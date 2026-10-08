import { createElement, forwardRef } from 'react'
import type { LucideProps } from 'lucide-react'
import { approvedIconDrawings, type ApprovedIconName, type IconDrawingNode } from '@fliptap/core'

function drawNode(node: IconDrawingNode, key: number): React.ReactNode {
  return createElement(node.tag, { ...node.attrs, key }, node.children?.map(drawNode))
}

const ApprovedIcon = forwardRef<SVGSVGElement, LucideProps & { name: ApprovedIconName }>(
  function ApprovedIcon(
    { name, size = 24, color = 'currentColor', absoluteStrokeWidth: _absoluteStrokeWidth, ...props },
    ref,
  ) {
    const drawing = approvedIconDrawings[name]
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        fill="none"
        color={color}
        aria-hidden="true"
        focusable="false"
        {...props}
        {...drawing.attrs}
        viewBox={drawing.viewBox}
        data-fliptap-icon={name}
      >
        {drawing.nodes.map(drawNode)}
      </svg>
    )
  },
)

export const StreakFlameIcon = forwardRef<SVGSVGElement, LucideProps>(function StreakFlameIcon(props, ref) {
  return <ApprovedIcon {...props} name="streak" ref={ref} />
})
export const RetentionIcon = forwardRef<SVGSVGElement, LucideProps>(function RetentionIcon(props, ref) {
  return <ApprovedIcon {...props} name="retention" ref={ref} />
})
export const CalendarMetricIcon = forwardRef<SVGSVGElement, LucideProps>(function CalendarMetricIcon(props, ref) {
  return <ApprovedIcon {...props} name="calendar" ref={ref} />
})
export const StudyTimeIcon = forwardRef<SVGSVGElement, LucideProps>(function StudyTimeIcon(props, ref) {
  return <ApprovedIcon {...props} name="time" ref={ref} />
})
export const LibraryIcon = forwardRef<SVGSVGElement, LucideProps>(function LibraryIcon(props, ref) {
  return <ApprovedIcon {...props} name="library" ref={ref} />
})
export const ReviewIcon = forwardRef<SVGSVGElement, LucideProps>(function ReviewIcon(props, ref) {
  return <ApprovedIcon {...props} name="review" ref={ref} />
})
export const ProgressIcon = forwardRef<SVGSVGElement, LucideProps>(function ProgressIcon(props, ref) {
  return <ApprovedIcon {...props} name="progress" ref={ref} />
})
export const ProfileIcon = forwardRef<SVGSVGElement, LucideProps>(function ProfileIcon(props, ref) {
  return <ApprovedIcon {...props} name="profile" ref={ref} />
})
export const RecallIcon = forwardRef<SVGSVGElement, LucideProps>(function RecallIcon(props, ref) {
  return <ApprovedIcon {...props} name="recall" ref={ref} />
})
export const MultipleChoiceIcon = forwardRef<SVGSVGElement, LucideProps>(function MultipleChoiceIcon(props, ref) {
  return <ApprovedIcon {...props} name="multiple_choice" ref={ref} />
})
export const WriteCodeIcon = forwardRef<SVGSVGElement, LucideProps>(function WriteCodeIcon(props, ref) {
  return <ApprovedIcon {...props} name="write_code" ref={ref} />
})
export const OrderingIcon = forwardRef<SVGSVGElement, LucideProps>(function OrderingIcon(props, ref) {
  return <ApprovedIcon {...props} name="ordering" ref={ref} />
})
export const MatchingIcon = forwardRef<SVGSVGElement, LucideProps>(function MatchingIcon(props, ref) {
  return <ApprovedIcon {...props} name="matching" ref={ref} />
})
export const WalkthroughIcon = forwardRef<SVGSVGElement, LucideProps>(function WalkthroughIcon(props, ref) {
  return <ApprovedIcon {...props} name="walkthrough" ref={ref} />
})
