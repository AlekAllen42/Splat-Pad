import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_CONFIG, type Config } from '../../shared/config'
import { detectLanguage, stringsFor, type Strings } from '../../shared/i18n'

export interface Notice {
  kind: 'ok' | 'error' | 'warning'
  text: string
  details?: string[]
}

// Turns "apps[3].name: must be non-empty text" into "App 4: name must be non-empty text".
// TODO(i18n): the detail after the colon still comes from the English validator.
function friendly(error: string, config: Config, t: Strings): string {
  const lists: [keyof Config, string, (i: number) => string | undefined][] = [
    ['apps', t.errorApp, (i) => config.apps[i]?.name],
    ['sliders', t.errorSlider, (i) => config.sliders[i]?.label],
    ['presets', t.errorPreset, (i) => config.presets[i]?.name],
    ['layout', t.errorPiece, () => undefined]
  ]
  for (const [key, label, nameOf] of lists) {
    const m = error.match(new RegExp(`^${key}\\[(\\d+)\\]\\.?([^:]*):\\s*(.*)$`))
    if (m) {
      const i = Number(m[1])
      const name = nameOf(i)?.trim()
      const who = name ? `${label} "${name}"` : `${label} ${i + 1}`
      return `${who}: ${m[2] ? `${m[2].replace(/\./g, ' ')} ` : ''}${m[3]}`
    }
  }
  return error
}

export interface Settings {
  ready: boolean
  config: Config // the version being edited
  update: (change: (c: Config) => Config) => void
  unsaved: boolean
  save: () => Promise<boolean>
  discard: () => void
  notice: Notice | null
  clearNotice: () => void
}

// Loads the saved settings, tracks edits, and saves/discards them.
export function useSettings(): Settings {
  const [ready, setReady] = useState(false)
  const [saved, setSaved] = useState<Config>(DEFAULT_CONFIG)
  const [draft, setDraft] = useState<Config>(DEFAULT_CONFIG)
  const [notice, setNotice] = useState<Notice | null>(null)
  const draftRef = useRef(draft)
  draftRef.current = draft

  useEffect(() => {
    void window.splatPad.loadConfig().then(({ config, warning }) => {
      // first launch: use the computer's language if we have it
      const start = config ?? { ...DEFAULT_CONFIG, language: detectLanguage(navigator.language) }
      setSaved(start)
      setDraft(start)
      if (warning) setNotice({ kind: 'warning', text: warning })
      setReady(true)
    })
  }, [])

  // Compared as text so "changed then changed back" counts as no change.
  const unsaved = useMemo(() => draft !== saved && JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved])

  useEffect(() => {
    window.splatPad.setUnsaved(unsaved)
  }, [unsaved])

  // the main process needs the language for the close dialog and file pickers
  useEffect(() => {
    window.splatPad.setLanguage(draft.language)
  }, [draft.language])

  const save = useCallback(async (): Promise<boolean> => {
    const toSave = draftRef.current
    const result = await window.splatPad.saveConfig(toSave)
    if (result.ok) {
      setSaved(toSave)
      setNotice({ kind: 'ok', text: stringsFor(toSave.language).saved })
      return true
    }
    setNotice({
      kind: 'error',
      text: stringsFor(toSave.language).cantSave,
      details: result.errors.slice(0, 6).map((e) => friendly(e, toSave, stringsFor(toSave.language)))
    })
    return false
  }, [])

  const discard = useCallback(() => {
    setDraft(saved)
    setNotice({ kind: 'ok', text: stringsFor(saved.language).discarded })
  }, [saved])

  // Ctrl+S (Cmd+S on Mac) saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save])

  // "Save" in the close dialog: save, then close only if it worked.
  useEffect(
    () =>
      window.splatPad.onSaveThenClose(() => {
        void save().then((ok) => ok && window.splatPad.closeWindow())
      }),
    [save]
  )

  return {
    ready,
    config: draft,
    update: setDraft,
    unsaved,
    save,
    discard,
    notice,
    clearNotice: () => setNotice(null)
  }
}
