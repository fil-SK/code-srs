import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/app/theme'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      type="button"
      onClick={toggle}
      title="Toggle theme"
      aria-label="Toggle color theme"
      className="grid h-9 w-9 place-items-center rounded-[9px] border border-border bg-panel text-muted hover:border-accent hover:text-text"
    >
      {theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />}
    </button>
  )
}
