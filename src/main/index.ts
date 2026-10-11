import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { registerPickers } from './pickers'
import { findStarterApps, STARTER_IDS } from './starterApps'
import { fetchSiteIcon } from './favicon'
import { configPath, loadConfig, saveConfig } from './configStore'
import { registerTestMode } from './testMode'
import { registerLanguage, t } from './language'
// the 42 Potential logo, shown in the taskbar, window corner and tray
import icon from '../../resources/icon.png?asset'
import { registerDevice } from './device'
import { HIDDEN_ARG, initAutostart, registerAutostart } from './autostart'
import { createTray, refreshTrayMenu, showTrayHint, type TrayActions } from './tray'
import { getPrefs, setPrefs } from './prefs'

// The app keeps running in the tray so the Splat Pad keeps working:
// closing the window hides it; "Quit" in the tray menu really exits.

// Windows whose UI reported unsaved changes, and ones allowed to close anyway.
const unsaved = new WeakSet<BrowserWindow>()
const allowClose = new WeakSet<BrowserWindow>()
let appWindow: BrowserWindow | null = null
let quitting = false

function showWindow(): void {
  if (!appWindow || appWindow.isDestroyed()) createWindow(true)
  else {
    if (appWindow.isMinimized()) appWindow.restore()
    appWindow.show()
    appWindow.focus()
  }
}

function quitApp(): void {
  quitting = true
  app.quit()
}

const trayActions: TrayActions = { show: showWindow, quit: quitApp }

function createWindow(visible: boolean): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: 'Splat Pad',
    icon,
    show: visible, // started at login: load hidden, so taps from the device still work
    backgroundColor: '#f6f3ec', // avoids a white flash before the UI loads
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Keep the UI isolated from Node.js; it only gets what preload exposes.
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  appWindow = win
  // When the main window really closes (quitting), close the pretend Splat Pad too.
  win.on('closed', () => {
    appWindow = null
    for (const w of BrowserWindow.getAllWindows()) w.close()
  })

  win.on('close', (e) => {
    // Not quitting: just hide in the tray (unsaved edits stay in the hidden window).
    if (!quitting) {
      e.preventDefault()
      win.hide()
      if (!getPrefs().trayHintShown) {
        showTrayHint()
        setPrefs({ trayHintShown: true })
      }
      return
    }
    // Quitting with unsaved changes: ask first.
    if (!unsaved.has(win) || allowClose.has(win)) return
    e.preventDefault()
    win.show()
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
      app.quit()
    } else {
      quitting = false // Cancel: stay open
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
  // After "Save" in the quit dialog: the UI saved, so finish quitting.
  ipcMain.on('close-window', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return
    allowClose.add(win)
    if (quitting) app.quit()
    else win.close()
  })
  ipcMain.on('show-config-file', () => {
    const file = configPath()
    if (existsSync(file)) shell.showItemInFolder(file)
    else void shell.openPath(dirname(file)) // not saved yet: open the folder
  })
}

// Only one copy runs; opening Splat Pad again just shows the existing window.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', showWindow)

  app.whenReady().then(() => {
    // Windows: our own taskbar identity, so the 42 Potential icon is used (not Electron's)
    if (process.platform === 'win32') app.setAppUserModelId('com.42potential.splatpad')
    registerPickers()
    registerConfigHandlers()
    registerLanguage(() => refreshTrayMenu(trayActions))
    registerTestMode()
    registerDevice(() => appWindow, icon)
    registerAutostart(() => refreshTrayMenu(trayActions))
    ipcMain.handle('find-starter-apps', (_e, ids: unknown) =>
      findStarterApps(Array.isArray(ids) ? ids.filter((id): id is string => STARTER_IDS.includes(id)) : [])
    )
    ipcMain.handle('fetch-site-icon', (_e, url: unknown) => (typeof url === 'string' ? fetchSiteIcon(url) : null))

    initAutostart()
    createTray(icon, trayActions)
    createWindow(!process.argv.includes(HIDDEN_ARG))

    // macOS: re-open the window when the dock icon is clicked.
    app.on('activate', showWindow)
  })

  app.on('before-quit', () => {
    quitting = true
  })

  // The tray keeps the app alive; it only exits through Quit.
  app.on('window-all-closed', () => {
    if (quitting) app.quit()
  })
}
