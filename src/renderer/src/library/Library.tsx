import { useState } from 'react'
import type { Config } from '../../../shared/config'
import AppsTab from './AppsTab'
import PiecesTab from './PiecesTab'
import ControlsTab from './ControlsTab'
import ColorsTab from './ColorsTab'
import OptionsTab from './OptionsTab'
import type { ConfigUpdate } from './helpers'
import './library.css'

const TABS = [
  { id: 'apps', label: 'Apps', Component: AppsTab },
  { id: 'pieces', label: 'Pieces', Component: PiecesTab },
  { id: 'controls', label: 'Controls', Component: ControlsTab },
  { id: 'colors', label: 'Colors', Component: ColorsTab },
  { id: 'options', label: 'Options', Component: OptionsTab }
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
  const Active = TABS.find((t) => t.id === tab)!.Component

  return (
    <div className="library">
      <div className="lib-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'is-on' : ''}
            onClick={() => {
              setTab(t.id)
              try {
                localStorage.setItem(STORAGE_KEY, t.id)
              } catch {
                // not fatal
              }
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="lib-body">
        <Active config={config} update={update} />
      </div>
    </div>
  )
}
