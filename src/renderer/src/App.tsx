import { useState } from 'react'
import TopBar from './components/TopBar'
import Panel from './components/Panel'
import DeviceScreen from './device/DeviceScreen'
import LayoutEditor from './editor/LayoutEditor'
import Library from './library/Library'
import { useAppTheme } from './appTheme'
import { DEFAULT_CONFIG, type Config } from '../../shared/config'

export default function App(): React.JSX.Element {
  const [themeMode, setThemeMode] = useAppTheme()
  // The settings being edited. Save (step 6) writes them to disk.
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG)

  return (
    <div className="app">
      <TopBar themeMode={themeMode} onThemeModeChange={setThemeMode} />

      <main className="quadrants">
        <Panel title="Live screen" subtitle="What your Splat Pad shows right now">
          <DeviceScreen config={config} />
        </Panel>
        <Panel title="Layout" subtitle="Drag, resize and arrange pieces of the screen">
          <LayoutEditor
            layout={config.layout}
            theme={config.theme}
            onChange={(layout) => setConfig((c) => ({ ...c, layout }))}
            onReset={() => setConfig((c) => ({ ...c, layout: DEFAULT_CONFIG.layout }))}
          />
        </Panel>
        <Panel title="Create with AI" subtitle="Describe something new for your Splat Pad">
          <div className="placeholder">AI panel comes in step 5</div>
        </Panel>
        <Panel title="Library" subtitle="Apps, pieces, controls, colors and options">
          <Library config={config} update={setConfig} />
        </Panel>
      </main>
    </div>
  )
}
