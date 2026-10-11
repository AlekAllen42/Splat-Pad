import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

// Three parts of an Electron app, each built separately:
//   main     - the Node.js side (windows, files, later: serial port, tray)
//   preload  - a small bridge that safely exposes main-side features to the UI
//   renderer - the UI itself (React), running inside the window
export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    plugins: [react()]
  }
})
