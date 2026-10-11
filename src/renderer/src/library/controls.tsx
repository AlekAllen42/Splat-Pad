// Small form controls shared by the Library tabs.

export function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}): React.JSX.Element {
  return (
    <label className="lib-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="lib-toggle-track" aria-hidden />
      <span>{label}</span>
    </label>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}): React.JSX.Element {
  return (
    <div className="lib-segmented" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'is-on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stepper({
  value,
  min,
  max,
  onChange,
  label
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  label: string
}): React.JSX.Element {
  return (
    <div className="lib-stepper" aria-label={label}>
      <button aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <span>{value}</span>
      <button aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  )
}

export function ColorInput({
  value,
  onChange,
  label
}: {
  value: string
  onChange: (v: string) => void
  label: string
}): React.JSX.Element {
  return (
    <label className="lib-color" title={label}>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
      <span className="lib-color-swatch" style={{ background: value }} />
    </label>
  )
}

export function Row({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="lib-row">
      <span className="lib-row-label">{label}</span>
      <div className="lib-row-control">{children}</div>
    </div>
  )
}
