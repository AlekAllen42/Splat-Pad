import TopBar from './components/TopBar'
import Panel from './components/Panel'
import { useAppTheme } from './appTheme'

export default function App(): React.JSX.Element {
  const [themeMode, setThemeMode] = useAppTheme()

  return (
    <div className="app">
      <TopBar themeMode={themeMode} onThemeModeChange={setThemeMode} />

      <main className="quadrants">
        <Panel title="Live screen" subtitle="What your Splat Pad shows right now">
          <div className="placeholder">Device preview comes in step 2</div>
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
