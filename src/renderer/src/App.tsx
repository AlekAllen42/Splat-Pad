import { useEffect, useRef, useState } from 'react'
import ConnectionLight, { useConnectionStatus } from './components/ConnectionLight'
import { runApp, runSlider } from './device/testRunner'
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
  const connection = useConnectionStatus()

  // Taps and slider moves on the Splat Pad run on this PC (same code as test mode).
  const configRef = useRef(config)
  configRef.current = config
  const showNotice = settings.showNotice
  useEffect(
    () =>
      window.splatPad.onDeviceEvent((event) => {
        const c = configRef.current
        const t = stringsFor(c.language)
        const report = (messages: string[]): void => {
          if (messages.length) showNotice({ kind: 'info', text: messages.join(' · ') })
        }
        if (event.type === 'tap') {
          const target = c.apps.find((a) => a.id === event.appId)
          if (target) void runApp(target, c, t).then(report)
        } else if (event.type === 'slider') {
          const slider = c.sliders.find((s) => s.id === event.sliderId)
          if (slider) void runSlider(slider, event.value, t).then((m) => report([m]))
        } else {
          const preset = c.presets.find((p) => p.id === event.presetId)
          if (!preset) return
          void Promise.all(
            Object.entries(preset.values).map(([id, value]) => {
              const slider = c.sliders.find((s) => s.id === id)
              return slider ? runSlider(slider, value, t) : Promise.resolve('')
            })
          ).then((m) => report(m.filter(Boolean)))
        }
      }),
    [showNotice]
  )

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
          status={<ConnectionLight status={connection} />}
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
