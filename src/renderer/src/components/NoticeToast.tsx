import { useEffect } from 'react'
import type { Notice } from '../settings'

// A message at the bottom of the window. Success messages fade on their own;
// errors and warnings stay until closed.
export default function NoticeToast({ notice, onClose }: { notice: Notice | null; onClose: () => void }): React.JSX.Element | null {
  useEffect(() => {
    if (notice?.kind !== 'ok') return
    const t = window.setTimeout(onClose, 2200)
    return () => window.clearTimeout(t)
  }, [notice, onClose])

  if (!notice) return null
  return (
    <div className={`notice notice-${notice.kind}`} role={notice.kind === 'ok' ? 'status' : 'alert'}>
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
      {notice.kind !== 'ok' && (
        <button className="icon-btn" aria-label="Close message" onClick={onClose}>
          ✕
        </button>
      )}
    </div>
  )
}
