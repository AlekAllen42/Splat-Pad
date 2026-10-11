import type { Config, TileShape } from '../../../shared/config'
import { Row, Segmented, Stepper, Toggle } from './controls'
import type { ConfigUpdate } from './helpers'
import { useT } from '../i18n'

const SHAPES: TileShape[] = ['square', 'circle', 'rectangle']
const randomShape = (): TileShape => SHAPES[Math.floor(Math.random() * SHAPES.length)]

export default function OptionsTab({ config, update }: { config: Config; update: ConfigUpdate }): React.JSX.Element {
  const t = useT()
  const { clock, carousel, behavior } = config
  const setClock = (patch: Partial<Config['clock']>): void => update((c) => ({ ...c, clock: { ...c.clock, ...patch } }))
  const setCarousel = (patch: Partial<Config['carousel']>): void =>
    update((c) => ({ ...c, carousel: { ...c.carousel, ...patch } }))
  const setBehavior = (patch: Partial<Config['behavior']>): void =>
    update((c) => ({ ...c, behavior: { ...c.behavior, ...patch } }))

  return (
    <div className="lib-tab">
      <section className="lib-section">
        <h3>{t.appTiles}</h3>
        <Row label={t.show}>
          <Segmented
            value={config.tiles.style}
            options={[
              { value: 'imageName', label: t.styleImageName },
              { value: 'image', label: t.styleImage },
              { value: 'letterName', label: t.styleLetterName }
            ]}
            onChange={(style) => update((c) => ({ ...c, tiles: { ...c.tiles, style } }))}
          />
        </Row>
        <Row label={t.shape}>
          <Segmented
            value={config.tiles.shape}
            options={[
              { value: 'square', label: t.shapeName.square },
              { value: 'circle', label: t.shapeName.circle },
              { value: 'rectangle', label: t.shapeName.rectangle },
              { value: 'mixed', label: t.shapeMixed }
            ]}
            onChange={(shape) =>
              update((c) => ({
                ...c,
                tiles: { ...c.tiles, shape },
                // Mixed gives every app a random shape (again on each click); the
                // user can then change any app's shape in the Apps tab.
                apps: shape === 'mixed' ? c.apps.map((a) => ({ ...a, shape: randomShape() })) : c.apps
              }))
            }
          />
        </Row>
        {config.tiles.shape === 'mixed' && (
          <p className="lib-hint">{t.mixedHint}</p>
        )}
        {config.tiles.shape === 'rectangle' && <p className="lib-hint">{t.rectangleHint}</p>}
        <Row label={t.tileBoxes}>
          <Segmented
            value={config.tiles.showBoxes ? 'show' : 'hide'}
            options={[
              { value: 'show', label: t.show },
              { value: 'hide', label: t.hide }
            ]}
            onChange={(v) => update((c) => ({ ...c, tiles: { ...c.tiles, showBoxes: v === 'show' } }))}
          />
        </Row>
        <p className="lib-hint">{t.tilesHint}</p>
      </section>

      <section className="lib-section">
        <h3>{t.clock}</h3>
        <Row label={t.format}>
          <Segmented
            value={clock.format}
            options={[
              { value: '12h', label: t.hour12 },
              { value: '24h', label: t.hour24 }
            ]}
            onChange={(format) => setClock({ format })}
          />
        </Row>
        <Toggle label={t.showSeconds} checked={clock.showSeconds} onChange={(showSeconds) => setClock({ showSeconds })} />
        <Toggle label={t.showDate} checked={clock.showDate} onChange={(showDate) => setClock({ showDate })} />
        <Toggle label={t.showLogo} checked={clock.showLogo} onChange={(showLogo) => setClock({ showLogo })} />
      </section>

      <section className="lib-section">
        <h3>{t.appCarousel}</h3>
        <Row label={t.columns}>
          <Stepper label={t.columnsWord} value={carousel.columns} min={1} max={4} onChange={(columns) => setCarousel({ columns })} />
        </Row>
        <Row label={t.driftSpeed}>
          <input
            type="range"
            min={0}
            max={80}
            value={carousel.speed}
            aria-label={t.driftSpeed}
            onChange={(e) => setCarousel({ speed: Number(e.target.value) })}
          />
          <span className="lib-value">{carousel.speed === 0 ? t.still : `${carousel.speed} px/s`}</span>
        </Row>
        <Row label={t.direction}>
          <Segmented
            value={carousel.direction}
            options={[
              { value: 'up', label: t.up },
              { value: 'down', label: t.down }
            ]}
            onChange={(direction) => setCarousel({ direction })}
          />
        </Row>
        <Row label={t.resumeAfter}>
          <input
            type="range"
            min={0}
            max={10000}
            step={500}
            value={carousel.resumeDelayMs}
            aria-label={t.resumeAfterLabel}
            onChange={(e) => setCarousel({ resumeDelayMs: Number(e.target.value) })}
          />
          <span className="lib-value">{(carousel.resumeDelayMs / 1000).toFixed(1)} s</span>
        </Row>
      </section>

      <section className="lib-section">
        <h3>{t.extras}</h3>
        <Toggle
          label={t.openMessageOption}
          checked={behavior.showOpenMessage}
          onChange={(showOpenMessage) => setBehavior({ showOpenMessage })}
        />
      </section>
    </div>
  )
}
