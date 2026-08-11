import { Code2, Database, ShieldCheck, type LucideIcon } from 'lucide-react'
import { LearningCardsIllustration } from './LearningCardsIllustration'

// The left half of the login page: brand, welcome copy, the learning-card
// illustration, and the three product principles. This is the larger half by
// design — the sign-in panel is the smaller, quieter side.

const PRINCIPLES: { label: string; icon: LucideIcon }[] = [
  { label: 'Local-first', icon: Database },
  { label: 'Private by default', icon: ShieldCheck },
  { label: 'Built for engineers', icon: Code2 },
]

function Principle({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-3 px-2">
      <span className="grid h-11 w-11 flex-none place-items-center rounded-full border border-itera-border-strong">
        <Icon size={19} strokeWidth={1.9} className="text-itera-navy" aria-hidden="true" />
      </span>
      <span className="whitespace-nowrap text-[15px] font-semibold text-itera-ink-brand">
        {label}
      </span>
    </div>
  )
}

export function LoginBrandPanel() {
  return (
    <div className="flex flex-col p-8 lg:p-14">
      {/* The real Itera mark (public/itera-logo.png), the same asset TopNav
          uses — not a redrawn approximation. */}
      <div className="flex items-center gap-3">
        <img src="/itera-logo.png" alt="" className="h-14 w-14 lg:h-16 lg:w-16" />
        <span className="font-itera-display text-[36px] font-extrabold tracking-tight text-itera-ink-brand lg:text-[42px]">
          Itera
        </span>
      </div>

      <h1 className="mt-8 font-itera-display text-[38px] font-extrabold leading-[1.04] tracking-[-0.025em] text-itera-ink-brand sm:text-[46px] xl:text-[50px]">
        Welcome back
      </h1>
      <p className="mt-4 max-w-[400px] text-[16px] leading-[1.55] text-itera-muted lg:text-[17px]">
        Pick up where you left off. Build better knowledge, one review at a time.
      </p>

      {/* Fixed-size illustration, so it is shown only where there is room for
          it rather than being scaled down into mush. */}
      <div className="mt-6 hidden justify-start lg:flex">
        <LearningCardsIllustration />
      </div>

      <div className="mt-auto hidden items-center pt-10 md:flex">
        {PRINCIPLES.map((p, i) => (
          <div key={p.label} className="flex flex-1 items-center">
            {i > 0 && <span aria-hidden="true" className="h-9 w-px bg-itera-border" />}
            <Principle {...p} />
          </div>
        ))}
      </div>
    </div>
  )
}
