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
