import { useState } from 'react'

// The ✱ in the middle of the window, sitting in the circle cut out of the
// four panels' inner corners. Spins on hover; clicking toggles test mode
// (it glows while test mode is on).
export default function CenterStar({ active, onToggle }: { active: boolean; onToggle: () => void }): React.JSX.Element {
  // Each hover adds a full turn, so it always spins forward, never back.
  const [turns, setTurns] = useState(0)

  return (
    <button
      className={`center-star ${active ? 'is-active' : ''}`}
      aria-pressed={active}
      aria-label={active ? 'Turn off test mode' : 'Turn on test mode'}
      title={active ? 'Test mode is on: click to turn off' : 'Test mode: make taps on the live screen run on this PC'}
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
