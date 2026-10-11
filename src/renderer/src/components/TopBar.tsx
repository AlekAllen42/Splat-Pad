import { useEffect, useRef, useState } from 'react'
import logo from '../assets/logo.svg'
import type { AppThemeMode } from '../appTheme'

interface Props {
  themeMode: AppThemeMode
  onThemeModeChange: (mode: AppThemeMode) => void
}

const THEME_OPTIONS: { mode: AppThemeMode; label: string }[] = [
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
  { mode: 'system', label: 'Match my computer' }
]

// How long the bar stays open after the pointer leaves it.
const CLOSE_DELAY_MS = 450

// A slim strip across the top that slides open on hover (mouse) or tap (touch).
export default function TopBar({ themeMode, onThemeModeChange }: Props): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)

  const cancelClose = (): void => window.clearTimeout(closeTimer.current)
  const scheduleClose = (): void => {
    cancelClose()
    closeTimer.current = window.setTimeout(() => {
      setOpen(false)
      setMenuOpen(false)
    }, CLOSE_DELAY_MS)
  }

  // Tapping anywhere outside the bar closes it (touchscreens have no "hover off").
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent): void => {
      if (!barRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useEffect(() => cancelClose, [])

  return (
    <div
      ref={barRef}
      className={`topbar ${open ? 'is-open' : ''}`}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') {
          cancelClose()
          setOpen(true)
        }
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') scheduleClose()
      }}
    >
      <div className="topbar-inner" aria-hidden={!open}>
        <div className="topbar-left">
          <div className="menu-anchor">
            <button
              className="icon-btn"
              aria-label="Menu"
              aria-expanded={menuOpen}
              tabIndex={open ? 0 : -1}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="hamburger" />
            </button>
            {menuOpen && (
              <div className="menu" role="menu">
                <div className="menu-label">Appearance</div>
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.mode}
                    role="menuitemradio"
                    aria-checked={themeMode === opt.mode}
                    className="menu-item"
                    onClick={() => onThemeModeChange(opt.mode)}
                  >
                    <span className="menu-check">{themeMode === opt.mode ? '●' : ''}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <img src={logo} alt="42 Potential" className="brand-logo" />
          <span className="brand-name">Splat Pad</span>
        </div>

        <div className="topbar-right">
          {/* Wired up in later steps: Update = Phase 6, Discard/Save = step 6. */}
          <button className="btn" tabIndex={open ? 0 : -1} disabled title="Available once firmware exists">
            Update
          </button>
          <button className="btn" tabIndex={open ? 0 : -1}>
            Discard
          </button>
          <button className="btn btn-primary" tabIndex={open ? 0 : -1}>
            Save
          </button>
        </div>
      </div>

      {/* The always-visible tab you hover or tap to open the bar. */}
      <button
        className="topbar-tab"
        aria-label="Show toolbar"
        tabIndex={open ? -1 : 0}
        onClick={() => setOpen(true)}
      >
        <img src={logo} alt="" />
        <span className="topbar-chevron">▾</span>
      </button>
    </div>
  )
}
