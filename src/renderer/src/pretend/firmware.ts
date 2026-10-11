// A stand-in for the Splat Pad firmware, written in TypeScript so the app's
// connection code can be tested before the board exists. It follows
// docs/PROTOCOL.md from the device's side; the real C++ firmware must behave
// the same way. Its "microSD card" is this window's local storage.

import { PROTOCOL_VERSION, parseLine, type DeviceEvent, type DeviceMessage, type WireConfig } from '../../../shared/protocol'

export const MODEL = 'splat-pad-5'
export const FIRMWARE = '0.0.0-pretend'
const SD_KEY = 'pretend.sd'
const SD_SIZE = 4 * 1024 * 1024 // pretend card size, to report free space
const MAX_FILE = 1024 * 1024

interface SdCard {
  config: WireConfig | null
  hash: string | null
  files: Record<string, string> // path -> base64 contents
}

const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon' }

function loadCard(): SdCard {
  try {
    const raw = localStorage.getItem(SD_KEY)
    if (raw) return JSON.parse(raw) as SdCard
  } catch {
    // unreadable card: start empty, like a fresh one
  }
  return { config: null, hash: null, files: {} }
}

const toHex = (buf: ArrayBuffer): string => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const fromBase64 = (b64: string): Uint8Array => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
const toBase64 = (bytes: Uint8Array): string => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

export class PretendFirmware {
  private card = loadCard()
  private incoming: { path: string; size: number; sha256: string; data: Uint8Array<ArrayBuffer> } | null = null
  private queue: Promise<void> = Promise.resolve() // handle one message at a time, in order

  constructor(
    private readonly send: (line: string) => void,
    // called whenever the screen should change; icons resolved to images
    private readonly show: (config: WireConfig) => void
  ) {}

  // Power-on: show what's saved on the card, if anything.
  boot(): void {
    if (this.card.config) this.show(this.withImages(this.card.config))
  }

  receive(line: string): void {
    this.queue = this.queue.then(() => this.handle(line)).catch((e: Error) => this.log('error', e.message))
  }

  // The user tapped / dragged something on the screen.
  report(event: DeviceEvent): void {
    if (event.type === 'tap') this.reply({ v: 1, type: 'tap', appId: event.appId })
    else if (event.type === 'slider') this.reply({ v: 1, type: 'slider', sliderId: event.sliderId, value: event.value })
    else this.reply({ v: 1, type: 'preset', presetId: event.presetId })
  }

  // ---------- internals ----------

  private reply(msg: DeviceMessage): void {
    this.send(JSON.stringify(msg))
  }

  private log(level: 'info' | 'warn' | 'error', msg: string): void {
    this.reply({ v: 1, type: 'log', level, msg })
  }

  private saveCard(): boolean {
    try {
      localStorage.setItem(SD_KEY, JSON.stringify(this.card))
      return true
    } catch {
      return false
    }
  }

  private usedBytes(): number {
    return Object.values(this.card.files).reduce((n, b64) => n + Math.floor((b64.length * 3) / 4), 0)
  }

  // Settings refer to icons by file name; the screen needs the actual images.
  private withImages(config: WireConfig): WireConfig {
    return {
      ...config,
      apps: config.apps.map((app) => {
        const b64 = app.icon ? this.card.files[app.icon] : undefined
        if (!app.icon || !b64) return { ...app, icon: undefined }
        const ext = app.icon.split('.').pop() ?? 'png'
        return { ...app, icon: `data:${MIME[ext] ?? 'application/octet-stream'};base64,${b64}` }
      })
    }
  }

  private async handle(line: string): Promise<void> {
    const msg = parseLine(line)
    if (!msg) return this.reply({ v: 1, type: 'error', code: 'bad_message' })
    const id = typeof msg.id === 'number' ? msg.id : undefined
    const ack = (): void => {
      if (id !== undefined) this.reply({ v: 1, type: 'ack', re: id })
    }
    const fail = (code: Extract<DeviceMessage, { type: 'error' }>['code'], text?: string): void => {
      if (id !== undefined) this.reply({ v: 1, type: 'error', re: id, code, msg: text })
    }

    if (msg.v !== PROTOCOL_VERSION) return fail('unsupported_version')

    switch (msg.type) {
      case 'hello':
        if (id === undefined) return
        return this.reply({
          v: 1,
          type: 'hello',
          re: id,
          model: MODEL,
          firmware: FIRMWARE,
          protocol: PROTOCOL_VERSION,
          sd: { present: true, freeBytes: Math.max(0, SD_SIZE - this.usedBytes()) },
          configHash: this.card.hash,
          files: Object.keys(this.card.files)
        })

      case 'time':
        // The pretend device uses the PC's own clock, so nothing to set.
        return ack()

      case 'ping':
        if (id !== undefined) this.reply({ v: 1, type: 'pong', re: id })
        return

      case 'state':
        return // slider positions from the PC; the pretend screen doesn't track them yet

      case 'config': {
        const config = msg.config as WireConfig | undefined
        if (!config || !Array.isArray(config.apps) || !Array.isArray(config.layout)) return fail('invalid_config')
        const missing = config.apps.find((a) => a.icon && !this.card.files[a.icon])
        if (missing) return fail('missing_file', String(missing.icon))
        this.show(this.withImages(config))
        if (msg.save === true) {
          this.card.config = config
          this.card.hash = typeof msg.hash === 'string' ? msg.hash : null
          if (!this.saveCard()) return fail('sd_write_failed')
        }
        return ack()
      }

      case 'fileBegin': {
        const size = Number(msg.size)
        if (typeof msg.path !== 'string' || !Number.isInteger(size) || size < 0) return fail('bad_message')
        if (size > MAX_FILE) return fail('sd_write_failed', 'file too big')
        this.incoming = { path: msg.path, size, sha256: String(msg.sha256), data: new Uint8Array(new ArrayBuffer(size)) }
        return ack()
      }

      case 'fileChunk': {
        const f = this.incoming
        if (!f || msg.path !== f.path || typeof msg.data !== 'string') return fail('bad_message')
        const bytes = fromBase64(msg.data)
        const offset = Number(msg.offset)
        if (offset + bytes.length > f.size) return fail('bad_message', 'chunk past end of file')
        f.data.set(bytes, offset)
        return ack()
      }

      case 'fileEnd': {
        const f = this.incoming
        this.incoming = null
        if (!f || msg.path !== f.path) return fail('bad_message')
        const digest = toHex(await crypto.subtle.digest('SHA-256', f.data))
        if (digest !== f.sha256) return fail('checksum_mismatch')
        // only now does the file "exist" on the card (never a half-written image)
        this.card.files[f.path] = toBase64(f.data)
        if (!this.saveCard()) {
          delete this.card.files[f.path]
          return fail('sd_write_failed')
        }
        return ack()
      }

      case 'fileDelete':
        if (typeof msg.path === 'string') delete this.card.files[msg.path]
        this.saveCard()
        return ack()

      default:
        return fail('unknown_type')
    }
  }
}
