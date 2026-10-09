import { useId } from 'react'
import type { AchievementId } from '@fliptap/core'

// The cup's material stays copper in either appearance. White is a specular
// highlight from the existing palette, rather than a theme-dependent fill.
export function AchievementTrophy() {
  const id = useId()
  return (
    <svg viewBox="0 0 200 180" fill="none" aria-hidden="true" focusable="false" className="achievement-trophy">
      <defs>
        <linearGradient id={`${id}-metal`} x1="53" y1="50" x2="147" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="color-mix(in srgb, var(--fliptap-accent-active) 76%, var(--fliptap-navy))" />
          <stop offset=".2" stopColor="var(--fliptap-accent)" />
          <stop offset=".35" stopColor="color-mix(in srgb, var(--fliptap-accent) 64%, white)" />
          <stop offset=".5" stopColor="var(--fliptap-accent)" />
          <stop offset=".8" stopColor="var(--fliptap-accent-active)" />
          <stop offset="1" stopColor="color-mix(in srgb, var(--fliptap-accent-active) 60%, var(--fliptap-navy))" />
        </linearGradient>
        <linearGradient id={`${id}-shade`} x1="100" y1="37" x2="100" y2="122" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity=".14" />
          <stop offset=".5" stopColor="var(--fliptap-navy)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--fliptap-navy)" stopOpacity=".3" />
        </linearGradient>
        <linearGradient id={`${id}-lip`} x1="54" y1="34" x2="146" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--fliptap-accent-active)" />
          <stop offset=".3" stopColor="color-mix(in srgb, var(--fliptap-accent) 40%, white)" />
          <stop offset=".7" stopColor="var(--fliptap-accent)" />
          <stop offset="1" stopColor="var(--fliptap-accent-active)" />
        </linearGradient>
        <linearGradient id={`${id}-inside`} x1="100" y1="31" x2="100" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="color-mix(in srgb, var(--fliptap-accent-active) 45%, var(--fliptap-navy))" />
          <stop offset="1" stopColor="var(--fliptap-accent-active)" />
        </linearGradient>
        <linearGradient id={`${id}-foot`} x1="70" y1="149" x2="130" y2="161" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--fliptap-accent-active)" />
          <stop offset=".35" stopColor="var(--fliptap-accent)" />
          <stop offset="1" stopColor="color-mix(in srgb, var(--fliptap-accent-active) 60%, var(--fliptap-navy))" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="165" rx="48" ry="5" fill="var(--fliptap-navy)" opacity=".22" />
      <g fill={`url(#${id}-metal)`}>
        <path d="M59 44H41c-10 0-14 7-13 18 2 26 17 43 43 47l-3-10C48 96 39 80 38 63c0-5 2-8 7-8h16l-2-11Z" />
        <path d="M141 44h18c10 0 14 7 13 18-2 26-17 43-43 47l3-10c20-3 29-19 30-36 0-5-2-8-7-8h-16l2-11Z" />
      </g>
      <path d="M57 47H42c-8 0-11 5-10 15 1 19 11 34 26 40m85-55h15c8 0 11 5 10 15" stroke="white" strokeOpacity=".35" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M92 115h16v15c0 8 5 12 16 15H76c11-3 16-7 16-15v-15Z" fill={`url(#${id}-metal)`} />
      <path d="M96 120v12c0 6-3 10-8 12" stroke="white" strokeOpacity=".25" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M55 36c15-5 75-5 90 0l-5 42c-3 25-20 41-40 41S63 103 60 78l-5-42Z" fill={`url(#${id}-metal)`} />
      <path d="M55 36c15-5 75-5 90 0l-5 42c-3 25-20 41-40 41S63 103 60 78l-5-42Z" fill={`url(#${id}-shade)`} />
      <path d="M62 45c1 17 4 37 11 48" stroke="white" strokeOpacity=".34" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M136 45c-1 24-7 42-17 53" stroke="var(--fliptap-navy)" strokeOpacity=".13" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="100" cy="35" rx="45" ry="6" fill={`url(#${id}-lip)`} />
      <ellipse cx="100" cy="34.5" rx="39.5" ry="3" fill={`url(#${id}-inside)`} />
      <path d="M58 36c18 5 66 5 84 0" stroke="white" strokeOpacity=".5" strokeWidth="1.2" strokeLinecap="round" />
      <path d="m100 58 5.4 11 12.1 1.8-8.8 8.6 2.1 12.1L100 85.8l-10.8 5.7 2.1-12.1-8.8-8.6 12.1-1.8L100 58Z" transform="translate(0 1.4)" fill="var(--fliptap-accent-active)" fillOpacity=".65" />
      <path d="m100 58 5.4 11 12.1 1.8-8.8 8.6 2.1 12.1L100 85.8l-10.8 5.7 2.1-12.1-8.8-8.6 12.1-1.8L100 58Z" fill="color-mix(in srgb, var(--fliptap-accent) 25%, white)" />
      <path d="M82 145h36c7 0 11 4 12 9H70c1-5 5-9 12-9Z" fill={`url(#${id}-metal)`} />
      <rect x="69" y="153" width="62" height="8" rx="2.5" fill={`url(#${id}-foot)`} />
      <path d="M73 154h54" stroke="white" strokeOpacity=".3" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
export function AchievementPath() {
  const id = useId()
  return (
    <svg viewBox="0 0 320 180" fill="none" aria-hidden="true" focusable="false" className="achievement-path">
      <defs>
        <linearGradient id={`${id}-back`} x1="172" y1="51" x2="172" y2="169" gradientUnits="userSpaceOnUse">
          <stop stopColor="color-mix(in srgb, var(--fliptap-accent) 15%, var(--fliptap-border-strong))" />
          <stop offset="1" stopColor="var(--fliptap-navy-soft)" />
        </linearGradient>
        <linearGradient id={`${id}-front`} x1="207" y1="66" x2="152" y2="175" gradientUnits="userSpaceOnUse">
          <stop stopColor="color-mix(in srgb, var(--fliptap-accent) 22%, var(--fliptap-border-strong))" />
          <stop offset=".5" stopColor="var(--fliptap-selection-soft)" />
          <stop offset="1" stopColor="var(--fliptap-navy-soft)" />
        </linearGradient>
        <linearGradient id={`${id}-trail`} x1="225" y1="67" x2="136" y2="172" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--fliptap-accent)" />
          <stop offset=".4" stopColor="color-mix(in srgb, var(--fliptap-accent) 50%, var(--fliptap-muted-light))" />
          <stop offset="1" stopColor="var(--fliptap-muted-light)" stopOpacity=".3" />
        </linearGradient>
      </defs>
      <path d="m10 166 56-52q6-6 12-1l23 15 46-49q5-6 11-2l31 21 35-43q5-7 11 0l67 111H10Z" fill={`url(#${id}-back)`} fillOpacity=".65" />
      <path d="m39 169 87-45q6-3 12 1l20 12 65-74q5-6 10 0l66 106H39Z" fill={`url(#${id}-front)`} />
      <path d="m228 60-14 39 13-7 15 18-14-50Z" fill="var(--fliptap-ink-brand)" fillOpacity=".12" />
      <path d="m231 67 38 62" stroke="var(--fliptap-accent)" strokeOpacity=".22" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M136 173c-20-16-11-25 13-34l31-12c23-9 29-15 9-21-11-3-9-8 4-14l31-19" stroke={`url(#${id}-trail)`} strokeWidth="6" strokeLinecap="round" />
      <path d="M228 63V25" stroke="var(--fliptap-muted)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M229 27c13-6 19 8 34 2l-4 10 4 10c-15 6-21-8-34-2V27Z" fill="var(--fliptap-accent)" />
      <path d="M232 30c10-2 18 6 26 3" stroke="var(--fliptap-ink-brand)" strokeOpacity=".28" strokeWidth="1.2" strokeLinecap="round" />
      <path d="m78 166 16-9 30 10m93-10 21-12 38 23" stroke="var(--fliptap-border-strong)" strokeOpacity=".5" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// The larger medallion context calls for bolder silhouettes than toolbar marks.
// This web-only treatment leaves the shared compact/native drawings intact.
export function AchievementEmblem({ id }: { id: AchievementId }) {
  return (
    <svg viewBox="0 0 48 48" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" data-achievement-icon={id}>
      {id === 'first-session' && <>
        <path d="M12 39V10m1 2c9-6 13 6 24 0v16c-11 6-15-6-24 0" fill="currentColor" fillOpacity=".13" />
        <path d="M9 40h10M18 20l4 4 8-8" />
      </>}
      {id === 'five-days' && <>
        <rect x="9" y="12" width="30" height="28" rx="6" fill="currentColor" fillOpacity=".13" />
        <path d="M16 8v8m16-8v8M10 21h28" />
        {[[17, 27], [24, 27], [31, 27], [17, 34], [24, 34]].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.6" fill="currentColor" stroke="none" />)}
      </>}
      {id === 'four-weeks' && <>
        <rect x="9" y="12" width="30" height="28" rx="6" fill="currentColor" fillOpacity=".13" />
        <path d="M16 8v8m16-8v8M10 21h28" />
        {[[16, 26], [27, 26], [16, 33], [27, 33]].map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="5" height="4" rx="1" fill="currentColor" stroke="none" />)}
      </>}
      {id === 'comeback' && <>
        <circle cx="24" cy="25" r="13" fill="currentColor" fillOpacity=".13" stroke="none" />
        <path d="M11 19a14 14 0 0 1 25-3m1 15a14 14 0 0 1-25 3M10 10v9h9m19 20v-9h-9M18 25l4 4 8-8" />
      </>}
    </svg>
  )
}
