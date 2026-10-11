import { useEffect, useRef, useState } from 'react'
import { SCREEN_HEIGHT, SCREEN_WIDTH, type AppTile, type Config, type Widget } from '../../../shared/config'
import Carousel from './Carousel'
import { Clock, ControlsButton, Favorites, Presets, SliderPanel } from './widgets'
import { useFitScale } from './useFitScale'
import './device.css'

const BEZEL = 22 // frame around the screen, in device pixels (preview only)

// A working stand-in for the Splat Pad's 800x480 screen.
export default function DeviceScreen({ config }: { config: Config }): React.JSX.Element {
  const [fitRef, scale] = useFitScale(SCREEN_WIDTH + BEZEL * 2, SCREEN_HEIGHT + BEZEL * 2)
  const [panelOpen, setPanelOpen] = useState(false)
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({})
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [pressedId, setPressedId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  // Tapping an app flashes the tile; the "Opening ..." message is optional (Library setting).
  const tapApp = (app: AppTile): void => {
    setPressedId(app.id)
    window.setTimeout(() => setPressedId(null), 160)
    if (!config.behavior.showOpenMessage) return
    window.clearTimeout(toastTimer.current)
    setToast(`Opening ${app.name}`)
    toastTimer.current = window.setTimeout(() => setToast(null), 1400)
  }

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const { theme } = config
  const favoriteApps = config.favorites
    .map((id) => config.apps.find((a) => a.id === id))
    .filter((a): a is AppTile => a !== undefined)

  const renderWidget = (wgt: Widget): React.JSX.Element => {
    switch (wgt.type) {
      case 'clock':
        return <Clock settings={config.clock} w={wgt.w} h={wgt.h} />
      case 'carousel':
        return (
          <Carousel apps={config.apps} tileStyle={config.tiles.style} settings={config.carousel} width={wgt.w} height={wgt.h} scale={scale} onTap={tapApp} />
        )
      case 'favorites':
        return <Favorites apps={favoriteApps} tileStyle={config.tiles.style} w={wgt.w} h={wgt.h} pressedId={pressedId} onPress={tapApp} />
      case 'presets':
        return (
          <Presets
            presets={config.presets}
            activeId={activePreset}
            onApply={(p) => {
              setActivePreset(p.id)
              setSliderValues((v) => ({ ...v, ...p.values }))
            }}
          />
        )
      case 'controls':
        return <ControlsButton w={wgt.w} h={wgt.h} onOpen={() => setPanelOpen(true)} />
    }
  }

  return (
    <div ref={fitRef} className="device-fit">
      <div
        className="device"
        style={{
          width: SCREEN_WIDTH + BEZEL * 2,
          height: SCREEN_HEIGHT + BEZEL * 2,
          padding: BEZEL,
          transform: `translate(-50%, -50%) scale(${scale})`
        }}
      >
        <div
          className="dev-screen"
          style={
            {
              width: SCREEN_WIDTH,
              height: SCREEN_HEIGHT,
              '--d-bg': theme.background,
              '--d-surface': theme.surface,
              '--d-accent': theme.accent,
              '--d-text': theme.text
            } as React.CSSProperties
          }
        >
          {config.layout.map((wgt) => (
            <div
              key={wgt.id}
              className={`dev-widget dev-widget-${wgt.type}`}
              style={{ left: wgt.x, top: wgt.y, width: wgt.w, height: wgt.h }}
            >
              {renderWidget(wgt)}
            </div>
          ))}

          <SliderPanel
            open={panelOpen}
            sliders={config.sliders}
            values={sliderValues}
            onChange={(id, v) => {
              setActivePreset(null)
              setSliderValues((vals) => ({ ...vals, [id]: v }))
            }}
            onClose={() => setPanelOpen(false)}
          />

          {toast && <div className="dev-toast">{toast}</div>}
        </div>
      </div>
    </div>
  )
}
