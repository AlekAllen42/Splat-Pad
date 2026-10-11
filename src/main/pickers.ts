import { app, BrowserWindow, dialog, ipcMain, nativeImage, shell } from 'electron'
import { readFile } from 'fs/promises'
import { basename, extname, join } from 'path'

export interface PickedProgram {
  name: string
  path: string // what to launch
  icon?: string // PNG data URL
}

const MAX_ICON_PX = 256 // custom images are shrunk to this so the settings file stays small

// Windows: start the file picker in the Start Menu, where every installed program has a shortcut.
function defaultProgramFolder(): string | undefined {
  if (process.platform === 'win32' && process.env.ProgramData)
    return join(process.env.ProgramData, 'Microsoft', 'Windows', 'Start Menu', 'Programs')
  if (process.platform === 'linux') return '/usr/share/applications'
  return undefined
}

async function pickProgram(win: BrowserWindow): Promise<PickedProgram | null> {
  const result = await dialog.showOpenDialog(win, {
    title: 'Choose a program',
    defaultPath: defaultProgramFolder(),
    properties: ['openFile'],
    filters:
      process.platform === 'win32'
        ? [
            { name: 'Programs and shortcuts', extensions: ['exe', 'lnk', 'bat', 'cmd'] },
            { name: 'All files', extensions: ['*'] }
          ]
        : [{ name: 'All files', extensions: ['*'] }]
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return describeProgram(result.filePaths[0])
}

// Name, launch path and icon for a program file or shortcut.
export async function describeProgram(picked: string): Promise<PickedProgram> {
  let target = picked
  // A Windows shortcut (.lnk) points at the real program; use that for the icon.
  // Targets can contain variables like %windir%, which must be filled in first.
  if (process.platform === 'win32' && extname(picked).toLowerCase() === '.lnk') {
    try {
      const raw = shell.readShortcutLink(picked).target
      if (raw) target = raw.replace(/%([^%]+)%/g, (whole, name: string) => process.env[name] ?? whole)
    } catch {
      // unreadable shortcut: keep the .lnk itself, Windows can still open it
    }
  }

  let icon: string | undefined
  try {
    const img = await app.getFileIcon(target, { size: 'large' })
    if (!img.isEmpty()) icon = img.toDataURL()
  } catch {
    // no icon available; the tile shows the first letter instead
  }

  return { name: basename(picked, extname(picked)), path: picked, icon }
}

async function pickImage(win: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(win, {
    title: 'Choose an icon image',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] }]
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const file = result.filePaths[0]

  if (extname(file).toLowerCase() === '.svg') {
    const svg = await readFile(file)
    return `data:image/svg+xml;base64,${svg.toString('base64')}`
  }
  let img = nativeImage.createFromPath(file)
  if (img.isEmpty()) return null
  const { width, height } = img.getSize()
  if (Math.max(width, height) > MAX_ICON_PX) {
    img = width >= height ? img.resize({ width: MAX_ICON_PX }) : img.resize({ height: MAX_ICON_PX })
  }
  return img.toDataURL()
}

export function registerPickers(): void {
  ipcMain.handle('pick-program', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    return win ? pickProgram(win) : null
  })
  ipcMain.handle('pick-image', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    return win ? pickImage(win) : null
  })
}
