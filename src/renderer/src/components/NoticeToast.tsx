import { useEffect } from 'react'
import type { Notice } from '../settings'
import { useT } from '../i18n'

// A message at the bottom of the window. Success messages fade on their own;
// errors and warnings stay until closed.
export default function NoticeToast({ notice, onClose }: { notice: Notice | null; onClose: () => void }): React.JSX.Element | null {
  const t = useT()
  useEffect(() => {
    if (notice?.kind !== 'ok' && notice?.kind !== 'info') return
    const timer = window.setTimeout(onClose, 2200)
    return () => window.clearTimeout(timer)
  }, [notice, onClose])

  if (!notice) return null
  return (
    <div className={`notice notice-${notice.kind}`} role={notice.kind === 'ok' || notice.kind === 'info' ? 'status' : 'alert'}>
      <div>
        <strong>{notice.kind === 'ok' ? `✓ ${notice.text}` : notice.text}</strong>
        {notice.details && (
          <ul>
            {notice.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
      </div>
      {notice.kind !== 'ok' && notice.kind !== 'info' && (
        <button className="icon-btn" aria-label={t.closeMessage} onClick={onClose}>
          ✕
        </button>
      )}
    </div>
  )
}
