import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

type RfiStatus = 'open' | 'pending' | 'answered' | 'closed'

interface RFI {
  id: string
  num: number
  date: string
  subject: string
  description: string
  from: string
  to: string
  response: string
  responseDate: string
  status: RfiStatus
  urgent: boolean
}

const STATUS_META: Record<RfiStatus, { label: string; color: string }> = {
  open:     { label: 'פתוח',   color: 'bg-red-100 text-red-700' },
  pending:  { label: 'ממתין',  color: 'bg-amber-100 text-amber-700' },
  answered: { label: 'נענה',   color: 'bg-blue-100 text-blue-700' },
  closed:   { label: 'סגור',   color: 'bg-green-100 text-green-700' },
}

let rfiCounter = 1

function newRfi(): RFI {
  return {
    id: crypto.randomUUID(),
    num: rfiCounter++,
    date: new Date().toISOString().slice(0, 10),
    subject: '',
    description: '',
    from: '',
    to: '',
    response: '',
    responseDate: '',
    status: 'open',
    urgent: false,
  }
}

export default function RfiLog() {
  const [rfis, setRfis] = useState<RFI[]>([newRfi()])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<RfiStatus | 'all'>('all')

  const add = () => {
    const r = newRfi()
    setRfis(rs => [...rs, r])
    setExpanded(r.id)
  }
  const remove = (id: string) => setRfis(rs => rs.filter(x => x.id !== id))
  const update = (id: string, field: keyof RFI, value: string | boolean) =>
    setRfis(rs => rs.map(r => r.id === id ? { ...r, [field]: value } : r))

  const filtered = filterStatus === 'all' ? rfis : rfis.filter(r => r.status === filterStatus)

  const counts = {
    open: rfis.filter(r => r.status === 'open').length,
    pending: rfis.filter(r => r.status === 'pending').length,
    answered: rfis.filter(r => r.status === 'answered').length,
    closed: rfis.filter(r => r.status === 'closed').length,
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.keys(STATUS_META) as RfiStatus[]).map(s => (
          <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
            className={`rounded-xl p-3 text-center border transition-all ${filterStatus === s ? 'ring-2 ring-offset-1 ring-blue-400' : ''} ${STATUS_META[s].color.replace('100', '50').replace('700', '600')}`}>
            <div className="text-2xl font-bold">{counts[s as RfiStatus]}</div>
            <div className="text-xs font-medium mt-0.5">{STATUS_META[s].label}</div>
          </button>
        ))}
      </div>

      {/* RFI List */}
      <div className="space-y-2">
        {filtered.map(rfi => (
          <div key={rfi.id} className="border border-slate-200 rounded-xl overflow-hidden">
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setExpanded(expanded === rfi.id ? null : rfi.id)}
            >
              <span className="text-xs font-bold text-slate-400 w-10 shrink-0">RFI-{rfi.num}</span>
              {rfi.urgent && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold shrink-0">דחוף</span>}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 truncate">{rfi.subject || '(ללא נושא)'}</div>
                <div className="text-xs text-slate-500">{rfi.date} · {rfi.from || 'שולח'} → {rfi.to || 'מקבל'}</div>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0 ${STATUS_META[rfi.status].color}`}>
                {STATUS_META[rfi.status].label}
              </span>
              <button onClick={e => { e.stopPropagation(); remove(rfi.id) }}
                className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {expanded === rfi.id && (
              <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">נושא</label>
                    <input value={rfi.subject} onChange={e => update(rfi.id, 'subject', e.target.value)}
                      placeholder="נושא השאלה"
                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">מ</label>
                    <input value={rfi.from} onChange={e => update(rfi.id, 'from', e.target.value)} placeholder="שם / חברה"
                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">אל</label>
                    <input value={rfi.to} onChange={e => update(rfi.id, 'to', e.target.value)} placeholder="נמען"
                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">תיאור השאלה</label>
                  <textarea value={rfi.description} onChange={e => update(rfi.id, 'description', e.target.value)}
                    rows={2} placeholder="פרט את השאלה..."
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">תשובה</label>
                    <textarea value={rfi.response} onChange={e => update(rfi.id, 'response', e.target.value)}
                      rows={2} placeholder="תשובה / הנחיה..."
                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">תאריך תשובה</label>
                      <input type="date" value={rfi.responseDate} onChange={e => update(rfi.id, 'responseDate', e.target.value)}
                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">סטטוס</label>
                        <select value={rfi.status} onChange={e => update(rfi.id, 'status', e.target.value)}
                          className="border border-slate-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                          {(Object.entries(STATUS_META) as [RfiStatus, typeof STATUS_META[RfiStatus]][]).map(([k, v]) =>
                            <option key={k} value={k}>{v.label}</option>
                          )}
                        </select>
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer mt-4">
                        <input type="checkbox" checked={rfi.urgent} onChange={e => update(rfi.id, 'urgent', e.target.checked)}
                          className="w-4 h-4 rounded text-red-500 cursor-pointer" />
                        <span className="text-sm text-slate-600">דחוף</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={add}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
        <Plus className="w-4 h-4" /> הוסף RFI
      </button>
    </div>
  )
}
