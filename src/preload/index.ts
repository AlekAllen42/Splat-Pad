import { contextBridge } from 'electron'

// The bridge between the UI and the main process. Step 6 (save/discard)
// adds loadConfig/saveConfig here.
contextBridge.exposeInMainWorld('controlPad', {
  platform: process.platform
})
