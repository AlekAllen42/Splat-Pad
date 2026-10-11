import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateStatus } from '../shared/updates'
import { t } from './language'

// App updates from GitHub Releases (see "publish" in electron-builder.yml and
// docs/RELEASING.md). Every installed copy checks shortly after it starts and
// then every few hours (it lives in the tray for days), downloads a newer
// version in the background, and asks before restarting. If the user picks
// "Later", the update installs the next time Splat Pad quits.

const FIRST_CHECK_MS = 10_000
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000

let status: UpdateStatus = { state: app.isPackaged ? 'idle' : 'dev' }
let manual = false // the user asked: show errors instead of staying quiet
let asked = false // the restart question is asked once per download
let restartForUpdate = false

interface UpdaterHooks {
  getWindow: () => BrowserWindow | null
  onChange: () => void // e.g. rebuild the tray menu
  quit: () => void // the app's normal quit (asks about unsaved changes)
}
let hooks: UpdaterHooks

export const getUpdateStatus = (): UpdateStatus => status

function setStatus(next: UpdateStatus): void {
  status = next
  hooks.getWindow()?.webContents.send('update-status', status)
  hooks.onChange()
}

export async function checkForUpdates(byUser = false): Promise<UpdateStatus> {
  if (status.state === 'dev' || status.state === 'ready') return status
  if (status.state === 'checking' || status.state === 'downloading') return status
  manual = byUser
  try {
    await autoUpdater.checkForUpdates()
  } catch {
    // reported through the 'error' event
  }
  return status
}

// Quit the normal way (unsaved changes are asked about first); the
// 'will-quit' handler below then starts the installer and reopens the app.
export function restartToUpdate(): void {
  if (status.state !== 'ready') return
  restartForUpdate = true
  hooks.quit()
}

// The user cancelled quitting (e.g. in the unsaved changes dialog).
export function cancelRestartToUpdate(): void {
  restartForUpdate = false
}

// Called when the window is shown, so an update downloaded while hidden gets offered.
export function offerRestartIfReady(): void {
  if (status.state === 'ready') askToRestart(status.version)
}

function askToRestart(version: string): void {
  const win = hooks.getWindow()
  // Running hidden in the tray: don't pop up a dialog; it installs on the next quit.
  if (!win || !win.isVisible() || asked) return
  asked = true
  const s = t()
  void dialog
    .showMessageBox(win, {
      type: 'info',
      buttons: [s.restartNow, s.later],
      defaultId: 0,
      cancelId: 1,
      title: 'Splat Pad',
      message: s.updateReadyMessage(version),
      detail: s.updateReadyDetail
    })
    .then(({ response }) => {
      if (response === 0) restartToUpdate()
    })
}

export function initUpdater(h: UpdaterHooks): void {
  hooks = h

  ipcMain.handle('app-version', () => app.getVersion())
  ipcMain.handle('update-get-status', () => status)
  ipcMain.handle('update-check', () => checkForUpdates(true))
  ipcMain.on('update-restart', restartToUpdate)

  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = null

  autoUpdater.on('checking-for-update', () => setStatus({ state: 'checking' }))
  autoUpdater.on('update-not-available', () => setStatus({ state: 'none' }))
  autoUpdater.on('update-available', () => setStatus({ state: 'downloading', percent: 0 }))
  autoUpdater.on('download-progress', (p) => setStatus({ state: 'downloading', percent: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', (info) => {
    setStatus({ state: 'ready', version: info.version })
    askToRestart(info.version)
  })
  autoUpdater.on('error', () => {
    // automatic checks fail quietly (no internet is normal); a check the user asked for says so
    setStatus(manual ? { state: 'error' } : { state: 'idle' })
  })

  app.on('will-quit', () => {
    if (restartForUpdate) autoUpdater.quitAndInstall(true, true) // silent install, then reopen
  })

  setTimeout(() => void checkForUpdates(), FIRST_CHECK_MS)
  setInterval(() => void checkForUpdates(), CHECK_EVERY_MS)
}
