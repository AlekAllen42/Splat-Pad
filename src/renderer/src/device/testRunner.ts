import type { AppTile, Config, Slider } from '../../../shared/config'

// Test mode: performs a tile's action on this PC and returns short messages
// describing what happened, for the live screen to show.

const MAX_DEPTH = 3 // custom buttons can open other buttons; stop runaway loops

export async function runSlider(slider: Slider, value: number): Promise<string> {
  if (slider.kind === 'masterVolume') {
    return (await window.splatPad.setVolume(value)) ? `Volume ${value}%` : 'Couldn’t change the volume'
  }
  return `${slider.label} → ${value}% (real control comes in Phase 3)`
}

export async function runApp(app: AppTile, config: Config, depth = 0): Promise<string[]> {
  if (depth > MAX_DEPTH) return ['Stopped: buttons opening each other too deeply']
  const action = app.action
  switch (action.type) {
    case 'none':
      return [`${app.name} isn’t linked to a program yet`]
    case 'launch':
    case 'url': {
      const r = await window.splatPad.testOpen(action.type, action.target)
      return [r.ok ? `Opened ${app.name}` : `Couldn’t open ${app.name}: ${r.error ?? 'unknown error'}`]
    }
    case 'macro': {
      const messages: string[] = []
      for (const step of action.steps) {
        if (step.type === 'openApp') {
          const target = config.apps.find((a) => a.id === step.appId)
          messages.push(...(target ? await runApp(target, config, depth + 1) : ['A step’s app was removed']))
        } else if (step.type === 'url') {
          const r = await window.splatPad.testOpen('url', step.target)
          messages.push(r.ok ? `Opened ${step.target.replace(/^https?:\/\/(www\.)?/i, '')}` : `Couldn’t open ${step.target}`)
        } else {
          const slider = config.sliders.find((s) => s.id === step.sliderId)
          if (slider) messages.push(await runSlider(slider, step.value))
        }
      }
      return messages
    }
  }
}
