import { Link, Outlet, useLocation } from 'react-router-dom'
import { Play } from 'lucide-react'
import { IteraSurface } from '@/features/reviewV2/components/IteraSurface'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { findActiveItem } from './navItems'

// Itera visual pass (see docs/itera-decisions.md): the whole app now renders
// inside IteraSurface (.itera-scope + ForceLightTheme), the same mechanism
// already proven by Review and /design-preview/*. Every page underneath
// reskins automatically via the re-pointed shared tokens — no page-level
// edits needed for color. ThemeToggle is intentionally not rendered here:
// the app is light-only for now (Itera has no dark palette yet), so the
// toggle would be inert under ForceLightTheme. Not deleted — see ThemeToggle.tsx.
export function AppShell() {
  const { pathname } = useLocation()
  const active = findActiveItem(pathname)

  return (
    <IteraSurface className="min-h-screen">
      <div className="grid min-h-screen md:grid-cols-[248px_1fr]">
        <Sidebar />

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-10 flex items-center gap-3.5 border-b border-border bg-bg/90 px-4 py-4 backdrop-blur md:px-6">
            <div className="min-w-0">
              <h1 className="truncate font-itera-display text-lg font-semibold tracking-tight">
                {active.title}
              </h1>
              <p className="truncate text-xs text-faint">{active.sub}</p>
            </div>
            <div className="flex-1" />
            <Link
              to="/review"
              className="inline-flex items-center gap-1.5 rounded-itera-control bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:brightness-105"
            >
              <Play size={15} />
              <span className="hidden sm:inline">Study now</span>
            </Link>
          </header>

          <main className="mx-auto w-full max-w-[1080px] flex-1 px-4 pb-24 pt-6 md:px-6 md:pb-8">
            <Outlet />
          </main>

          <BottomNav />
        </div>
      </div>
    </IteraSurface>
  )
}
