import { useEffect, useState } from 'react'
import type { ConnectionStatus } from '../../../shared/protocol'
import { useT } from '../i18n'

// Follows the device connection status from the main process.
export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>({ state: 'disconnected' })
  useEffect(() => {
    void window.splatPad.getDeviceStatus().then(setStatus)
    return window.splatPad.onDeviceStatus(setStatus)
  }, [])
  return status
}

// A small dot and label: green connected, orange connecting, grey not connected.
export default function ConnectionLight({ status }: { status: ConnectionStatus }): React.JSX.Element {
  const t = useT()
  const label =
    status.state === 'connected'
      ? t.deviceConnected(status.pretend ? t.pretendName : 'Splat Pad')
      : status.state === 'connecting'
        ? t.deviceConnecting
        : t.deviceNotConnected
  return (
    <span
      className={`conn-light conn-${status.state}`}
      role="status"
      title={status.state === 'connected' ? t.deviceDetails(status.model, status.firmware) : undefined}
    >
      <span className="conn-dot" aria-hidden />
      {label}
    </span>
  )
}
