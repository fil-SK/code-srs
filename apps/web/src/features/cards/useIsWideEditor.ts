import { useEffect, useState } from 'react'

// Same matchMedia-driven pattern as TodayPage's useIsWideToday and
// library/shared's useIsWideLibrary. The editor/preview split needs more
// width than either of those (two full content panes side by side, one of
// them a whole ReviewSessionScreen), hence the wider threshold.
const QUERY = '(min-width: 980px)'

export function useIsWideEditor(): boolean {
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
