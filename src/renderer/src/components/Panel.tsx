import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  className?: string
  children?: ReactNode
}

// One of the four quadrants of the main window.
export default function Panel({ title, subtitle, className = '', children }: Props): React.JSX.Element {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-header">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  )
}
