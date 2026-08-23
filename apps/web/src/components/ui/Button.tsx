import type { ComponentPropsWithRef } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const base =
  'inline-flex items-center justify-center gap-1.5 rounded-[9px] px-4 py-2 text-sm font-semibold disabled:pointer-events-none disabled:opacity-50'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:brightness-110',
  secondary: 'border border-border bg-panel-2 text-text hover:border-accent',
  ghost: 'text-muted hover:bg-panel hover:text-text',
  // --red re-points to --itera-error inside .itera-scope, so this reads as the
  // Itera error color everywhere the app is scoped and still works outside it.
  danger: 'bg-red text-white hover:brightness-110',
}

export function Button({
  variant = 'secondary',
  className,
  ...props
}: ComponentPropsWithRef<'button'> & { variant?: Variant }) {
  return <button className={cn(base, variants[variant], className)} {...props} />
}
