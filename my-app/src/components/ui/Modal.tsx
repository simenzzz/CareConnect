import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import './Modal.css'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  /** Hide the default close (X) button. */
  hideClose?: boolean
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export default function Modal({
  open,
  onClose,
  title,
  hideClose = false,
  size = 'md',
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('modal-open')
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="hearth-modal__overlay" onClick={onClose} role="presentation">
      <div
        className={`hearth-modal hearth-modal--${size}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {(title || !hideClose) && (
          <header className="hearth-modal__head">
            {title && <h3 className="hearth-modal__title">{title}</h3>}
            {!hideClose && (
              <button
                type="button"
                className="hearth-modal__close"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            )}
          </header>
        )}
        <div className="hearth-modal__body">{children}</div>
      </div>
    </div>
  )
}
