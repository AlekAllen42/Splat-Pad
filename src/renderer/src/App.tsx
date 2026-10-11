import { useState } from 'react'
import TopBar from './components/TopBar'
import CenterStar from './components/CenterStar'
import Panel from './components/Panel'
import NoticeToast from './components/NoticeToast'
import DeviceScreen from './device/DeviceScreen'
import LayoutEditor from './editor/LayoutEditor'
import Library from './library/Library'
import AiPanel from './ai/AiPanel'
import { useAppTheme } from './appTheme'
import { useSettings } from './settings'
import { DEFAULT_CONFIG } from '../../shared/config'

export default function App(): React.JSX.Element {
  const [themeMode, setThemeMode] = useAppTheme()
  const settings = useSettings()
  const { config, update } = settings
  const [testMode, setTestMode] = useState(false) // not saved; always starts off

  if (!settings.ready) return <div className="app-loading">Loading your Splat Pad…</div>

  return (
    <div className="app">
      <TopBar
        themeMode={themeMode}
        onThemeModeChange={setThemeMode}
        unsaved={settings.unsaved}
        onSave={() => void settings.save()}
        onDiscard={settings.discard}
      />

      <main className="quadrants">
        <Panel
          className="panel-tl"
          title="Live screen"
          subtitle={testMode ? 'Test mode: taps open apps and change volume on this PC' : 'What your Splat Pad shows right now'}
        >
          <DeviceScreen config={config} testMode={testMode} />
        </Panel>
        <Panel className="panel-tr" title="Layout" subtitle="Drag, resize and arrange pieces of the screen">
          <LayoutEditor
            layout={config.layout}
            theme={config.theme}
            onChange={(layout) => update((c) => ({ ...c, layout }))}
            onReset={() => update((c) => ({ ...c, layout: DEFAULT_CONFIG.layout }))}
          />
        </Panel>
        <Panel className="panel-bl" title="Create with AI" subtitle="Describe something new for your Splat Pad">
          <AiPanel config={config} update={update} />
        </Panel>
        <Panel className="panel-br" title="Library" subtitle="Apps, pieces, controls, colors and options">
          <Library config={config} update={update} />
        </Panel>

        <CenterStar active={testMode} onToggle={() => setTestMode((t) => !t)} />
      </main>

      <NoticeToast notice={settings.notice} onClose={settings.clearNotice} />
    </div>
  )
}
