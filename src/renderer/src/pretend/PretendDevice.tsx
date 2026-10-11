import { useEffect, useRef, useState } from 'react'
import DeviceScreen from '../device/DeviceScreen'
import { LanguageProvider } from '../i18n'
import { stringsFor } from '../../../shared/i18n'
import type { WireConfig } from '../../../shared/protocol'
import { PretendFirmware } from './firmware'

// The pretend Splat Pad window: shows whatever the app has sent it, and
// sends taps and slider moves back, through the same protocol as the real
// device.
export default function PretendDevice(): React.JSX.Element {
  const [config, setConfig] = useState<WireConfig | null>(null)
  const firmware = useRef<PretendFirmware | null>(null)

  useEffect(() => {
    const wire = window.pretendWire!
    const fw = new PretendFirmware(wire.send, setConfig)
    firmware.current = fw
    fw.boot() // show what's on the "card" right away, like a real power-on
    const stop = wire.onLine((line) => fw.receive(line))
    wire.ready() // "plug in the cable"
    return stop
  }, [])

  const t = stringsFor(config?.language ?? 'en')

  return (
    <LanguageProvider language={config?.language ?? 'en'}>
      <div className="pretend">
        <p className="pretend-note">{t.pretendNote}</p>
        <div className="pretend-screen">
          {config ? (
            <DeviceScreen config={config} onEvent={(e) => firmware.current?.report(e)} />
          ) : (
            <div className="pretend-waiting">{t.waitingForComputer}</div>
          )}
        </div>
      </div>
    </LanguageProvider>
  )
}
