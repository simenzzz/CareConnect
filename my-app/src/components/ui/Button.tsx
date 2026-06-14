import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import { buttonClasses, type ButtonVariant, type ButtonSize } from './buttonClasses'
import './Button.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  children: ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={buttonClasses(variant, size, [
        fullWidth ? 'hearth-btn--block' : '',
        className,
      ]
        .filter(Boolean)
        .join(' '))}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <LoaderCircle size={18} className="spin" aria-hidden />}
      {children}
    </button>
  )
}
