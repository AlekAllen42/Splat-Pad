import { app, ipcMain, nativeImage, shell } from 'electron'
import { readdir, stat } from 'fs/promises'
import { basename, dirname, extname, join } from 'path'

// Looks through a program's files for icons that are sharper than the small
// one Windows gives us (48 px), e.g. a 256 px logo.png in the install folder,
// or a Microsoft Store app's Assets folder. Only *suggests*: the UI shows the
// results and the user picks one.

const MAX_ICON_PX = 256 // same limit as pickImage in pickers.ts
const MIN_ICON_PX = 32 // smaller images look blurry on the 5" screen
const MAX_RESULTS = 6
const MAX_FILES_SCANNED = 3000 // big install folders (games) are cut short

// Image names that are likely the app's logo (not toolbar or file-type icons).
const LOGO_NAME = /(^|[^a-z])(icon|logo|app|square\d*x\d*logo|storelogo)([^a-z]|$)/i
// Subfolders where programs usually keep their images.
const IMAGE_FOLDER = /^(assets|images?|icons?|resources|res|img|media|graphics|branding|ui)$/i
const IMAGE_EXT = new Set(['.png', '.ico'])

// Windows' own folders hold thousands of unrelated icons; never search them.
function isSystemFolder(folder: string): boolean {
  const win = (process.env.SystemRoot ?? 'C:\\Windows').toLowerCase()
  return folder.toLowerCase().startsWith(win)
}

const expandVars = (p: string): string => p.replace(/%([^%]+)%/g, (whole, name: string) => process.env[name] ?? whole)

// Image files under `folder`: its own files, plus image-named subfolders
// (and the app's name as a folder, as some programs nest everything there).
async function listImages(folder: string, appName: string, depth: number, budget: { left: number }): Promise<string[]> {
  let entries
  try {
    entries = await readdir(folder, { withFileTypes: true })
  } catch {
    return [] // no access (e.g. some Store app folders): just skip
  }
  const found: string[] = []
  for (const e of entries) {
    if (budget.left-- <= 0) break
    const p = join(folder, e.name)
    if (e.isFile() && IMAGE_EXT.has(extname(e.name).toLowerCase())) found.push(p)
    else if (e.isDirectory() && depth > 0 && (IMAGE_FOLDER.test(e.name) || e.name.toLowerCase().includes(appName)))
      found.push(...(await listImages(p, appName, depth - 1, budget)))
  }
  return found
}

// Program folders worth searching for a launch target.
function searchFolders(target: string): string[] {
  const folder = dirname(target)
  if (isSystemFolder(folder)) return []
  const folders = [folder]
  // Apps like Discord and Slack run from a versioned folder ("app-1.0.9") inside their real folder.
  if (/^app-[\d.]+$/i.test(basename(folder))) folders.push(dirname(folder))
  return folders
}

// Load an image file as a PNG data URL (shrunk to MAX_ICON_PX), or null if it's too small/unreadable.
function loadImage(file: string): { url: string; px: number } | null {
  let img = nativeImage.createFromPath(file)
  if (img.isEmpty()) return null
  const { width, height } = img.getSize()
  const px = Math.min(width, height)
  if (px < MIN_ICON_PX || Math.abs(width - height) > px * 0.25) return null // tiny or not square-ish
  if (px > MAX_ICON_PX) img = img.resize({ width: MAX_ICON_PX, height: MAX_ICON_PX, quality: 'best' })
  return { url: img.toDataURL(), px }
}

async function fileIcon(path: string): Promise<string | null> {
  try {
    const img = await app.getFileIcon(path, { size: 'large' })
    return img.isEmpty() ? null : img.toDataURL()
  } catch {
    return null
  }
}

// Candidate icons for a program or shortcut, best first.
export async function findIcons(launchTarget: string): Promise<string[]> {
  if (process.platform !== 'win32') return [] // TODO(linux): look up the .desktop file's Icon= in the icon theme
  const results: string[] = []
  const add = (url: string | null): void => {
    if (url && !results.includes(url)) results.push(url)
  }

  let target = expandVars(launchTarget)
  let shortcutIcon: string | null = null
  if (extname(target).toLowerCase() === '.lnk') {
    try {
      const link = shell.readShortcutLink(target)
      if (link.icon) {
        const iconFile = expandVars(link.icon)
        // an .ico file, or the first icon inside a program (a later index needs Windows APIs Electron doesn't expose)
        if (extname(iconFile).toLowerCase() === '.ico') shortcutIcon = loadImage(iconFile)?.url ?? null
        else if (!link.iconIndex) shortcutIcon = await fileIcon(iconFile)
      }
      if (link.target) target = expandVars(link.target)
    } catch {
      // unreadable shortcut: search next to the shortcut's target only if we know it
    }
  }

  // 1) large images in the program's folder, biggest and most logo-like first
  const appName = basename(target, extname(target)).toLowerCase()
  const budget = { left: MAX_FILES_SCANNED }
  const files = (await Promise.all(searchFolders(target).map((f) => listImages(f, appName, 2, budget)))).flat()
  const scored: { url: string; score: number }[] = []
  for (const file of files) {
    const name = basename(file, extname(file)).toLowerCase()
    if (!LOGO_NAME.test(name) && !name.includes(appName)) continue
    try {
      if ((await stat(file)).size > 2_000_000) continue
    } catch {
      continue
    }
    const img = loadImage(file)
    // bigger is better; the app's own name or "logo" in the file name breaks ties
    if (img) scored.push({ url: img.url, score: Math.min(img.px, MAX_ICON_PX) + (name.includes(appName) || /logo/.test(name) ? 64 : 0) })
  }
  scored.sort((a, b) => b.score - a.score)
  for (const s of scored) add(s.url)

  // 2) the shortcut's chosen icon, then the program's built-in icon
  add(shortcutIcon)
  add(await fileIcon(target))

  return results.slice(0, MAX_RESULTS)
}

export function registerIconFinder(): void {
  ipcMain.handle('find-icons', (_e, target: unknown) => (typeof target === 'string' && target ? findIcons(target) : []))
}
