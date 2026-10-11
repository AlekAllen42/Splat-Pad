import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { registerPickers } from './pickers'
import { findStarterApps, STARTER_IDS } from './starterApps'
import { fetchSiteIcon } from './favicon'
import { configPath, loadConfig, saveConfig } from './configStore'
import { registerTestMode } from './testMode'
import { registerLanguage, t } from './language'
// the 42 Potential logo, shown in the taskbar and window corner
import icon from '../../resources/icon.png?asset'
import { registerDevice } from './device'

// Windows whose UI reported unsaved changes, and ones allowed to close anyway.
const unsaved = new WeakSet<BrowserWindow>()
const allowClose = new WeakSet<BrowserWindow>()
let appWindow: BrowserWindow | null = null

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: 'Splat Pad',
    icon,
    backgroundColor: '#f6f3ec', // avoids a white flash before the UI loads
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Keep the UI isolated from Node.js; it only gets what preload exposes.
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  appWindow = win
  // Closing the main window closes the pretend Splat Pad too, so the app quits.
  win.on('closed', () => {
    appWindow = null
    for (const w of BrowserWindow.getAllWindows()) w.close()
  })

  // Closing with unsaved changes asks first.
  win.on('close', (e) => {
    if (!unsaved.has(win) || allowClose.has(win)) return
    e.preventDefault()
    const choice = dialog.showMessageBoxSync(win, {
      type: 'question',
      buttons: [t().save, t().dontSave, t().cancel],
      defaultId: 0,
      cancelId: 2,
      title: 'Splat Pad',
      message: t().closeQuestion,
      detail: t().closeDetail
    })
    if (choice === 0) {
      win.webContents.send('save-then-close') // the UI saves, then calls close-window
    } else if (choice === 1) {
      allowClose.add(win)
      win.close()
    }
  })

  // In development electron-vite serves the UI with live reload;
  // in a built app we load the bundled HTML file.
  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerConfigHandlers(): void {
  ipcMain.handle('config-load', () => loadConfig())
  ipcMain.handle('config-save', (_e, config: unknown) => saveConfig(config))
  ipcMain.on('set-unsaved', (e, value: unknown) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return
    if (value === true) unsaved.add(win)
    else unsaved.delete(win)
  })
  ipcMain.on('close-window', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return
    allowClose.add(win)
    win.close()
  })
  ipcMain.on('show-config-file', () => {
    const file = configPath()
    if (existsSync(file)) shell.showItemInFolder(file)
    else void shell.openPath(dirname(file)) // not saved yet: open the folder
  })
}

app.whenReady().then(() => {
  // Windows: our own taskbar identity, so the 42 Potential icon is used (not Electron's)
  if (process.platform === 'win32') app.setAppUserModelId('com.42potential.splatpad')
  registerPickers()
  registerConfigHandlers()
  registerLanguage()
  registerTestMode()
  registerDevice(() => appWindow, icon)
  ipcMain.handle('find-starter-apps', (_e, ids: unknown) =>
    findStarterApps(Array.isArray(ids) ? ids.filter((id): id is string => STARTER_IDS.includes(id)) : [])
  )
  ipcMain.handle('fetch-site-icon', (_e, url: unknown) => (typeof url === 'string' ? fetchSiteIcon(url) : null))
  createWindow()

  // macOS: re-open a window when the dock icon is clicked.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // Phase 4 will keep the app running in the system tray instead.
  if (process.platform !== 'darwin') app.quit()
})
