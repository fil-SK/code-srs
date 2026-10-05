import { useTheme } from '@/app/theme'
import { cn } from '@/lib/cn'

// The one FlipTap logo mark. Dark mode swaps to the dark-background artwork;
// both files are square, and callers size the box with className so the mark
// occupies the same space in either theme (the PNGs' intrinsic sizes differ).
export function FlipTapMark({ className }: { className?: string }) {
  const { theme } = useTheme()
  const src = theme === 'dark' ? '/fliptap-logo-dark.png' : '/fliptap-logo.png'
  return <img src={src} alt="" className={cn('shrink-0 object-contain', className)} />
}
