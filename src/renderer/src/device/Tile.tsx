import type { AppTile, TileStyle } from '../../../shared/config'

// Black or white text, whichever is easier to read on the given color.
export function readableOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#1b1711' : '#ffffff'
}

interface Props {
  app: AppTile
  size: number
  style?: TileStyle
  pressed?: boolean
}

// One app button, Stream Deck style: colored square with the app's image or
// first letter, and (depending on the style) its name.
export default function Tile({ app, size, style = 'imageName', pressed }: Props): React.JSX.Element {
  const fg = readableOn(app.color)
  const useImage = style !== 'letterName' && !!app.icon
  const showName = !(useImage && style === 'image')

  return (
    <div
      className={`dev-tile ${pressed ? 'is-pressed' : ''} ${showName ? 'has-name' : ''}`}
      style={{ width: size, height: size, background: app.color, color: fg }}
      title={app.name}
    >
      {useImage ? (
        <img
          className="dev-tile-icon"
          src={app.icon}
          alt=""
          draggable={false}
          style={{ width: size * (showName ? 0.5 : 0.66), height: size * (showName ? 0.5 : 0.66) }}
        />
      ) : (
        <span className="dev-tile-letter" style={{ fontSize: size * 0.38 }}>
          {app.name.charAt(0).toUpperCase()}
        </span>
      )}
      {showName && (
        <span className="dev-tile-name" style={{ fontSize: Math.max(11, size * 0.12) }}>
          {app.name}
        </span>
      )}
    </div>
  )
}
