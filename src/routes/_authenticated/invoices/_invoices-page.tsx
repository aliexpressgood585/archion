import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Download, Eye, Trash2 } from 'lucide-react'

interface Invoice {
  id: string
  invoice_number: string
  project_id: string | null
  client_id: string | null
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  issue_date: string
  due_date: string | null
  paid_at: string | null
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  currency: string
  notes: string | null
  terms: string | null
  created_at: string
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'טיוטה',
  sent: 'נשלח',
  paid: 'שולם',
  overdue: 'באיחור',
  cancelled: 'בוטל',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-800',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
}

export function InvoicesPage() {
  const { profile } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string | 'all'>('all')

  const orgId = profile?.organization_id

  useEffect(() => {
    if (!orgId) return
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', orgId!)
        .order('issue_date', { ascending: false })
      setInvoices((data as Invoice[]) ?? [])
      setLoading(false)
    }
    load()
  }, [orgId])

  const filtered = invoices.filter(
    inv => filterStatus === 'all' || inv.status === filterStatus
  )

  const totalRevenue = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.total, 0)

  const pendingAmount = invoices
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.total, 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">חשבוניות</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition">
          <Plus className="w-5 h-5" />
          חשבונית חדשה
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <p className="text-xs text-slate-500 mb-1">הכנסה שהתקבלה</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <p className="text-xs text-slate-500 mb-1">ממתין לתשלום</p>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(pendingAmount)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <p className="text-xs text-slate-500 mb-1">סה״כ חשבוניות</p>
          <p className="text-2xl font-bold text-blue-600">{invoices.length}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {status === 'all' ? 'הכל' : STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p>אין חשבוניות</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-xs text-slate-500 bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-3 font-medium">מספר</th>
                <th className="px-6 py-3 font-medium">תאריך</th>
                <th className="px-6 py-3 font-medium">סכום</th>
                <th className="px-6 py-3 font-medium">סטטוס</th>
                <th className="px-6 py-3 font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono">{inv.invoice_number}</td>
                  <td className="px-6 py-4">{formatDate(inv.issue_date)}</td>
                  <td className="px-6 py-4 font-semibold">{formatCurrency(inv.total, inv.currency)}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[inv.status]}`}>
                      {STATUS_LABELS[inv.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded hover:bg-slate-100">
                        <Eye className="w-4 h-4 text-slate-500" />
                      </button>
                      <button className="p-1.5 rounded hover:bg-slate-100">
                        <Download className="w-4 h-4 text-slate-500" />
                      </button>
                      <button className="p-1.5 rounded hover:bg-slate-100">
                        <Trash2 className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
