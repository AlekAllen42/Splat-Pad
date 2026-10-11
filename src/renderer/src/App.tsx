import { DEFAULT_CONFIG, validateConfig } from '../../shared/config'

// Temporary screen for Step 2: shows the default settings so you can see
// what's customizable. Step 3 replaces this with the device preview.
export default function App(): React.JSX.Element {
  const check = validateConfig(DEFAULT_CONFIG)
  const c = DEFAULT_CONFIG

  return (
    <main className="placeholder">
      <h1>Control Pad</h1>
      <p className={check.ok ? 'good' : 'bad'}>
        Default settings: {check.ok ? 'valid' : check.errors.join('; ')}
      </p>

      <h2>Theme</h2>
      <div className="row">
        {Object.entries(c.theme).map(([name, color]) => (
          <div key={name} className="swatch">
            <span style={{ background: color }} />
            {name}
          </div>
        ))}
      </div>

      <h2>Apps ({c.apps.length})</h2>
      <div className="row">
        {c.apps.map((app) => (
          <div key={app.id} className="tile" style={{ background: app.color }}>
            {app.name}
          </div>
        ))}
      </div>

      <h2>Sliders</h2>
      <p>{c.sliders.map((s) => s.label).join(', ')}</p>

      <h2>Presets</h2>
      <p>{c.presets.map((p) => p.name).join(', ')}</p>

      <h2>Carousel</h2>
      <p>
        {c.carousel.columns} columns, drifting {c.carousel.direction} at {c.carousel.speed} px/s
      </p>
    </main>
  )
}
