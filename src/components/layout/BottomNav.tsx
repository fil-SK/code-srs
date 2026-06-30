import { NavLink } from 'react-router-dom'
import { navItems } from './navItems'
import { cn } from '@/lib/cn'

// Mobile-only bottom navigation. Settings is reachable from the topbar/menu, so
// it is omitted here to keep the bar to the primary destinations.
const bottomItems = navItems.filter((item) => item.to !== '/settings')

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-border bg-bg-elev p-2 md:hidden">
      {bottomItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            cn(
              'relative flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium',
              isActive ? 'text-accent' : 'text-muted',
            )
          }
        >
          <item.icon size={20} />
          <span>{item.short}</span>
          {item.badge ? (
            <span className="absolute right-1 top-0 rounded-full bg-accent px-1.5 text-[9px] font-semibold text-white">
              {item.badge}
            </span>
          ) : null}
        </NavLink>
      ))}
    </nav>
  )
}
