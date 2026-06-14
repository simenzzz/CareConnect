import type { HTMLAttributes, ReactNode } from 'react'
import './Badge.css'

export type BadgeTone = 'terracotta' | 'olive' | 'sand' | 'brass' | 'error'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  children: ReactNode
}

export default function Badge({
  tone = 'terracotta',
  className = '',
  children,
  ...rest
}: BadgeProps) {
  return (
    <span className={`hearth-badge hearth-badge--${tone} ${className}`} {...rest}>
      {children}
    </span>
  )
}
