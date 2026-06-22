import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, X, ClipboardList, CheckCircle2, Clock, Send, AlertCircle } from 'lucide-react'
import type { Client, Project, Proposal } from '@/integrations/supabase/types'

export const Route = createFileRoute('/_authenticated/proposals/')({
  component: ProposalsPage,
})

type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined'

type ProposalWithRels = Proposal & {
  clients: Pick<Client, 'name'> | null
  projects: Pick<Project, 'name'> | null
}

const STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: 'טיוטה',
  sent: 'נשלח',
  viewed: 'נצפה',
  accepted: 'אושר',
  declined: 'נדחה',
}

const STATUS_COLORS: Record<ProposalStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-purple-100 text-purple-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
}

const STATUS_ICONS: Record<ProposalStatus, React.ElementType> = {
  draft: ClipboardList,
  sent: Send,
  viewed: Clock,
  accepted: CheckCircle2,
  declined: AlertCircle,
}

interface NewProposalForm {
  title: string
  client_id: string
  project_id: string
  total: string
  currency: string
  valid_until: string
  description: string
}

const INITIAL_FORM: NewProposalForm = {
  title: '',
  client_id: '',
  project_id: '',
  total: '',
  currency: 'ILS',
  valid_until: '',
  description: '',
}

function ProposalsPage() {
  const { profile } = useAuth()
  const [proposals, setProposals] = useState<ProposalWithRels[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<NewProposalForm>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'all'>('all')

  const orgId = profile?.organization_id

  async function fetchProposals() {
    if (!orgId) return
    const { data } = await supabase
      .from('proposals')
      .select('*, clients(name), projects(name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
    setProposals(((data as unknown) as ProposalWithRels[]) ?? [])
  }

  useEffect(() => {
    if (!orgId) return
    async function init() {
      setLoading(true)
      const [, clientsRes, projectsRes] = await Promise.all([
        fetchProposals(),
        supabase.from('clients').select('*').eq('organization_id', orgId!).order('name'),
        supabase.from('projects').select('*').eq('organization_id', orgId!).neq('status', 'cancelled').order('name'),
      ])
      setClients(clientsRes.data ?? [])
      setProjects(projectsRes.data ?? [])
      setLoading(false)
    }
    init()
  }, [orgId])

  const handleStatusChange = async (id: string, newStatus: ProposalStatus) => {
    await supabase.from('proposals').update({ status: newStatus }).eq('id', id)
    setProposals(prev =>
      prev.map(p => p.id === id ? { ...p, status: newStatus } : p)
    )
  }

  const handleDelete = async (id: string) => {
    if (!confirm('האם למחוק הצעת מחיר זו?')) return
    const { error } = await supabase.from('proposals').delete().eq('id', id)
    if (!error) setProposals(prev => prev.filter(p => p.id !== id))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId || !profile) return
    if (!form.title.trim()) {
      setFormError('כותרת היא שדה חובה')
      return
    }
    setSaving(true)
    setFormError(null)
    const { error } = await supabase.from('proposals').insert({
      organization_id: orgId,
      client_id: form.client_id || null,
      project_id: form.project_id || null,
      title: form.title.trim(),
      description: form.description || null,
      status: 'draft',
      total: form.total ? parseFloat(form.total) : 0,
      currency: form.currency,
      valid_until: form.valid_until || null,
      content: {},
      created_by: profile.id,
    })
    setSaving(false)
    if (error) { setFormError('שמירה נכשלה. נסה שוב.'); return }
    setShowModal(false)
    setForm(INITIAL_FORM)
    fetchProposals()
  }

  const filtered = statusFilter === 'all'
    ? proposals
    : proposals.filter(p => p.status === statusFilter)

  const totals = {
    all: proposals.length,
    draft: proposals.filter(p => p.status === 'draft').length,
    sent: proposals.filter(p => p.status === 'sent').length,
    accepted: proposals.filter(p => p.status === 'accepted').length,
    declined: proposals.filter(p => p.status === 'declined').length,
    viewed: proposals.filter(p => p.status === 'viewed').length,
  }

  const totalAccepted = proposals
    .filter(p => p.status === 'accepted')
    .reduce((s, p) => s + (p.total ?? 0), 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">הצעות מחיר</h1>
          <p className="text-slate-500 text-sm mt-0.5">{proposals.length} הצעות בסך הכל</p>
        </div>
        {profile?.role !== 'viewer' && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition text-sm"
          >
            <Plus className="w-4 h-4" />
            הצעה חדשה
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'הצעות פעילות', value: totals.draft + totals.sent + totals.viewed, color: 'text-blue-600 bg-blue-50', icon: ClipboardList },
          { label: 'ממתינות לתשובה', value: totals.sent, color: 'text-orange-600 bg-orange-50', icon: Clock },
          { label: 'אושרו', value: totals.accepted, color: 'text-green-600 bg-green-50', icon: CheckCircle2 },
          { label: 'סכום שאושר', value: formatCurrency(totalAccepted), color: 'text-purple-600 bg-purple-50', icon: CheckCircle2 },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">{label}</p>
              <p className="font-bold text-slate-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {[
          { id: 'all' as const, label: 'הכל', count: totals.all },
          ...(['draft', 'sent', 'viewed', 'accepted', 'declined'] as ProposalStatus[]).map(s => ({
            id: s, label: STATUS_LABELS[s], count: totals[s],
          })),
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition ${
              statusFilter === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            <span className="text-xs text-slate-400">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <ClipboardList className="w-16 h-16 mb-3 opacity-30" />
          <p className="text-base font-medium">אין הצעות מחיר</p>
          <p className="text-sm mt-1">
            {statusFilter !== 'all' ? 'נסה לשנות את הסינון' : 'צור הצעה ראשונה'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 font-medium">כותרת</th>
                  <th className="px-4 py-3 font-medium">לקוח</th>
                  <th className="px-4 py-3 font-medium">פרויקט</th>
                  <th className="px-4 py-3 font-medium">סכום</th>
                  <th className="px-4 py-3 font-medium">תוקף עד</th>
                  <th className="px-4 py-3 font-medium">תאריך יצירה</th>
                  <th className="px-4 py-3 font-medium">סטטוס</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(proposal => {
                  const StatusIcon = STATUS_ICONS[proposal.status as ProposalStatus] ?? ClipboardList
                  return (
                    <tr key={proposal.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate">
                        {proposal.title}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{proposal.clients?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{proposal.projects?.name ?? '—'}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {formatCurrency(proposal.total, proposal.currency)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {proposal.valid_until ? formatDate(proposal.valid_until) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(proposal.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${STATUS_COLORS[proposal.status as ProposalStatus]?.split(' ')[1]}`} />
                          <select
                            value={proposal.status}
                            onChange={e => handleStatusChange(proposal.id, e.target.value as ProposalStatus)}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer border-0 outline-none appearance-none ${STATUS_COLORS[proposal.status as ProposalStatus]}`}
                          >
                            {(Object.keys(STATUS_LABELS) as ProposalStatus[]).map(s => (
                              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {profile?.role !== 'viewer' && (
                          <button
                            onClick={() => handleDelete(proposal.id)}
                            className="p-1.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition"
                            title="מחק הצעה"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">הצעת מחיר חדשה</h2>
              <button
                onClick={() => { setShowModal(false); setForm(INITIAL_FORM); setFormError(null) }}
                className="p-1.5 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{formError}</p>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">כותרת *</label>
                <input
                  autoFocus
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="הצעת מחיר לבית X"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">לקוח</label>
                <select
                  value={form.client_id}
                  onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">בחר לקוח</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">פרויקט</label>
                <select
                  value={form.project_id}
                  onChange={e => {
                    const pid = e.target.value
                    const proj = projects.find(p => p.id === pid)
                    setForm(f => ({
                      ...f,
                      project_id: pid,
                      client_id: proj?.client_id ?? f.client_id,
                    }))
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">בחר פרויקט</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">סכום (₪)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.total}
                    onChange={e => setForm(f => ({ ...f, total: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">תוקף עד</label>
                  <input
                    type="date"
                    value={form.valid_until}
                    onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">תיאור</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="תיאור הצעת המחיר..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(INITIAL_FORM); setFormError(null) }}
                  className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition"
                >
                  {saving ? 'שומר...' : 'צור הצעה'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
