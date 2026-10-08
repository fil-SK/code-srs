// Share the recall cue's loose-card silhouette with Library metrics.
// Scale the whole drawing so its rotations and border weight stay proportional.
export function CardsIcon({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span aria-hidden="true" className={className} style={{ display: 'block', position: 'relative', width: size, height: size * 7 / 8 }}>
      <span className="absolute left-0 top-0 block h-7 w-8" style={{ transform: `scale(${size / 32})`, transformOrigin: 'top left' }}>
        <span
          className="absolute left-1 top-1 h-5 w-4 rounded-[3px] border-2 border-current bg-fliptap-surface"
          style={{ transform: 'rotate(-24deg)' }}
        />
        <span
          className="absolute right-1 top-0.5 h-5 w-4 rounded-[3px] border-2 border-current bg-fliptap-surface"
          style={{ transform: 'rotate(10deg)' }}
        />
      </span>
    </span>
  )
}
