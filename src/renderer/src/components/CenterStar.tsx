import { useState } from 'react'
import { useT } from '../i18n'

// The ✱ in the middle of the window, sitting in the circle cut out of the
// four panels' inner corners. Spins on hover; clicking toggles test mode
// (it glows while test mode is on).
export default function CenterStar({ active, onToggle }: { active: boolean; onToggle: () => void }): React.JSX.Element {
  // Each hover adds a full turn, so it always spins forward, never back.
  const [turns, setTurns] = useState(0)
  const t = useT()

  return (
    <button
      className={`center-star ${active ? 'is-active' : ''}`}
      aria-pressed={active}
      aria-label={active ? t.testModeOff : t.testModeOn}
      title={active ? t.testModeTitleOn : t.testModeTitleOff}
      onPointerEnter={() => setTurns((t) => t + 1)}
      onClick={onToggle}
    >
      <svg viewBox="-32 -32 64 64" style={{ transform: `rotate(${turns * 360}deg)` }} aria-hidden>
        {/* flat offset shadow, like the panels */}
        <g className="center-star-shadow" transform="translate(3 3)">
          {[0, 60, 120].map((deg) => (
            <line key={deg} x1="0" y1="-22" x2="0" y2="22" transform={`rotate(${deg})`} />
          ))}
        </g>
        <g className="center-star-arms">
          {[0, 60, 120].map((deg) => (
            <line key={deg} x1="0" y1="-22" x2="0" y2="22" transform={`rotate(${deg})`} />
          ))}
        </g>
      </svg>
    </button>
  )
}
