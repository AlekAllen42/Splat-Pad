import { useEffect, useState } from 'react'
import type { UpdateStatus } from '../../../shared/updates'
import { useT } from '../i18n'

// "Check for updates" in the ☰ menu, plus what the updater is doing and the version.
export default function UpdateMenuItem(): React.JSX.Element {
  const t = useT()
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [version, setVersion] = useState('')

  useEffect(() => {
    void window.splatPad.getUpdateStatus().then(setStatus)
    void window.splatPad.getAppVersion().then(setVersion)
    return window.splatPad.onUpdateStatus(setStatus)
  }, [])

  const state = status?.state ?? 'idle'
  let label = t.updatesCheck
  let note: string | null = null
  let action: (() => void) | null = () => void window.splatPad.checkForUpdates().then(setStatus)

  if (status?.state === 'dev') {
    label = t.updatesDev
    action = null
  } else if (status?.state === 'checking') {
    label = t.updatesChecking
    action = null
  } else if (status?.state === 'downloading') {
    label = t.updatesDownloading(status.percent)
    action = null
  } else if (status?.state === 'ready') {
    label = t.updatesReady(status.version)
    action = () => window.splatPad.restartToUpdate()
  } else if (state === 'none') note = t.updatesNone
  else if (state === 'error') note = t.updatesError

  return (
    <>
      <button role="menuitem" className="menu-item" disabled={!action} onClick={() => action?.()}>
        <span className="menu-check">{status?.state === 'ready' ? '↻' : ''}</span>
        {label}
      </button>
      {note && <div className="menu-note">{note}</div>}
      {version && <div className="menu-note">{t.version(version)}</div>}
    </>
  )
}
