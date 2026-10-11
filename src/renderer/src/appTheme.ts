import { useEffect, useState } from 'react'

// The app window's own look (not the device screen's colors, which live in
// the settings file). Remembered per computer in browser storage.
export type AppThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'splatpad.appTheme'

function loadMode(): AppThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch {
    // storage unavailable; fall back to the default
  }
  return 'system'
}

export function useAppTheme(): [AppThemeMode, (mode: AppThemeMode) => void] {
  const [mode, setMode] = useState<AppThemeMode>(loadMode)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (): void => {
      const dark = mode === 'dark' || (mode === 'system' && media.matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    }
    apply()
    media.addEventListener('change', apply)
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // not fatal; the choice just won't be remembered
    }
    return () => media.removeEventListener('change', apply)
  }, [mode])

  return [mode, setMode]
}
