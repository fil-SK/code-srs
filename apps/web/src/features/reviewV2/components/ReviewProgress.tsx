import { cn } from '@/lib/cn'

export function ReviewProgress({ current, total }: { current: number; total: number }) {
  const position = total > 0 ? Math.min(Math.max(current, 0), total) : 0
  const progress = total > 0 ? (position / total) * 100 : 0
  const segments = total > 0 && total <= 10 ? total : 1
  const track = Array.from({ length: segments }, (_,index) => (
    <span key={index} className="h-1 min-w-0 flex-1 rounded-full bg-current" />
  ))

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[104px] flex justify-center px-6">
      <div
        role="progressbar"
        aria-label="Card position"
        aria-valuemin={0}
        aria-valuemax={Math.max(total, 1)}
        aria-valuenow={position}
        aria-valuetext={`Card ${position} of ${total}`}
        className="relative h-3 w-full max-w-[280px]"
      >
        <div aria-hidden="true" className="absolute inset-x-0 top-1 flex gap-1.5 text-fliptap-border-strong">
          {track}
        </div>
        <div
          aria-hidden="true"
          className={cn('absolute inset-x-0 top-1 flex gap-1.5 text-fliptap-muted-light',
            'duration-300 ease-out motion-safe:transition-[clip-path] motion-reduce:transition-none')}
          style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }}
        >
          {track}
        </div>
        <span
          aria-hidden="true"
          className="absolute top-0.5 h-2.5 w-2.5 border-2 border-fliptap-accent bg-fliptap-canvas duration-300 ease-out motion-safe:transition-[left] motion-reduce:transition-none"
          style={{ left: `calc(${progress}% - 5px)`, transform: 'rotate(45deg)' }}
        />
      </div>
    </div>
  )
}