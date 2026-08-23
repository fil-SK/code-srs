import { forwardRef } from 'react'
import type { LucideProps } from 'lucide-react'

// The locked Progress reference uses a compact flame with a substantial outer
// stroke and a small solid inner lick. Lucide's Flame becomes a thin droplet at
// navigation sizes, so streak surfaces share this one deliberately bespoke
// brand glyph instead.
export const StreakFlameIcon = forwardRef<SVGSVGElement, LucideProps>(
  function StreakFlameIcon(
    {
      color = 'currentColor',
      size = 24,
      strokeWidth = 2.35,
      absoluteStrokeWidth,
      className,
      ...props
    },
    ref,
  ) {
    const numericSize = Number(size)
    const resolvedStrokeWidth =
      absoluteStrokeWidth && Number.isFinite(numericSize) && numericSize > 0
        ? (Number(strokeWidth) * 24) / numericSize
        : strokeWidth

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={resolvedStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        <path d="M13.1 2.55c.2 2.18-.58 3.92-2.08 5.43-.74.75-1.38 1.48-1.72 2.45-.32-1.18-.98-2.18-1.98-3.02-1.56 1.73-2.37 3.78-2.37 5.96 0 3.87 3.1 7.03 6.97 7.03 3.93 0 7.13-3.1 7.13-7.03 0-4.08-2.3-7.82-5.95-10.82Z" />
        <path
          d="M9.73 16.35c0 1.66 1.05 2.94 2.4 2.94 1.42 0 2.53-1.17 2.53-2.68 0-1.13-.55-2.2-1.62-3.18-.12.9-.58 1.7-1.35 2.36-.42-.73-1.02-1.33-1.8-1.82-.1.75-.16 1.55-.16 2.38Z"
          fill={color}
          stroke="none"
        />
      </svg>
    )
  },
)
