import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, X, FileText, TrendingUp, DollarSign, AlertCircle, Clock } from 'lucide-react'
import type { Invoice, Client, Project } from '@/integrations/supabase/types'

export const Route = createFileRoute('/_authenticated/invoices/')({
  component: InvoicesPage,
})

type InvoiceTab = 'all' | Invoice['status']

type InvoiceWithRels = Invoice & {
  clients: Pick<Client, 'name'> | null
  projects: Pick<Project, 'name'> | null
}

const STATUS_LABELS: Record<Invoice['status'], string> = {
  draft: 'טיוטה', sent: 'נשלח', paid: 'שולם', overdue: 'באיחור', cancelled: 'בוטל',
}
const STATUS_COLORS: Record<Invoice['status'], string> = {
  draft: 'bg-slate-100 text-slate-600', sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700', overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-400',
}

const TABS: { id: InvoiceTab; label: string }[] = [
  { id: 'all', label: 'הכל' },
  { id: 'draft', label: 'טיוטות' },
  { id: 'sent', label: 'נשלחו' },
  { id: 'paid', label: 'שולמו' },
  { id: 'overdue', label: 'באיחור' },
]

interface NewInvoiceForm {
  client_id: string
  project_id: string
  invoice_number: string
  issue_date: string
  due_date: string
  subtotal: string
  tax_rate: string
  notes: string
}

const INITIAL_FORM: NewInvoiceForm = {
  client_id: '',
  project_id: '',
  invoice_number: '',
  issue_date: new Date().toISOString().split('T')[0],
  due_date: '',
  subtotal: '',
  tax_rate: '17',
  notes: '',
}

function InvoicesPage() {
  const { profile } = useAuth()
  const [invoices, setInvoices] = useState<InvoiceWithRels[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<InvoiceTab>('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<NewInvoiceForm>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const orgId = profile?.organization_id

  async function fetchInvoices() {
    if (!orgId) return
    const { data } = await supabase
      .from('invoices')
      .select('*, clients(name), projects(name)')
      .eq('organization_id', orgId)
      .order('issue_date', { ascending: false })
    setInvoices(((data as unknown) as InvoiceWithRels[]) ?? [])
  }

  useEffect(() => {
    if (!orgId) return
    async function init() {
      setLoading(true)
      const [, clientsRes, projectsRes] = await Promise.all([
        fetchInvoices(),
        supabase.from('clients').select('*').eq('organization_id', orgId!).order('name'),
        supabase.from('projects').select('*').eq('organization_id', orgId!).order('name'),
      ])
      setClients(clientsRes.data ?? [])
      setProjects(projectsRes.data ?? [])
      setLoading(false)
    }
    init()
  }, [orgId])

  const filtered = activeTab === 'all' ? invoices : invoices.filter(i => i.status === activeTab)

  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const totalPending = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.total, 0)
  const overdueCount = invoices.filter(i => i.status === 'overdue').length

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId || !profile) return
    if (!form.invoice_number.trim() || !form.subtotal) {
      setFormError('מספר חשבונית וסכום הם שדות חובה')
      return
    }
    const subtotal = parseFloat(form.subtotal)
    const taxRate = parseFloat(form.tax_rate) || 0
    const taxAmount = (subtotal * taxRate) / 100
    const total = subtotal + taxAmount
    setSaving(true)
    setFormError(null)
    const { error } = await supabase.from('invoices').insert({
      organization_id: orgId,
      client_id: form.client_id || null,
      project_id: form.project_id || null,
      invoice_number: form.invoice_number.trim(),
      issue_date: form.issue_date,
      due_date: form.due_date || null,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      notes: form.notes || null,
      created_by: profile.id,
    })
    setSaving(false)
    if (error) { setFormError('שמירה נכשלה.'); return }
    setShowModal(false)
    setForm(INITIAL_FORM)
    fetchInvoices()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">חשבוניות</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition text-sm"
        >
          <Plus className="w-4 h-4" />
          חשבונית חדשה
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'סה״כ חויב', value: formatCurrency(totalInvoiced), icon: FileText, color: 'text-blue-600 bg-blue-50' },
          { label: 'שולם', value: formatCurrency(totalPaid), icon: TrendingUp, color: 'text-green-600 bg-green-50' },
          { label: 'ממתין לתשלום', value: formatCurrency(totalPending), icon: Clock, color: 'text-orange-600 bg-orange-50' },
          { label: 'חשבוניות באיחור', value: String(overdueCount), icon: AlertCircle, color: 'text-red-600 bg-red-50' },
        ].map(({ label, value, icon: Icon, color }) => (
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
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {tab.id !== 'all' && (
              <span className="mr-1.5 text-xs text-slate-400">
                ({invoices.filter(i => i.status === tab.id).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <DollarSign className="w-16 h-16 mb-3 opacity-30" />
          <p className="text-base font-medium">אין חשבוניות</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 font-medium">מספר</th>
                  <th className="px-4 py-3 font-medium">לקוח</th>
                  <th className="px-4 py-3 font-medium">פרויקט</th>
                  <th className="px-4 py-3 font-medium">תאריך הנפקה</th>
                  <th className="px-4 py-3 font-medium">תאריך פירעון</th>
                  <th className="px-4 py-3 font-medium">סכום</th>
                  <th className="px-4 py-3 font-medium">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-medium text-slate-700">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-slate-600">{inv.clients?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{inv.projects?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(inv.issue_date)}</td>
                    <td className="px-4 py-3 text-slate-500">{inv.due_date ? formatDate(inv.due_date) : '—'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(inv.total, inv.currency)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[inv.status]}`}>
                        {STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">חשבונית חדשה</h2>
              <button onClick={() => { setShowModal(false); setForm(INITIAL_FORM); setFormError(null) }} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {formError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{formError}</p>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">מספר חשבונית *</label>
                <input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="INV-001" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">לקוח</label>
                <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">בחר לקוח</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">פרויקט</label>
                <select value={form.project_id} onChange={e => {
                  const pid = e.target.value
                  const proj = projects.find(p => p.id === pid)
                  setForm(f => ({
                    ...f,
                    project_id: pid,
                    // Auto-fill client when project has one
                    client_id: proj?.client_id ?? f.client_id,
                  }))
                }} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">בחר פרויקט</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">תאריך הנפקה</label>
                  <input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">תאריך פירעון</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">סכום לפני מע״מ (₪) *</label>
                  <input type="number" min="0" step="0.01" value={form.subtotal} onChange={e => setForm(f => ({ ...f, subtotal: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">מע״מ (%)</label>
                  <input type="number" min="0" max="100" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              {form.subtotal && (
                <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>סכום לפני מע״מ:</span>
                    <span>{formatCurrency(parseFloat(form.subtotal) || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>מע״מ ({form.tax_rate}%):</span>
                    <span>{formatCurrency(((parseFloat(form.subtotal) || 0) * (parseFloat(form.tax_rate) || 0)) / 100)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-slate-800 mt-1 pt-1 border-t border-slate-200">
                    <span>סה״כ:</span>
                    <span>{formatCurrency((parseFloat(form.subtotal) || 0) * (1 + (parseFloat(form.tax_rate) || 0) / 100))}</span>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">הערות</label>
                <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="הערות לחשבונית..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setForm(INITIAL_FORM); setFormError(null) }}
                  className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">ביטול</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition">
                  {saving ? 'שומר...' : 'צור חשבונית'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
