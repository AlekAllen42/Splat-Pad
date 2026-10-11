import type { ReactNode } from 'react'

interface Props {
  title: string
  status?: ReactNode // shown next to the title (e.g. the connection light)
  subtitle?: string
  className?: string
  children?: ReactNode
}

// One of the four quadrants of the main window.
export default function Panel({ title, status, subtitle, className = '', children }: Props): React.JSX.Element {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-header">
        <div className="panel-title-row">
          <h2>{title}</h2>
          {status}
        </div>
        {subtitle && <p>{subtitle}</p>}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  )
}
