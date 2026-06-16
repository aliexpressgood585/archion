import { Link, useRouterState } from '@tanstack/react-router'
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  FileText,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n-context'
import type { TranslationKey } from '@/lib/i18n'

interface BottomNavItem {
  to: string
  icon: React.ElementType
  labelKey: TranslationKey
}

const navItems: BottomNavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { to: '/projects', icon: FolderOpen, labelKey: 'projects' },
  { to: '/clients', icon: Users, labelKey: 'clients' },
  { to: '/invoices', icon: FileText, labelKey: 'invoices' },
  { to: '/settings', icon: Settings, labelKey: 'settings' },
]

export function BottomNav() {
  const { t } = useI18n()
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  const isActive = (to: string) =>
    pathname === to || pathname.startsWith(to + '/')

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white md:hidden">
      <ul className="flex items-stretch">
        {navItems.map(({ to, icon: Icon, labelKey }) => {
          const active = isActive(to)
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
                  active ? 'text-blue-600' : 'text-slate-500'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5',
                    active ? 'text-blue-600' : 'text-slate-400'
                  )}
                />
                <span>{t(labelKey)}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
