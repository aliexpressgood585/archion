import { useState, useRef, useEffect, useCallback } from 'react'
import { Menu, Bell, ChevronDown, LogOut, User, Search, X, FolderOpen, Users, FileText } from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n-context'
import { Avatar } from '@/components/ui/avatar'
import { supabase } from '@/integrations/supabase/client'
import type { Notification } from '@/integrations/supabase/types'

export interface TopbarProps {
  title?: string
  onMenuToggle?: () => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'עכשיו'
  if (minutes < 60) return `לפני ${minutes} דק׳`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `לפני ${hours} שע׳`
  const days = Math.floor(hours / 24)
  return `לפני ${days} ימים`
}

interface SearchResult {
  id: string
  label: string
  sub: string
  type: 'project' | 'client' | 'invoice'
}

export function Topbar({ title, onMenuToggle }: TopbarProps) {
  const { profile, signOut } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Notifications state
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const unreadCount = notifications.filter(n => !n.read).length

  // Search state
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const orgId = profile?.organization_id

  // Load notifications
  async function fetchNotifications() {
    if (!profile?.id) return
    setNotifLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10)
    setNotifications((data as Notification[]) ?? [])
    setNotifLoading(false)
  }

  useEffect(() => {
    if (profile?.id) fetchNotifications()
  }, [profile?.id])

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [userMenuOpen])

  // Close notif dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    if (notifOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notifOpen])

  // Close search on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    if (searchOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [searchOpen])

  // Cmd+K to open search
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        setTimeout(() => searchInputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setSearchQuery('')
        setSearchResults([])
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  const handleMarkRead = async (notif: Notification) => {
    if (notif.read) return
    await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notif.id)
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true, read_at: new Date().toISOString() } : n))
  }

  const handleMarkAllRead = async () => {
    if (!profile?.id) return
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length === 0) return
    await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .in('id', unreadIds)
    setNotifications(prev => prev.map(n => ({ ...n, read: true, read_at: n.read_at ?? new Date().toISOString() })))
  }

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || !orgId) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    const [projRes, clientRes, invRes] = await Promise.all([
      supabase.from('projects').select('id, name').eq('organization_id', orgId).ilike('name', `%${q}%`).limit(5),
      supabase.from('clients').select('id, name').eq('organization_id', orgId).ilike('name', `%${q}%`).limit(5),
      supabase.from('invoices').select('id, invoice_number').eq('organization_id', orgId).ilike('invoice_number', `%${q}%`).limit(3),
    ])
    const results: SearchResult[] = [
      ...((projRes.data ?? []).map(p => ({ id: p.id, label: p.name, sub: 'פרויקט', type: 'project' as const }))),
      ...((clientRes.data ?? []).map(c => ({ id: c.id, label: c.name, sub: 'לקוח', type: 'client' as const }))),
      ...((invRes.data ?? []).map(i => ({ id: i.id, label: i.invoice_number, sub: 'חשבונית', type: 'invoice' as const }))),
    ]
    setSearchResults(results)
    setSearchLoading(false)
  }, [orgId])

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 300)
  }

  const handleResultClick = (result: SearchResult) => {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
    if (result.type === 'project') {
      navigate({ to: '/projects/$projectId', params: { projectId: result.id } })
    } else if (result.type === 'client') {
      navigate({ to: '/clients/$clientId', params: { clientId: result.id } })
    } else {
      navigate({ to: '/invoices' })
    }
  }

  const RESULT_ICONS = {
    project: FolderOpen,
    client: Users,
    invoice: FileText,
  }

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

      {/* Right: search + notifications + user */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div ref={searchRef} className="relative">
          <button
            onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50) }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors text-sm"
            aria-label="חיפוש"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:block text-xs text-slate-400">חיפוש...</span>
            <span className="hidden sm:block text-xs text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded">⌘K</span>
          </button>

          {searchOpen && (
            <div className="absolute top-full mt-2 end-0 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white shadow-xl z-50" dir="rtl">
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100">
                <Search className="h-4 w-4 text-slate-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  placeholder="חיפוש פרויקטים, לקוחות, חשבוניות..."
                  className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder-slate-400"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setSearchResults([]) }}>
                    <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                  </button>
                )}
              </div>
              <div className="py-2 max-h-64 overflow-y-auto">
                {searchLoading && (
                  <p className="text-center text-xs text-slate-400 py-4">מחפש...</p>
                )}
                {!searchLoading && searchQuery && searchResults.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-4">לא נמצאו תוצאות</p>
                )}
                {!searchLoading && !searchQuery && (
                  <p className="text-center text-xs text-slate-400 py-4">הקלד לחיפוש</p>
                )}
                {searchResults.length > 0 && (() => {
                  const groups: { label: string; type: SearchResult['type'] }[] = [
                    { label: 'פרויקטים', type: 'project' },
                    { label: 'לקוחות', type: 'client' },
                    { label: 'חשבוניות', type: 'invoice' },
                  ]
                  return groups.map(group => {
                    const items = searchResults.filter(r => r.type === group.type)
                    if (items.length === 0) return null
                    const Icon = RESULT_ICONS[group.type]
                    return (
                      <div key={group.type}>
                        <p className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">{group.label}</p>
                        {items.map(result => (
                          <button
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition text-right"
                          >
                            <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="text-sm text-slate-700 truncate">{result.label}</span>
                          </button>
                        ))}
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setNotifOpen(prev => !prev); if (!notifOpen) fetchNotifications() }}
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

          {notifOpen && (
            <div
              className="absolute top-full mt-1 w-80 rounded-xl border border-slate-200 bg-white shadow-lg z-50 end-0"
              dir="rtl"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-800">התראות</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-blue-600 hover:text-blue-700 transition"
                  >
                    סמן הכל כנקרא
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {notifLoading && (
                  <div className="text-center py-8 text-xs text-slate-400">טוען...</div>
                )}
                {!notifLoading && notifications.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-400">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>אין התראות</p>
                  </div>
                )}
                {notifications.map(notif => (
                  <button
                    key={notif.id}
                    onClick={() => handleMarkRead(notif)}
                    className={cn(
                      'w-full text-right px-4 py-3 hover:bg-slate-50 transition block',
                      !notif.read && 'bg-blue-50/50'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!notif.read && (
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                      )}
                      {notif.read && <span className="mt-1.5 h-2 w-2 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 leading-snug truncate">{notif.title}</p>
                        {notif.body && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.body}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">{timeAgo(notif.created_at)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

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
