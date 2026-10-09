import { ArrowRight, Check, Cloud, HardDrive, Repeat2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@fliptap/core'
import { FlipTapMark } from '@/components/brand/FlipTapMark'
import { CardFormatDemo } from './CardFormatDemo'

const learningLoop = [
  { icon: Repeat2, title: 'Recall', description: 'Try to find the answer before you reveal it.' },
  { icon: Check, title: 'Reflect', description: 'Check your answer and rate how well you remembered.' },
  { icon: ArrowRight, title: 'Return', description: 'Come back when your next review is due.' },
]

export function AboutPage() {
  const { mode } = useAuth()
  const cloudEnabled = mode === 'supabase'
  const StorageIcon = cloudEnabled ? Cloud : HardDrive

  return (
    <div className="space-y-10 pb-4 sm:space-y-12">
      <header className="flex items-center gap-3">
        <FlipTapMark className="h-10 w-10" />
        <h1 className="text-3xl font-extrabold tracking-tight text-fliptap-ink-brand">
          About FlipTap
        </h1>
      </header>

      <section aria-labelledby="about-purpose" className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fliptap-muted">
            A little practice. Knowledge that stays.
          </p>
          <h2 id="about-purpose" className="mt-4 max-w-[650px] text-4xl font-[750] leading-[1.12] tracking-[-0.035em] text-fliptap-ink-brand sm:text-5xl">
            Keep what you learn.
          </h2>
          <p className="mt-5 max-w-[600px] text-base leading-7 text-fliptap-muted sm:text-lg sm:leading-8">
            You solve a problem, understand an idea, or finally make sense of a piece of code.
            FlipTap helps you keep that knowledge close, long after you close the tab.
          </p>
          <p className="mt-4 max-w-[600px] text-sm leading-6 text-fliptap-muted sm:text-base sm:leading-7">
            Built for software engineering and computer science, it turns the things you want
            to remember into focused practice. Make your own cards, organize them into decks,
            and build a habit of coming back.
          </p>
          <Link
            to="/decks"
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-fliptap-control fliptap-button fliptap-button-primary px-5 py-2.5 text-sm font-semibold text-white"
          >
            Open your library <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>

        <div className="rounded-fliptap-card border border-fliptap-border bg-fliptap-surface p-5 sm:p-7">
          <h3 className="text-lg font-semibold tracking-tight text-fliptap-ink-brand">
            One simple learning loop
          </h3>
          <ol className="mt-2 divide-y divide-fliptap-border">
            {learningLoop.map(({ icon: Icon, title, description }, index) => (
              <li key={title} className="flex items-start gap-4 py-5 last:pb-0">
                <span aria-hidden="true" className="grid h-10 w-10 flex-none place-items-center rounded-fliptap-control bg-fliptap-navy-soft text-fliptap-ink-brand">
                  <Icon size={19} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-fliptap-ink-brand">
                    <span className="mr-2 font-mono text-xs font-medium text-fliptap-muted">0{index + 1}</span>
                    {title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-fliptap-muted">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="about-formats" className="border-t border-fliptap-border pt-8 sm:pt-10">
        <h2 id="about-formats" className="text-2xl font-bold tracking-tight text-fliptap-ink-brand">
          Different ideas. Different ways to practice.
        </h2>
        <p className="mt-2 text-sm leading-6 text-fliptap-muted">
          Six card formats, with code snippets, optional tips, and explanations where you need them.
        </p>
        <CardFormatDemo />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="about-scheduling" className="rounded-fliptap-card border border-fliptap-border bg-fliptap-surface p-5 sm:p-7">
          <h2 id="about-scheduling" className="text-lg font-semibold tracking-tight text-fliptap-ink-brand">
            A rhythm that adapts to you
          </h2>
          <p className="mt-3 text-sm leading-6 text-fliptap-muted">
            FlipTap uses FSRS to schedule reviews based on your ratings and review history.
            After each card, you choose Again, Hard, Good, or Easy to tell it how well you remembered.
          </p>
          <p className="mt-3 text-sm leading-6 text-fliptap-muted">
            Answer feedback helps you check your work. You always choose the final rating.
            Today shows what is due, and Progress helps you see how your practice adds up.
          </p>
        </section>

        <section aria-labelledby="about-storage" className="rounded-fliptap-card border border-fliptap-border bg-fliptap-surface p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="about-storage" className="text-lg font-semibold tracking-tight text-fliptap-ink-brand">
              Your learning, in your hands
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-fliptap-pill bg-fliptap-navy-soft px-2.5 py-1 text-xs font-medium text-fliptap-muted">
              <StorageIcon size={13} aria-hidden="true" />
              {cloudEnabled ? 'Cloud storage' : 'Local storage'}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-fliptap-muted">
            {cloudEnabled
              ? 'This workspace stores your cards and review history in your cloud account. You need an internet connection to load and save your work.'
              : 'This workspace stores your cards and review history in this browser. Once the app is loaded, you can keep studying offline. Your data stays here unless you export it.'}
          </p>
          <p className="mt-3 text-sm leading-6 text-fliptap-muted">
            Export a JSON backup to keep a separate copy or move your collection to another workspace.
          </p>
          <Link to="/settings/import-export" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-fliptap-ink-brand hover:underline">
            Import / Export <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-fliptap-border pt-5 text-xs leading-5 text-fliptap-muted">
        <p>FlipTap · Make room for what you want to remember.</p>
        <a href="/third-party-licenses.txt" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center hover:text-fliptap-ink-brand hover:underline">
          Icon licenses<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </footer>
    </div>
  )
}
