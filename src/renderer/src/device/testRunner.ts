import type { AppTile, Config, Slider } from '../../../shared/config'
import type { Strings } from '../../../shared/i18n'

// Test mode: performs a tile's action on this PC and returns short messages
// describing what happened, for the live screen to show.

const MAX_DEPTH = 3 // custom buttons can open other buttons; stop runaway loops

export async function runSlider(slider: Slider, value: number, t: Strings): Promise<string> {
  switch (slider.kind) {
    case 'masterVolume':
      return (await window.splatPad.setVolume(value)) ? t.volumeSet(value) : t.volumeFailed
    case 'brightness': {
      const r = await window.splatPad.setBrightness(value)
      return r.laptop + r.external > 0 ? t.brightnessSet(value) : t.brightnessFailed
    }
    case 'appVolume': {
      const r = await window.splatPad.setAppVolume(slider.target ?? '', value)
      if (r === 'set') return t.appVolumeSet(slider.label, value)
      if (r === 'remembered') return t.appVolumeRemembered(slider.label, value)
      return t.appVolumeInvalid(slider.label)
    }
    case 'device':
      return t.phase3Slider(slider.label, value)
  }
}

// Current PC level for a slider, to start the on-screen slider from it.
export async function readSlider(slider: Slider): Promise<number | null> {
  switch (slider.kind) {
    case 'masterVolume':
      return window.splatPad.getVolume()
    case 'brightness':
      return window.splatPad.getBrightness()
    case 'appVolume':
      return slider.target ? window.splatPad.getAppVolume(slider.target) : null
    default:
      return null
  }
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
