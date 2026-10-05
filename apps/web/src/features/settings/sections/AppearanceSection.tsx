import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/app/theme'
import { cn } from '@/lib/cn'
import { Panel, SectionShell } from './SectionShell'

const OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun, description: 'A bright, clear workspace.' },
  { value: 'dark', label: 'Dark', icon: Moon, description: 'A calm workspace for low light.' },
  { value: 'system', label: 'System', icon: Monitor, description: 'Follow your device’s appearance.' },
] as const

export function AppearanceSection() {
  const { preference, setTheme } = useTheme()

  return (
    <SectionShell title="Appearance" description="Choose how FlipTap looks on this browser.">
      <Panel>
        <fieldset>
          <legend className="text-sm font-semibold text-fliptap-ink-brand">Theme</legend>
          <p className="mt-1 text-sm text-fliptap-muted">Your choice is saved automatically on this device.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {OPTIONS.map(({ value, label, icon: Icon, description }) => (
              <label
                key={value}
                className={cn(
                  'relative flex cursor-pointer items-start gap-3 rounded-fliptap-control border p-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-fliptap-accent motion-reduce:transition-none',
                  preference === value
                    ? 'border-fliptap-selection-border bg-fliptap-selection-soft'
                    : 'border-fliptap-border bg-fliptap-surface hover:border-fliptap-border-strong hover:bg-fliptap-surface-subtle',
                )}
              >
                <input
                  type="radio"
                  name="theme"
                  value={value}
                  checked={preference === value}
                  onChange={() => setTheme(value)}
                  aria-label={label}
                  className="peer sr-only"
                />
                <Icon size={20} aria-hidden="true" className="mt-0.5 flex-none text-fliptap-muted" />
                <span>
                  <span className="block text-sm font-semibold text-fliptap-ink-brand">{label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-fliptap-muted">{description}</span>
                </span>
                <span aria-hidden="true" className="ml-auto mt-1 h-3.5 w-3.5 flex-none rounded-full border border-fliptap-border-strong peer-checked:border-4 peer-checked:border-fliptap-ink-brand" />
              </label>
            ))}
          </div>
        </fieldset>
      </Panel>
      <p className="text-sm text-fliptap-muted">Interface density and code font settings are planned.</p>
    </SectionShell>
  )
}
