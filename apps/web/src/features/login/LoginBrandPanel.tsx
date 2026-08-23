import { Check, Database, Shield, SquareCode, type LucideIcon } from 'lucide-react'
import { LearningCardsIllustration } from './LearningCardsIllustration'

// The left half of the login page: brand, welcome copy, the learning-card
// illustration, and the three product principles. This is the larger half by
// design — the sign-in panel is the smaller, quieter side.

const PRINCIPLES: {
  label: string
  description: React.ReactNode
  icon: LucideIcon
  checked?: boolean
}[] = [
  {
    label: 'Local-first',
    description: <>Your data stays<br />on your device.</>,
    icon: Database,
    checked: true,
  },
  {
    label: 'Private by default',
    description: <>No accounts required.<br />Ever.</>,
    icon: Shield,
    checked: true,
  },
  {
    label: 'Built for engineers',
    description: <>Optimized for how you<br />learn and build.</>,
    icon: SquareCode,
  },
]

function Principle({
  label,
  description,
  icon: Icon,
  checked,
}: (typeof PRINCIPLES)[number]) {
  return (
    <div className="flex flex-1 flex-col items-center px-3 text-center">
      <span className="relative grid h-9 w-10 place-items-center">
        <Icon size={30} strokeWidth={1.7} className="text-itera-navy" aria-hidden="true" />
        {checked && (
          <span className="absolute bottom-0 right-0 grid h-[15px] w-[15px] place-items-center rounded-full bg-itera-surface-subtle">
            <Check size={12} strokeWidth={2.6} className="text-itera-accent" aria-hidden="true" />
          </span>
        )}
      </span>
      <span className="mt-2 whitespace-nowrap text-[13px] font-semibold text-itera-ink-brand">
        {label}
      </span>
      <span className="mt-1 text-[12px] leading-[1.35] text-itera-muted">{description}</span>
    </div>
  )
}

export function LoginBrandPanel() {
  return (
    <div className="flex flex-col p-6 sm:p-8 lg:p-10">
      {/* The real Itera mark (public/itera-logo.png), the same asset TopNav
          uses — not a redrawn approximation. */}
      <div className="flex items-center gap-3">
        <img src="/itera-logo.png" alt="" className="h-11 w-11 lg:h-12 lg:w-12" />
        <span className="text-[32px] font-[650] tracking-[-0.025em] text-itera-ink-brand lg:text-[34px]">
          Itera
        </span>
      </div>

      <h1 className="mt-6 text-[34px] font-[650] leading-[1.1] tracking-[-0.025em] text-itera-ink-brand sm:text-[40px] lg:text-[42px]">
        Welcome back
      </h1>
      <p className="mt-3 max-w-[380px] text-[15px] font-normal leading-[1.55] text-itera-muted">
        Pick up where you left off. Build better knowledge, one review at a time.
      </p>

      {/* Fixed-size illustration, so it is shown only where there is room for
          it rather than being scaled down into mush. */}
      <div className="mt-4 hidden justify-start lg:flex">
        <LearningCardsIllustration />
      </div>

      <div className="mt-auto hidden items-start pt-6 md:flex">
        {PRINCIPLES.map((p, i) => (
          <div key={p.label} className="flex flex-1 items-start">
            {i > 0 && <span aria-hidden="true" className="h-16 w-px bg-itera-border" />}
            <Principle {...p} />
          </div>
        ))}
      </div>
    </div>
  )
}
