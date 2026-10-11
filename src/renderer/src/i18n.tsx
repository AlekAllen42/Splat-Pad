import { createContext, useContext, type ReactNode } from 'react'
import type { Language } from '../../shared/config'
import { stringsFor, type Strings } from '../../shared/i18n'

// Gives every component the text for the chosen language: const t = useT()
const LanguageContext = createContext<Strings>(stringsFor('en'))

export function LanguageProvider({ language, children }: { language: Language; children: ReactNode }): React.JSX.Element {
  return <LanguageContext.Provider value={stringsFor(language)}>{children}</LanguageContext.Provider>
}

export const useT = (): Strings => useContext(LanguageContext)
