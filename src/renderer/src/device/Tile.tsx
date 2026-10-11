import type { AppTile, TileShape, TileStyle } from '../../../shared/config'

// Black or white text, whichever is easier to read on the given color.
export function readableOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#1b1711' : '#ffffff'
}

interface Props {
  app: AppTile
  size: number // height; also the width of a square or circle
  shape?: TileShape
  gap?: number // space between columns; a rectangle is two squares plus one gap wide
  style?: TileStyle
  boxed?: boolean // false: no colored box, just the image/letter; the tap area stays the same
  pressed?: boolean
}

// Width of a tile of this shape.
export const tileWidth = (shape: TileShape, size: number, gap: number): number =>
  shape === 'rectangle' ? size * 2 + gap : size

// One app button, Stream Deck style: the app's image or first letter, and
// (depending on the style) its name, on a colored square, circle or
// double-wide rectangle, unless boxes are off.
export default function Tile({
  app,
  size,
  shape = 'square',
  gap = 12,
  style = 'imageName',
  boxed = true,
  pressed
}: Props): React.JSX.Element {
  const useImage = style !== 'letterName' && !!app.icon
  const showName = !(useImage && style === 'image')
  // Without a box the image can be bigger, since nothing surrounds it.
  const imageScale = boxed ? (showName ? 0.5 : 0.66) : showName ? 0.62 : 0.86

  return (
    <div
      className={`dev-tile dev-tile-${shape} ${boxed ? '' : 'is-bare'} ${pressed ? 'is-pressed' : ''} ${showName ? 'has-name' : ''}`}
      style={{
        width: tileWidth(shape, size, gap),
        height: size,
        // boxless tiles sit on the screen background, so use the screen's text color
        ...(boxed ? { background: app.color, color: readableOn(app.color) } : {})
      }}
      title={app.name}
    >
      {useImage ? (
        <img
          className="dev-tile-icon"
          src={app.icon}
          alt=""
          draggable={false}
          style={{ width: size * imageScale, height: size * imageScale }}
        />
      ) : (
        <span className="dev-tile-letter" style={{ fontSize: size * (boxed ? 0.38 : 0.5) }}>
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
