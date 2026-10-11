import { contextBridge, ipcRenderer } from 'electron'

// Bridge for the pretend Splat Pad window: its "USB cable" to the app.
contextBridge.exposeInMainWorld('pretendWire', {
  // tell the app the pretend firmware is running (like plugging in the cable)
  ready: () => ipcRenderer.send('pretend-ready'),
  send: (line: string) => ipcRenderer.send('pretend-from-device', line),
  onLine: (callback: (line: string) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, line: string): void => callback(line)
    ipcRenderer.on('pretend-to-device', listener)
    return () => ipcRenderer.removeListener('pretend-to-device', listener)
  }
})
