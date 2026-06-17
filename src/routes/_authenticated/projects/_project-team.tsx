import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth-context'
import {
  Plus, X, BarChart3, Clock, Users
} from 'lucide-react'

interface TeamMember {
  id: string
  user_id: string
  role: 'owner' | 'architect' | 'engineer' | 'contractor' | 'member'
  hours_allocated: number
  notes: string | null
  joined_at: string
}

interface TimeLog {
  id: string
  date: string
  hours: number
  description: string | null
  user_id: string
}

const ROLES = {
  owner: { label: 'בעלים', color: 'bg-red-100 text-red-800' },
  architect: { label: 'אדריכל', color: 'bg-blue-100 text-blue-800' },
  engineer: { label: 'מהנדס', color: 'bg-purple-100 text-purple-800' },
  contractor: { label: 'קבלן', color: 'bg-yellow-100 text-yellow-800' },
  member: { label: 'חבר צוות', color: 'bg-slate-100 text-slate-800' },
}

export function ProjectTeam({ projectId }: { projectId: string }) {
  const { profile } = useAuth()
  const [team, setTeam] = useState<TeamMember[]>([])
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'team' | 'time' | 'hours'>('team')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTimeModal, setShowTimeModal] = useState(false)
  const [newMemberForm, setNewMemberForm] = useState({
    email: '',
    role: 'member' as const,
    hours: '0',
  })
  const [timeForm, setTimeForm] = useState({
    date: new Date().toISOString().split('T')[0],
    hours: '1',
    description: '',
  })
  const [saving, setSaving] = useState(false)

  const orgId = profile?.organization_id

  async function fetchData() {
    if (!orgId || !projectId) return
    const [teamRes, timeRes] = await Promise.all([
      supabase
        .from('project_team' as any)
        .select('*')
        .eq('project_id', projectId)
        .order('joined_at') as any,
      supabase
        .from('time_logs' as any)
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: false })
        .limit(50) as any,
    ])

    setTeam((teamRes.data as TeamMember[]) ?? [])
    setTimeLogs((timeRes.data as TimeLog[]) ?? [])
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      await fetchData()
      setLoading(false)
    }
    load()
  }, [orgId, projectId])

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId || !newMemberForm.email.trim()) return

    setSaving(true)
    // In a real app, you'd create the user first or invite them
    // For now, we'll just show an invite message
    const { error } = await (supabase
      .from('project_team' as any)
      .insert({
        organization_id: orgId,
        project_id: projectId,
        user_id: profile?.id,
        role: newMemberForm.role,
        hours_allocated: parseFloat(newMemberForm.hours) || 0,
        notes: `הוזמן: ${newMemberForm.email}`,
      }) as any)

    setSaving(false)
    if (!error) {
      setShowAddModal(false)
      setNewMemberForm({ email: '', role: 'member', hours: '0' })
      fetchData()
    }
  }

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId || !profile) return

    setSaving(true)
    const { error } = await (supabase
      .from('time_logs' as any)
      .insert({
        organization_id: orgId,
        project_id: projectId,
        user_id: profile.id,
        date: timeForm.date,
        hours: parseFloat(timeForm.hours) || 1,
        description: timeForm.description || null,
      }) as any)

    setSaving(false)
    if (!error) {
      setShowTimeModal(false)
      setTimeForm({
        date: new Date().toISOString().split('T')[0],
        hours: '1',
        description: '',
      })
      fetchData()
    }
  }

  const totalHours = timeLogs.reduce((sum, log) => sum + log.hours, 0)
  const totalAllocated = team.reduce((sum, m) => sum + m.hours_allocated, 0)

  return (
    <div className="space-y-6" dir="rtl">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {(['team', 'time', 'hours'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 font-medium text-sm transition border-b-2 flex items-center gap-2 ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            {tab === 'team' && <Users className="w-4 h-4" />}
            {tab === 'time' && <Clock className="w-4 h-4" />}
            {tab === 'hours' && <BarChart3 className="w-4 h-4" />}
            {tab === 'team' && 'צוות'}
            {tab === 'time' && 'רישום שעות'}
            {tab === 'hours' && 'סיכום שעות'}
          </button>
        ))}
      </div>

      {/* Team Tab */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" />
            הוסף חבר
          </button>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : team.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>אין חברים בצוות</p>
            </div>
          ) : (
            <div className="space-y-3">
              {team.map(member => (
                <div key={member.id} className="bg-white rounded-lg border border-slate-200 p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${ROLES[member.role].color}`}>
                        {ROLES[member.role].label}
                      </span>
                      {member.hours_allocated > 0 && (
                        <span className="text-xs text-slate-600">{member.hours_allocated} שעות</span>
                      )}
                    </div>
                    {member.notes && (
                      <p className="text-xs text-slate-600">{member.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Member Modal */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">הוסף חבר</h3>
                  <button onClick={() => setShowAddModal(false)} className="p-1">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
                <form onSubmit={handleAddMember} className="p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">אימייל</label>
                    <input
                      type="email"
                      value={newMemberForm.email}
                      onChange={e => setNewMemberForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="user@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">תפקיד</label>
                    <select
                      value={newMemberForm.role}
                      onChange={e => setNewMemberForm(f => ({ ...f, role: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(ROLES).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">שעות מוקצות</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={newMemberForm.hours}
                      onChange={e => setNewMemberForm(f => ({ ...f, hours: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                    >
                      ביטול
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition"
                    >
                      {saving ? 'שומר...' : 'הוסף'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Time Logging Tab */}
      {activeTab === 'time' && (
        <div className="space-y-4">
          <button
            onClick={() => setShowTimeModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" />
            רשום שעות
          </button>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : timeLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>אין רישומי שעות</p>
            </div>
          ) : (
            <div className="space-y-2">
              {timeLogs.map(log => (
                <div key={log.id} className="bg-white rounded-lg border border-slate-200 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{log.date}</p>
                    <p className="text-xs text-slate-600">{log.hours} שעות</p>
                    {log.description && (
                      <p className="text-xs text-slate-500 mt-1">{log.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Time Log Modal */}
          {showTimeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">רשום שעות</h3>
                  <button onClick={() => setShowTimeModal(false)} className="p-1">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
                <form onSubmit={handleLogTime} className="p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">תאריך</label>
                    <input
                      type="date"
                      value={timeForm.date}
                      onChange={e => setTimeForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">שעות</label>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={timeForm.hours}
                      onChange={e => setTimeForm(f => ({ ...f, hours: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">תיאור</label>
                    <input
                      value={timeForm.description}
                      onChange={e => setTimeForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="מה עשית בשעות אלו?"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowTimeModal(false)}
                      className="flex-1 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                    >
                      ביטול
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition"
                    >
                      {saving ? 'שומר...' : 'רשום'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hours Summary Tab */}
      {activeTab === 'hours' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-xs text-blue-600 mb-1">סה״כ שעות רשומות</p>
              <p className="text-2xl font-bold text-blue-700">{totalHours.toFixed(1)}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <p className="text-xs text-purple-600 mb-1">שעות מוקצות</p>
              <p className="text-2xl font-bold text-purple-700">{totalAllocated.toFixed(1)}</p>
            </div>
          </div>

          {team.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800 mb-4">חלוקת שעות לפי חברים</h3>
              <div className="space-y-3">
                {team.map(member => {
                  const memberHours = timeLogs
                    .filter(log => log.user_id === member.user_id)
                    .reduce((sum, log) => sum + log.hours, 0)

                  return (
                    <div key={member.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{member.notes || 'חבר'}</p>
                        <p className="text-xs text-slate-500">{ROLES[member.role].label}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-800">{memberHours.toFixed(1)}</p>
                        <p className="text-xs text-slate-500">שעות</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
