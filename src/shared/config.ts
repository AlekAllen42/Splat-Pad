// The Splat Pad settings file: everything a user can customize.
// The same JSON is saved on the PC and will later be copied to the device's
// microSD card. Field-by-field documentation lives in docs/CONFIG.md.

export const CONFIG_VERSION = 1

export type HexColor = string // "#RRGGBB"

export interface Theme {
  background: HexColor // screen background
  surface: HexColor // tiles, panels
  accent: HexColor // highlights, slider fill
  text: HexColor
}

export interface ClockSettings {
  format: '12h' | '24h'
  showSeconds: boolean
  showDate: boolean
}

export interface CarouselSettings {
  columns: number // tiles per row
  speed: number // drift speed, pixels per second (0 = don't move)
  direction: 'up' | 'down'
  resumeDelayMs: number // how long after the user stops scrolling before drifting resumes
}

// What happens on the PC when an app tile is tapped (performed in Phase 3).
export type AppAction =
  | { type: 'launch'; target: string } // program path or command
  | { type: 'url'; target: string } // website to open
  | { type: 'none' }

export interface AppTile {
  id: string
  name: string
  color: HexColor // tile background
  icon?: string // image file name, e.g. "icons/spotify.png"; first letter of name shown if missing
  action: AppAction
}

export type SliderKind = 'masterVolume' | 'brightness' | 'appVolume' | 'device'

export interface Slider {
  id: string
  kind: SliderKind
  label: string
  target?: string // appVolume: program name (e.g. "spotify.exe"); device: device name
}

export interface Preset {
  id: string
  name: string
  values: Record<string, number> // slider id -> 0..100
}

// The device screen, in pixels. Layout positions use this coordinate space.
export const SCREEN_WIDTH = 800
export const SCREEN_HEIGHT = 480
export const GRID = 20 // pieces snap to multiples of this
export const MIN_WIDGET_SIZE = 40

// The pieces that can be placed on the screen.
export type WidgetType = 'clock' | 'carousel' | 'favorites' | 'presets' | 'controls'

export interface Widget {
  id: string
  type: WidgetType
  x: number // left edge, pixels from the left of the screen
  y: number // top edge, pixels from the top of the screen
  w: number
  h: number
}

export interface BehaviorSettings {
  showOpenMessage: boolean // brief "Opening Spotify" message when an app is tapped
}

export interface Config {
  version: number
  theme: Theme
  clock: ClockSettings
  carousel: CarouselSettings
  behavior: BehaviorSettings
  layout: Widget[] // where each piece sits on the screen
  apps: AppTile[]
  favorites: string[] // app ids, shown in the favorites row
  sliders: Slider[]
  presets: Preset[]
}

export const DEFAULT_CONFIG: Config = {
  version: CONFIG_VERSION,
  // 42 Potential brand colors
  theme: {
    background: '#f6f3ec',
    surface: '#efe8d9',
    accent: '#e2562c',
    text: '#1b1711'
  },
  clock: { format: '12h', showSeconds: false, showDate: true },
  carousel: { columns: 2, speed: 18, direction: 'up', resumeDelayMs: 2000 },
  behavior: { showOpenMessage: false },
  layout: [
    { id: 'carousel', type: 'carousel', x: 20, y: 20, w: 340, h: 440 },
    { id: 'clock', type: 'clock', x: 400, y: 20, w: 380, h: 280 },
    { id: 'presets', type: 'presets', x: 400, y: 320, w: 280, h: 140 },
    { id: 'controls', type: 'controls', x: 700, y: 320, w: 80, h: 140 }
  ],
  apps: [
    { id: 'browser', name: 'Browser', color: '#3b82f6', action: { type: 'none' } },
    { id: 'spotify', name: 'Spotify', color: '#1db954', action: { type: 'none' } },
    { id: 'discord', name: 'Discord', color: '#5865f2', action: { type: 'none' } },
    { id: 'obs', name: 'OBS', color: '#302e31', action: { type: 'none' } },
    { id: 'steam', name: 'Steam', color: '#1b2838', action: { type: 'none' } },
    { id: 'code', name: 'VS Code', color: '#007acc', action: { type: 'none' } },
    { id: 'files', name: 'Files', color: '#f59e0b', action: { type: 'none' } },
    { id: 'terminal', name: 'Terminal', color: '#374151', action: { type: 'none' } }
  ],
  favorites: ['spotify', 'discord', 'browser'],
  sliders: [
    { id: 'volume', kind: 'masterVolume', label: 'Volume' },
    { id: 'brightness', kind: 'brightness', label: 'Brightness' },
    { id: 'spotify-vol', kind: 'appVolume', label: 'Spotify', target: 'spotify.exe' }
  ],
  presets: [
    { id: 'gaming', name: 'Gaming', values: { volume: 70, brightness: 80, 'spotify-vol': 30 } },
    { id: 'night', name: 'Night', values: { volume: 35, brightness: 20, 'spotify-vol': 50 } }
  ]
}

// ---------------------------------------------------------------------------
// Validation: checks a loaded file before the app uses it, so a hand-edited
// or corrupted file produces clear messages instead of a crash.

export type ValidationResult = { ok: true; config: Config } | { ok: false; errors: string[] }

const HEX = /^#[0-9a-fA-F]{6}$/

export function validateConfig(raw: unknown): ValidationResult {
  const errors: string[] = []
  const err = (path: string, msg: string): void => {
    errors.push(`${path}: ${msg}`)
  }

  const isObj = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v)
  const str = (v: unknown, path: string): void => {
    if (typeof v !== 'string' || v.trim() === '') err(path, 'must be non-empty text')
  }
  const color = (v: unknown, path: string): void => {
    if (typeof v !== 'string' || !HEX.test(v)) err(path, 'must be a color like "#4f8cff"')
  }
  const num = (v: unknown, path: string, min: number, max: number): void => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max)
      err(path, `must be a number from ${min} to ${max}`)
  }
  const bool = (v: unknown, path: string): void => {
    if (typeof v !== 'boolean') err(path, 'must be true or false')
  }
  const oneOf = (v: unknown, path: string, options: readonly string[]): void => {
    if (typeof v !== 'string' || !options.includes(v))
      err(path, `must be one of: ${options.join(', ')}`)
  }
  const list = (v: unknown, path: string): unknown[] => {
    if (!Array.isArray(v)) {
      err(path, 'must be a list')
      return []
    }
    return v
  }
  const uniqueIds = (items: unknown[], path: string): Set<string> => {
    const seen = new Set<string>()
    items.forEach((item, i) => {
      const id = isObj(item) ? item.id : undefined
      str(id, `${path}[${i}].id`)
      if (typeof id === 'string') {
        if (seen.has(id)) err(`${path}[${i}].id`, `"${id}" is used more than once`)
        seen.add(id)
      }
    })
    return seen
  }

  if (!isObj(raw)) return { ok: false, errors: ['settings file must contain a JSON object'] }

  if (raw.version !== CONFIG_VERSION)
    err('version', `must be ${CONFIG_VERSION} (this app doesn't understand version ${String(raw.version)})`)

  const theme = isObj(raw.theme) ? raw.theme : (err('theme', 'missing'), {})
  for (const key of ['background', 'surface', 'accent', 'text'] as const)
    color(theme[key], `theme.${key}`)

  const clock = isObj(raw.clock) ? raw.clock : (err('clock', 'missing'), {})
  oneOf(clock.format, 'clock.format', ['12h', '24h'])
  bool(clock.showSeconds, 'clock.showSeconds')
  bool(clock.showDate, 'clock.showDate')

  const carousel = isObj(raw.carousel) ? raw.carousel : (err('carousel', 'missing'), {})
  num(carousel.columns, 'carousel.columns', 1, 4)
  if (typeof carousel.columns === 'number' && !Number.isInteger(carousel.columns))
    err('carousel.columns', 'must be a whole number')
  num(carousel.speed, 'carousel.speed', 0, 200)
  oneOf(carousel.direction, 'carousel.direction', ['up', 'down'])
  num(carousel.resumeDelayMs, 'carousel.resumeDelayMs', 0, 60000)

  const behavior = isObj(raw.behavior) ? raw.behavior : (err('behavior', 'missing'), {})
  bool(behavior.showOpenMessage, 'behavior.showOpenMessage')

  const layout = list(raw.layout, 'layout')
  uniqueIds(layout, 'layout')
  layout.forEach((wgt, i) => {
    const p = `layout[${i}]`
    if (!isObj(wgt)) return err(p, 'must be an object')
    oneOf(wgt.type, `${p}.type`, ['clock', 'carousel', 'favorites', 'presets', 'controls'])
    num(wgt.x, `${p}.x`, 0, SCREEN_WIDTH - MIN_WIDGET_SIZE)
    num(wgt.y, `${p}.y`, 0, SCREEN_HEIGHT - MIN_WIDGET_SIZE)
    num(wgt.w, `${p}.w`, MIN_WIDGET_SIZE, SCREEN_WIDTH)
    num(wgt.h, `${p}.h`, MIN_WIDGET_SIZE, SCREEN_HEIGHT)
    const { x, y, w, h } = wgt
    if (typeof x === 'number' && typeof w === 'number' && x + w > SCREEN_WIDTH)
      err(p, `sticks out past the right edge of the screen (${SCREEN_WIDTH}px)`)
    if (typeof y === 'number' && typeof h === 'number' && y + h > SCREEN_HEIGHT)
      err(p, `sticks out past the bottom edge of the screen (${SCREEN_HEIGHT}px)`)
  })

  const apps = list(raw.apps, 'apps')
  const appIds = uniqueIds(apps, 'apps')
  apps.forEach((a, i) => {
    const p = `apps[${i}]`
    if (!isObj(a)) return err(p, 'must be an object')
    str(a.name, `${p}.name`)
    color(a.color, `${p}.color`)
    if (a.icon !== undefined) str(a.icon, `${p}.icon`)
    const action = isObj(a.action) ? a.action : (err(`${p}.action`, 'missing'), {})
    oneOf(action.type, `${p}.action.type`, ['launch', 'url', 'none'])
    if (action.type === 'launch' || action.type === 'url') str(action.target, `${p}.action.target`)
  })

  list(raw.favorites, 'favorites').forEach((id, i) => {
    if (typeof id !== 'string' || !appIds.has(id))
      err(`favorites[${i}]`, `"${String(id)}" is not the id of an app`)
  })

  const sliders = list(raw.sliders, 'sliders')
  const sliderIds = uniqueIds(sliders, 'sliders')
  sliders.forEach((s, i) => {
    const p = `sliders[${i}]`
    if (!isObj(s)) return err(p, 'must be an object')
    oneOf(s.kind, `${p}.kind`, ['masterVolume', 'brightness', 'appVolume', 'device'])
    str(s.label, `${p}.label`)
    if (s.kind === 'appVolume' || s.kind === 'device') str(s.target, `${p}.target`)
  })

  const presets = list(raw.presets, 'presets')
  uniqueIds(presets, 'presets')
  presets.forEach((pr, i) => {
    const p = `presets[${i}]`
    if (!isObj(pr)) return err(p, 'must be an object')
    str(pr.name, `${p}.name`)
    if (!isObj(pr.values)) return err(`${p}.values`, 'must be an object')
    for (const [sliderId, value] of Object.entries(pr.values)) {
      if (!sliderIds.has(sliderId)) err(`${p}.values.${sliderId}`, 'is not the id of a slider')
      num(value, `${p}.values.${sliderId}`, 0, 100)
    }
  })

  return errors.length ? { ok: false, errors } : { ok: true, config: raw as unknown as Config }
}
