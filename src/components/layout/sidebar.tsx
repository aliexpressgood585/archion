import { Link, useRouterState } from '@tanstack/react-router'
import {
  Building2,
  LayoutDashboard,
  FolderOpen,
  Users,
  FileText,
  File,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n-context'
import { Avatar } from '@/components/ui/avatar'
import type { TranslationKey } from '@/lib/i18n'

interface NavItem {
  to: string
  icon: React.ElementType
  labelKey: TranslationKey
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { to: '/projects', icon: FolderOpen, labelKey: 'projects' },
  { to: '/clients', icon: Users, labelKey: 'clients' },
  { to: '/invoices', icon: FileText, labelKey: 'invoices' },
  { to: '/documents', icon: File, labelKey: 'documents' },
  { to: '/settings', icon: Settings, labelKey: 'settings' },
]

export interface SidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
  const { profile, signOut } = useAuth()
  const { t, locale, setLocale } = useI18n()
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  const isActive = (to: string) =>
    pathname === to || pathname.startsWith(to + '/')

  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-slate-900 text-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-slate-700/60',
          collapsed ? 'justify-center px-2' : 'gap-2.5 px-5'
        )}
      >
        <Building2 className="h-7 w-7 shrink-0 text-blue-400" />
        {!collapsed && (
          <span className="text-xl font-bold tracking-tight text-white">Archion</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className={cn('flex flex-col gap-1', collapsed ? 'px-2' : 'px-3')}>
          {navItems.map(({ to, icon: Icon, labelKey }) => {
            const active = isActive(to)
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                    collapsed && 'justify-center px-2'
                  )}
                  title={collapsed ? t(labelKey) : undefined}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 shrink-0',
                      active ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    )}
                  />
                  {!collapsed && <span>{t(labelKey)}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Language toggle */}
      <div
        className={cn(
          'border-t border-slate-700/60 py-3',
          collapsed ? 'flex flex-col items-center gap-1 px-2' : 'flex gap-2 px-4'
        )}
      >
        <button
          onClick={() => setLocale('he')}
          className={cn(
            'rounded-md px-2 py-1 text-xs font-medium transition-colors',
            locale === 'he'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          )}
        >
          He
        </button>
        <button
          onClick={() => setLocale('en')}
          className={cn(
            'rounded-md px-2 py-1 text-xs font-medium transition-colors',
            locale === 'en'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          )}
        >
          En
        </button>
      </div>

      {/* User + collapse toggle */}
      <div className="border-t border-slate-700/60 p-3">
        <div
          className={cn(
            'flex items-center gap-3',
            collapsed && 'flex-col'
          )}
        >
          <Avatar
            src={profile?.avatar_url}
            name={profile?.full_name ?? ''}
            size="sm"
          />
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-white">
                {profile?.full_name ?? '—'}
              </p>
              <p className="truncate text-xs text-slate-400">
                {profile?.title ?? ''}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => signOut()}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title={t('logout')}
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Collapse button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={cn(
              'mt-3 flex w-full items-center justify-center rounded-lg py-1.5',
              'text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-xs gap-1'
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  )
}
