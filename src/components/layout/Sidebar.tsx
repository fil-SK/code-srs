import { NavLink } from 'react-router-dom'
import { navItems } from './navItems'
import { useNavBadges } from './useNavBadges'
import { cn } from '@/lib/cn'

export function Sidebar() {
  const badges = useNavBadges()

  return (
    <aside className="sticky top-0 hidden h-screen flex-col gap-1.5 border-r border-border bg-bg-elev p-3.5 md:flex">
      <div className="flex items-center gap-2.5 px-2.5 pb-4 pt-2">
        <div className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-accent font-mono text-[15px] font-bold text-white">
          {'{}'}
        </div>
        <div className="leading-tight">
          <div className="text-[15.5px] font-semibold tracking-tight">
            code-srs
          </div>
          <div className="font-mono text-[11px] text-faint">learn by recall</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-[9px] px-2.5 py-2.5 text-sm font-medium',
                isActive
                  ? 'bg-accent-soft text-text'
                  : 'text-muted hover:bg-panel hover:text-text',
              )
            }
          >
            <item.icon size={18} className="shrink-0 opacity-90" />
            <span>{item.label}</span>
            {badges[item.to] ? (
              <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">
                {badges[item.to]}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
