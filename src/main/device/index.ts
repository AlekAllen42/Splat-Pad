import { BrowserWindow, ipcMain } from 'electron'
import { validateConfig } from '../../shared/config'
import { Connection } from './connection'
import { openPretendDevice } from './pretend'

// Connects the device link to the app window: settings in, status and
// device taps/slider moves out.
// TODO(phase 2, board): find the real Splat Pad on the USB serial ports
// (serialport package) and attach it the same way the pretend one is.

export function registerDevice(getAppWindow: () => BrowserWindow | null, icon: string): void {
  const toApp = (channel: string, payload: unknown): void => {
    const w = getAppWindow()
    if (w && !w.isDestroyed()) w.webContents.send(channel, payload)
  }

  const connection = new Connection({
    status: (status) => toApp('device-status', status),
    event: (event) => toApp('device-event', event),
    log: (line) => console.log('[device]', line)
  })

  ipcMain.handle('device-get-status', () => connection.getStatus())

  // Settings from the app window; checked again here before anything reaches the device.
  ipcMain.on('device-saved-config', (_e, config: unknown) => {
    const r = validateConfig(config)
    if (r.ok) connection.setSaved(r.config)
  })
  ipcMain.on('device-live-config', (_e, config: unknown) => {
    const r = validateConfig(config)
    if (r.ok) connection.setLive(r.config)
  })

  ipcMain.on('open-pretend-device', () => openPretendDevice(icon, (transport) => void connection.attach(transport)))
}
