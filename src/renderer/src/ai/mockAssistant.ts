// DEMO ONLY: a pretend assistant that understands a few kinds of requests
// with simple keyword rules. The real version will send the request to our
// website, which asks Claude (an API key must never ship inside the app).
// The shape of a reply (message + optional creation) is meant to stay the
// same when the real AI replaces this.

import type { AppTile, Config, MacroStep, Preset, Theme } from '../../../shared/config'
import { makeId, TILE_COLORS } from '../library/helpers'

export type Creation =
  | { kind: 'button'; app: Omit<AppTile, 'id'> }
  | { kind: 'preset'; preset: Omit<Preset, 'id'> }
  | { kind: 'theme'; name: string; theme: Theme }

export interface Reply {
  message: string
  creation?: Creation
  idea?: boolean // couldn't build it; offer to send the idea for review
}

const THEMES: { words: string[]; name: string; theme: Theme }[] = [
  { words: ['purple', 'grape', 'violet'], name: 'Grape', theme: { background: '#1a1325', surface: '#2a1f3d', accent: '#c084fc', text: '#f4eefc' } },
  { words: ['pink', 'rose'], name: 'Rose', theme: { background: '#fff0f5', surface: '#ffd6e5', accent: '#db2777', text: '#3b0a1f' } },
  { words: ['blue', 'midnight', 'navy'], name: 'Midnight', theme: { background: '#0f1115', surface: '#1c2029', accent: '#4f8cff', text: '#f2f3f5' } },
  { words: ['green', 'mint', 'forest'], name: 'Mint', theme: { background: '#eef6f1', surface: '#d9ece1', accent: '#1f8a5b', text: '#11231a' } },
  { words: ['sunset', 'orange', 'warm'], name: 'Sunset', theme: { background: '#fff4e6', surface: '#ffe0bd', accent: '#d9480f', text: '#3b1d0b' } },
  { words: ['dark', 'black', 'night', 'ink'], name: 'Ink', theme: { background: '#15120e', surface: '#26211a', accent: '#ec6a40', text: '#f1eadf' } },
  { words: ['light', 'paper', 'white', 'cream'], name: 'Paper', theme: { background: '#f6f3ec', surface: '#efe8d9', accent: '#e2562c', text: '#1b1711' } }
]

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const titleCase = (s: string): string => s.replace(/\b\w/g, (c) => c.toUpperCase())

// "called Focus" / "named Focus" / "Study mode" -> a name
function findName(text: string): string | undefined {
  const called = text.match(/\b(?:called|named)\s+["']?([\w ]{1,24}?)["']?(?:\s+(?:that|with|which|and)\b|[.,!]|$)/i)
  if (called) return titleCase(called[1].trim())
  const mode = text.match(/\b(?:a|an|my)\s+([a-z]+)\s+(?:mode|preset|scene|setup)\b/i)
  if (mode) return titleCase(mode[1])
  return undefined
}

// Slider settings mentioned with a number: "volume to 40", "brightness 70%"
function findSliderValues(text: string, config: Config): Record<string, number> {
  const values: Record<string, number> = {}
  for (const s of config.sliders) {
    const words = [s.label.toLowerCase()]
    if (s.kind === 'masterVolume') words.push('volume', 'sound')
    if (s.kind === 'brightness') words.push('brightness')
    for (const w of words) {
      const m = text.match(new RegExp(`\\b${escape(w)}\\b\\D{0,12}?(\\d{1,3})\\s*%?`, 'i'))
      if (m) {
        values[s.id] = Math.min(100, Number(m[1]))
        break
      }
    }
  }
  return values
}

const findApps = (text: string, config: Config): AppTile[] =>
  config.apps.filter((a) => new RegExp(`\\b${escape(a.name.toLowerCase())}\\b`).test(text))

const findUrls = (text: string): string[] =>
  [...text.matchAll(/\b((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?)/gi)].map((m) =>
    /^https?:\/\//i.test(m[1]) ? m[1] : `https://${m[1]}`
  )

export function respond(input: string, config: Config): Reply {
  const text = input.toLowerCase().trim()
  if (!text) return { message: 'Tell me what you’d like your Splat Pad to do.' }

  // Colors and themes
  if (/\b(theme|colou?rs?|look|make it)\b/.test(text)) {
    const match = THEMES.find((t) => t.words.some((w) => text.includes(w)))
    if (match) {
      return {
        message: `Here’s a ${match.name} look for your screen.`,
        creation: { kind: 'theme', name: match.name, theme: match.theme }
      }
    }
  }

  const values = findSliderValues(text, config)
  const apps = findApps(text, config)
  const urls = findUrls(text)
  const name = findName(input)

  // Presets: slider settings only, asked for as a mode/preset/scene
  if (/\b(preset|mode|scene|setup)\b/.test(text) && Object.keys(values).length > 0 && apps.length === 0 && urls.length === 0) {
    return {
      message: 'Here’s a preset with those slider settings. Tap it on the screen to apply them all at once.',
      creation: { kind: 'preset', preset: { name: name ?? 'New preset', values } }
    }
  }

  // Buttons: any mix of apps, websites and slider settings
  const steps: MacroStep[] = [
    ...apps.map((a): MacroStep => ({ type: 'openApp', appId: a.id })),
    ...urls.map((target): MacroStep => ({ type: 'url', target })),
    ...Object.entries(values).map(([sliderId, value]): MacroStep => ({ type: 'setSlider', sliderId, value }))
  ]
  if (steps.length > 0) {
    const onlyUrl = steps.length === 1 && steps[0].type === 'url'
    const label =
      name ??
      (onlyUrl
        ? titleCase(urls[0].replace(/^https?:\/\/(www\.)?/i, '').split(/[./]/)[0])
        : [...apps.map((a) => a.name), ...urls.map((u) => u.replace(/^https?:\/\/(www\.)?/i, '').split('.')[0])].slice(0, 2).join(' + ') ||
          'My button')
    return {
      message:
        steps.length === 1
          ? 'Here’s a button for that.'
          : `Here’s a custom button that does ${steps.length} things in a row with one tap.`,
      creation: {
        kind: 'button',
        app: {
          name: label,
          color: TILE_COLORS[(config.apps.length + 3) % TILE_COLORS.length],
          action: onlyUrl ? { type: 'url', target: urls[0] } : { type: 'macro', steps }
        }
      }
    }
  }

  return {
    message:
      'I can’t build that with what Splat Pad can do yet. I can make buttons that open apps and websites and set sliders, presets, and color themes. Want to send this idea to the Splat team? They review ideas for new features.',
    idea: true
  }
}

// Adds a creation to the settings.
export function applyCreation(c: Config, creation: Creation): Config {
  switch (creation.kind) {
    case 'button':
      return { ...c, apps: [...c.apps, { ...creation.app, id: makeId(creation.app.name, c.apps.map((a) => a.id)) }] }
    case 'preset':
      return {
        ...c,
        presets: [...c.presets, { ...creation.preset, id: makeId(creation.preset.name, c.presets.map((p) => p.id)) }]
      }
    case 'theme':
      return { ...c, theme: creation.theme }
  }
}
