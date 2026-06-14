import { Star } from 'lucide-react'
import './Rating.css'

interface RatingProps {
  value: number
  count?: number
  size?: number
  className?: string
}

/** Brass star rating with a Fraunces numeral. */
export default function Rating({ value, count, size = 15, className = '' }: RatingProps) {
  const rounded = Math.round(value)
  return (
    <span className={`hearth-rating ${className}`}>
      <span className="hearth-rating__stars" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            size={size}
            className={n <= rounded ? 'is-on' : 'is-off'}
            fill={n <= rounded ? 'currentColor' : 'none'}
          />
        ))}
      </span>
      <span className="hearth-rating__value">{value.toFixed(1)}</span>
      {count != null && <span className="hearth-rating__count">({count})</span>}
    </span>
  )
}
