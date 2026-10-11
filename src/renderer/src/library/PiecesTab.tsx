import { useState } from 'react'
import type { Config, WidgetType } from '../../../shared/config'
import { WIDGET_NAMES } from '../editor/LayoutEditor'
import { Stepper } from './controls'
import { DEFAULT_WIDGET_SIZE, makeId, placeWidget, type ConfigUpdate } from './helpers'

const PIECES: { type: WidgetType; description: string }[] = [
  { type: 'carousel', description: 'Your apps, drifting in a loop' },
  { type: 'clock', description: 'Time and date' },
  { type: 'favorites', description: 'Big buttons for your ★ apps' },
  { type: 'presets', description: 'One-tap slider settings' },
  { type: 'controls', description: 'Opens the sliders panel' }
]

const MAX_PER_TYPE = 4

export default function PiecesTab({ config, update }: { config: Config; update: ConfigUpdate }): React.JSX.Element {
  const [noRoom, setNoRoom] = useState<string | null>(null)
  const count = (type: WidgetType): number => config.layout.filter((w) => w.type === type).length

  // Adding finds an empty spot; removing takes away the most recently added one of that kind.
  const setCount = (type: WidgetType, next: number): void => {
    const current = config.layout.filter((w) => w.type === type)
    if (next > current.length) {
      const { w, h } = DEFAULT_WIDGET_SIZE[type]
      const { spot, fits } = placeWidget(config.layout, w, h)
      setNoRoom(fits ? null : WIDGET_NAMES[type])
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
      <p className="lib-hint">
        Choose how many of each piece is on the screen. New pieces go in an empty spot; arrange them in the Layout panel.
      </p>
      {noRoom && (
        <p className="lib-warning">
          The screen is full, so the new {noRoom} was placed in the top-left corner on top of something (shown in red).
          Move or shrink pieces in the Layout panel to make room.
        </p>
      )}
      <ul className="lib-list">
        {PIECES.map((p) => (
          <li key={p.type} className="lib-piece">
            <div className="lib-piece-text">
              <strong>{WIDGET_NAMES[p.type]}</strong>
              <span>{p.description}</span>
            </div>
            <Stepper
              label={WIDGET_NAMES[p.type]}
              value={count(p.type)}
              min={0}
              max={MAX_PER_TYPE}
              onChange={(n) => setCount(p.type, n)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
