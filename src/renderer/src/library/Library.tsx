import { useState } from 'react'
import type { Config } from '../../../shared/config'
import AppsTab from './AppsTab'
import PiecesTab from './PiecesTab'
import ControlsTab from './ControlsTab'
import ColorsTab from './ColorsTab'
import OptionsTab from './OptionsTab'
import type { ConfigUpdate } from './helpers'
import './library.css'
import { useT } from '../i18n'

const TABS = [
  { id: 'apps', label: 'tabApps', Component: AppsTab },
  { id: 'pieces', label: 'tabPieces', Component: PiecesTab },
  { id: 'controls', label: 'tabControls', Component: ControlsTab },
  { id: 'colors', label: 'tabColors', Component: ColorsTab },
  { id: 'options', label: 'tabOptions', Component: OptionsTab }
] as const

type TabId = (typeof TABS)[number]['id']
const STORAGE_KEY = 'splatpad.libraryTab'

function loadTab(): TabId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (TABS.some((t) => t.id === saved)) return saved as TabId
  } catch {
    // storage unavailable
  }
  return 'apps'
}

export default function Library({ config, update }: { config: Config; update: ConfigUpdate }): React.JSX.Element {
  const [tab, setTab] = useState<TabId>(loadTab)
  const t = useT()
  const Active = TABS.find((x) => x.id === tab)!.Component

  return (
    <div className="library">
      <div className="lib-tabs" role="tablist">
        {TABS.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={tab === x.id}
            className={tab === x.id ? 'is-on' : ''}
            onClick={() => {
              setTab(x.id)
              try {
                localStorage.setItem(STORAGE_KEY, x.id)
              } catch {
                // not fatal
              }
            }}
          >
            {t[x.label]}
          </button>
        ))}
      </div>
      <div className="lib-body">
        <Active config={config} update={update} />
      </div>
    </div>
  )
}
