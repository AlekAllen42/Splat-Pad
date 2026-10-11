/// <reference types="vite/client" />

interface PickedProgram {
  name: string
  path: string
  icon?: string // PNG data URL
}

type UpdateStatus = import('../../shared/updates').UpdateStatus

// What the preload script exposes on `window` (see src/preload/index.ts).
interface Window {
  // Only in the pretend Splat Pad window (src/preload/pretend.ts): its "USB cable".
  pretendWire?: {
    ready: () => void
    send: (line: string) => void
    onLine: (callback: (line: string) => void) => () => void
  }
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
    getBrightness: () => Promise<number | null>
    // how many laptop screens / external monitors were set
    setBrightness: (value: number) => Promise<{ laptop: number; external: number }>
    getAppVolume: (name: string) => Promise<number | null>
    // 'remembered' = the app isn't playing; applied when it starts
    setAppVolume: (name: string, value: number) => Promise<'set' | 'remembered' | 'invalid'>

    // Device connection (real or pretend Splat Pad); the on* functions return an "unsubscribe".
    getDeviceStatus: () => Promise<import('../../shared/protocol').ConnectionStatus>
    onDeviceStatus: (callback: (status: import('../../shared/protocol').ConnectionStatus) => void) => () => void
    onDeviceEvent: (callback: (event: import('../../shared/protocol').DeviceEvent) => void) => () => void
    sendLiveConfig: (config: unknown) => void
    sendSavedConfig: (config: unknown) => void
    openPretendDevice: () => void

    // Start with Windows; available is false while developing (npm run dev).
    getAutostart: () => Promise<{ available: boolean; on: boolean }>
    setAutostart: (on: boolean) => Promise<{ available: boolean; on: boolean }>

    // App updates. "dev" = running with npm run dev, where there's nothing to update.
    getAppVersion: () => Promise<string>
    getUpdateStatus: () => Promise<UpdateStatus>
    checkForUpdates: () => Promise<UpdateStatus>
    restartToUpdate: () => void
    onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void

    // Image data URLs found in a program's files, best first; excludes nothing (the UI filters).
    findIcons: (target: string) => Promise<string[]>

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
