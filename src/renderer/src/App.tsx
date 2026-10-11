import { useState } from 'react'
import TopBar from './components/TopBar'
import Panel from './components/Panel'
import DeviceScreen from './device/DeviceScreen'
import { useAppTheme } from './appTheme'
import { DEFAULT_CONFIG, type Config } from '../../shared/config'

export default function App(): React.JSX.Element {
  const [themeMode, setThemeMode] = useAppTheme()
  // The settings being edited. Later steps change these; Save writes them to disk.
  const [config] = useState<Config>(DEFAULT_CONFIG)

  return (
    <div className="app">
      <TopBar themeMode={themeMode} onThemeModeChange={setThemeMode} />

      <main className="quadrants">
        <Panel title="Live screen" subtitle="What your Splat Pad shows right now">
          <DeviceScreen config={config} />
        </Panel>
        <Panel title="Layout" subtitle="Drag, resize and arrange pieces of the screen">
          <div className="placeholder">Layout editor comes in step 3</div>
        </Panel>
        <Panel title="Create with AI" subtitle="Describe something new for your Splat Pad">
          <div className="placeholder">AI panel comes in step 5</div>
        </Panel>
        <Panel title="Library" subtitle="Apps, widgets, presets and colors">
          <div className="placeholder">Library comes in step 4</div>
        </Panel>
      </main>
    </div>
  )
}
