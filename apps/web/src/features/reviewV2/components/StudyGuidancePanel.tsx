import { RichText } from '@/components/text/RichText'
import { GuidanceIllustration } from './GuidanceIllustration'

// Authored content stays separate from the purely decorative paper and illustration.
export function StudyGuidancePanel({ text, title, kind }: {
  text: string | undefined
  title: string
  kind: 'hint' | 'explanation'
}) {
  if (!text?.trim()) return null
  return (
    <section className={`fliptap-study-guidance fliptap-study-guidance-${kind} relative mt-5`} aria-label={title}>
      <div className="fliptap-guidance-paper">
        <div className="fliptap-guidance-content">
          <div className="fliptap-study-guidance-label mb-3 text-[11px] font-semibold uppercase tracking-[0.16em]">{title}</div>
          <RichText text={text} className="fliptap-study-guidance-copy min-w-0 text-sm leading-[1.75] text-fliptap-ink" />
        </div>
        <GuidanceIllustration kind={kind} />
        <span className="fliptap-guidance-fold" aria-hidden="true" />
      </div>
    </section>
  )
}
