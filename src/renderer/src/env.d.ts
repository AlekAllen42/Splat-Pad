/// <reference types="vite/client" />

interface PickedProgram {
  name: string
  path: string
  icon?: string // PNG data URL
}

// What the preload script exposes on `window` (see src/preload/index.ts).
interface Window {
  splatPad: {
    platform: string
    // Opens a file picker; resolves to null if the user cancels.
    pickProgram: () => Promise<PickedProgram | null>
    pickImage: () => Promise<string | null>
    // Looks for the starter apps in the Start Menu; null = not found. Changes nothing by itself.
    findStarterApps: (ids: string[]) => Promise<Record<string, PickedProgram | null>>
    // A website's icon as a data URL, or null if none could be found.
    fetchSiteIcon: (url: string) => Promise<string | null>
  }
}
