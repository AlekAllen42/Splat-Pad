import { nativeImage, net } from 'electron'

// Finds a website's icon and returns it as a data URL (or null).
// Prefers the bigger "home screen" icon (apple-touch-icon, usually 180px)
// because the tab icon (favicon, often 16-32px) looks blurry on a big tile.

const TIMEOUT_MS = 8000
const MAX_BYTES = 1024 * 1024
const MAX_ICON_PX = 256

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await net.fetch(url, { signal: controller.signal, redirect: 'follow' })
    return res.ok ? res : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

interface Candidate {
  href: string
  score: number
}

// Reads <link rel="...icon..." href="..." sizes="..."> tags from the page.
function findIconLinks(html: string, pageUrl: string): Candidate[] {
  const candidates: Candidate[] = []
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const attr = (name: string): string | undefined =>
      tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1] ??
      tag.match(new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, 'i'))?.[1]
    const rel = attr('rel')?.toLowerCase() ?? ''
    const href = attr('href')
    if (!href || !/\bicon\b|apple-touch-icon/.test(rel)) continue
    let abs: string
    try {
      abs = new URL(href, pageUrl).toString()
    } catch {
      continue
    }
    const size = Number(attr('sizes')?.match(/(\d+)x\d+/i)?.[1] ?? 0)
    const isSvg = /\.svg(\?|$)/i.test(abs) || attr('type') === 'image/svg+xml'
    // bigger is better; apple-touch-icon and svg are usually big/crisp
    const score = (rel.includes('apple-touch-icon') ? 180 : 0) + (isSvg ? 200 : 0) + Math.min(size, 512)
    candidates.push({ href: abs, score })
  }
  return candidates.sort((a, b) => b.score - a.score)
}

async function download(url: string): Promise<string | null> {
  const res = await fetchWithTimeout(url)
  if (!res) return null
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length === 0 || buf.length > MAX_BYTES) return null
  const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()

  if (type === 'image/svg+xml' || /\.svg(\?|$)/i.test(url)) return `data:image/svg+xml;base64,${buf.toString('base64')}`
  if (type.includes('icon') || /\.ico(\?|$)/i.test(url)) return `data:image/x-icon;base64,${buf.toString('base64')}`

  let img = nativeImage.createFromBuffer(buf)
  if (img.isEmpty()) return null
  const { width, height } = img.getSize()
  if (Math.max(width, height) > MAX_ICON_PX)
    img = width >= height ? img.resize({ width: MAX_ICON_PX }) : img.resize({ height: MAX_ICON_PX })
  return img.toDataURL()
}

export async function fetchSiteIcon(siteUrl: string): Promise<string | null> {
  let page: URL
  try {
    page = new URL(siteUrl)
  } catch {
    return null
  }
  if (page.protocol !== 'https:' && page.protocol !== 'http:') return null

  const res = await fetchWithTimeout(page.toString())
  const html = res ? (await res.text()).slice(0, 300_000) : ''
  const candidates = findIconLinks(html, res?.url || page.toString())
  // last resort: the classic /favicon.ico at the site root
  candidates.push({ href: new URL('/favicon.ico', page).toString(), score: -1 })

  for (const c of candidates.slice(0, 5)) {
    const icon = await download(c.href)
    if (icon) return icon
  }
  return null
}
