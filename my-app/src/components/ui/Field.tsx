import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from 'react'
import './Field.css'

interface FieldProps {
  label?: ReactNode
  htmlFor?: string
  error?: string | null
  hint?: ReactNode
  required?: boolean
  children: ReactNode
  className?: string
}

/** Label + control + error scaffold used across forms. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className = '',
}: FieldProps) {
  return (
    <div className={`hearth-field ${error ? 'hearth-field--error' : ''} ${className}`}>
      {label && (
        <label className="hearth-field__label" htmlFor={htmlFor}>
          {label}
          {required && <span className="hearth-field__req"> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="hearth-field__hint">{hint}</p>}
      {error && <p className="hearth-field__error">{error}</p>}
    </div>
  )
}

/** Wraps a control with a leading icon adornment. */
export function InputAffix({
  icon,
  children,
}: {
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div className="hearth-affix">
      <span className="hearth-affix__icon" aria-hidden>
        {icon}
      </span>
      {children}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...props }, ref) {
    return <input ref={ref} className={`hearth-input ${className}`} {...props} />
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = '', children, ...props }, ref) {
    return (
      <select ref={ref} className={`hearth-input hearth-input--select ${className}`} {...props}>
        {children}
      </select>
    )
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = '', ...props }, ref) {
    return <textarea ref={ref} className={`hearth-input hearth-input--area ${className}`} {...props} />
  },
)
