import { useEffect, useRef, useState } from 'react'
import logo from '../assets/logo.svg'
import type { AppThemeMode } from '../appTheme'
import { LANGUAGES, type Language } from '../../../shared/config'
import { stringsFor } from '../../../shared/i18n'
import { useT } from '../i18n'

interface Props {
  themeMode: AppThemeMode
  onThemeModeChange: (mode: AppThemeMode) => void
  unsaved: boolean
  onSave: () => void
  onDiscard: () => void
  language: Language
  onLanguageChange: (language: Language) => void
}

const THEME_MODES: AppThemeMode[] = ['light', 'dark', 'system']

// How long the bar stays open after the pointer leaves it.
const CLOSE_DELAY_MS = 450

// A slim strip across the top that slides open on hover (mouse) or tap (touch).
export default function TopBar({
  themeMode,
  onThemeModeChange,
  unsaved,
  onSave,
  onDiscard,
  language,
  onLanguageChange
}: Props): React.JSX.Element {
  const t = useT()
  const themeLabel: Record<AppThemeMode, string> = { light: t.themeLight, dark: t.themeDark, system: t.themeSystem }
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
              aria-label={t.menu}
              aria-expanded={menuOpen}
              tabIndex={open ? 0 : -1}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="hamburger" />
            </button>
            {menuOpen && (
              <div className="menu" role="menu">
                <div className="menu-label">{t.appearance}</div>
                {THEME_MODES.map((mode) => (
                  <button
                    key={mode}
                    role="menuitemradio"
                    aria-checked={themeMode === mode}
                    className="menu-item"
                    onClick={() => onThemeModeChange(mode)}
                  >
                    <span className="menu-check">{themeMode === mode ? '●' : ''}</span>
                    {themeLabel[mode]}
                  </button>
                ))}
                <div className="menu-sep" />
                <div className="menu-label">{t.language}</div>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    role="menuitemradio"
                    aria-checked={language === lang}
                    className="menu-item"
                    lang={lang}
                    onClick={() => onLanguageChange(lang)}
                  >
                    <span className="menu-check">{language === lang ? '●' : ''}</span>
                    {/* each language is shown in its own language, so anyone can find theirs */}
                    {stringsFor(lang).languageName}
                  </button>
                ))}
                <div className="menu-sep" />
                <button
                  role="menuitem"
                  className="menu-item"
                  onClick={() => {
                    window.splatPad.openPretendDevice()
                    setMenuOpen(false)
                  }}
                >
                  <span className="menu-check" />
                  {t.openPretend}
                </button>
                <button
                  role="menuitem"
                  className="menu-item"
                  onClick={() => {
                    window.splatPad.showConfigFile()
                    setMenuOpen(false)
                  }}
                >
                  <span className="menu-check" />
                  {t.showSettingsFile}
                </button>
              </div>
            )}
          </div>
          <img src={logo} alt="42 Potential" className="brand-logo" />
          <span className="brand-name">Splat Pad</span>
        </div>

        <div className="topbar-right">
          {/* Update is wired up in Phase 6, once the firmware exists. */}
          <button className="btn" tabIndex={open ? 0 : -1} disabled title={t.updateTitle}>
            {t.update}
          </button>
          {unsaved && <span className="unsaved-label">{t.unsavedChanges}</span>}
          <button className="btn" tabIndex={open ? 0 : -1} disabled={!unsaved} onClick={onDiscard}>
            {t.discard}
          </button>
          <button className="btn btn-primary" tabIndex={open ? 0 : -1} onClick={onSave} title={t.saveTitle}>
            {t.save}
            {unsaved && <span className="unsaved-dot" aria-hidden />}
          </button>
        </div>
      </div>

      {/* The always-visible tab you hover or tap to open the bar. */}
      <button
        className="topbar-tab"
        aria-label={unsaved ? t.showToolbarUnsaved : t.showToolbar}
        tabIndex={open ? -1 : 0}
        onClick={() => setOpen(true)}
      >
        <img src={logo} alt="" />
        {unsaved && <span className="unsaved-dot" title={t.unsavedChanges} />}
        <span className="topbar-chevron">▾</span>
      </button>
    </div>
  )
}
