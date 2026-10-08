import type { ComponentPropsWithRef } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const base =
  'fliptap-button rounded-[9px] text-sm font-semibold disabled:pointer-events-none disabled:opacity-50'

const variants: Record<Variant, string> = {
  primary: 'fliptap-button-primary text-white',
  secondary: 'fliptap-button-secondary',
  ghost: 'fliptap-button-ghost',
  // Bright status copy needs a separate fill role to keep white labels readable.
  danger: 'fliptap-button-danger text-white',
}

export function Button({
  variant = 'secondary',
  className,
  ...props
}: ComponentPropsWithRef<'button'> & { variant?: Variant }) {
  return <button className={cn(base, variants[variant], className)} {...props} />
}
