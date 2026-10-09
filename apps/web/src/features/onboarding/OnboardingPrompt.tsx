import { useTourState } from './tourStore'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { FlipTapMark } from '@/components/brand/FlipTapMark'
import { dismissOnboarding, useOnboardingDismissed } from './onboardingPreference'

export function OnboardingPrompt() {
  const dismissed = useOnboardingDismissed()
  const tour = useTourState()
  if (dismissed || tour) return null
  return (
    <section aria-label="Welcome to FlipTap" className="mb-7 flex flex-wrap items-center gap-4 rounded-fliptap-card border border-fliptap-border bg-fliptap-surface p-5">
      <FlipTapMark className="h-10 w-10 flex-none" />
      <div className="min-w-0 flex-1 basis-[220px]">
        <h2 className="text-lg font-semibold text-fliptap-ink-brand">New here? Make your first flip.</h2>
        <p className="mt-1 text-sm leading-6 text-fliptap-muted">A quick tour through creating a card and reviewing it.</p>
      </div>
      <Link to="/onboarding" className="fliptap-button fliptap-button-primary inline-flex min-h-11 items-center rounded-fliptap-control px-5 text-sm font-semibold text-white">Get started</Link>
      <Button variant="ghost" className="min-h-11 px-3" onClick={dismissOnboarding}>Maybe later</Button>
    </section>
  )
}
