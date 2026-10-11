import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

// Three parts of an Electron app, each built separately:
//   main     - the Node.js side (windows, files, device connection)
//   preload  - small bridges that safely expose main-side features to the UI
//   renderer - the UI itself (React), running inside the windows
// Two windows: the app (index) and the pretend Splat Pad (pretend).
export default defineConfig({
  main: {},
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
          pretend: resolve(__dirname, 'src/preload/pretend.ts')
        }
      }
    }
  },
  renderer: {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          pretend: resolve(__dirname, 'src/renderer/pretend.html')
        }
      }
    }
  }
})
