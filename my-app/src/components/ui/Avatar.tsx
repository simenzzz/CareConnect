import './Avatar.css'

interface AvatarProps {
  /** Full name used to derive initials when no image is provided. */
  name?: string
  src?: string | null
  size?: number
  className?: string
}

function initials(name?: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || '?'
}

export default function Avatar({ name, src, size = 56, className = '' }: AvatarProps) {
  const style = { width: size, height: size, fontSize: size * 0.36 }
  return (
    <span className={`hearth-avatar ${className}`} style={style} aria-hidden={!name}>
      {src ? (
        <img src={src} alt={name ?? ''} />
      ) : (
        <span className="hearth-avatar__initials">{initials(name)}</span>
      )}
    </span>
  )
}
