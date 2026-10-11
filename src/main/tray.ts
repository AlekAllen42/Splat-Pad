import { Menu, Tray, nativeImage } from 'electron'
import { autostartAvailable, isAutostartOn, setAutostart } from './autostart'
import { t } from './language'

// The 42 Potential icon next to the clock. Click: open the window.
// Right-click: open, start with Windows, quit.

let tray: Tray | null = null

export interface TrayActions {
  show: () => void
  quit: () => void
}

export function createTray(icon: string, actions: TrayActions): Tray {
  const image = nativeImage.createFromPath(icon).resize({ width: 32, height: 32 })
  tray = new Tray(image)
  tray.setToolTip('Splat Pad')
  tray.on('click', actions.show)
  refreshTrayMenu(actions)
  return tray
}

// Rebuild the menu (after a language change or the autostart switch flips).
export function refreshTrayMenu(actions: TrayActions): void {
  if (!tray) return
  const s = t()
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: s.trayOpen, click: actions.show },
      {
        label: s.startAtLogin,
        type: 'checkbox',
        checked: isAutostartOn(),
        enabled: autostartAvailable(),
        click: (item) => {
          setAutostart(item.checked)
          refreshTrayMenu(actions)
        }
      },
      { type: 'separator' },
      { label: s.trayQuit, click: actions.quit }
    ])
  )
}

// Windows: a one-time balloon pointing at the tray icon.
export function showTrayHint(): void {
  if (!tray) return
  const s = t()
  if (process.platform === 'win32') tray.displayBalloon({ title: s.trayHintTitle, content: s.trayHintBody, iconType: 'info' })
}
