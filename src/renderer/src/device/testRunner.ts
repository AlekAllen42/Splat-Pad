import type { AppTile, Config, Slider } from '../../../shared/config'
import type { Strings } from '../../../shared/i18n'

// Test mode: performs a tile's action on this PC and returns short messages
// describing what happened, for the live screen to show.

const MAX_DEPTH = 3 // custom buttons can open other buttons; stop runaway loops

export async function runSlider(slider: Slider, value: number, t: Strings): Promise<string> {
  if (slider.kind === 'masterVolume') {
    return (await window.splatPad.setVolume(value)) ? t.volumeSet(value) : t.volumeFailed
  }
  return t.phase3Slider(slider.label, value)
}

export async function runApp(app: AppTile, config: Config, t: Strings, depth = 0): Promise<string[]> {
  if (depth > MAX_DEPTH) return [t.tooDeep]
  const action = app.action
  switch (action.type) {
    case 'none':
      return [t.notLinked(app.name)]
    case 'launch':
    case 'url': {
      const r = await window.splatPad.testOpen(action.type, action.target)
      return [r.ok ? t.opened(app.name) : t.couldntOpen(app.name, r.error ?? t.unknownError)]
    }
    case 'macro': {
      const messages: string[] = []
      for (const step of action.steps) {
        if (step.type === 'openApp') {
          const target = config.apps.find((a) => a.id === step.appId)
          messages.push(...(target ? await runApp(target, config, t, depth + 1) : [t.stepAppRemoved]))
        } else if (step.type === 'url') {
          const r = await window.splatPad.testOpen('url', step.target)
          messages.push(
            r.ok
              ? t.opened(step.target.replace(/^https?:\/\/(www\.)?/i, ''))
              : t.couldntOpen(step.target, t.unknownError)
          )
        } else {
          const slider = config.sliders.find((s) => s.id === step.sliderId)
          if (slider) messages.push(await runSlider(slider, step.value, t))
        }
      }
      return messages
    }
  }
}
