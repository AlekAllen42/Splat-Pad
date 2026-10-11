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
import { LanguageProvider } from './i18n'
import { stringsFor } from '../../shared/i18n'
import { DEFAULT_CONFIG } from '../../shared/config'

export default function App(): React.JSX.Element {
  const [themeMode, setThemeMode] = useAppTheme()
  const settings = useSettings()
  const { config, update } = settings
  const [testMode, setTestMode] = useState(false) // not saved; always starts off

  const t = stringsFor(config.language)

  if (!settings.ready) return <div className="app-loading">{t.loading}</div>

  return (
    <LanguageProvider language={config.language}>
    <div className="app">
      <TopBar
        themeMode={themeMode}
        onThemeModeChange={setThemeMode}
        language={config.language}
        onLanguageChange={(language) => update((c) => ({ ...c, language }))}
        unsaved={settings.unsaved}
        onSave={() => void settings.save()}
        onDiscard={settings.discard}
      />

      <main className="quadrants">
        <Panel
          className="panel-tl"
          title={t.liveScreen}
          subtitle={testMode ? t.liveScreenTestSub : t.liveScreenSub}
        >
          <DeviceScreen config={config} testMode={testMode} />
        </Panel>
        <Panel className="panel-tr" title={t.layout} subtitle={t.layoutSub}>
          <LayoutEditor
            layout={config.layout}
            theme={config.theme}
            onChange={(layout) => update((c) => ({ ...c, layout }))}
            onReset={() => update((c) => ({ ...c, layout: DEFAULT_CONFIG.layout }))}
          />
        </Panel>
        <Panel className="panel-bl" title={t.createWithAi} subtitle={t.createWithAiSub}>
          <AiPanel config={config} update={update} />
        </Panel>
        <Panel className="panel-br" title={t.library} subtitle={t.librarySub}>
          <Library config={config} update={update} />
        </Panel>

        <CenterStar active={testMode} onToggle={() => setTestMode((t) => !t)} />
      </main>

      <NoticeToast notice={settings.notice} onClose={settings.clearNotice} />
    </div>
    </LanguageProvider>
  )
}
