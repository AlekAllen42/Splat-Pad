/// <reference types="vite/client" />

// What the preload script exposes on `window` (see src/preload/index.ts).
interface Window {
  splatPad: {
    platform: string
    // Opens a file picker; resolves to null if the user cancels.
    pickProgram: () => Promise<{ name: string; path: string; icon?: string } | null>
    pickImage: () => Promise<string | null>
  }
}
