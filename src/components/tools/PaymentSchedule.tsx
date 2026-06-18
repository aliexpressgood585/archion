import { useToolState } from '@/hooks/useToolState'
import { Plus, Trash2 } from 'lucide-react'

interface Milestone {
  id: string
  name: string
  pct: string
  dueDate: string
  paid: boolean
}

interface State {
  contractValue: string
  milestones: Milestone[]
}

const DEFAULT_MILESTONES: Omit<Milestone, 'id'>[] = [
  { name: 'חתימת הסכם',         pct: '15', dueDate: '', paid: false },
  { name: 'אישור תכנון מוקדם',  pct: '20', dueDate: '', paid: false },
  { name: 'הגשה להיתר',          pct: '20', dueDate: '', paid: false },
  { name: 'קבלת היתר',           pct: '15', dueDate: '', paid: false },
  { name: 'תחילת ביצוע',         pct: '15', dueDate: '', paid: false },
  { name: 'מסירת תכנון לביצוע',  pct: '10', dueDate: '', paid: false },
  { name: 'מסירה סופית',         pct: '5',  dueDate: '', paid: false },
]

const DEFAULT: State = {
  contractValue: '',
  milestones: DEFAULT_MILESTONES.map(m => ({ ...m, id: crypto.randomUUID() })),
}

export default function PaymentSchedule({ projectId }: { projectId: string | null }) {
  const { state, setState, loading, saving } = useToolState('payment-schedule', projectId, DEFAULT)
  const { contractValue, milestones } = state

  const add = () => setState(s => ({ ...s, milestones: [...s.milestones, { id: crypto.randomUUID(), name: '', pct: '0', dueDate: '', paid: false }] }))
  const remove = (id: string) => setState(s => ({ ...s, milestones: s.milestones.filter(x => x.id !== id) }))
  const update = (id: string, field: keyof Milestone, value: string | boolean) =>
    setState(s => ({ ...s, milestones: s.milestones.map(m => m.id === id ? { ...m, [field]: value } : m) }))

  const contract = parseFloat(contractValue.replace(/,/g, '')) || 0
  const totalPct = milestones.reduce((s, m) => s + (parseFloat(m.pct) || 0), 0)
  const paidTotal = milestones.filter(m => m.paid).reduce((s, m) => s + contract * (parseFloat(m.pct) || 0) / 100, 0)
  const remaining = contract - paidTotal

  const fmt = (n: number) => n > 0 ? `₪${Math.round(n).toLocaleString('he-IL')}` : '—'

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-5" dir="rtl">
      {saving && <div className="text-xs text-slate-400 text-left">שומר...</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">שכ"ט כולל (ללא מע"מ, ₪)</label>
          <input type="text" value={contractValue} onChange={e => setState(s => ({ ...s, contractValue: e.target.value }))} placeholder="200,000"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-end">
          <div className={`px-4 py-2 rounded-lg text-sm font-medium ${Math.abs(totalPct - 100) < 0.5 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
            סה"כ אחוזים: {totalPct.toFixed(1)}% {Math.abs(totalPct - 100) < 0.5 ? '✓' : '⚠'}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-right font-medium">אבן דרך</th>
              <th className="px-3 py-2 text-center font-medium w-20">%</th>
              <th className="px-3 py-2 text-right font-medium">סכום</th>
              <th className="px-3 py-2 text-right font-medium">תאריך יעד</th>
              <th className="px-3 py-2 text-center font-medium w-20">שולם</th>
              <th className="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((m, i) => {
              const amount = contract * (parseFloat(m.pct) || 0) / 100
              return (
                <tr key={m.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} ${m.paid ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-1.5">
                    <input value={m.name} onChange={e => update(m.id, 'name', e.target.value)} placeholder="שם אבן דרך"
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="px-3 py-1.5">
                    <input type="number" min="0" max="100" value={m.pct} onChange={e => update(m.id, 'pct', e.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className={`px-3 py-1.5 font-semibold ${m.paid ? 'text-green-600 line-through' : 'text-emerald-700'}`}>
                    {fmt(amount)}
                  </td>
                  <td className="px-3 py-1.5">
                    <input type="date" value={m.dueDate} onChange={e => update(m.id, 'dueDate', e.target.value)}
                      className="border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <input type="checkbox" checked={m.paid} onChange={e => update(m.id, 'paid', e.target.checked)}
                      className="w-4 h-4 rounded text-green-600 cursor-pointer" />
                  </td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => remove(m.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <button onClick={add}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
        <Plus className="w-4 h-4" /> הוסף אבן דרך
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
          <div className="text-2xl font-bold text-emerald-700">{fmt(contract)}</div>
          <div className="text-sm text-emerald-600 mt-1">שכ"ט כולל</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
          <div className="text-2xl font-bold text-green-700">{fmt(paidTotal)}</div>
          <div className="text-sm text-green-600 mt-1">שולם עד כה</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
          <div className="text-2xl font-bold text-amber-700">{fmt(remaining)}</div>
          <div className="text-sm text-amber-600 mt-1">יתרה לגבייה</div>
        </div>
      </div>
    </div>
  )
}
