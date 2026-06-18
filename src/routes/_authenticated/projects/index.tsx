import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Search, FolderOpen, X, ChevronDown } from 'lucide-react'
import type { Project, Client } from '@/integrations/supabase/types'

export const Route = createFileRoute('/_authenticated/projects/')({
  component: ProjectsPage,
})

type ProjectWithClient = Project & { clients: Pick<Client, 'name'> | null; invoiced_amount?: number }

const STATUS_LABELS: Record<Project['status'], string> = {
  planning: 'תכנון',
  active: 'פעיל',
  on_hold: 'מושהה',
  completed: 'הושלם',
  cancelled: 'בוטל',
}

const STATUS_COLORS: Record<Project['status'], string> = {
  planning: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  on_hold: 'bg-orange-100 text-orange-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
}

type ProjectStatus = Project['status']

interface NewProjectForm {
  name: string
  client_id: string
  status: ProjectStatus
  budget: string
  start_date: string
  end_date: string
  description: string
}

const INITIAL_FORM: NewProjectForm = {
  name: '',
  client_id: '',
  status: 'planning',
  budget: '',
  start_date: '',
  end_date: '',
  description: '',
}

function ProjectsPage() {
  const { profile } = useAuth()
  const [projects, setProjects] = useState<ProjectWithClient[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<NewProjectForm>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const orgId = profile?.organization_id

  async function fetchProjects() {
    if (!orgId) return
    const { data } = await supabase
      .from('projects')
      .select('*, clients(name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
    const rawProjects = ((data as unknown) as ProjectWithClient[]) ?? []
    // Fetch invoiced amounts in parallel for each project
    const projectsWithInvoiced = await Promise.all(
      rawProjects.map(async project => {
        const { data: invData } = await supabase
          .from('invoices')
          .select('total')
          .eq('project_id', project.id)
          .neq('status', 'cancelled')
        const invoiced_amount = (invData ?? []).reduce((sum, row) => sum + (row.total ?? 0), 0)
        return { ...project, invoiced_amount }
      })
    )
    setProjects(projectsWithInvoiced)
  }

  useEffect(() => {
    if (!orgId) return
    async function init() {
      setLoading(true)
      const [, clientsRes] = await Promise.all([
        fetchProjects(),
        supabase.from('clients').select('*').eq('organization_id', orgId!).order('name'),
      ])
      setClients(clientsRes.data ?? [])
      setLoading(false)
    }
    init()
  }, [orgId])

  const filtered = projects.filter(p => {
    const matchSearch =
      !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  // Reload clients every time the modal opens so newly created clients appear
  useEffect(() => {
    if (!showModal || !orgId) return
    supabase.from('clients').select('*').eq('organization_id', orgId).order('name')
      .then(({ data }) => { if (data) setClients(data) })
  }, [showModal, orgId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId || !profile) return
    if (!form.name.trim()) {
      setFormError('שם הפרויקט הוא שדה חובה')
      return
    }
    setSaving(true)
    setFormError(null)
    const { data: inserted, error } = await supabase.from('projects').insert({
      organization_id: orgId,
      name: form.name.trim(),
      client_id: form.client_id || null,
      status: form.status,
      budget: form.budget ? parseFloat(form.budget) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      description: form.description || null,
      created_by: profile.id,
    }).select('*, clients(name)').single()
    setSaving(false)
    if (error) {
      setFormError('שמירה נכשלה. נסה שוב.')
      return
    }
    // Immediately prepend to list — no refetch needed
    if (inserted) setProjects(prev => [inserted as unknown as ProjectWithClient, ...prev])
    setShowModal(false)
    setForm(INITIAL_FORM)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">פרויקטים</h1>
          <p className="text-slate-500 text-sm mt-0.5">{projects.length} פרויקטים בסך הכל</p>
        </div>
        {profile?.role !== 'viewer' && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition text-sm"
          >
            <Plus className="w-4 h-4" />
            פרויקט חדש
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש פרויקטים..."
            className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as ProjectStatus | 'all')}
            className="appearance-none pr-3 pl-8 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
          >
            <option value="all">כל הסטטוסים</option>
            {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 h-44 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <FolderOpen className="w-16 h-16 mb-3 opacity-30" />
          <p className="text-base font-medium">אין פרויקטים</p>
          <p className="text-sm mt-1">
            {search || statusFilter !== 'all' ? 'נסה לשנות את פרמטרי החיפוש' : 'צור פרויקט ראשון'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(project => {
            const invoicedAmount = project.invoiced_amount ?? 0
            const spentPercent =
              project.budget && project.budget > 0
                ? Math.min((invoicedAmount / project.budget) * 100, 100)
                : 0
            const barColor =
              spentPercent >= 90
                ? 'bg-red-500'
                : spentPercent >= 70
                ? 'bg-orange-500'
                : 'bg-blue-500'
            return (
              <div
                key={project.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition cursor-pointer group"
                onClick={() =>
                  (window.location.hash = `#/projects/${project.id}`)
                }
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition leading-tight">
                    {project.name}
                  </h3>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mr-2 ${STATUS_COLORS[project.status]}`}
                  >
                    {STATUS_LABELS[project.status]}
                  </span>
                </div>
                {project.clients?.name && (
                  <p className="text-sm text-slate-500 mb-3">{project.clients.name}</p>
                )}
                {project.budget && project.budget > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>תקציב</span>
                      <span>{formatCurrency(project.budget, project.budget_currency)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${spentPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatCurrency(invoicedAmount)} מתוך {formatCurrency(project.budget, project.budget_currency)}
                    </p>
                  </div>
                )}
                <div className="flex justify-between text-xs text-slate-400">
                  {project.start_date && <span>{formatDate(project.start_date)}</span>}
                  {project.end_date && <span>עד {formatDate(project.end_date)}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">פרויקט חדש</h2>
              <button
                onClick={() => { setShowModal(false); setForm(INITIAL_FORM); setFormError(null) }}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  {formError}
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">שם הפרויקט *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="שם הפרויקט"
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
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">סטטוס</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">תקציב (₪)</label>
                <input
                  type="number"
                  min="0"
                  value={form.budget}
                  onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">תאריך התחלה</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">תאריך סיום</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
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
                  placeholder="תיאור הפרויקט..."
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
                  {saving ? 'שומר...' : 'צור פרויקט'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
