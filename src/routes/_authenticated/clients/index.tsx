import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { formatCurrency } from '@/lib/utils'
import { Plus, Search, Users, Mail, Phone, X } from 'lucide-react'
import type { Client } from '@/integrations/supabase/types'

export const Route = createFileRoute('/_authenticated/clients/')({
  component: ClientsPage,
})

interface ClientWithStats extends Client {
  project_count: number
  total_billed: number
}

interface NewClientForm {
  name: string
  email: string
  phone: string
  address: string
  company: string
  notes: string
}

const INITIAL_FORM: NewClientForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
  company: '',
  notes: '',
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function ClientsPage() {
  const { profile } = useAuth()
  const [clients, setClients] = useState<ClientWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<NewClientForm>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const orgId = profile?.organization_id

  async function fetchClients() {
    if (!orgId) return
    const { data: clientsData } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', orgId)
      .order('name')

    const clients: Client[] = clientsData ?? []

    // For each client, fetch project count and total billed
    const enriched: ClientWithStats[] = await Promise.all(
      clients.map(async (c) => {
        const [projRes, invoiceRes] = await Promise.all([
          supabase.from('projects').select('id', { count: 'exact', head: true }).eq('client_id', c.id),
          supabase.from('invoices').select('total').eq('client_id', c.id).neq('status', 'cancelled'),
        ])
        const total_billed = (invoiceRes.data ?? []).reduce((s, i) => s + (i.total ?? 0), 0)
        return {
          ...c,
          project_count: projRes.count ?? 0,
          total_billed,
        }
      })
    )
    setClients(enriched)
  }

  useEffect(() => {
    if (!orgId) return
    async function load() {
      setLoading(true)
      await fetchClients()
      setLoading(false)
    }
    load()
  }, [orgId])

  const filtered = clients.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId || !profile) return
    if (!form.name.trim()) {
      setFormError('שם הלקוח הוא שדה חובה')
      return
    }
    setSaving(true)
    setFormError(null)
    const { error } = await supabase.from('clients').insert({
      organization_id: orgId,
      name: form.name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      company: form.company || null,
      notes: form.notes || null,
      created_by: profile.id,
    })
    setSaving(false)
    if (error) {
      setFormError('שמירה נכשלה. נסה שוב.')
      return
    }
    setShowModal(false)
    setForm(INITIAL_FORM)
    setLoading(true)
    fetchClients().then(() => setLoading(false))
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">לקוחות</h1>
          <p className="text-slate-500 text-sm mt-0.5">{clients.length} לקוחות בסך הכל</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition text-sm"
        >
          <Plus className="w-4 h-4" />
          לקוח חדש
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש לקוחות..."
          className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 h-36 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Users className="w-16 h-16 mb-3 opacity-30" />
          <p className="text-base font-medium">אין לקוחות</p>
          <p className="text-sm mt-1">
            {search ? 'לא נמצאו תוצאות לחיפוש' : 'הוסף לקוח ראשון'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(client => (
            <div
              key={client.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition cursor-pointer group"
              onClick={() => (window.location.hash = `#/clients/${client.id}`)}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {getInitials(client.name)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate group-hover:text-blue-600 transition">
                    {client.name}
                  </p>
                  {client.company && (
                    <p className="text-xs text-slate-400 truncate">{client.company}</p>
                  )}
                </div>
              </div>
              {client.email && (
                <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-1">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-3">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>{client.phone}</span>
                </div>
              )}
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
                <span className="text-xs text-slate-500">
                  {client.project_count} פרויקטים
                </span>
                {client.total_billed > 0 && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                    {formatCurrency(client.total_billed)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">לקוח חדש</h2>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">שם הלקוח *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="שם הלקוח"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">חברה</label>
                <input
                  value={form.company}
                  onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="שם החברה"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">אימייל</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="client@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">טלפון</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="050-000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">כתובת</label>
                <input
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="כתובת"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">הערות</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="הערות נוספות..."
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
                  {saving ? 'שומר...' : 'צור לקוח'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
