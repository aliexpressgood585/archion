import { useState, useRef, useEffect } from 'react'
import { Menu, Bell, ChevronDown, LogOut, User } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n-context'
import { Avatar } from '@/components/ui/avatar'

export interface TopbarProps {
  title?: string
  onMenuToggle?: () => void
  unreadCount?: number
}

export function Topbar({ title, onMenuToggle, unreadCount = 0 }: TopbarProps) {
  const { profile, signOut } = useAuth()
  const { t } = useI18n()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClick)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [userMenuOpen])

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        {title && (
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        )}
      </div>

      {/* Right: notifications + user */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label={t('notifications')}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 end-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors"
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
          >
            <Avatar
              src={profile?.avatar_url}
              name={profile?.full_name ?? ''}
              size="sm"
            />
            <span className="hidden sm:block text-sm font-medium text-slate-700">
              {profile?.full_name ?? '—'}
            </span>
            <ChevronDown
              className={cn(
                'hidden sm:block h-4 w-4 text-slate-400 transition-transform',
                userMenuOpen && 'rotate-180'
              )}
            />
          </button>

          {userMenuOpen && (
            <div
              role="menu"
              className={cn(
                'absolute top-full mt-1 w-48 rounded-xl border border-slate-200 bg-white shadow-lg py-1 z-50',
                'end-0'
              )}
            >
              <Link
                to="/settings"
                onClick={() => setUserMenuOpen(false)}
                role="menuitem"
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <User className="h-4 w-4 text-slate-400" />
                {t('profile')}
              </Link>
              <hr className="my-1 border-slate-100" />
              <button
                role="menuitem"
                onClick={() => {
                  setUserMenuOpen(false)
                  signOut()
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                {t('logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
