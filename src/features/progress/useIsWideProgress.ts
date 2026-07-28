import { useEffect, useState } from 'react'

// matchMedia-driven, lazy useState init — same technique as
// useIsWideLibrary.ts, kept as its own copy per this codebase's
// feature-independence convention (library/shared and design-preview stay
// independent; progress follows the same pattern rather than importing
// library's hook).
const QUERY = '(min-width: 880px)'

export function useIsWideProgress(): boolean {
  const [isWide, setIsWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = () => setIsWide(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isWide
}
