import type { Config } from '../../../shared/config'
import { Row, Segmented, Stepper, Toggle } from './controls'
import type { ConfigUpdate } from './helpers'

export default function OptionsTab({ config, update }: { config: Config; update: ConfigUpdate }): React.JSX.Element {
  const { clock, carousel, behavior } = config
  const setClock = (patch: Partial<Config['clock']>): void => update((c) => ({ ...c, clock: { ...c.clock, ...patch } }))
  const setCarousel = (patch: Partial<Config['carousel']>): void =>
    update((c) => ({ ...c, carousel: { ...c.carousel, ...patch } }))
  const setBehavior = (patch: Partial<Config['behavior']>): void =>
    update((c) => ({ ...c, behavior: { ...c.behavior, ...patch } }))

  return (
    <div className="lib-tab">
      <section className="lib-section">
        <h3>Clock</h3>
        <Row label="Format">
          <Segmented
            value={clock.format}
            options={[
              { value: '12h', label: '12-hour' },
              { value: '24h', label: '24-hour' }
            ]}
            onChange={(format) => setClock({ format })}
          />
        </Row>
        <Toggle label="Show seconds" checked={clock.showSeconds} onChange={(showSeconds) => setClock({ showSeconds })} />
        <Toggle label="Show date" checked={clock.showDate} onChange={(showDate) => setClock({ showDate })} />
      </section>

      <section className="lib-section">
        <h3>App carousel</h3>
        <Row label="Columns">
          <Stepper label="columns" value={carousel.columns} min={1} max={4} onChange={(columns) => setCarousel({ columns })} />
        </Row>
        <Row label="Drift speed">
          <input
            type="range"
            min={0}
            max={80}
            value={carousel.speed}
            aria-label="Drift speed"
            onChange={(e) => setCarousel({ speed: Number(e.target.value) })}
          />
          <span className="lib-value">{carousel.speed === 0 ? 'Still' : `${carousel.speed} px/s`}</span>
        </Row>
        <Row label="Direction">
          <Segmented
            value={carousel.direction}
            options={[
              { value: 'up', label: 'Up' },
              { value: 'down', label: 'Down' }
            ]}
            onChange={(direction) => setCarousel({ direction })}
          />
        </Row>
        <Row label="Resume after">
          <input
            type="range"
            min={0}
            max={10000}
            step={500}
            value={carousel.resumeDelayMs}
            aria-label="Resume drifting after"
            onChange={(e) => setCarousel({ resumeDelayMs: Number(e.target.value) })}
          />
          <span className="lib-value">{(carousel.resumeDelayMs / 1000).toFixed(1)} s</span>
        </Row>
      </section>

      <section className="lib-section">
        <h3>Extras</h3>
        <Toggle
          label='Show "Opening …" message when an app is tapped'
          checked={behavior.showOpenMessage}
          onChange={(showOpenMessage) => setBehavior({ showOpenMessage })}
        />
      </section>
    </div>
  )
}
