import { contextBridge, ipcRenderer } from 'electron'

// The bridge between the UI and the main process. Only what's listed here is
// reachable from the UI. Step 6 (save/discard) adds loadConfig/saveConfig.
contextBridge.exposeInMainWorld('splatPad', {
  platform: process.platform,
  pickProgram: () => ipcRenderer.invoke('pick-program'),
  pickImage: () => ipcRenderer.invoke('pick-image')
})
