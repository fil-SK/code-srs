import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@fliptap/core'
import { Button } from '@/components/ui/Button'
import { LogoLoader } from '@/components/brand/LogoLoader'
import { SCENARIOS, type ScenarioId } from './scenarios'
import {
  getActiveWorkspace,
  hasParkedSession,
  loadScenario,
  restoreParkedSession,
} from './devWorkspace'

// Dev-only page at /dev. It is registered only in development builds (see
// router.tsx), and it refuses to act in cloud mode: a scenario replaces the
// workspace, and on Supabase that would overwrite real account data.
export function DevScenariosPage() {
  const { mode } = useAuth()
  const queryClient = useQueryClient()
  const [active, setActive] = useState<ScenarioId | 'live' | null>(null)
  const [parked, setParked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revealKey, setRevealKey] = useState(0)

  async function refresh() {
    setActive(await getActiveWorkspace())
    setParked(await hasParkedSession())
  }

  useEffect(() => {
    if (mode === 'local') void refresh()
  }, [mode])

  if (mode !== 'local') {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="text-xl font-semibold">Dev scenarios</h1>
        <p className="mt-2 text-sm">
          Scenarios are only available in local mode. Loading one would replace the cloud
          workspace, so this page does nothing while signed in to Supabase.
        </p>
      </main>
    )
  }

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      // Reload every cached query so the other pages show the new workspace
      // without a full page reload.
      await queryClient.invalidateQueries()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header>
        <h1 className="text-xl font-semibold">Dev scenarios</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Replaces the local workspace with a generated starting point. Your current work is
          parked first and can be restored below. Visible only in development builds.
        </p>
        <p className="mt-2 text-sm">
          Active: <strong>{active === null ? '...' : active === 'live' ? 'your workspace' : active}</strong>
        </p>
      </header>

      <section className="space-y-3">
        {SCENARIOS.map((s) => (
          <div key={s.id} className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div>
              <h2 className="font-medium">{s.label}</h2>
              <p className="text-sm text-neutral-600">{s.summary}</p>
            </div>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => run(() => loadScenario(s.id))}
            >
              Load
            </Button>
          </div>
        ))}
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="font-medium">Your work</h2>
        <p className="mt-1 text-sm text-neutral-600">
          {parked
            ? 'A session parked before your last scenario switch is ready to restore.'
            : 'Nothing parked yet. It is saved automatically the first time you load a scenario.'}
        </p>
        <Button
          className="mt-3"
          disabled={busy || !parked}
          onClick={() => run(restoreParkedSession)}
        >
          Restore my session
        </Button>
      </section>

      {/* Logo animation preview. DEV-ONLY: remove this section with the rest of /dev. */}
      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="font-medium">Logo animation</h2>
        <p className="text-sm text-neutral-600">
          The looping loader is what the app shows while the session restores. The reveal plays
          once; replay it to watch again.
        </p>
        <div className="flex items-center gap-6">
          <LogoLoader />
          <div className="flex flex-col items-center gap-2">
            <LogoLoader key={revealKey} variant="reveal" className="h-24 w-24" />
            <Button variant="secondary" onClick={() => setRevealKey((k) => k + 1)}>
              Replay reveal
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </main>
  )
}
