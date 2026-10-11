import { useEffect, useMemo, useRef, useState } from 'react'
import { tileShapeOf, type AppTile, type CarouselSettings, type TileSettings } from '../../../shared/config'
import Tile from './Tile'
import { packRows } from './packRows'

interface Props {
  apps: AppTile[]
  tiles: TileSettings
  settings: CarouselSettings
  width: number
  height: number
  scale: number // how much the preview is shrunk on the PC screen; pointer moves are divided by it
  onTap: (app: AppTile) => void
}

const GAP = 12
const TAP_SLOP = 6 // a press that moves less than this (screen px) counts as a tap, not a scroll

// App tiles in an endless loop that slowly drifts. Drag or use the mouse wheel
// to scroll; drifting pauses and resumes after `resumeDelayMs`.
export default function Carousel({ apps, tiles, settings, width, height, scale, onTap }: Props): React.JSX.Element {
  const { columns, speed, direction, resumeDelayMs } = settings
  const tile = Math.max(20, Math.floor((width - GAP * (columns + 1)) / columns))
  // every row full: the list wraps around to fill gaps (see packRows)
  const rows = useMemo(
    () => packRows(apps, (a) => (tileShapeOf(a, tiles) === 'rectangle' ? 2 : 1), columns),
    [apps, tiles, columns]
  )
  const loopHeight = rows.length * (tile + GAP) // height of one full copy of the tiles
  // enough copies to always cover the visible area while wrapping around
  const copies = loopHeight > 0 ? Math.ceil(height / loopHeight) + 1 : 0

  const trackRef = useRef<HTMLDivElement>(null)
  const offset = useRef(0)
  const pausedUntil = useRef(0)
  const drag = useRef<{ startY: number; lastY: number; moved: boolean; app?: AppTile } | null>(null)
  const [pressedId, setPressedId] = useState<string | null>(null)

  const wrap = (v: number): number => (loopHeight > 0 ? ((v % loopHeight) + loopHeight) % loopHeight : 0)
  const paint = (): void => {
    if (trackRef.current) trackRef.current.style.transform = `translateY(${-wrap(offset.current)}px)`
  }
  const pause = (): void => {
    pausedUntil.current = Infinity
  }
  const resumeLater = (): void => {
    pausedUntil.current = performance.now() + resumeDelayMs
  }

  // The drift animation: runs every frame, nudging the offset.
  useEffect(() => {
    let frame = 0
    let last = performance.now()
    const tick = (now: number): void => {
      const dt = (now - last) / 1000
      last = now
      if (now >= pausedUntil.current && speed > 0) {
        offset.current += speed * dt * (direction === 'up' ? 1 : -1)
        paint()
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [speed, direction, loopHeight])

  useEffect(paint, [loopHeight])

  const appAt = (target: EventTarget): AppTile | undefined => {
    const id = (target as HTMLElement).closest<HTMLElement>('[data-app-id]')?.dataset.appId
    return apps.find((a) => a.id === id)
  }

  return (
    <div
      className="dev-carousel"
      style={{ width, height }}
      onWheel={(e) => {
        offset.current += e.deltaY / scale
        paint()
        resumeLater()
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        const app = appAt(e.target)
        drag.current = { startY: e.clientY, lastY: e.clientY, moved: false, app }
        setPressedId(app?.id ?? null)
        pause()
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d) return
        if (Math.abs(e.clientY - d.startY) > TAP_SLOP) {
          d.moved = true
          setPressedId(null)
        }
        offset.current -= (e.clientY - d.lastY) / scale
        d.lastY = e.clientY
        paint()
      }}
      onPointerUp={() => {
        const d = drag.current
        if (d && !d.moved && d.app) onTap(d.app)
        drag.current = null
        setPressedId(null)
        resumeLater()
      }}
      onPointerCancel={() => {
        drag.current = null
        setPressedId(null)
        resumeLater()
      }}
    >
      <div ref={trackRef} className="dev-carousel-track">
        {Array.from({ length: copies }, (_, copy) => (
          <div
            key={copy}
            className="dev-carousel-grid"
            style={{
              gridTemplateColumns: `repeat(${columns}, ${tile}px)`,
              gap: GAP,
              padding: `${GAP / 2}px ${GAP}px`
            }}
          >
            {rows.flatMap((row, r) =>
              row.map((slot, i) =>
                slot.item ? (
                  <div key={`${r}-${i}`} data-app-id={slot.item.id} style={{ gridColumn: `span ${slot.span}` }}>
                    <Tile
                      app={slot.item}
                      size={tile}
                      gap={GAP}
                      shape={tileShapeOf(slot.item, tiles)}
                      style={tiles.style}
                      boxed={tiles.showBoxes}
                      pressed={pressedId === slot.item.id}
                    />
                  </div>
                ) : (
                  <div key={`${r}-${i}`} style={{ gridColumn: `span ${slot.span}` }} />
                )
              )
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
