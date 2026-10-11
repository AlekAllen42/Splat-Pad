import { app, ipcMain } from 'electron'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { getPrefs, setPrefs } from './prefs'

// Start with Windows (or Linux login), opening hidden in the tray.
// Only in the installed app: while developing, the "app" is Electron itself
// running our code, and registering that would be wrong.

export const HIDDEN_ARG = '--hidden' // started at login: stay in the tray

export const autostartAvailable = (): boolean =>
  app.isPackaged && (process.platform === 'win32' || (process.platform === 'linux' && !!process.env.APPIMAGE))

const linuxEntry = (): string => join(homedir(), '.config', 'autostart', 'splat-pad.desktop')

export function isAutostartOn(): boolean {
  if (!autostartAvailable()) return false
  if (process.platform === 'linux') return existsSync(linuxEntry())
  return app.getLoginItemSettings({ args: [HIDDEN_ARG] }).openAtLogin
}

export function setAutostart(on: boolean): void {
  if (!autostartAvailable()) return
  if (process.platform === 'linux') {
    if (on) {
      mkdirSync(join(homedir(), '.config', 'autostart'), { recursive: true })
      // APPIMAGE is the path of the running AppImage file
      writeFileSync(
        linuxEntry(),
        `[Desktop Entry]\nType=Application\nName=Splat Pad\nExec="${process.env.APPIMAGE}" ${HIDDEN_ARG}\nX-GNOME-Autostart-enabled=true\n`
      )
    } else rmSync(linuxEntry(), { force: true })
  } else {
    app.setLoginItemSettings({ openAtLogin: on, args: [HIDDEN_ARG] })
  }
  setPrefs({ autostartChosen: true })
}

// First run of the installed app: on by default.
export function initAutostart(): void {
  if (autostartAvailable() && !getPrefs().autostartChosen) setAutostart(true)
}

export function registerAutostart(onChange: () => void): void {
  ipcMain.handle('autostart-get', () => ({ available: autostartAvailable(), on: isAutostartOn() }))
  ipcMain.handle('autostart-set', (_e, on: unknown) => {
    setAutostart(on === true)
    onChange()
    return { available: autostartAvailable(), on: isAutostartOn() }
  })
}
