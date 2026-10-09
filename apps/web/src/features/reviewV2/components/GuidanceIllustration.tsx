// Decorative, local vector artwork keeps the reference's motif crisp at any size.
export function GuidanceIllustration({ kind }: { kind: 'hint' | 'explanation' }) {
  const hint = kind === 'hint'
  return (
    <svg className="fliptap-guidance-art" viewBox="0 0 160 120" fill="none" aria-hidden="true">
      <circle cx="83" cy="61" r="47" fill="currentColor" opacity={hint ? 0.04 : 0.08} />
      <g stroke="currentColor" strokeWidth="0.7" opacity="0.5">
        <ellipse cx="79" cy="62" rx="68" ry="21" transform="rotate(-23 79 62)" />
        {hint && <ellipse cx="84" cy="65" rx="57" ry="17" transform="rotate(-48 84 65)" />}
      </g>
      {hint ? (
        <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M66 78c-1-8-14-14-14-29a22 22 0 0 1 44 0c0 15-13 21-14 29Z" fill="var(--fliptap-surface)" fillOpacity="0.8" />
          <path d="m66 83 16 3m-16 2 14 3m-12 3 10 2" />
          <path d="M59 44c1-5 5-9 10-10" opacity="0.35" />
        </g>
      ) : (
        <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="var(--fliptap-surface)" fillOpacity="0.4">
          <path d="M81 40c-3-10-18-11-22-2-9-2-16 7-13 15-10 3-13 15-6 22-6 9 1 20 11 20 2 12 20 14 26 4 3-3 4-7 4-12Z" />
          <path d="M81 40c3-10 18-11 22-2 9-2 16 7 13 15 10 3 13 15 6 22 6 9-1 20-11 20-2 12-20 14-26 4-3-3-4-7-4-12Z" />
          <path d="M59 38c-3 7 1 11 6 11m-19 4c6-3 13 1 13 7m-19 15c4-5 10-5 14-1m-3 21c-2-6 1-11 6-13m11-24c-7 0-11 7-7 12m16 10c-7-3-13 2-11 8m37-50c3 7-1 11-6 11m19 4c-6-3-13 1-13 7m19 15c-4-5-10-5-14-1m3 21c2-6-1-11-6-13m-11-24c7 0 11 7 7 12m-16 10c7-3 13 2 11 8" fill="none" />
        </g>
      )}
      <g fill="currentColor">
        <circle cx="20" cy="81" r="3.5" opacity="0.85" />
        <circle cx="30" cy="39" r="2.5" opacity="0.55" />
        <path d="m139 80 2.2 5.2 5.3 2.2-5.3 2.2-2.2 5.3-2.2-5.3-5.2-2.2 5.2-2.2Z" />
        {hint && <path d="m16 98 4.5 4.5-4.5 4.5-4.5-4.5Z" opacity="0.65" />}
      </g>
      <path d="m133 24 2.3 5.5 5.5 2.3-5.5 2.3-2.3 5.5-2.3-5.5-5.5-2.3 5.5-2.3Z" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="147" cy="60" r="3" stroke="currentColor" strokeWidth="1.1" opacity="0.6" />
    </svg>
  )
}
