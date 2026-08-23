import { RichText } from '@/components/text/RichText'
import { cn } from '@/lib/cn'
import { isLongCardPrompt } from './promptLength'

// One prompt treatment for every interaction. Front faces stay at 24px
// unless the authored prompt is genuinely long; back faces use the quieter
// 20px repeat established by the answer layouts.
export function CardPrompt({
  text,
  face = 'front',
  className,
}: {
  text: string
  face?: 'front' | 'back'
  className?: string
}) {
  const compact = face === 'back' || isLongCardPrompt(text)

  return (
    <RichText
      text={text}
      className={cn(
        'itera-card-prompt font-bold leading-snug text-itera-ink-brand',
        compact ? 'text-xl' : 'text-2xl',
        className,
      )}
    />
  )
}
