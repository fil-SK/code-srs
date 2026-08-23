import { useEffect, useState } from 'react'

// Same matchMedia + lazy-useState shape as useIsWideLibrary, at the width
// where an anchored ~300px popover stops having room to sit under the avatar
// without hugging both viewport edges.
const QUERY = '(max-width: 479px)'

export function useIsNarrowShell(): boolean {
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = () => setIsNarrow(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isNarrow
}
