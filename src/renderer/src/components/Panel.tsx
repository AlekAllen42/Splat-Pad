import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  className?: string
  children?: ReactNode
}

// One of the four quadrants of the main window.
export default function Panel({ title, subtitle, className = '', children }: Props): React.JSX.Element {
  // Panels placed in a corner of the window (panel-tl etc.) get a separate
  // shadow element so the shadow can follow the circle cut out of the corner.
  const cornered = /panel-(tl|tr|bl|br)/.test(className)
  return (
    <>
      {cornered && <div className={`panel-shadow ${className}`} aria-hidden />}
      <section className={`panel ${className}`}>
        <header className="panel-header">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </header>
        <div className="panel-body">{children}</div>
      </section>
    </>
  )
}
