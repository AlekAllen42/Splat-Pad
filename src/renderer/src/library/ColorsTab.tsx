import type { Config, Theme } from '../../../shared/config'
import { ColorInput } from './controls'
import type { ConfigUpdate } from './helpers'

const THEMES: { name: string; theme: Theme }[] = [
  { name: 'Paper', theme: { background: '#f6f3ec', surface: '#efe8d9', accent: '#e2562c', text: '#1b1711' } },
  { name: 'Ink', theme: { background: '#15120e', surface: '#26211a', accent: '#ec6a40', text: '#f1eadf' } },
  { name: 'Midnight', theme: { background: '#0f1115', surface: '#1c2029', accent: '#4f8cff', text: '#f2f3f5' } },
  { name: 'Mint', theme: { background: '#eef6f1', surface: '#d9ece1', accent: '#1f8a5b', text: '#11231a' } },
  { name: 'Grape', theme: { background: '#1a1325', surface: '#2a1f3d', accent: '#c084fc', text: '#f4eefc' } },
  { name: 'Sunset', theme: { background: '#fff4e6', surface: '#ffe0bd', accent: '#d9480f', text: '#3b1d0b' } }
]

const FIELDS: { key: keyof Theme; label: string; hint: string }[] = [
  { key: 'background', label: 'Background', hint: 'Behind everything' },
  { key: 'surface', label: 'Panels', hint: 'Buttons and slider tracks' },
  { key: 'accent', label: 'Accent', hint: 'Highlights and slider fill' },
  { key: 'text', label: 'Text & outlines', hint: 'Words, borders and shadows' }
]

const same = (a: Theme, b: Theme): boolean => FIELDS.every(({ key }) => a[key].toLowerCase() === b[key].toLowerCase())

export default function ColorsTab({ config, update }: { config: Config; update: ConfigUpdate }): React.JSX.Element {
  const setTheme = (theme: Theme): void => update((c) => ({ ...c, theme }))
  return (
    <div className="lib-tab">
      <section className="lib-section">
        <h3>Themes</h3>
        <div className="lib-themes">
          {THEMES.map(({ name, theme }) => (
            <button
              key={name}
              className={`lib-theme ${same(theme, config.theme) ? 'is-on' : ''}`}
              onClick={() => setTheme(theme)}
            >
              <span className="lib-theme-preview" style={{ background: theme.background, borderColor: theme.text }}>
                <span style={{ background: theme.surface, borderColor: theme.text }} />
                <span style={{ background: theme.accent }} />
              </span>
              {name}
            </button>
          ))}
        </div>
      </section>

      <section className="lib-section">
        <h3>Custom colors</h3>
        <ul className="lib-list">
          {FIELDS.map(({ key, label, hint }) => (
            <li key={key} className="lib-color-row">
              <ColorInput label={label} value={config.theme[key]} onChange={(v) => setTheme({ ...config.theme, [key]: v })} />
              <div>
                <strong>{label}</strong>
                <span>{hint}</span>
              </div>
              <code>{config.theme[key]}</code>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
