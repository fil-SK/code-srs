import { BookOpen, Calendar, Camera, Clock, ExternalLink, Flame, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NotBuiltYet, Panel, SectionShell } from './SectionShell'

// The landing section, laid out from the reference mockup (avatar + identity
// form, a statistics strip, a danger zone) but entirely inert: there is no
// profile entity in this product yet, so every control is disabled and every
// statistic shows an em dash rather than a fabricated number. Rendering the
// intended shape greyed out is the point — it states the plan without
// pretending the feature landed.
export function ProfileSection() {
  return (
    <SectionShell
      title="Profile"
      description="Manage your personal information and how you appear in Itera."
      action={
        <button
          type="button"
          aria-disabled="true"
          onClick={(e) => e.preventDefault()}
          className="inline-flex cursor-default items-center gap-2 rounded-itera-control border border-itera-border px-3.5 py-2 text-sm font-semibold text-itera-muted-light"
        >
          View public profile
          <ExternalLink size={15} aria-hidden="true" />
        </button>
      }
    >
      <NotBuiltYet>
        Not available yet. Itera has no profile record — cards and decks live in this browser (or
        your own Supabase project), and nothing here is stored or sent anywhere.
      </NotBuiltYet>

      <Panel>
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="relative h-[92px] w-[92px] flex-none">
            <span className="grid h-full w-full place-items-center rounded-full bg-itera-navy text-white">
              <User size={38} aria-hidden="true" />
            </span>
            <span
              aria-hidden="true"
              className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full border-2 border-itera-surface bg-itera-navy-soft text-itera-muted-light"
            >
              <Camera size={14} />
            </span>
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <DisabledField label="Full name" placeholder="Your name" />
              <DisabledField
                label="Username"
                placeholder="username"
                hint="This is how you'll appear in Itera."
              />
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-itera-muted">
                Bio
              </span>
              <textarea
                disabled
                rows={3}
                placeholder="A short description of what you're learning."
                className="w-full resize-none rounded-itera-control border border-itera-border bg-itera-surface-subtle px-3.5 py-2.5 text-sm text-itera-muted-light placeholder:text-itera-muted-light"
              />
            </label>
            <div className="flex justify-end">
              <button
                type="button"
                aria-disabled="true"
                onClick={(e) => e.preventDefault()}
                className="cursor-default rounded-itera-control bg-itera-accent/40 px-4 py-2 text-sm font-semibold text-white"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      </Panel>

      <Panel>
        <h3 className="text-sm font-semibold text-itera-ink-brand">Statistics</h3>
        <p className="mt-0.5 text-sm text-itera-muted">Your learning at a glance.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={BookOpen} label="Cards reviewed" caption="All time" />
          <Stat icon={Calendar} label="Study sessions" caption="All time" />
          <Stat icon={Flame} label="Day streak" caption="Current" />
          <Stat icon={Clock} label="Study time" caption="All time" />
        </div>
        <p className="mt-4 text-xs text-itera-muted-light">
          Not wired up here yet — the Progress page already computes real numbers from your review
          history.
        </p>
      </Panel>

      <div className="rounded-itera-card border border-itera-error/30 bg-itera-error-soft p-5">
        <h3 className="text-sm font-semibold text-itera-error">Danger zone</h3>
        <p className="mt-0.5 text-sm text-itera-error/80">Irreversible and destructive actions.</p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button
            type="button"
            aria-disabled="true"
            onClick={(e) => e.preventDefault()}
            className="cursor-default rounded-itera-control border border-itera-error/40 bg-itera-surface px-4 py-2 text-sm font-semibold text-itera-error/60"
          >
            Delete account
          </button>
          <p className="min-w-[260px] flex-1 text-sm text-itera-muted">
            There is no account to delete yet. To clear local data, export a backup first, then use
            your browser's site-data controls.
          </p>
        </div>
      </div>
    </SectionShell>
  )
}

function DisabledField({
  label,
  placeholder,
  hint,
}: {
  label: string
  placeholder: string
  hint?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-itera-muted">
        {label}
      </span>
      <input
        disabled
        placeholder={placeholder}
        className="w-full rounded-itera-control border border-itera-border bg-itera-surface-subtle px-3.5 py-2.5 text-sm text-itera-muted-light placeholder:text-itera-muted-light"
      />
      {hint && <span className="mt-1 block text-xs text-itera-muted-light">{hint}</span>}
    </label>
  )
}

function Stat({ icon: Icon, label, caption }: { icon: LucideIcon; label: string; caption: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={18} aria-hidden="true" className="mt-1 flex-none text-itera-muted-light" />
      <div>
        <div className="text-xl font-bold text-itera-muted-light">&mdash;</div>
        <div className="text-sm text-itera-muted">{label}</div>
        <div className="text-xs text-itera-muted-light">{caption}</div>
      </div>
    </div>
  )
}
