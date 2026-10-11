import { readdir } from 'fs/promises'
import { basename, extname, join } from 'path'
import { describeProgram, type PickedProgram } from './pickers'

// Start Menu names to look for, per starter app id, best match first.
// Only used to *suggest* links; the user approves each one.
const SEARCH_NAMES: Record<string, string[]> = {
  browser: ['google chrome', 'microsoft edge', 'firefox', 'brave', 'opera'],
  spotify: ['spotify'],
  discord: ['discord'],
  obs: ['obs studio'],
  steam: ['steam'],
  code: ['visual studio code'],
  files: ['file explorer'],
  terminal: ['terminal', 'windows powershell', 'command prompt']
}

export const STARTER_IDS = Object.keys(SEARCH_NAMES)

function startMenuFolders(): string[] {
  const folders: string[] = []
  if (process.env.ProgramData) folders.push(join(process.env.ProgramData, 'Microsoft', 'Windows', 'Start Menu', 'Programs'))
  if (process.env.APPDATA) folders.push(join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs'))
  return folders
}

// All shortcuts in the Start Menu (a few folders deep).
async function listShortcuts(folder: string, depth = 3): Promise<string[]> {
  let entries
  try {
    entries = await readdir(folder, { withFileTypes: true })
  } catch {
    return []
  }
  const found: string[] = []
  for (const e of entries) {
    const p = join(folder, e.name)
    if (e.isDirectory() && depth > 0) found.push(...(await listShortcuts(p, depth - 1)))
    else if (extname(e.name).toLowerCase() === '.lnk') found.push(p)
  }
  return found
}

// For each requested starter app id: the matching program, or null if not found.
// TODO(linux): search /usr/share/applications .desktop files.
export async function findStarterApps(ids: string[]): Promise<Record<string, PickedProgram | null>> {
  const results: Record<string, PickedProgram | null> = {}
  const shortcuts =
    process.platform === 'win32' ? (await Promise.all(startMenuFolders().map((f) => listShortcuts(f)))).flat() : []
  const named = shortcuts.map((p) => ({ path: p, name: basename(p, extname(p)).toLowerCase() }))

  for (const id of ids) {
    results[id] = null
    for (const wanted of SEARCH_NAMES[id] ?? []) {
      // exact name first, then names that start with it (e.g. "Discord" vs "Discord PTB")
      const hit = named.find((s) => s.name === wanted) ?? named.find((s) => s.name.startsWith(wanted))
      if (hit) {
        results[id] = await describeProgram(hit.path)
        break
      }
    }
  }
  return results
}
