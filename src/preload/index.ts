import { contextBridge, ipcRenderer } from 'electron'

// The bridge between the UI and the main process. Only what's listed here is
// reachable from the UI.
contextBridge.exposeInMainWorld('splatPad', {
  platform: process.platform,
  pickProgram: () => ipcRenderer.invoke('pick-program'),
  pickImage: () => ipcRenderer.invoke('pick-image'),
  findStarterApps: (ids: string[]) => ipcRenderer.invoke('find-starter-apps', ids),
  fetchSiteIcon: (url: string) => ipcRenderer.invoke('fetch-site-icon', url),

  // Test mode: really open things / change volume on this PC
  testOpen: (kind: string, target: string) => ipcRenderer.invoke('test-open', kind, target),
  getVolume: () => ipcRenderer.invoke('test-get-volume'),
  setVolume: (value: number) => ipcRenderer.invoke('test-set-volume', value),
  getBrightness: () => ipcRenderer.invoke('pc-get-brightness'),
  setBrightness: (value: number) => ipcRenderer.invoke('pc-set-brightness', value),
  getAppVolume: (name: string) => ipcRenderer.invoke('pc-get-app-volume', name),
  setAppVolume: (name: string, value: number) => ipcRenderer.invoke('pc-set-app-volume', name, value),

  // Device connection (real or pretend Splat Pad)
  getDeviceStatus: () => ipcRenderer.invoke('device-get-status'),
  onDeviceStatus: (callback: (status: unknown) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, status: unknown): void => callback(status)
    ipcRenderer.on('device-status', listener)
    return () => ipcRenderer.removeListener('device-status', listener)
  },
  onDeviceEvent: (callback: (event: unknown) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, event: unknown): void => callback(event)
    ipcRenderer.on('device-event', listener)
    return () => ipcRenderer.removeListener('device-event', listener)
  },
  sendLiveConfig: (config: unknown) => ipcRenderer.send('device-live-config', config),
  sendSavedConfig: (config: unknown) => ipcRenderer.send('device-saved-config', config),
  openPretendDevice: () => ipcRenderer.send('open-pretend-device'),

  // Settings file
  loadConfig: () => ipcRenderer.invoke('config-load'),
  saveConfig: (config: unknown) => ipcRenderer.invoke('config-save', config),
  setUnsaved: (value: boolean) => ipcRenderer.send('set-unsaved', value),
  setLanguage: (language: string) => ipcRenderer.send('set-language', language),
  showConfigFile: () => ipcRenderer.send('show-config-file'),
  closeWindow: () => ipcRenderer.send('close-window'),
  // The close dialog's "Save" button; returns a function that stops listening.
  onSaveThenClose: (callback: () => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('save-then-close', listener)
    return () => ipcRenderer.removeListener('save-then-close', listener)
  }
})
