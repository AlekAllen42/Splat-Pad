import { app, ipcMain, shell } from 'electron'
import { getVolume, setVolume, stopVolumeHelper } from './volume'

// Test mode: tapping tiles in the live preview really does things on this PC.
// Phase 3 reuses these when the real device sends tile/slider events.

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

export function registerTestMode(): void {
  ipcMain.handle('test-open', (_e, kind: unknown, target: unknown) => openTarget(kind, target))
  ipcMain.handle('test-get-volume', () => getVolume())
  ipcMain.handle('test-set-volume', (_e, value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) ? setVolume(value) : false
  )
  app.on('will-quit', stopVolumeHelper)
}
