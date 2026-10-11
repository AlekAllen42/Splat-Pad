import { app } from 'electron'
import { mkdir, readFile, rename, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { validateConfig, type Config } from '../shared/config'

// The settings file lives in the app's own data folder
// (Windows: %APPDATA%\splat-pad\config.json).
export const configPath = (): string => join(app.getPath('userData'), 'config.json')

export interface LoadResult {
  config: Config | null // null = no saved settings yet; use the defaults
  warning?: string
}

export async function loadConfig(): Promise<LoadResult> {
  const file = configPath()
  let text: string
  try {
    text = await readFile(file, 'utf8')
  } catch {
    return { config: null } // first launch
  }

  let problem: string
  try {
    const result = validateConfig(JSON.parse(text))
    if (result.ok) return { config: result.config }
    problem = result.errors.slice(0, 3).join('; ')
  } catch {
    problem = 'the file is not valid JSON'
  }

  // Keep the damaged file so nothing is lost, then start from the defaults.
  const backup = file.replace(/\.json$/, `.broken-${Date.now()}.json`)
  await rename(file, backup).catch(() => undefined)
  return {
    config: null,
    warning: `Your saved settings couldn't be read (${problem}). Starting from the defaults; the old file was kept as ${backup}.`
  }
}

export async function saveConfig(raw: unknown): Promise<{ ok: true } | { ok: false; errors: string[] }> {
  const result = validateConfig(raw)
  if (!result.ok) return result
  const file = configPath()
  await mkdir(dirname(file), { recursive: true })
  // Write to a temporary file first, then swap it in, so a crash mid-save
  // can't leave a half-written settings file.
  const tmp = `${file}.tmp`
  await writeFile(tmp, JSON.stringify(result.config, null, 2), 'utf8')
  await rename(tmp, file)
  return { ok: true }
}
