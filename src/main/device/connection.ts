import { app } from 'electron'
import type { Config } from '../../shared/config'
import {
  FILE_CHUNK_BYTES,
  PROTOCOL_VERSION,
  TIMING,
  parseLine,
  type AppMessage,
  type ConnectionStatus,
  type DeviceEvent,
  type DeviceHello
} from '../../shared/protocol'
import type { Transport } from './transport'
import { sha256, toWire } from './wire'

// The app's side of docs/PROTOCOL.md: says hello, sets the clock, keeps the
// device's settings and icons in sync (live previews + saved copies), keeps
// the link alive with pings, and passes taps/slider moves to the app.

type Outgoing = AppMessage extends infer M ? (M extends { id: number } ? Omit<M, 'id' | 'v'> : never) : never
type Fire = Exclude<AppMessage, { id: number }>

interface Pending {
  resolve: (msg: Record<string, unknown>) => void
  reject: (err: Error) => void
  timer: NodeJS.Timeout
}

export interface ConnectionEvents {
  status: (status: ConnectionStatus) => void
  event: (event: DeviceEvent) => void
  log: (line: string) => void
}

class DeviceError extends Error {
  constructor(
    readonly code: string,
    message?: string
  ) {
    super(message ?? code)
  }
}

export class Connection {
  private transport: Transport | null = null
  private status: ConnectionStatus = { state: 'disconnected' }
  private pending = new Map<number, Pending>()
  private nextId = 1
  private lastHeard = 0
  private pingTimer: NodeJS.Timeout | null = null
  private liveTimer: NodeJS.Timeout | null = null
  private queue: Promise<unknown> = Promise.resolve() // keeps requests in order
  private deviceFiles = new Set<string>()
  private deviceHash: string | null = null // what the device is showing right now
  private savedConfig: Config | null = null
  private liveConfig: Config | null = null

  constructor(private readonly on: ConnectionEvents) {}

  getStatus(): ConnectionStatus {
    return this.status
  }

  // ---------- plugging in / unplugging ----------

  async attach(transport: Transport): Promise<void> {
    this.detach()
    this.transport = transport
    transport.onLine((line) => this.handleLine(line))
    transport.onClose(() => {
      if (this.transport === transport) this.detach()
    })
    this.setStatus({ state: 'connecting' })
    try {
      const hello = (await this.request(
        { type: 'hello', app: 'splat-pad', appVersion: app.getVersion() },
        TIMING.helloTimeoutMs
      )) as unknown as DeviceHello
      if (hello.protocol < PROTOCOL_VERSION) throw new DeviceError('unsupported_version')
      this.deviceFiles = new Set(Array.isArray(hello.files) ? hello.files : [])
      this.deviceHash = hello.configHash ?? null
      this.setStatus({ state: 'connected', model: String(hello.model), firmware: String(hello.firmware), pretend: transport.pretend })
      this.startPinging()
      await this.sendTime()
      await this.syncAll()
    } catch (err) {
      this.on.log(`connect failed: ${(err as Error).message}`)
      if (this.transport === transport) this.detach()
    }
  }

  detach(): void {
    this.stopPinging()
    if (this.liveTimer) clearTimeout(this.liveTimer)
    for (const p of this.pending.values()) {
      clearTimeout(p.timer)
      p.reject(new DeviceError('disconnected'))
    }
    this.pending.clear()
    const t = this.transport
    this.transport = null
    t?.close()
    this.deviceFiles.clear()
    this.deviceHash = null
    if (this.status.state !== 'disconnected') this.setStatus({ state: 'disconnected' })
  }

  // ---------- settings from the app ----------

  // The saved settings (from disk, or after Save). Written to the device's card.
  setSaved(config: Config): void {
    this.savedConfig = config
    if (this.isConnected()) void this.enqueue(() => this.pushConfig(config, true))
  }

  // What the user is editing right now. Shown on the device but not stored.
  setLive(config: Config): void {
    this.liveConfig = config
    if (!this.isConnected()) return
    if (this.liveTimer) clearTimeout(this.liveTimer)
    this.liveTimer = setTimeout(() => {
      const latest = this.liveConfig
      if (latest) void this.enqueue(() => this.pushConfig(latest, false))
    }, TIMING.liveDebounceMs)
  }

  // ---------- internals ----------

  private isConnected(): boolean {
    return this.status.state === 'connected' && this.transport !== null
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status
    this.on.status(status)
  }

  private enqueue<T>(job: () => Promise<T>): Promise<T | undefined> {
    const run = this.queue.then(job).catch((err: Error) => {
      this.on.log(`device request failed: ${err.message}`)
      return undefined
    })
    this.queue = run
    return run
  }

  private async syncAll(): Promise<void> {
    // saved copy first (so the card is right), then the live edit on top
    if (this.savedConfig) await this.pushConfig(this.savedConfig, true)
    if (this.liveConfig) await this.pushConfig(this.liveConfig, false)
  }

  private async pushConfig(config: Config, save: boolean): Promise<void> {
    const bundle = toWire(config)
    if (!save && bundle.hash === this.deviceHash) return // already showing exactly this
    for (const [path, data] of bundle.files) {
      if (!this.deviceFiles.has(path)) await this.sendFile(path, data)
    }
    await this.request({ type: 'config', save, hash: bundle.hash, config: bundle.config })
    this.deviceHash = bundle.hash
  }

  private async sendFile(path: string, data: Buffer): Promise<void> {
    await this.request({ type: 'fileBegin', path, size: data.length, sha256: sha256(data) })
    for (let offset = 0; offset < data.length; offset += FILE_CHUNK_BYTES) {
      const chunk = data.subarray(offset, offset + FILE_CHUNK_BYTES).toString('base64')
      await this.request({ type: 'fileChunk', path, offset, data: chunk })
    }
    await this.request({ type: 'fileEnd', path })
    this.deviceFiles.add(path)
  }

  private async sendTime(): Promise<void> {
    const now = new Date()
    await this.request({ type: 'time', unix: Math.floor(now.getTime() / 1000), tzOffsetMin: -now.getTimezoneOffset() })
  }

  private write(msg: AppMessage | Fire): void {
    this.transport?.write(JSON.stringify(msg))
  }

  // Sends a message with an id and waits for its ack/error (or hello/pong reply).
  private request(msg: Outgoing, timeoutMs = TIMING.replyTimeoutMs): Promise<Record<string, unknown>> {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      if (!this.transport) return reject(new DeviceError('disconnected'))
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new DeviceError('timeout', `no reply to ${msg.type}`))
      }, timeoutMs)
      this.pending.set(id, { resolve, reject, timer })
      this.write({ ...msg, v: PROTOCOL_VERSION, id } as AppMessage)
    })
  }

  private handleLine(line: string): void {
    const msg = parseLine(line)
    if (!msg) return this.on.log(`ignored bad line from device: ${line.slice(0, 80)}`)
    this.lastHeard = Date.now()

    if (typeof msg.re === 'number') {
      const p = this.pending.get(msg.re)
      if (!p) return
      this.pending.delete(msg.re)
      clearTimeout(p.timer)
      if (msg.type === 'error') p.reject(new DeviceError(String(msg.code), String(msg.msg ?? msg.code)))
      else p.resolve(msg)
      return
    }

    switch (msg.type) {
      case 'tap':
        if (typeof msg.appId === 'string') this.on.event({ type: 'tap', appId: msg.appId })
        break
      case 'slider':
        if (typeof msg.sliderId === 'string' && typeof msg.value === 'number')
          this.on.event({ type: 'slider', sliderId: msg.sliderId, value: Math.max(0, Math.min(100, msg.value)) })
        break
      case 'preset':
        if (typeof msg.presetId === 'string') this.on.event({ type: 'preset', presetId: msg.presetId })
        break
      case 'log':
        this.on.log(`device ${String(msg.level)}: ${String(msg.msg)}`)
        break
      default:
        this.on.log(`ignored message type from device: ${msg.type}`)
    }
  }

  private startPinging(): void {
    this.stopPinging()
    this.lastHeard = Date.now()
    this.pingTimer = setInterval(() => {
      if (Date.now() - this.lastHeard > TIMING.silenceLimitMs) {
        this.on.log('device went quiet; disconnecting')
        this.detach()
        return
      }
      void this.request({ type: 'ping' }).catch(() => undefined)
    }, TIMING.pingEveryMs)
  }

  private stopPinging(): void {
    if (this.pingTimer) clearInterval(this.pingTimer)
    this.pingTimer = null
  }
}
