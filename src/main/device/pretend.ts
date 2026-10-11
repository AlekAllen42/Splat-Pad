import { BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import type { Transport } from './transport'

// The pretend Splat Pad: a separate window that acts like the real device
// (it runs a stand-in for the firmware, see src/renderer/src/pretend). The
// "wire" between it and the app is IPC instead of a USB cable, carrying the
// exact same protocol lines.

let win: BrowserWindow | null = null

// Opens the pretend device (or brings it to the front) and calls `plugIn`
// with a transport once its firmware stand-in is ready to talk.
export function openPretendDevice(icon: string, plugIn: (transport: Transport) => void): void {
  if (win && !win.isDestroyed()) {
    win.focus()
    return
  }
  const w = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 480,
    minHeight: 340,
    title: 'Pretend Splat Pad',
    icon,
    backgroundColor: '#2a2520',
    webPreferences: {
      preload: join(__dirname, '../preload/pretend.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  win = w

  let lineListener: ((line: string) => void) | null = null
  const closeListeners: (() => void)[] = []
  let closed = false

  const transport: Transport = {
    pretend: true,
    write: (line) => {
      if (!w.isDestroyed()) w.webContents.send('pretend-to-device', line)
    },
    onLine: (cb) => {
      lineListener = cb
    },
    onClose: (cb) => {
      closeListeners.push(cb)
    },
    close: () => {
      // unplugging from the app side doesn't close the window
    }
  }

  const onDeviceLine = (e: Electron.IpcMainEvent, line: unknown): void => {
    if (e.sender === w.webContents && typeof line === 'string') lineListener?.(line)
  }
  // the pretend firmware says it has "booted" (also after a reload): plug it in
  const onReady = (e: Electron.IpcMainEvent): void => {
    if (e.sender === w.webContents) plugIn(transport)
  }
  ipcMain.on('pretend-from-device', onDeviceLine)
  ipcMain.on('pretend-ready', onReady)

  w.on('closed', () => {
    ipcMain.removeListener('pretend-from-device', onDeviceLine)
    ipcMain.removeListener('pretend-ready', onReady)
    win = null
    if (!closed) {
      closed = true
      for (const cb of closeListeners) cb() // like pulling out the cable
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) w.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/pretend.html`)
  else w.loadFile(join(__dirname, '../renderer/pretend.html'))
}
