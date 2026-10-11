// Message shapes for the USB protocol. docs/PROTOCOL.md is the source of
// truth; keep this file in step with it. Used by the app side (main
// process) and by the pretend Splat Pad, which stands in for the firmware.

import type { Config } from './config'

export const PROTOCOL_VERSION = 1

export const TIMING = {
  helloTimeoutMs: 1000, // a port must answer hello this fast to count as a Splat Pad
  replyTimeoutMs: 2000, // requests with an id expect ack/error within this
  pingEveryMs: 2000,
  silenceLimitMs: 6000, // no message for this long = disconnected
  retryEveryMs: 2000, // how often to look for the device again
  liveDebounceMs: 300 // wait for edits to pause before sending a live preview
}

export const MAX_LINE_BYTES = 32 * 1024
export const FILE_CHUNK_BYTES = 4096 // before base64

// ---- app -> device ----
export type AppMessage =
  | { v: 1; type: 'hello'; id: number; app: 'splat-pad'; appVersion: string }
  | { v: 1; type: 'time'; id: number; unix: number; tzOffsetMin: number }
  | { v: 1; type: 'config'; id: number; save: boolean; hash: string; config: WireConfig }
  | { v: 1; type: 'state'; sliders: Record<string, number> }
  | { v: 1; type: 'ping'; id: number }
  | { v: 1; type: 'fileBegin'; id: number; path: string; size: number; sha256: string }
  | { v: 1; type: 'fileChunk'; id: number; path: string; offset: number; data: string }
  | { v: 1; type: 'fileEnd'; id: number; path: string }
  | { v: 1; type: 'fileDelete'; id: number; path: string }

// ---- device -> app ----
export interface DeviceHello {
  v: 1
  type: 'hello'
  re: number
  model: string
  firmware: string
  protocol: number
  sd: { present: boolean; freeBytes: number }
  configHash: string | null
  files: string[]
}

export type DeviceMessage =
  | DeviceHello
  | { v: 1; type: 'ack'; re: number }
  | { v: 1; type: 'error'; re?: number; code: ErrorCode; msg?: string }
  | { v: 1; type: 'pong'; re: number }
  | { v: 1; type: 'tap'; appId: string }
  | { v: 1; type: 'slider'; sliderId: string; value: number }
  | { v: 1; type: 'preset'; presetId: string }
  | { v: 1; type: 'log'; level: 'info' | 'warn' | 'error'; msg: string }

export type ErrorCode =
  | 'unknown_type'
  | 'unsupported_version'
  | 'bad_message'
  | 'invalid_config'
  | 'missing_file'
  | 'checksum_mismatch'
  | 'sd_missing'
  | 'sd_write_failed'
  | 'busy'

// Settings as sent to the device: identical to Config, except each app's
// icon is a file name on the device ("icons/<hash>.png") instead of image data.
export type WireConfig = Config

// Events the device reports, as the app's UI sees them.
export type DeviceEvent =
  | { type: 'tap'; appId: string }
  | { type: 'slider'; sliderId: string; value: number }
  | { type: 'preset'; presetId: string }

// Connection status shown in the app.
export type ConnectionStatus =
  | { state: 'disconnected' }
  | { state: 'connecting' }
  | { state: 'connected'; model: string; firmware: string; pretend: boolean }

// One line on the wire. Returns null if it isn't a JSON object with v and type.
export function parseLine(line: string): Record<string, unknown> | null {
  if (line.length > MAX_LINE_BYTES) return null
  try {
    const msg: unknown = JSON.parse(line)
    if (typeof msg !== 'object' || msg === null || Array.isArray(msg)) return null
    const m = msg as Record<string, unknown>
    return typeof m.v === 'number' && typeof m.type === 'string' ? m : null
  } catch {
    return null
  }
}
