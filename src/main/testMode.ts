import { app, ipcMain, shell } from 'electron'
import { getAppVolume, getBrightness, getVolume, setAppVolume, setBrightness, setVolume, stopPcHelper } from './pcControl'

// PC actions: opening programs/websites and setting volume and brightness.
// Used by Test mode and by taps/slider moves from the Splat Pad.

async function openTarget(kind: unknown, target: unknown): Promise<{ ok: boolean; error?: string }> {
  if (typeof target !== 'string' || !target.trim()) return { ok: false, error: 'nothing to open' }
  if (kind === 'url') {
    if (!/^https?:\/\//i.test(target)) return { ok: false, error: 'only web addresses (http/https) can be opened' }
    await shell.openExternal(target)
    return { ok: true }
  }
  if (kind === 'launch') {
    const error = await shell.openPath(target) // empty string means success
    return error ? { ok: false, error } : { ok: true }
  }
  return { ok: false, error: 'unknown action' }
}

const isLevel = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function registerTestMode(): void {
  ipcMain.handle('test-open', (_e, kind: unknown, target: unknown) => openTarget(kind, target))
  ipcMain.handle('test-get-volume', () => getVolume())
  ipcMain.handle('test-set-volume', (_e, value: unknown) => (isLevel(value) ? setVolume(value) : false))
  ipcMain.handle('pc-get-brightness', () => getBrightness())
  ipcMain.handle('pc-set-brightness', (_e, value: unknown) =>
    isLevel(value) ? setBrightness(value) : { laptop: 0, external: 0 }
  )
  ipcMain.handle('pc-get-app-volume', (_e, name: unknown) => (typeof name === 'string' ? getAppVolume(name) : null))
  ipcMain.handle('pc-set-app-volume', (_e, name: unknown, value: unknown) =>
    typeof name === 'string' && isLevel(value) ? setAppVolume(name, value) : 'invalid'
  )
  app.on('will-quit', stopPcHelper)
}
