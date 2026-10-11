import { GRID, SCREEN_HEIGHT, SCREEN_WIDTH, type Config, type Widget, type WidgetType } from '../../../shared/config'

export type ConfigUpdate = (update: (c: Config) => Config) => void

// A short id that isn't used yet: "spotify", then "spotify-2", "spotify-3"...
export function makeId(base: string, taken: string[]): string {
  const slug =
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  if (!taken.includes(slug)) return slug
  let n = 2
  while (taken.includes(`${slug}-${n}`)) n++
  return `${slug}-${n}`
}

// Starting size for each kind of piece when added from the Library.
export const DEFAULT_WIDGET_SIZE: Record<WidgetType, { w: number; h: number }> = {
  clock: { w: 380, h: 200 },
  carousel: { w: 340, h: 440 },
  favorites: { w: 400, h: 140 },
  presets: { w: 280, h: 140 },
  controls: { w: 80, h: 140 }
}

const overlaps = (a: Omit<Widget, 'id' | 'type'>, b: Widget): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

// First empty spot (scanning top-left to bottom-right) where a w x h piece fits.
// Tries smaller sizes if the full size doesn't fit anywhere; falls back to the
// top-left corner, where the layout editor will show the overlap in red.
export function placeWidget(
  layout: Widget[],
  w: number,
  h: number
): { spot: { x: number; y: number; w: number; h: number }; fits: boolean } {
  for (const factor of [1, 0.75, 0.5]) {
    const sw = Math.max(GRID * 2, Math.round((w * factor) / GRID) * GRID)
    const sh = Math.max(GRID * 2, Math.round((h * factor) / GRID) * GRID)
    for (let y = 0; y + sh <= SCREEN_HEIGHT; y += GRID) {
      for (let x = 0; x + sw <= SCREEN_WIDTH; x += GRID) {
        const spot = { x, y, w: sw, h: sh }
        if (!layout.some((other) => overlaps(spot, other))) return { spot, fits: true }
      }
    }
  }
  return { spot: { x: 0, y: 0, w: Math.min(w, SCREEN_WIDTH), h: Math.min(h, SCREEN_HEIGHT) }, fits: false }
}

// Tile colors handed out to newly added apps, in turn.
export const TILE_COLORS = ['#e2562c', '#2f6b46', '#3b82f6', '#a9790a', '#7c3aed', '#0f766e', '#b3273f', '#374151']
