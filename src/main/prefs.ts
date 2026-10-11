import { app } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// Small app preferences that aren't part of the Splat Pad's settings
// (those live in config.json and go to the device).
interface Prefs {
  trayHintShown: boolean // the "still running in the tray" message was shown once
  autostartChosen: boolean // start-with-Windows was set up on first run (or changed by the user)
}

const DEFAULTS: Prefs = { trayHintShown: false, autostartChosen: false }
const file = (): string => join(app.getPath('userData'), 'prefs.json')

export function getPrefs(): Prefs {
  try {
    return { ...DEFAULTS, ...(JSON.parse(readFileSync(file(), 'utf8')) as Partial<Prefs>) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function setPrefs(patch: Partial<Prefs>): void {
  try {
    writeFileSync(file(), JSON.stringify({ ...getPrefs(), ...patch }, null, 2), 'utf8')
  } catch {
    // not fatal: worst case the hint shows again
  }
}
