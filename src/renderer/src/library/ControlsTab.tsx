import { removeSlider, type Config, type Preset, type Slider, type SliderKind } from '../../../shared/config'
import { makeId, type ConfigUpdate } from './helpers'

const KINDS: { value: SliderKind; label: string; needsTarget?: string }[] = [
  { value: 'masterVolume', label: 'Volume' },
  { value: 'brightness', label: 'Screen brightness' },
  { value: 'appVolume', label: 'App volume', needsTarget: 'Program, e.g. spotify.exe' },
  { value: 'device', label: 'Device', needsTarget: 'Device name' }
]

export default function ControlsTab({ config, update }: { config: Config; update: ConfigUpdate }): React.JSX.Element {
  const setSlider = (next: Slider): void =>
    update((c) => ({ ...c, sliders: c.sliders.map((s) => (s.id === next.id ? next : s)) }))

  const addSlider = (): void =>
    update((c) => ({
      ...c,
      sliders: [...c.sliders, { id: makeId('volume', c.sliders.map((s) => s.id)), kind: 'masterVolume', label: 'Volume' }]
    }))

  // Also removes it from every preset and custom button.
  const removeSliderById = (id: string): void => update((c) => removeSlider(c, id))

  const setPreset = (next: Preset): void =>
    update((c) => ({ ...c, presets: c.presets.map((p) => (p.id === next.id ? next : p)) }))

  const addPreset = (): void =>
    update((c) => ({
      ...c,
      presets: [
        ...c.presets,
        {
          id: makeId('preset', c.presets.map((p) => p.id)),
          name: `Preset ${c.presets.length + 1}`,
          values: Object.fromEntries(c.sliders.map((s) => [s.id, 50]))
        }
      ]
    }))

  return (
    <div className="lib-tab">
      <section className="lib-section">
        <div className="lib-section-head">
          <h3>Sliders</h3>
          <button className="btn btn-small" onClick={addSlider}>
            + Add slider
          </button>
        </div>
        <ul className="lib-list">
          {config.sliders.map((s) => {
            const kind = KINDS.find((k) => k.value === s.kind)
            return (
              <li key={s.id} className="lib-slider">
                <input
                  className="lib-input"
                  value={s.label}
                  aria-label="Slider name"
                  onChange={(e) => setSlider({ ...s, label: e.target.value })}
                />
                <select
                  className="lib-input"
                  value={s.kind}
                  aria-label="What it controls"
                  onChange={(e) => {
                    const k = e.target.value as SliderKind
                    const needsTarget = KINDS.find((x) => x.value === k)?.needsTarget
                    setSlider({ ...s, kind: k, target: needsTarget ? (s.target ?? '') : undefined })
                  }}
                >
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
                {kind?.needsTarget ? (
                  <input
                    className="lib-input"
                    value={s.target ?? ''}
                    placeholder={kind.needsTarget}
                    aria-label={kind.needsTarget}
                    onChange={(e) => setSlider({ ...s, target: e.target.value })}
                  />
                ) : (
                  <span />
                )}
                <button className="lib-icon-btn lib-remove" aria-label={`Remove ${s.label}`} onClick={() => removeSliderById(s.id)}>
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="lib-section">
        <div className="lib-section-head">
          <h3>Presets</h3>
          <button className="btn btn-small" onClick={addPreset}>
            + Add preset
          </button>
        </div>
        <ul className="lib-list">
          {config.presets.map((p) => (
            <li key={p.id} className="lib-preset">
              <div className="lib-preset-head">
                <input
                  className="lib-input"
                  value={p.name}
                  aria-label="Preset name"
                  onChange={(e) => setPreset({ ...p, name: e.target.value })}
                />
                <button
                  className="lib-icon-btn lib-remove"
                  aria-label={`Remove ${p.name}`}
                  onClick={() => update((c) => ({ ...c, presets: c.presets.filter((x) => x.id !== p.id) }))}
                >
                  ✕
                </button>
              </div>
              {config.sliders.map((s) => {
                const set = s.id in p.values
                return (
                  <div key={s.id} className="lib-preset-value">
                    <label>
                      <input
                        type="checkbox"
                        checked={set}
                        onChange={(e) => {
                          const values = { ...p.values }
                          if (e.target.checked) values[s.id] = 50
                          else delete values[s.id]
                          setPreset({ ...p, values })
                        }}
                      />
                      {s.label}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      disabled={!set}
                      value={p.values[s.id] ?? 50}
                      aria-label={`${s.label} in ${p.name}`}
                      onChange={(e) => setPreset({ ...p, values: { ...p.values, [s.id]: Number(e.target.value) } })}
                    />
                    <span>{set ? `${p.values[s.id]}%` : '—'}</span>
                  </div>
                )
              })}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
