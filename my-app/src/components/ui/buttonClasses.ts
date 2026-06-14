export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

/** Shared class builder so <Link>/<a> CTAs can match Button styling. */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra = '',
): string {
  return ['hearth-btn', `hearth-btn--${variant}`, `hearth-btn--${size}`, extra]
    .filter(Boolean)
    .join(' ')
}
