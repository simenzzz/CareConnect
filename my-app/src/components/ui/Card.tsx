import type { HTMLAttributes, ReactNode } from 'react'
import './Card.css'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds an accent left rule in terracotta. */
  accent?: boolean
  /** Adds hover lift interaction. */
  interactive?: boolean
  children: ReactNode
}

export default function Card({
  accent = false,
  interactive = false,
  className = '',
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        'hearth-card',
        accent ? 'hearth-card--accent' : '',
        interactive ? 'hearth-card--interactive' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}
