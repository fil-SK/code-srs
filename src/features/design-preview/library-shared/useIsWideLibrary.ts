import { useEffect, useState } from 'react'

// Copy of TodayPage.tsx's useIsWideToday pattern (that hook is an unexported
// local function there, not importable) — matchMedia-driven, lazy useState
// init, addEventListener('change', ...). New breakpoint: the two-pane
// Collection-nav/content layout needs less width than Today's hero grid.
const QUERY = '(min-width: 880px)'

export function useIsWideLibrary(): boolean {
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
