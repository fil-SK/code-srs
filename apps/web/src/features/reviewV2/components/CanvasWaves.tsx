import { useId } from 'react'

function WaveDrawing({ washId, className }: { washId: string; className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 650"
      preserveAspectRatio="none"
      fill="none"
      focusable="false"
    >
      <defs>
        <linearGradient id={washId} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="currentColor" stopOpacity="0.075" />
          <stop offset="0.4" stopColor="currentColor" stopOpacity="0.05" />
          <stop offset="0.9" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g fill={`url(#${washId})`}>
        <path d="M0 330C160 246 270 394 440 330S650 278 800 144S1040 28 1200 112V650H0Z" />
        <path d="M0 406C180 310 292 444 478 370S706 326 848 204S1072 94 1200 164V650H0Z" />
        <path d="M0 474C180 380 340 484 518 418S754 366 898 258S1102 168 1200 212V650H0Z" />
      </g>
      {/* Hairline contours follow the crest of the middle wave at fixed offsets,
          so they read as one engraved set. vector-effect keeps them 1px wide
          even though preserveAspectRatio="none" stretches the drawing. */}
      <g fill="none" stroke="currentColor" vectorEffect="non-scaling-stroke" strokeWidth="1">
        <path opacity="0.2" d="M0 406C180 310 292 444 478 370S706 326 848 204S1072 94 1200 164" />
        <path opacity="0.14" transform="translate(0 26)" d="M0 406C180 310 292 444 478 370S706 326 848 204S1072 94 1200 164" />
        <path opacity="0.08" transform="translate(0 52)" d="M0 406C180 310 292 444 478 370S706 326 848 204S1072 94 1200 164" />
      </g>
    </svg>
  )
}

// Keep both ends in one clipped layer so the bottom wave follows page height
// while card shadows and focus rings can still extend beyond their containers.
export function CanvasWaves() {
  const washId = useId()

  return (
    <div className="fliptap-canvas-waves" aria-hidden="true">
      <WaveDrawing washId={washId} className="fliptap-canvas-waves-top" />
      <WaveDrawing washId={`${washId}-bottom`} className="fliptap-canvas-waves-bottom" />
    </div>
  )
}
