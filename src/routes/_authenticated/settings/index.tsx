import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n-context'
import { User, Building2, Users, Globe, Save, Mail, CheckCircle } from 'lucide-react'
import type { Organization, Profile } from '@/integrations/supabase/types'

export const Route = createFileRoute('/_authenticated/settings/')({
  component: SettingsPage,
})

type SettingsTab = 'profile' | 'organization' | 'team' | 'language'

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'פרופיל', icon: User },
  { id: 'organization', label: 'ארגון', icon: Building2 },
  { id: 'team', label: 'צוות', icon: Users },
  { id: 'language', label: 'שפה', icon: Globe },
]

function SettingsPage() {
  const { profile, user, updateProfile } = useAuth()
  const { locale, setLocale } = useI18n()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  // Profile form
  const [profileForm, setProfileForm] = useState({ full_name: '', avatar_url: '', phone: '', title: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)

  // Organization form
  const [org, setOrg] = useState<Organization | null>(null)
  const [orgForm, setOrgForm] = useState({ name: '', address: '', phone: '', website: '' })
  const [savingOrg, setSavingOrg] = useState(false)
  const [orgSuccess, setOrgSuccess] = useState(false)

  // Team
  const [members, setMembers] = useState<Profile[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const orgId = profile?.organization_id

  useEffect(() => {
    if (!profile) return
    const { full_name, avatar_url, phone, title } = profile
    setProfileForm({
      full_name: full_name ?? '',
      avatar_url: avatar_url ?? '',
      phone: phone ?? '',
      title: title ?? '',
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  useEffect(() => {
    if (!orgId) return
    async function fetchOrg() {
      const { data } = await supabase.from('organizations').select('*').eq('id', orgId!).single()
      if (data) {
        setOrg(data as Organization)
        setOrgForm({
          name: data.name ?? '',
          address: (data.settings as Record<string, string>)?.address ?? '',
          phone: (data.settings as Record<string, string>)?.phone ?? '',
          website: (data.settings as Record<string, string>)?.website ?? '',
        })
      }
      const { data: membersData } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', orgId!)
        .order('full_name')
      setMembers((membersData as Profile[]) ?? [])
    }
    fetchOrg()
  }, [orgId])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    await updateProfile({
      full_name: profileForm.full_name || null,
      avatar_url: profileForm.avatar_url || null,
      phone: profileForm.phone || null,
      title: profileForm.title || null,
    })
    setSavingProfile(false)
    setProfileSuccess(true)
    setTimeout(() => setProfileSuccess(false), 2500)
  }

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!org) return
    setSavingOrg(true)
    await supabase.from('organizations').update({
      name: orgForm.name,
      settings: {
        ...((org.settings as Record<string, unknown>) ?? {}),
        address: orgForm.address,
        phone: orgForm.phone,
        website: orgForm.website,
      },
    }).eq('id', org.id)
    setSavingOrg(false)
    setOrgSuccess(true)
    setTimeout(() => setOrgSuccess(false), 2500)
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg(null)
    // In a real app this would call an edge function to send an invite.
    // Here we simulate by showing a success message.
    await new Promise(r => setTimeout(r, 800))
    setInviting(false)
    setInviteMsg({ type: 'success', text: `הזמנה נשלחה ל-${inviteEmail}` })
    setInviteEmail('')
  }

  const ROLE_LABELS: Record<Profile['role'], string> = {
    owner: 'בעלים', admin: 'מנהל', member: 'חבר', viewer: 'צופה',
  }

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">הגדרות</h1>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-48 shrink-0">
          <nav className="space-y-1">
            {TABS.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-5">פרופיל אישי</h2>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">שם מלא</label>
                  <input
                    value={profileForm.full_name}
                    onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">אימייל</label>
                  <input
                    value={user?.email ?? ''}
                    readOnly
                    className="w-full px-3 py-2 border border-slate-100 rounded-xl text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">כותרת / תפקיד</label>
                  <input
                    value={profileForm.title}
                    onChange={e => setProfileForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="למשל: אדריכל בכיר"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">טלפון</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="050-000-0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">כתובת תמונה (URL)</label>
                  <input
                    value={profileForm.avatar_url}
                    onChange={e => setProfileForm(f => ({ ...f, avatar_url: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition"
                >
                  {profileSuccess ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {savingProfile ? 'שומר...' : profileSuccess ? 'נשמר!' : 'שמור שינויים'}
                </button>
              </form>
            </div>
          )}

          {/* Organization Tab */}
          {activeTab === 'organization' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-5">פרטי הארגון</h2>
              <form onSubmit={handleSaveOrg} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">שם הארגון</label>
                  <input
                    value={orgForm.name}
                    onChange={e => setOrgForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">כתובת</label>
                  <input
                    value={orgForm.address}
                    onChange={e => setOrgForm(f => ({ ...f, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="כתובת המשרד"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">טלפון</label>
                  <input
                    type="tel"
                    value={orgForm.phone}
                    onChange={e => setOrgForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="03-000-0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">אתר אינטרנט</label>
                  <input
                    type="url"
                    value={orgForm.website}
                    onChange={e => setOrgForm(f => ({ ...f, website: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://myoffice.co.il"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingOrg}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition"
                >
                  {orgSuccess ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {savingOrg ? 'שומר...' : orgSuccess ? 'נשמר!' : 'שמור שינויים'}
                </button>
              </form>
            </div>
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">חברי צוות ({members.length})</h2>
                {members.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-6">אין חברי צוות</p>
                ) : (
                  <ul className="divide-y divide-slate-50">
                    {members.map(m => (
                      <li key={m.id} className="py-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
                          {(m.full_name ?? 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-700">{m.full_name ?? 'ללא שם'}</p>
                          <p className="text-xs text-slate-400">{m.email}</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {ROLE_LABELS[m.role]}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">הזמנת עמית</h2>
                {inviteMsg && (
                  <p className={`text-sm p-3 rounded-lg mb-4 ${inviteMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {inviteMsg.text}
                  </p>
                )}
                <form onSubmit={handleInvite} className="flex gap-3">
                  <div className="relative flex-1">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition"
                  >
                    {inviting ? 'שולח...' : 'שלח הזמנה'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Language Tab */}
          {activeTab === 'language' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-5">שפת ממשק</h2>
              <div className="space-y-3">
                {[
                  { id: 'he' as const, label: 'עברית', sub: 'Hebrew (RTL)', flag: '🇮🇱' },
                  { id: 'en' as const, label: 'English', sub: 'English (LTR)', flag: '🇺🇸' },
                ].map(lang => (
                  <button
                    key={lang.id}
                    onClick={() => setLocale(lang.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition ${
                      locale === lang.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <div className="text-right flex-1">
                      <p className="font-medium text-slate-800">{lang.label}</p>
                      <p className="text-xs text-slate-400">{lang.sub}</p>
                    </div>
                    {locale === lang.id && (
                      <CheckCircle className="w-5 h-5 text-blue-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
