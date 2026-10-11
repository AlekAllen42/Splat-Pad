import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerPickers } from './pickers'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: 'Splat Pad',
    backgroundColor: '#f6f3ec', // avoids a white flash before the UI loads
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Keep the UI isolated from Node.js; it only gets what preload exposes.
      contextIsolation: true,
      nodeIntegration: false
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

app.whenReady().then(() => {
  registerPickers()
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
