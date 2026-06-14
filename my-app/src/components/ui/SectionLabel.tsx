import type { HTMLAttributes, ReactNode } from 'react'
import './SectionLabel.css'

interface SectionLabelProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  /** Center the label + rule (default left-aligned editorial). */
  center?: boolean
}

/** Magazine-style eyebrow: small uppercase olive text preceded by a hairline rule. */
export default function SectionLabel({
  children,
  center = false,
  className = '',
  ...rest
}: SectionLabelProps) {
  return (
    <span
      className={`hearth-eyebrow ${center ? 'hearth-eyebrow--center' : ''} ${className}`}
      {...rest}
    >
      <span className="hearth-eyebrow__rule" aria-hidden />
      {children}
    </span>
  )
}
