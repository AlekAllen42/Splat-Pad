import { useEffect, useRef, useState } from 'react'
import type { AppTile, ClockSettings, Preset, Slider } from '../../../shared/config'
import Tile from './Tile'

// ---------- Clock ----------

function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

export function Clock({ settings, w, h }: { settings: ClockSettings; w: number; h: number }): React.JSX.Element {
  const now = useNow(1000)
  const hours = settings.format === '24h' ? now.getHours() : now.getHours() % 12 || 12
  const pad = (n: number): string => String(n).padStart(2, '0')
  const time =
    `${settings.format === '24h' ? pad(hours) : hours}:${pad(now.getMinutes())}` +
    (settings.showSeconds ? `:${pad(now.getSeconds())}` : '')
  const ampm = settings.format === '12h' ? (now.getHours() < 12 ? 'AM' : 'PM') : ''
  const date = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  // Size the digits to fit the box: limited by both height and width.
  const chars = time.length + (ampm ? 1.2 : 0)
  const timeSize = Math.min(h * (settings.showDate ? 0.6 : 0.8), w / (chars * 0.56))

  return (
    <div className="dev-clock">
      <div className="dev-clock-time" style={{ fontSize: timeSize }}>
        {time}
        {ampm && <span className="dev-clock-ampm">{ampm}</span>}
      </div>
      {settings.showDate && (
        <div className="dev-clock-date" style={{ fontSize: Math.max(14, timeSize * 0.24) }}>
          {date}
        </div>
      )}
    </div>
  )
}

// ---------- Favorites ----------

export function Favorites({
  apps,
  w,
  h,
  pressedId,
  onPress
}: {
  apps: AppTile[]
  w: number
  h: number
  pressedId: string | null
  onPress: (app: AppTile) => void
}): React.JSX.Element {
  const gap = 12
  const n = Math.max(1, apps.length)
  const size = Math.max(20, Math.floor(Math.min(h, (w - gap * (n - 1)) / n)))
  return (
    <div className="dev-favorites" style={{ gap }}>
      {apps.length === 0 && <span className="dev-empty">No favorites yet</span>}
      {apps.map((app) => (
        <button key={app.id} className="dev-plain" onClick={() => onPress(app)}>
          <Tile app={app} size={size} pressed={pressedId === app.id} />
        </button>
      ))}
    </div>
  )
}

// ---------- Presets ----------

export function Presets({
  presets,
  activeId,
  onApply
}: {
  presets: Preset[]
  activeId: string | null
  onApply: (preset: Preset) => void
}): React.JSX.Element {
  return (
    <div className="dev-presets">
      <div className="dev-label">Presets</div>
      <div className="dev-presets-list">
        {presets.length === 0 && <span className="dev-empty">No presets yet</span>}
        {presets.map((p) => (
          <button
            key={p.id}
            className={`dev-btn ${activeId === p.id ? 'is-active' : ''}`}
            onClick={() => onApply(p)}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------- Sliders button + panel ----------

function SlidersIcon({ size }: { size: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="9" cy="6" r="2.4" fill="currentColor" />
      <circle cx="15" cy="12" r="2.4" fill="currentColor" />
      <circle cx="7" cy="18" r="2.4" fill="currentColor" />
    </svg>
  )
}

export function ControlsButton({ w, h, onOpen }: { w: number; h: number; onOpen: () => void }): React.JSX.Element {
  return (
    <button className="dev-btn dev-controls" onClick={onOpen} aria-label="Show sliders">
      <SlidersIcon size={Math.min(w, h) * 0.45} />
    </button>
  )
}

function SliderRow({
  slider,
  value,
  onChange
}: {
  slider: Slider
  value: number
  onChange: (v: number) => void
}): React.JSX.Element {
  const trackRef = useRef<HTMLDivElement>(null)
  // getBoundingClientRect already includes the preview's scaling, so no math needed for it.
  const setFromPointer = (clientX: number): void => {
    const r = trackRef.current!.getBoundingClientRect()
    onChange(Math.round(Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * 100))
  }
  return (
    <div className="dev-slider">
      <span className="dev-slider-label">{slider.label}</span>
      <div
        ref={trackRef}
        className="dev-slider-track"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          setFromPointer(e.clientX)
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromPointer(e.clientX)
        }}
      >
        <div className="dev-slider-fill" style={{ width: `${value}%` }} />
        <div className="dev-slider-knob" style={{ left: `${value}%` }} />
      </div>
      <span className="dev-slider-value">{value}%</span>
    </div>
  )
}

export function SliderPanel({
  open,
  sliders,
  values,
  onChange,
  onClose
}: {
  open: boolean
  sliders: Slider[]
  values: Record<string, number>
  onChange: (id: string, v: number) => void
  onClose: () => void
}): React.JSX.Element {
  return (
    <>
      <div className={`dev-scrim ${open ? 'is-open' : ''}`} onClick={onClose} />
      <div className={`dev-slider-panel ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <div className="dev-slider-panel-head">
          <span className="dev-label">Controls</span>
          <button className="dev-btn dev-close" onClick={onClose} aria-label="Hide sliders">
            ✕
          </button>
        </div>
        {sliders.length === 0 && <span className="dev-empty">No sliders yet</span>}
        {sliders.map((s) => (
          <SliderRow key={s.id} slider={s} value={values[s.id] ?? 50} onChange={(v) => onChange(s.id, v)} />
        ))}
      </div>
    </>
  )
}
