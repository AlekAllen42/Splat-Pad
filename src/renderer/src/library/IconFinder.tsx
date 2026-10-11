import { useEffect, useState } from 'react'
import type { Config } from '../../../shared/config'
import type { ConfigUpdate } from './helpers'
import { useT } from '../i18n'
import { readableOn } from '../device/Tile'

// What to look for: program paths (the apps' launch targets).
// quiet = started automatically after adding a program: say nothing if no better icon exists.
export interface IconRequest {
  targets: string[]
  quiet: boolean
}

interface Found {
  target: string
  name: string
  current?: string
  color: string // the tile color, so choices are previewed as they'll look
  options: string[]
}

// Offers icons found in the programs' files. Nothing changes until the user
// clicks an icon and Apply (same idea as StarterFinder).
export default function IconFinder({
  config,
  update,
  request,
  onDone
}: {
  config: Config
  update: ConfigUpdate
  request: IconRequest | null
  onDone: () => void
}): React.JSX.Element | null {
  const t = useT()
  const [found, setFound] = useState<Found[] | null>(null)
  const [chosen, setChosen] = useState<Record<string, string>>({}) // target -> picked icon

  useEffect(() => {
    if (!request) return
    let cancelled = false
    setFound(null)
    setChosen({})
    void (async () => {
      const results: Found[] = []
      for (const target of request.targets) {
        const app = config.apps.find((a) => a.action.type === 'launch' && a.action.target === target)
        if (!app) continue
        const options = (await window.splatPad.findIcons(target)).filter((url) => url !== app.icon)
        if (options.length) results.push({ target, name: app.name, current: app.icon, color: app.color, options })
      }
      if (cancelled) return
      if (results.length === 0 && request.quiet) onDone()
      else setFound(results)
    })()
    return () => {
      cancelled = true
    }
    // only a new request starts a search (config changes while it runs are fine)
  }, [request])

  if (!request) return null
  if (!found) {
    return request.quiet ? null : (
      <div className="lib-starter">
        <p>{t.iconsSearching}</p>
      </div>
    )
  }

  if (found.length === 0) {
    return (
      <div className="lib-starter">
        <p>{t.iconsNone}</p>
        <div className="lib-actions">
          <button className="btn btn-small" onClick={onDone}>
            {t.close}
          </button>
        </div>
      </div>
    )
  }

  const count = Object.keys(chosen).length
  const apply = (): void => {
    update((c) => ({
      ...c,
      apps: c.apps.map((a) =>
        a.action.type === 'launch' && chosen[a.action.target] ? { ...a, icon: chosen[a.action.target] } : a
      )
    }))
    onDone()
  }

  const pick = (target: string, icon: string | null): void => {
    const next = { ...chosen }
    if (icon) next[target] = icon
    else delete next[target]
    setChosen(next)
  }

  return (
    <div className="lib-starter">
      <p>{t.iconsFound}</p>
      <ul className="lib-list">
        {found.map((f) => (
          <li key={f.target} className="lib-icon-choices">
            <strong>{f.name}</strong>
            <div className="lib-icon-options" role="radiogroup" aria-label={f.name}>
              <button
                role="radio"
                aria-checked={!chosen[f.target]}
                style={{ background: f.color }}
                className={`lib-icon-option ${!chosen[f.target] ? 'is-on' : ''}`}
                title={t.iconsKeep}
                onClick={() => pick(f.target, null)}
              >
                {f.current ? <img src={f.current} alt={t.iconsCurrent} /> : <span style={{ color: readableOn(f.color) }}>{f.name.charAt(0).toUpperCase()}</span>}
              </button>
              {f.options.map((url, i) => (
                <button
                  key={i}
                  role="radio"
                  aria-checked={chosen[f.target] === url}
                  style={{ background: f.color }}
                className={`lib-icon-option ${chosen[f.target] === url ? 'is-on' : ''}`}
                  title={t.iconsOption(i + 1)}
                  onClick={() => pick(f.target, url)}
                >
                  <img src={url} alt={t.iconsOption(i + 1)} />
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <div className="lib-actions">
        <button className="btn btn-small btn-primary" disabled={count === 0} onClick={apply}>
          {t.apply(count)}
        </button>
        <button className="btn btn-small" onClick={onDone}>
          {t.notNow}
        </button>
      </div>
    </div>
  )
}
