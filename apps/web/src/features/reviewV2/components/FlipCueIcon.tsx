// The recall mockup uses two loose, overlapping flashcards rather than a
// generic copy glyph. These tiny bordered cards preserve that silhouette at
// icon size without adding a raster asset or a second icon library.
export function FlipCueIcon() {
  return (
    <span aria-hidden="true" className="relative block h-7 w-8">
      <span
        className="absolute left-1 top-1 h-5 w-4 rounded-[3px] border-2 border-current bg-itera-surface"
        style={{ transform: 'rotate(-24deg)' }}
      />
      <span
        className="absolute right-1 top-0.5 h-5 w-4 rounded-[3px] border-2 border-current bg-itera-surface"
        style={{ transform: 'rotate(10deg)' }}
      />
    </span>
  )
}
