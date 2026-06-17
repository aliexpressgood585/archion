import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowRight, Mail, Phone, MapPin, Edit2, X, Plus, FolderOpen, FileText, Send } from 'lucide-react'
import type { Client, Project, Invoice, Proposal } from '@/integrations/supabase/types'

export const Route = createFileRoute('/_authenticated/clients/$clientId')({
  component: ClientDetailPage,
})

const PROJECT_STATUS_LABELS: Record<Project['status'], string> = {
  planning: 'תכנון', active: 'פעיל', on_hold: 'מושהה', completed: 'הושלם', cancelled: 'בוטל',
}
const PROJECT_STATUS_COLORS: Record<Project['status'], string> = {
  planning: 'bg-yellow-100 text-yellow-800', active: 'bg-green-100 text-green-800',
  on_hold: 'bg-orange-100 text-orange-800', completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
}
const INVOICE_STATUS_LABELS: Record<Invoice['status'], string> = {
  draft: 'טיוטה', sent: 'נשלח', paid: 'שולם', overdue: 'באיחור', cancelled: 'בוטל',
}
const INVOICE_STATUS_COLORS: Record<Invoice['status'], string> = {
  draft: 'bg-slate-100 text-slate-600', sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700', overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-400',
}
const PROPOSAL_STATUS_LABELS: Record<Proposal['status'], string> = {
  draft: 'טיוטה', sent: 'נשלח', viewed: 'נצפה', accepted: 'אושר', rejected: 'נדחה', expired: 'פג תוקף',
}
const PROPOSAL_STATUS_COLORS: Record<Proposal['status'], string> = {
  draft: 'bg-slate-100 text-slate-600', sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-purple-100 text-purple-700', accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700', expired: 'bg-orange-100 text-orange-700',
}

interface ProposalForm {
  title: string
  description: string
  total: string
  valid_until: string
}

interface EditClientForm {
  name: string
  email: string
  phone: string
  address: string
  company: string
  notes: string
}

function ClientDetailPage() {
  const { clientId } = Route.useParams()
  const { profile } = useAuth()
  const [client, setClient] = useState<Client | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [showProposalModal, setShowProposalModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [proposalForm, setProposalForm] = useState<ProposalForm>({ title: '', description: '', total: '', valid_until: '' })
  const [editForm, setEditForm] = useState<EditClientForm>({ name: '', email: '', phone: '', address: '', company: '', notes: '' })
  const [savingProposal, setSavingProposal] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const orgId = profile?.organization_id

  async function fetchAll() {
    if (!orgId) return
    const [clientRes, projRes, invRes, propRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('projects').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').eq('client_id', clientId).order('issue_date', { ascending: false }),
      supabase.from('proposals').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    ])
    const c = clientRes.data as Client | null
    setClient(c)
    if (c) {
      setEditForm({
        name: c.name, email: c.email ?? '', phone: c.phone ?? '',
        address: c.address ?? '', company: c.company ?? '', notes: c.notes ?? '',
      })
    }
    setProjects((projRes.data as Project[]) ?? [])
    setInvoices((invRes.data as Invoice[]) ?? [])
    setProposals((propRes.data as Proposal[]) ?? [])
  }

  useEffect(() => {
    if (!orgId) return
    async function load() {
      setLoading(true)
      await fetchAll()
      setLoading(false)
    }
    load()
  }, [orgId, clientId])

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId || !profile || !proposalForm.title.trim()) {
      setFormError('כותרת הצעת המחיר היא שדה חובה')
      return
    }
    setSavingProposal(true)
    setFormError(null)
    const { error } = await supabase.from('proposals').insert({
      organization_id: orgId,
      client_id: clientId,
      title: proposalForm.title.trim(),
      description: proposalForm.description || null,
      total: proposalForm.total ? parseFloat(proposalForm.total) : 0,
      valid_until: proposalForm.valid_until || null,
      created_by: profile.id,
      content: {},
    })
    setSavingProposal(false)
    if (error) { setFormError('שמירה נכשלה.'); return }
    setShowProposalModal(false)
    setProposalForm({ title: '', description: '', total: '', valid_until: '' })
    fetchAll()
  }

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm.name.trim()) { setFormError('שם הלקוח הוא שדה חובה'); return }
    setSavingEdit(true)
    setFormError(null)
    const { error } = await supabase.from('clients').update({
      name: editForm.name.trim(),
      email: editForm.email || null,
      phone: editForm.phone || null,
      address: editForm.address || null,
      company: editForm.company || null,
      notes: editForm.notes || null,
    }).eq('id', clientId)
    setSavingEdit(false)
    if (error) { setFormError('שמירה נכשלה.'); return }
    setShowEditModal(false)
    fetchAll()
  }

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto" dir="rtl">
        <div className="h-8 w-48 bg-slate-100 rounded animate-pulse mb-4" />
        <div className="h-40 bg-slate-50 rounded-2xl animate-pulse" />
      </div>
    )
  }
  if (!client) {
    return <div className="p-6 text-center text-slate-500" dir="rtl">לקוח לא נמצא</div>
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => history.back()} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
          <ArrowRight className="w-5 h-5 text-slate-500" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">{client.name}</h1>
        <button
          onClick={() => setShowEditModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm text-slate-600 transition mr-auto"
        >
          <Edit2 className="w-3.5 h-3.5" />
          עריכה
        </button>
      </div>

      {/* Contact Info */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h2 className="font-semibold text-slate-800 mb-4">פרטי קשר</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {client.email && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Mail className="w-4 h-4 text-slate-400" />
              <a href={`mailto:${client.email}`} className="hover:text-blue-600 transition">{client.email}</a>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>{client.phone}</span>
            </div>
          )}
          {client.address && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>{client.address}</span>
            </div>
          )}
          {client.company && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="text-slate-400 text-xs">חברה:</span>
              <span>{client.company}</span>
            </div>
          )}
        </div>
        {client.notes && (
          <div className="mt-4 pt-4 border-t border-slate-50">
            <p className="text-xs text-slate-400 mb-1">הערות</p>
            <p className="text-sm text-slate-600">{client.notes}</p>
          </div>
        )}
      </div>

      {/* Projects */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-blue-500" />
          פרויקטים ({projects.length})
        </h2>
        {projects.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">אין פרויקטים</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {projects.map(p => (
              <li key={p.id} className="py-3 flex items-center justify-between hover:bg-slate-50 -mx-2 px-2 rounded-lg cursor-pointer transition"
                onClick={() => (window.location.hash = `#/projects/${p.id}`)}>
                <div>
                  <p className="font-medium text-slate-700">{p.name}</p>
                  {p.start_date && <p className="text-xs text-slate-400">{formatDate(p.start_date)}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${PROJECT_STATUS_COLORS[p.status]}`}>
                  {PROJECT_STATUS_LABELS[p.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-500" />
          חשבוניות ({invoices.length})
        </h2>
        {invoices.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">אין חשבוניות</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-xs text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-medium">מספר</th>
                  <th className="pb-2 font-medium">תאריך</th>
                  <th className="pb-2 font-medium">סכום</th>
                  <th className="pb-2 font-medium">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-b border-slate-50">
                    <td className="py-2.5 font-mono">{inv.invoice_number}</td>
                    <td className="py-2.5 text-slate-500">{formatDate(inv.issue_date)}</td>
                    <td className="py-2.5 font-medium">{formatCurrency(inv.total, inv.currency)}</td>
                    <td className="py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${INVOICE_STATUS_COLORS[inv.status]}`}>
                        {INVOICE_STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Proposals */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Send className="w-5 h-5 text-purple-500" />
            הצעות מחיר ({proposals.length})
          </h2>
          <button
            onClick={() => setShowProposalModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" />
            הצעה חדשה
          </button>
        </div>
        {proposals.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">אין הצעות מחיר</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {proposals.map(p => (
              <li key={p.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-700">{p.title}</p>
                  {p.valid_until && <p className="text-xs text-slate-400">תוקף עד {formatDate(p.valid_until)}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm text-slate-700">{formatCurrency(p.total, p.currency)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PROPOSAL_STATUS_COLORS[p.status]}`}>
                    {PROPOSAL_STATUS_LABELS[p.status]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Proposal Modal */}
      {showProposalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">הצעת מחיר חדשה</h2>
              <button onClick={() => { setShowProposalModal(false); setFormError(null) }} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreateProposal} className="space-y-4">
              {formError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{formError}</p>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">כותרת *</label>
                <input value={proposalForm.title} onChange={e => setProposalForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="כותרת ההצעה" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">תיאור</label>
                <textarea rows={3} value={proposalForm.description} onChange={e => setProposalForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="תיאור ההצעה..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">סכום (₪)</label>
                <input type="number" min="0" value={proposalForm.total} onChange={e => setProposalForm(f => ({ ...f, total: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">תוקף עד</label>
                <input type="date" value={proposalForm.valid_until} onChange={e => setProposalForm(f => ({ ...f, valid_until: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowProposalModal(false); setFormError(null) }}
                  className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">ביטול</button>
                <button type="submit" disabled={savingProposal}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition">
                  {savingProposal ? 'שומר...' : 'צור הצעה'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">עריכת לקוח</h2>
              <button onClick={() => { setShowEditModal(false); setFormError(null) }} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleEditClient} className="space-y-4">
              {formError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{formError}</p>}
              {(['name', 'email', 'phone', 'company', 'address'] as const).map(field => (
                <div key={field}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {field === 'name' ? 'שם *' : field === 'email' ? 'אימייל' : field === 'phone' ? 'טלפון' : field === 'company' ? 'חברה' : 'כתובת'}
                  </label>
                  <input value={editForm[field]} onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
                    type={field === 'email' ? 'email' : 'text'}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">הערות</label>
                <textarea rows={3} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowEditModal(false); setFormError(null) }}
                  className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">ביטול</button>
                <button type="submit" disabled={savingEdit}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition">
                  {savingEdit ? 'שומר...' : 'שמור'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
