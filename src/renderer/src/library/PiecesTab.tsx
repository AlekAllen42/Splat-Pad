import { useState } from 'react'
import type { Config, WidgetType } from '../../../shared/config'
import { useT } from '../i18n'
import { Stepper } from './controls'
import { DEFAULT_WIDGET_SIZE, makeId, placeWidget, type ConfigUpdate } from './helpers'

const PIECES: WidgetType[] = ['carousel', 'clock', 'favorites', 'presets', 'controls']

const MAX_PER_TYPE = 4

export default function PiecesTab({ config, update }: { config: Config; update: ConfigUpdate }): React.JSX.Element {
  const t = useT()
  const [noRoom, setNoRoom] = useState<WidgetType | null>(null)
  const count = (type: WidgetType): number => config.layout.filter((w) => w.type === type).length

  // Adding finds an empty spot; removing takes away the most recently added one of that kind.
  const setCount = (type: WidgetType, next: number): void => {
    const current = config.layout.filter((w) => w.type === type)
    if (next > current.length) {
      const { w, h } = DEFAULT_WIDGET_SIZE[type]
      const { spot, fits } = placeWidget(config.layout, w, h)
      setNoRoom(fits ? null : type)
      update((c) => ({
        ...c,
        layout: [...c.layout, { id: makeId(type, c.layout.map((wgt) => wgt.id)), type, ...spot }]
      }))
    } else {
      const last = current[current.length - 1]
      setNoRoom(null)
      if (last) update((c) => ({ ...c, layout: c.layout.filter((w) => w.id !== last.id) }))
    }
  }

  return (
    <div className="lib-tab">
      <p className="lib-hint">{t.piecesHint}</p>
      {noRoom && <p className="lib-warning">{t.screenFull(t.widget[noRoom])}</p>}
      <ul className="lib-list">
        {PIECES.map((type) => (
          <li key={type} className="lib-piece">
            <div className="lib-piece-text">
              <strong>{t.widget[type]}</strong>
              <span>{t.widgetDesc[type]}</span>
            </div>
            <Stepper
              label={t.widget[type]}
              value={count(type)}
              min={0}
              max={MAX_PER_TYPE}
              onChange={(n) => setCount(type, n)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
