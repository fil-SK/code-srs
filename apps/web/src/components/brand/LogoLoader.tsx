import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'
import * as logoReveal from './logoReveal'

// The riffle of the FlipTap mark. 'loader' loops for waits with nothing else to show;
// 'reveal' plays once and holds the finished mark. The engine is driven imperatively on a
// DOM node React does not render children into; the cleanup stops the frame loop so an
// unmounted instance never keeps animating.
export function LogoLoader({
  className,
  variant = 'loader',
}: {
  className?: string
  variant?: logoReveal.LogoRevealVariant
}) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const run = logoReveal.play(logoReveal.create(svg), variant)
    return () => run.stop()
  }, [variant])

  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex items-center justify-center"
    >
      <svg
        ref={svgRef}
        viewBox="0 0 1254 1254"
        aria-hidden="true"
        className={cn('h-16 w-16', className)}
      >
        <g data-cards />
      </svg>
    </div>
  )
}
