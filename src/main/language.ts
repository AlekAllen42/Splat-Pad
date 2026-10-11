import { ipcMain } from 'electron'
import { LANGUAGES, type Language } from '../shared/config'
import { stringsFor, type Strings } from '../shared/i18n'

// The language the window is currently using; the UI tells us when it changes.
// Used for text the main process shows itself (close dialog, file pickers).
let current: Language = 'en'

export const t = (): Strings => stringsFor(current)

export function registerLanguage(onChange: () => void): void {
  ipcMain.on('set-language', (_e, lang: unknown) => {
    if (typeof lang === 'string' && (LANGUAGES as string[]).includes(lang) && lang !== current) {
      current = lang as Language
      onChange()
    }
  })
}
