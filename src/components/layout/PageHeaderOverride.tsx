import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface PageHeaderOverride {
  title: string
  sub: string
  hideCta?: boolean
}

interface PageHeaderOverrideValue {
  override: PageHeaderOverride | null
  setOverride: (next: PageHeaderOverride | null) => void
}

const PageHeaderOverrideContext = createContext<PageHeaderOverrideValue | null>(null)

// Lets a focused-workspace route (e.g. card create/edit) replace AppShell's
// topbar title/subtitle and hide its "Study now" CTA, instead of the two
// competing headers/CTAs a nav-item-only topbar produces on those routes
// (see docs/itera-decisions.md). AppShell reads `override`; routes write it
// via useSetPageHeader below.
export function PageHeaderOverrideProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<PageHeaderOverride | null>(null)
  return (
    <PageHeaderOverrideContext.Provider value={{ override, setOverride }}>
      {children}
    </PageHeaderOverrideContext.Provider>
  )
}

// Falls back to a no-op (not a thrown error) outside a provider: every real
// route is wrapped by AppShell's provider, but *EditorShell.tsx unit tests
// deliberately render the shell standalone (no AppShell) to stay focused on
// form behavior, and shouldn't need that chrome just to avoid a crash here.
const noopValue: PageHeaderOverrideValue = { override: null, setOverride: () => {} }

function usePageHeaderOverrideContext(): PageHeaderOverrideValue {
  return useContext(PageHeaderOverrideContext) ?? noopValue
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePageHeaderOverride(): PageHeaderOverride | null {
  return usePageHeaderOverrideContext().override
}

// Declares this route's own topbar content for as long as it's mounted;
// reverts to the nav-item default automatically on unmount.
// eslint-disable-next-line react-refresh/only-export-components
export function useSetPageHeader(override: PageHeaderOverride): void {
  const { setOverride } = usePageHeaderOverrideContext()
  const { title, sub, hideCta } = override
  useEffect(() => {
    setOverride({ title, sub, hideCta })
    return () => setOverride(null)
  }, [setOverride, title, sub, hideCta])
}
