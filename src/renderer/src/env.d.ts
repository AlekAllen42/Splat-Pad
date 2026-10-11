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

    // Test mode. testOpen kind: "launch" (program) or "url" (website).
    testOpen: (kind: "launch" | "url", target: string) => Promise<{ ok: boolean; error?: string }>
    getVolume: () => Promise<number | null>
    setVolume: (value: number) => Promise<boolean>

    // Settings file. loadConfig: config is null when nothing has been saved yet.
    loadConfig: () => Promise<{ config: import('../../shared/config').Config | null; warning?: string }>
    saveConfig: (config: unknown) => Promise<{ ok: true } | { ok: false; errors: string[] }>
    setUnsaved: (value: boolean) => void
    setLanguage: (language: string) => void
    showConfigFile: () => void
    closeWindow: () => void
    onSaveThenClose: (callback: () => void) => () => void
  }
}
