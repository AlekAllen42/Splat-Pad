import { useRef, useState } from 'react'
import {
  GRID,
  MIN_WIDGET_SIZE,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  type Theme,
  type Widget
} from '../../../shared/config'
import { useFitScale } from '../device/useFitScale'
import { useT } from '../i18n'
import './editor.css'

// Which edges a handle moves: n = top, s = bottom, e = right, w = left.
type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
const HANDLES: Handle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

const snap = (v: number): number => Math.round(v / GRID) * GRID
const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v))

const overlaps = (a: Widget, b: Widget): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

// Work out a piece's new position/size from how far the pointer has moved.
function applyDrag(start: Widget, mode: 'move' | Handle, dx: number, dy: number): Widget {
  if (mode === 'move') {
    return {
      ...start,
      x: clamp(snap(start.x + dx), 0, SCREEN_WIDTH - start.w),
      y: clamp(snap(start.y + dy), 0, SCREEN_HEIGHT - start.h)
    }
  }
  let left = start.x
  let top = start.y
  let right = start.x + start.w
  let bottom = start.y + start.h
  if (mode.includes('w')) left = clamp(snap(left + dx), 0, right - MIN_WIDGET_SIZE)
  if (mode.includes('e')) right = clamp(snap(right + dx), left + MIN_WIDGET_SIZE, SCREEN_WIDTH)
  if (mode.includes('n')) top = clamp(snap(top + dy), 0, bottom - MIN_WIDGET_SIZE)
  if (mode.includes('s')) bottom = clamp(snap(bottom + dy), top + MIN_WIDGET_SIZE, SCREEN_HEIGHT)
  return { ...start, x: left, y: top, w: right - left, h: bottom - top }
}

interface Props {
  layout: Widget[]
  theme: Theme
  onChange: (layout: Widget[]) => void
  onReset: () => void
}

export default function LayoutEditor({ layout, theme, onChange, onReset }: Props): React.JSX.Element {
  const t = useT()
  const [fitRef, scale] = useFitScale(SCREEN_WIDTH + 8, SCREEN_HEIGHT + 8)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const drag = useRef<{ id: string; mode: 'move' | Handle; startX: number; startY: number; start: Widget } | null>(null)

  const selected = layout.find((w) => w.id === selectedId) ?? null
  const update = (next: Widget): void => onChange(layout.map((w) => (w.id === next.id ? next : w)))
  const remove = (id: string): void => {
    onChange(layout.filter((w) => w.id !== id))
    setSelectedId(null)
  }

  const startDrag = (e: React.PointerEvent, wgt: Widget, mode: 'move' | Handle): void => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setSelectedId(wgt.id)
    drag.current = { id: wgt.id, mode, startX: e.clientX, startY: e.clientY, start: wgt }
  }

  const onPointerMove = (e: React.PointerEvent): void => {
    const d = drag.current
    if (!d) return
    const next = applyDrag(d.start, d.mode, (e.clientX - d.startX) / scale, (e.clientY - d.startY) / scale)
    const current = layout.find((w) => w.id === d.id)
    if (current && (current.x !== next.x || current.y !== next.y || current.w !== next.w || current.h !== next.h))
      update(next)
  }

  const endDrag = (): void => {
    drag.current = null
  }

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (!selected) return
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-GRID, 0],
      ArrowRight: [GRID, 0],
      ArrowUp: [0, -GRID],
      ArrowDown: [0, GRID]
    }
    if (moves[e.key]) {
      e.preventDefault()
      update(applyDrag(selected, 'move', ...moves[e.key]))
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      remove(selected.id)
    } else if (e.key === 'Escape') {
      setSelectedId(null)
    }
  }

  return (
    <div className="layout-editor" tabIndex={0} onKeyDown={onKeyDown}>
      <div ref={fitRef} className="le-fit">
        <div
          className="le-screen"
          style={
            {
              width: SCREEN_WIDTH,
              height: SCREEN_HEIGHT,
              transform: `translate(-50%, -50%) scale(${scale})`,
              background: theme.background,
              '--grid': `${GRID}px`,
              '--grid-line': theme.text
            } as React.CSSProperties
          }
          onPointerDown={() => setSelectedId(null)}
        >
          {layout.map((wgt) => {
            const clash = layout.some((o) => o.id !== wgt.id && overlaps(wgt, o))
            const isSel = wgt.id === selectedId
            return (
              <div
                key={wgt.id}
                className={`le-box ${isSel ? 'is-selected' : ''} ${clash ? 'is-clash' : ''}`}
                style={{ left: wgt.x, top: wgt.y, width: wgt.w, height: wgt.h }}
                onPointerDown={(e) => startDrag(e, wgt, 'move')}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              >
                <span className="le-box-name">{t.widget[wgt.type]}</span>
                <span className="le-box-size">
                  {wgt.w} × {wgt.h}
                </span>
                {isSel &&
                  HANDLES.map((h) => (
                    <span
                      key={h}
                      className={`le-handle le-handle-${h}`}
                      onPointerDown={(e) => startDrag(e, wgt, h)}
                      onPointerMove={onPointerMove}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                    />
                  ))}
              </div>
            )
          })}
        </div>
      </div>

      <div className="le-toolbar">
        {selected ? (
          <>
            <strong>{t.widget[selected.type]}</strong>
            <span className="le-readout">
              x {selected.x} · y {selected.y} · {selected.w} × {selected.h}
            </span>
            <button className="btn btn-small" onClick={() => remove(selected.id)}>
              {t.remove}
            </button>
          </>
        ) : (
          <span className="le-hint">{t.layoutHint}</span>
        )}
        <button className="btn btn-small le-reset" onClick={onReset}>
          {t.resetLayout}
        </button>
      </div>
    </div>
  )
}
