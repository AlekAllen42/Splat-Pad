import { Menu, Tray, nativeImage } from 'electron'
import { autostartAvailable, isAutostartOn, setAutostart } from './autostart'
import { t } from './language'
import { getUpdateStatus } from './updater'

// The 42 Potential icon next to the clock. Click: open the window.
// Right-click: open, start with Windows, quit.

let tray: Tray | null = null

export interface TrayActions {
  show: () => void
  quit: () => void
  checkForUpdates: () => void
  restartToUpdate: () => void
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
      updateItem(actions),
      { type: 'separator' },
      { label: s.trayQuit, click: actions.quit }
    ])
  )
}

// "Check for updates", or what's happening with the current one.
function updateItem(actions: TrayActions): Electron.MenuItemConstructorOptions {
  const s = t()
  const u = getUpdateStatus()
  switch (u.state) {
    case 'dev':
      return { label: s.updatesDev, enabled: false }
    case 'checking':
      return { label: s.updatesChecking, enabled: false }
    case 'downloading':
      return { label: s.updatesDownloading(u.percent), enabled: false }
    case 'ready':
      return { label: s.updatesReady(u.version), click: actions.restartToUpdate }
    default:
      return { label: s.updatesCheck, click: actions.checkForUpdates }
  }
}

// Windows: a one-time balloon pointing at the tray icon.
export function showTrayHint(): void {
  if (!tray) return
  const s = t()
  if (process.platform === 'win32') tray.displayBalloon({ title: s.trayHintTitle, content: s.trayHintBody, iconType: 'info' })
}
