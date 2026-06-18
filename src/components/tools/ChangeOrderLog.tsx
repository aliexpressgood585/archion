import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

type COStatus = 'pending' | 'approved' | 'rejected' | 'on_hold'

interface ChangeOrder {
  id: string
  num: number
  date: string
  description: string
  initiator: string
  reason: string
  costImpact: string
  costType: 'add' | 'deduct' | 'none'
  scheduleDays: string
  status: COStatus
  notes: string
}

const STATUS_META: Record<COStatus, { label: string; color: string }> = {
  pending:   { label: 'ממתין לאישור', color: 'bg-amber-100 text-amber-700' },
  approved:  { label: 'אושר',         color: 'bg-green-100 text-green-700' },
  rejected:  { label: 'נדחה',         color: 'bg-red-100 text-red-700' },
  on_hold:   { label: 'בהקפאה',       color: 'bg-slate-100 text-slate-600' },
}

let coCounter = 1

function newCO(): ChangeOrder {
  return {
    id: crypto.randomUUID(),
    num: coCounter++,
    date: new Date().toISOString().slice(0, 10),
    description: '',
    initiator: '',
    reason: '',
    costImpact: '',
    costType: 'add',
    scheduleDays: '',
    status: 'pending',
    notes: '',
  }
}

export default function ChangeOrderLog() {
  const [cos, setCos] = useState<ChangeOrder[]>([newCO()])
  const [contractValue, setContractValue] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const add = () => {
    const co = newCO()
    setCos(cs => [...cs, co])
    setExpanded(co.id)
  }
  const remove = (id: string) => setCos(cs => cs.filter(x => x.id !== id))
  const update = (id: string, field: keyof ChangeOrder, value: string) =>
    setCos(cs => cs.map(c => c.id === id ? { ...c, [field]: value } : c))

  const contract = parseFloat(contractValue.replace(/,/g, '')) || 0

  const netCostImpact = cos
    .filter(c => c.status === 'approved')
    .reduce((sum, c) => {
      const v = parseFloat(c.costImpact) || 0
      return sum + (c.costType === 'add' ? v : c.costType === 'deduct' ? -v : 0)
    }, 0)

  const totalScheduleImpact = cos
    .filter(c => c.status === 'approved')
    .reduce((sum, c) => sum + (parseFloat(c.scheduleDays) || 0), 0)

  const revisedContract = contract + netCostImpact
  const fmt = (n: number) => n !== 0 ? `₪${Math.round(Math.abs(n)).toLocaleString('he-IL')}` : '—'

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">שווי חוזה מקורי (₪)</label>
          <input type="text" value={contractValue} onChange={e => setContractValue(e.target.value)} placeholder="5,000,000"
            className="w-48 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
          <div className="text-xl font-bold text-slate-700">{cos.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">סה"כ שינויים</div>
        </div>
        <div className={`rounded-xl p-3 text-center border ${netCostImpact >= 0 ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
          <div className={`text-xl font-bold ${netCostImpact >= 0 ? 'text-amber-700' : 'text-green-700'}`}>
            {netCostImpact >= 0 ? '+' : '-'}{fmt(netCostImpact)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">השפעת עלות מאושרת</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
          <div className="text-xl font-bold text-blue-700">{totalScheduleImpact > 0 ? `+${totalScheduleImpact}` : totalScheduleImpact} ימים</div>
          <div className="text-xs text-slate-500 mt-0.5">השפעה על לוח זמנים</div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
          <div className="text-xl font-bold text-emerald-700">{contract > 0 ? fmt(revisedContract) : '—'}</div>
          <div className="text-xs text-slate-500 mt-0.5">שווי חוזה מעודכן</div>
        </div>
      </div>

      {/* CO List */}
      <div className="space-y-2">
        {cos.map(co => (
          <div key={co.id} className="border border-slate-200 rounded-xl overflow-hidden">
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setExpanded(expanded === co.id ? null : co.id)}
            >
              <span className="text-xs font-bold text-slate-400 w-12 shrink-0">CO-{co.num}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 truncate">{co.description || '(ללא תיאור)'}</div>
                <div className="text-xs text-slate-500">{co.date} · {co.initiator || 'יוזם'}</div>
              </div>
              {co.costImpact && (
                <span className={`text-sm font-bold shrink-0 ${co.costType === 'add' ? 'text-amber-600' : co.costType === 'deduct' ? 'text-green-600' : 'text-slate-500'}`}>
                  {co.costType === 'add' ? '+' : co.costType === 'deduct' ? '-' : ''}₪{parseInt(co.costImpact).toLocaleString('he-IL')}
                </span>
              )}
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0 ${STATUS_META[co.status].color}`}>
                {STATUS_META[co.status].label}
              </span>
              <button onClick={e => { e.stopPropagation(); remove(co.id) }}
                className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {expanded === co.id && (
              <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">תיאור השינוי</label>
                    <input value={co.description} onChange={e => update(co.id, 'description', e.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">יוזם</label>
                    <input value={co.initiator} onChange={e => update(co.id, 'initiator', e.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">סיבה</label>
                    <input value={co.reason} onChange={e => update(co.id, 'reason', e.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-500 mb-1">השפעת עלות (₪)</label>
                      <input type="number" value={co.costImpact} onChange={e => update(co.id, 'costImpact', e.target.value)}
                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">סוג</label>
                      <select value={co.costType} onChange={e => update(co.id, 'costType', e.target.value)}
                        className="border border-slate-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="add">תוספת</option>
                        <option value="deduct">קיצוץ</option>
                        <option value="none">ניטרלי</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">השפעת זמן (ימים)</label>
                    <input type="number" value={co.scheduleDays} onChange={e => update(co.id, 'scheduleDays', e.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">סטטוס</label>
                    <select value={co.status} onChange={e => update(co.id, 'status', e.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                      {(Object.entries(STATUS_META) as [COStatus, typeof STATUS_META[COStatus]][]).map(([k, v]) =>
                        <option key={k} value={k}>{v.label}</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={add}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
        <Plus className="w-4 h-4" /> הוסף פקודת שינוי
      </button>
    </div>
  )
}
