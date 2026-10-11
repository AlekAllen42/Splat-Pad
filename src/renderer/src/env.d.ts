/// <reference types="vite/client" />

// What the preload script exposes on `window` (see src/preload/index.ts).
interface Window {
  splatPad: {
    platform: string
  }
}
