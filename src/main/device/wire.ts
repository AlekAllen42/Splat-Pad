import { createHash } from 'crypto'
import type { Config } from '../../shared/config'
import type { WireConfig } from '../../shared/protocol'

// Turns the app's settings into what the device receives (docs/PROTOCOL.md
// section 5): icons stored as image data become separate files named by
// their content, and the settings refer to those file names.
//
// TODO(hardware): convert icons to the size/format the firmware can draw
// (proposal: 96x96 PNG). For now they are sent as-is.

export interface WireBundle {
  config: WireConfig
  hash: string // SHA-256 of the settings text, so the device can say what it has
  files: Map<string, Buffer> // path on the device -> file contents
}

const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico'
}

export const sha256 = (data: Buffer | string): string => createHash('sha256').update(data).digest('hex')

function iconFile(dataUrl: string): { path: string; data: Buffer } | null {
  const m = dataUrl.match(/^data:([^;,]+);base64,(.*)$/)
  if (!m) return null
  const data = Buffer.from(m[2], 'base64')
  return { path: `icons/${sha256(data).slice(0, 16)}.${EXT[m[1]] ?? 'bin'}`, data }
}

export function toWire(config: Config): WireBundle {
  const files = new Map<string, Buffer>()
  const apps = config.apps.map((app) => {
    if (!app.icon?.startsWith('data:')) return app
    const file = iconFile(app.icon)
    if (!file) return { ...app, icon: undefined }
    files.set(file.path, file.data)
    return { ...app, icon: file.path }
  })
  const wire: WireConfig = { ...config, apps }
  return { config: wire, hash: sha256(JSON.stringify(wire)), files }
}
