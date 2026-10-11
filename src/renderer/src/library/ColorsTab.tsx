import type { Config, Theme } from '../../../shared/config'
import { ColorInput, Toggle } from './controls'
import type { ConfigUpdate } from './helpers'
import { useT } from '../i18n'
import type { Strings } from '../../../shared/i18n'

const THEMES: { name: keyof Strings['themeName']; theme: Theme }[] = [
  { name: 'Paper', theme: { background: '#f6f3ec', surface: '#efe8d9', accent: '#e2562c', text: '#1b1711' } },
  { name: 'Ink', theme: { background: '#15120e', surface: '#26211a', accent: '#ec6a40', text: '#f1eadf' } },
  { name: 'Midnight', theme: { background: '#0f1115', surface: '#1c2029', accent: '#4f8cff', text: '#f2f3f5' } },
  { name: 'Mint', theme: { background: '#eef6f1', surface: '#d9ece1', accent: '#1f8a5b', text: '#11231a' } },
  { name: 'Grape', theme: { background: '#1a1325', surface: '#2a1f3d', accent: '#c084fc', text: '#f4eefc' } },
  { name: 'Sunset', theme: { background: '#fff4e6', surface: '#ffe0bd', accent: '#d9480f', text: '#3b1d0b' } }
]

// label/hint are keys into the translations
const FIELDS: { key: keyof Theme; label: keyof Strings; hint: keyof Strings }[] = [
  { key: 'accent', label: 'colorAccent', hint: 'colorAccentHint' },
  { key: 'background', label: 'colorBackground', hint: 'colorBackgroundHint' },
  { key: 'surface', label: 'colorSurface', hint: 'colorSurfaceHint' },
  { key: 'text', label: 'colorText', hint: 'colorTextHint' }
]

const same = (a: Theme, b: Theme): boolean => FIELDS.every(({ key }) => a[key].toLowerCase() === b[key].toLowerCase())

type ClockColorKey = 'timeColor' | 'dateColor' | 'ampmColor'

// One clock color row: picker, name, and "Reset" back to the theme color.
function ClockColorRow({
  label,
  hint,
  value,
  fallback,
  onChange
}: {
  label: string
  hint: string
  value: string | undefined
  fallback: string
  onChange: (v: string | undefined) => void
}): React.JSX.Element {
  const t = useT()
  return (
    <li className="lib-color-row">
      <ColorInput label={label} value={value ?? fallback} onChange={onChange} />
      <div>
        <strong>{label}</strong>
        <span>{value ? hint : t.usingTheme(hint)}</span>
      </div>
      {value && (
        <button className="btn btn-small" onClick={() => onChange(undefined)}>
          {t.reset}
        </button>
      )}
    </li>
  )
}

export default function ColorsTab({ config, update }: { config: Config; update: ConfigUpdate }): React.JSX.Element {
  const t = useT()
  const text = (key: keyof Strings): string => t[key] as string
  const setTheme = (theme: Theme): void => update((c) => ({ ...c, theme }))
  const { clock, theme } = config
  const setClockColor = (key: ClockColorKey, value: string | undefined): void =>
    update((c) => {
      const next = { ...c.clock, [key]: value }
      if (value === undefined) delete next[key] // missing = use the theme color
      return { ...c, clock: next }
    })
  // "Separate" mode is on when a date or AM/PM color has been chosen.
  const separate = clock.dateColor !== undefined || clock.ampmColor !== undefined
  return (
    <div className="lib-tab">
      <section className="lib-section">
        <h3>{t.themes}</h3>
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
              {t.themeName[name]}
            </button>
          ))}
        </div>
      </section>

      <section className="lib-section">
        <h3>{t.customColors}</h3>
        <ul className="lib-list">
          {FIELDS.map(({ key, label, hint }) => (
            <li key={key} className="lib-color-row">
              <ColorInput label={text(label)} value={config.theme[key]} onChange={(v) => setTheme({ ...config.theme, [key]: v })} />
              <div>
                <strong>{text(label)}</strong>
                <span>{text(hint)}</span>
              </div>
              <code>{config.theme[key]}</code>
            </li>
          ))}
        </ul>
      </section>

      <section className="lib-section">
        <h3>{t.clock}</h3>
        <ul className="lib-list">
          <ClockColorRow
            label={t.colorTime}
            hint={t.colorTimeHint}
            value={clock.timeColor}
            fallback={theme.text}
            onChange={(v) => setClockColor('timeColor', v)}
          />
        </ul>
        <Toggle
          label={t.separateClockColors}
          checked={separate}
          onChange={(on) =>
            update((c) => {
              const next = { ...c.clock }
              if (on) {
                // start from what they look like now
                next.dateColor = c.theme.text
                next.ampmColor = c.theme.accent
              } else {
                delete next.dateColor
                delete next.ampmColor
              }
              return { ...c, clock: next }
            })
          }
        />
        {separate ? (
          <ul className="lib-list">
            <ClockColorRow
              label={t.colorDate}
              hint={t.colorDateHint}
              value={clock.dateColor}
              fallback={theme.text}
              onChange={(v) => setClockColor('dateColor', v)}
            />
            <ClockColorRow
              label={t.colorAmpm}
              hint={t.colorAmpmHint}
              value={clock.ampmColor}
              fallback={theme.accent}
              onChange={(v) => setClockColor('ampmColor', v)}
            />
          </ul>
        ) : (
          <p className="lib-hint">{t.clockColorsDefault}</p>
        )}
      </section>
    </div>
  )
}
