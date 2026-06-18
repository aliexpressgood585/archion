import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

interface TimeEntry {
  id: string
  date: string
  person: string
  phase: string
  task: string
  hours: string
  rate: string
}

const PHASES = [
  'בחינה מוקדמת', 'תכנון מוקדם', 'פיתוח תכנון', 'הגשה להיתר',
  'תכנון לביצוע', 'מכרז', 'פיקוח', 'ניהול', 'אחר',
]

function newEntry(): TimeEntry {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    person: '',
    phase: 'תכנון מוקדם',
    task: '',
    hours: '',
    rate: '300',
  }
}

export default function TimeTracker() {
  const [entries, setEntries] = useState<TimeEntry[]>([newEntry()])
  const [budgetHours, setBudgetHours] = useState('')
  const [filterPhase, setFilterPhase] = useState('הכל')

  const add = () => setEntries(e => [...e, newEntry()])
  const remove = (id: string) => setEntries(e => e.filter(x => x.id !== id))
  const update = (id: string, field: keyof TimeEntry, value: string) =>
    setEntries(e => e.map(x => x.id === id ? { ...x, [field]: value } : x))

  const filtered = filterPhase === 'הכל' ? entries : entries.filter(e => e.phase === filterPhase)

  const totalHours = entries.reduce((s, e) => s + (parseFloat(e.hours) || 0), 0)
  const totalValue = entries.reduce((s, e) => s + (parseFloat(e.hours) || 0) * (parseFloat(e.rate) || 0), 0)
  const budget = parseFloat(budgetHours) || 0

  const byPhase: Record<string, { hours: number; value: number }> = {}
  for (const e of entries) {
    if (!byPhase[e.phase]) byPhase[e.phase] = { hours: 0, value: 0 }
    byPhase[e.phase].hours += parseFloat(e.hours) || 0
    byPhase[e.phase].value += (parseFloat(e.hours) || 0) * (parseFloat(e.rate) || 0)
  }

  const fmtMoney = (n: number) => `₪${Math.round(n).toLocaleString('he-IL')}`
  const fmtHrs = (n: number) => `${n.toFixed(1)} ש'`

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">תקציב שעות כולל</label>
          <input type="number" value={budgetHours} onChange={e => setBudgetHours(e.target.value)} placeholder="למשל: 150"
            className="w-36 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">סנן שלב</label>
          <select value={filterPhase} onChange={e => setFilterPhase(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>הכל</option>
            {PHASES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
          <div className="text-2xl font-bold text-blue-700">{fmtHrs(totalHours)}</div>
          <div className="text-xs text-blue-600 mt-0.5">שעות כולל</div>
        </div>
        {budget > 0 && (
          <div className={`rounded-xl p-3 text-center border ${totalHours > budget ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
            <div className={`text-2xl font-bold ${totalHours > budget ? 'text-red-600' : 'text-green-700'}`}>
              {((totalHours / budget) * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-slate-500 mt-0.5">מהתקציב ({budget}ש')</div>
          </div>
        )}
        <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
          <div className="text-xl font-bold text-emerald-700">{fmtMoney(totalValue)}</div>
          <div className="text-xs text-emerald-600 mt-0.5">ערך שעות</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
          <div className="text-2xl font-bold text-slate-700">{filtered.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">רשומות</div>
        </div>
      </div>

      {/* Entries table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-right font-medium">תאריך</th>
              <th className="px-3 py-2 text-right font-medium">אנשי צוות</th>
              <th className="px-3 py-2 text-right font-medium">שלב</th>
              <th className="px-3 py-2 text-right font-medium">משימה</th>
              <th className="px-3 py-2 text-center font-medium w-20">שעות</th>
              <th className="px-3 py-2 text-center font-medium w-24">תעריף ₪/ש'</th>
              <th className="px-3 py-2 text-left font-medium">ערך</th>
              <th className="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => {
              const val = (parseFloat(e.hours) || 0) * (parseFloat(e.rate) || 0)
              return (
                <tr key={e.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="px-3 py-1.5">
                    <input type="date" value={e.date} onChange={x => update(e.id, 'date', x.target.value)}
                      className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="px-3 py-1.5">
                    <input value={e.person} onChange={x => update(e.id, 'person', x.target.value)} placeholder="שם"
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="px-3 py-1.5">
                    <select value={e.phase} onChange={x => update(e.id, 'phase', x.target.value)}
                      className="border border-slate-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                      {PHASES.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-1.5">
                    <input value={e.task} onChange={x => update(e.id, 'task', x.target.value)} placeholder="תיאור"
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="px-3 py-1.5">
                    <input type="number" step="0.5" value={e.hours} onChange={x => update(e.id, 'hours', x.target.value)} placeholder="0"
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="px-3 py-1.5">
                    <input type="number" value={e.rate} onChange={x => update(e.id, 'rate', x.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="px-3 py-1.5 text-left font-semibold text-emerald-700 text-xs">
                    {val > 0 ? fmtMoney(val) : '—'}
                  </td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => remove(e.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
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
        <Plus className="w-4 h-4" /> הוסף רשומה
      </button>

      {/* By phase breakdown */}
      {Object.keys(byPhase).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm font-medium text-slate-700 mb-3">פירוט לפי שלב</div>
          {Object.entries(byPhase).sort(([, a], [, b]) => b.hours - a.hours).map(([phase, data]) => (
            <div key={phase} className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-0">
              <span className="text-sm text-slate-600 flex-1">{phase}</span>
              <span className="text-sm font-medium text-slate-700">{fmtHrs(data.hours)}</span>
              <span className="text-sm text-emerald-600 font-semibold">{fmtMoney(data.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
