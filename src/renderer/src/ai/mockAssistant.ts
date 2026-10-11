// DEMO ONLY: a pretend assistant that understands a few kinds of requests
// with simple keyword rules. The real version will send the request to our
// website, which asks Claude (an API key must never ship inside the app).
// The shape of a reply (message + optional creation) is meant to stay the
// same when the real AI replaces this.

import type { AppTile, Config, MacroStep, Preset, Theme } from '../../../shared/config'
import { makeId, TILE_COLORS } from '../library/helpers'
import type { Strings } from '../../../shared/i18n'

type ThemeKey = keyof Strings['themeName']

export type Creation =
  | { kind: 'button'; app: Omit<AppTile, 'id'> }
  | { kind: 'preset'; preset: Omit<Preset, 'id'> }
  | { kind: 'theme'; name: ThemeKey; theme: Theme }

export interface Reply {
  message: string
  creation?: Creation
  idea?: boolean // couldn't build it; offer to send the idea for review
}

// Keywords in English, Spanish and French (the demo only; the real AI will
// understand any wording).
const THEMES: { words: string[]; name: ThemeKey; theme: Theme }[] = [
  { words: ['purple', 'grape', 'violet', 'morado', 'violeta', 'uva', 'raisin'], name: 'Grape', theme: { background: '#1a1325', surface: '#2a1f3d', accent: '#c084fc', text: '#f4eefc' } },
  { words: ['pink', 'rose', 'rosa'], name: 'Rose', theme: { background: '#fff0f5', surface: '#ffd6e5', accent: '#db2777', text: '#3b0a1f' } },
  { words: ['blue', 'midnight', 'navy', 'azul', 'medianoche', 'bleu', 'minuit'], name: 'Midnight', theme: { background: '#0f1115', surface: '#1c2029', accent: '#4f8cff', text: '#f2f3f5' } },
  { words: ['green', 'mint', 'forest', 'verde', 'menta', 'vert', 'menthe'], name: 'Mint', theme: { background: '#eef6f1', surface: '#d9ece1', accent: '#1f8a5b', text: '#11231a' } },
  { words: ['sunset', 'orange', 'warm', 'naranja', 'atardecer', 'coucher'], name: 'Sunset', theme: { background: '#fff4e6', surface: '#ffe0bd', accent: '#d9480f', text: '#3b1d0b' } },
  { words: ['dark', 'black', 'night', 'ink', 'oscuro', 'negro', 'noche', 'sombre', 'noir', 'nuit'], name: 'Ink', theme: { background: '#15120e', surface: '#26211a', accent: '#ec6a40', text: '#f1eadf' } },
  { words: ['light', 'paper', 'white', 'cream', 'claro', 'blanco', 'clair', 'blanc'], name: 'Paper', theme: { background: '#f6f3ec', surface: '#efe8d9', accent: '#e2562c', text: '#1b1711' } }
]

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const titleCase = (s: string): string => s.replace(/(^|\s)(\p{L})/gu, (_m, sp: string, c: string) => sp + c.toUpperCase())

// Whole-word match that also works with accented letters (\b doesn't).
const hasWord = (text: string, words: string[]): boolean =>
  words.some((w) => new RegExp(`(?<!\\p{L})${escape(w)}(?!\\p{L})`, 'iu').test(text))

const THEME_WORDS = ['theme', 'color', 'colors', 'colour', 'colours', 'look', 'make it', 'tema', 'colores', 'hazlo', 'thème', 'couleur', 'couleurs', 'mets-le']
const PRESET_WORDS = ['preset', 'mode', 'scene', 'setup', 'modo', 'ajuste', 'escena', 'préréglage', 'scène']

// "called Focus" / "named Focus" / "Study mode" -> a name
function findName(text: string): string | undefined {
  const called = text.match(
    /(?:called|named|llamad[oa]|appelée?|nommée?)\s+["'«]?([\p{L}\d ]{1,24}?)["'»]?(?:\s+(?:that|with|which|and|que|con|y|qui|avec|et)(?!\p{L})|[.,!]|$)/iu
  )
  if (called) return titleCase(called[1].trim())
  // "a study mode" (English: name before the word)
  const before = text.match(/(?:^|\s)(?:a|an|my)\s+(\p{L}+)\s+(?:mode|preset|scene|setup)(?!\p{L})/iu)
  if (before) return titleCase(before[1])
  // "un modo estudio" / "un mode étude" (Spanish/French: name after the word)
  const after = text.match(/(?:^|\s)(?:un|mi|mon)\s+(?:modo|mode)\s+(?:de\s+)?(\p{L}+)/iu)
  if (after) return titleCase(after[1])
  return undefined
}

// Slider settings mentioned with a number: "volume to 40", "brightness 70%"
function findSliderValues(text: string, config: Config): Record<string, number> {
  const values: Record<string, number> = {}
  for (const s of config.sliders) {
    const words = [s.label.toLowerCase()]
    if (s.kind === 'masterVolume') words.push('volume', 'sound', 'volumen', 'sonido', 'son')
    if (s.kind === 'brightness') words.push('brightness', 'brillo', 'luminosité')
    for (const w of words) {
      const m = text.match(new RegExp(`(?<!\\p{L})${escape(w)}(?!\\p{L})\\D{0,14}?(\\d{1,3})\\s*%?`, 'iu'))
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

export function respond(input: string, config: Config, t: Strings): Reply {
  const text = input.toLowerCase().trim()
  if (!text) return { message: t.aiEmpty }

  // Colors and themes
  if (hasWord(text, THEME_WORDS)) {
    const match = THEMES.find((th) => hasWord(text, th.words))
    if (match) {
      return {
        message: t.aiTheme(t.themeName[match.name]),
        creation: { kind: 'theme', name: match.name, theme: match.theme }
      }
    }
  }

  const values = findSliderValues(text, config)
  const apps = findApps(text, config)
  const urls = findUrls(text)
  const name = findName(input)

  // Presets: slider settings only, asked for as a mode/preset/scene
  if (hasWord(text, PRESET_WORDS) && Object.keys(values).length > 0 && apps.length === 0 && urls.length === 0) {
    return {
      message: t.aiPreset,
      creation: { kind: 'preset', preset: { name: name ?? t.aiNewPreset, values } }
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
          t.aiMyButton)
    return {
      message: steps.length === 1 ? t.aiButtonOne : t.aiButtonMany(steps.length),
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

  return { message: t.aiCantBuild, idea: true }
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
