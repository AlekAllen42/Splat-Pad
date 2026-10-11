import { useState } from 'react'
import { removeApp, type Config } from '../../../shared/config'
import type { ConfigUpdate } from './helpers'

// Starter apps that came with the default settings (see DEFAULT_CONFIG).
const STARTER_IDS = ['browser', 'spotify', 'discord', 'obs', 'steam', 'code', 'files', 'terminal']

type Results = Record<string, PickedProgram | null>

// Offers to link the placeholder starter apps to real programs on this PC.
// Searching changes nothing; the user ticks what to link/remove and clicks Apply.
export default function StarterFinder({ config, update }: { config: Config; update: ConfigUpdate }): React.JSX.Element | null {
  const [state, setState] = useState<'idle' | 'searching' | 'results'>('idle')
  const [results, setResults] = useState<Results>({})
  const [chosen, setChosen] = useState<Record<string, boolean>>({})
  const [dismissed, setDismissed] = useState(false)

  const unlinked = config.apps.filter((a) => STARTER_IDS.includes(a.id) && a.action.type === 'none')
  if (dismissed || unlinked.length === 0) return null

  const search = async (): Promise<void> => {
    setState('searching')
    const found = await window.splatPad.findStarterApps(unlinked.map((a) => a.id))
    setResults(found)
    // pre-tick links for programs that were found; removals stay unticked
    setChosen(Object.fromEntries(unlinked.map((a) => [a.id, !!found[a.id]])))
    setState('results')
  }

  const apply = (): void => {
    update((c) => {
      let next = c
      for (const app of unlinked) {
        if (!chosen[app.id]) continue
        const program = results[app.id]
        next = program
          ? {
              ...next,
              apps: next.apps.map((a) =>
                a.id === app.id ? { ...a, icon: program.icon ?? a.icon, action: { type: 'launch', target: program.path } } : a
              )
            }
          : removeApp(next, app.id)
      }
      return next
    })
    setDismissed(true)
  }

  if (state !== 'results') {
    return (
      <div className="lib-starter">
        <p>
          {unlinked.length} starter {unlinked.length === 1 ? 'app isn’t' : 'apps aren’t'} linked to a program yet, so{' '}
          {unlinked.length === 1 ? 'it shows' : 'they show'} letters. Look for them on this PC? Nothing changes until you
          approve.
        </p>
        <div className="lib-actions">
          <button className="btn btn-small btn-primary" disabled={state === 'searching'} onClick={search}>
            {state === 'searching' ? 'Searching…' : 'Find these on my PC'}
          </button>
          <button className="btn btn-small" onClick={() => setDismissed(true)}>
            Not now
          </button>
        </div>
      </div>
    )
  }

  const count = Object.values(chosen).filter(Boolean).length
  return (
    <div className="lib-starter">
      <p>Here’s what I found. Tick what you want, then Apply.</p>
      <ul className="lib-list">
        {unlinked.map((app) => {
          const program = results[app.id]
          return (
            <li key={app.id} className="lib-starter-row">
              <label>
                <input
                  type="checkbox"
                  checked={!!chosen[app.id]}
                  onChange={(e) => setChosen({ ...chosen, [app.id]: e.target.checked })}
                />
                {program ? (
                  <>
                    <span>Link {app.name} →</span>
                    {program.icon && <img src={program.icon} alt="" />}
                    <strong>{program.name}</strong>
                  </>
                ) : (
                  <span>
                    Remove {app.name} <em>(not found on this PC)</em>
                  </span>
                )}
              </label>
            </li>
          )
        })}
      </ul>
      <div className="lib-actions">
        <button className="btn btn-small btn-primary" disabled={count === 0} onClick={apply}>
          Apply{count ? ` (${count})` : ''}
        </button>
        <button className="btn btn-small" onClick={() => setDismissed(true)}>
          Cancel
        </button>
      </div>
    </div>
  )
}
