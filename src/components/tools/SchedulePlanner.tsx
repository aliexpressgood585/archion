import { useToolState } from '@/hooks/useToolState'
import { Plus, Trash2 } from 'lucide-react'

interface Phase {
  id: string
  name: string
  durationWeeks: string
  depends: string
  notes: string
}

interface State {
  startDate: string
  phases: Phase[]
}

const DEFAULT_PHASES: Omit<Phase, 'id'>[] = [
  { name: 'בחינה מוקדמת',    durationWeeks: '2',  depends: '', notes: '' },
  { name: 'תכנון מוקדם',     durationWeeks: '6',  depends: '', notes: '' },
  { name: 'פיתוח תכנון',     durationWeeks: '8',  depends: '', notes: '' },
  { name: 'הגשה להיתר',      durationWeeks: '3',  depends: '', notes: '' },
  { name: 'טיפול בהיתר',     durationWeeks: '16', depends: '', notes: 'תלוי ברשות' },
  { name: 'תכנון לביצוע',    durationWeeks: '10', depends: '', notes: '' },
  { name: 'מכרז קבלנים',     durationWeeks: '4',  depends: '', notes: '' },
  { name: 'ביצוע',           durationWeeks: '52', depends: '', notes: '' },
  { name: 'פיקוח ומסירה',    durationWeeks: '4',  depends: '', notes: '' },
]

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + weeks * 7)
  return d
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const DEFAULT: State = {
  startDate: new Date().toISOString().slice(0, 10),
  phases: DEFAULT_PHASES.map(p => ({ ...p, id: crypto.randomUUID() })),
}

const BAR_COLORS = [
  'bg-blue-400', 'bg-indigo-400', 'bg-violet-400', 'bg-purple-400',
  'bg-pink-400', 'bg-rose-400', 'bg-orange-400', 'bg-amber-400', 'bg-emerald-400'
]

export default function SchedulePlanner({ projectId }: { projectId: string | null }) {
  const { state, setState, loading, saving } = useToolState('schedule-planner', projectId, DEFAULT)
  const { startDate, phases } = state

  const add = () => setState(s => ({ ...s, phases: [...s.phases, { id: crypto.randomUUID(), name: '', durationWeeks: '4', depends: '', notes: '' }] }))
  const remove = (id: string) => setState(s => ({ ...s, phases: s.phases.filter(x => x.id !== id) }))
  const update = (id: string, field: keyof Phase, value: string) =>
    setState(s => ({ ...s, phases: s.phases.map(p => p.id === id ? { ...p, [field]: value } : p) }))

  const start = new Date(startDate + 'T12:00:00')
  const totalWeeks = phases.reduce((s, p) => s + (parseFloat(p.durationWeeks) || 0), 0)

  type PhaseWithDates = Phase & { phaseStart: Date; phaseEnd: Date }
  const phasesWithDates = phases.reduce<PhaseWithDates[]>((acc, p) => {
    const phaseStart = acc.length > 0 ? acc[acc.length - 1].phaseEnd : start
    const weeks = parseFloat(p.durationWeeks) || 0
    const phaseEnd = addWeeks(phaseStart, weeks)
    return [...acc, { ...p, phaseStart, phaseEnd }]
  }, [])
  const projectEnd = phasesWithDates.length > 0 ? phasesWithDates[phasesWithDates.length - 1].phaseEnd : start

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-5" dir="rtl">
      {saving && <div className="text-xs text-slate-400 text-left">שומר...</div>}
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">תאריך התחלה</label>
          <input type="date" value={startDate} onChange={e => setState(s => ({ ...s, startDate: e.target.value }))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="text-sm text-slate-500">
          <span className="font-medium">משך כולל:</span> {totalWeeks} שבועות ({(totalWeeks / 4).toFixed(1)} חודשים)
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-right font-medium">שלב</th>
              <th className="px-3 py-2 text-center font-medium w-24">שבועות</th>
              <th className="px-3 py-2 text-right font-medium">תחילה</th>
              <th className="px-3 py-2 text-right font-medium">סיום</th>
              <th className="px-3 py-2 text-right font-medium">הערות</th>
              <th className="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {phasesWithDates.map((p, i) => (
              <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                <td className="px-3 py-1.5">
                  <input value={p.name} onChange={e => update(p.id, 'name', e.target.value)} placeholder="שם שלב"
                    className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </td>
                <td className="px-3 py-1.5">
                  <input type="number" min="1" value={p.durationWeeks} onChange={e => update(p.id, 'durationWeeks', e.target.value)}
                    className="w-full border border-slate-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </td>
                <td className="px-3 py-1.5 text-slate-600 text-xs whitespace-nowrap">{fmtDate(p.phaseStart)}</td>
                <td className="px-3 py-1.5 text-slate-600 text-xs whitespace-nowrap font-medium">{fmtDate(p.phaseEnd)}</td>
                <td className="px-3 py-1.5">
                  <input value={p.notes} onChange={e => update(p.id, 'notes', e.target.value)} placeholder="..."
                    className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </td>
                <td className="px-2 py-1.5">
                  <button onClick={() => remove(p.id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={add}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
        <Plus className="w-4 h-4" /> הוסף שלב
      </button>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="text-sm font-medium text-slate-700 mb-3">גאנט מוקצר</div>
        <div className="space-y-1.5">
          {phasesWithDates.map((p, i) => {
            const totalMs = projectEnd.getTime() - start.getTime()
            const offsetMs = p.phaseStart.getTime() - start.getTime()
            const durationMs = p.phaseEnd.getTime() - p.phaseStart.getTime()
            const leftPct = totalMs > 0 ? (offsetMs / totalMs) * 100 : 0
            const widthPct = totalMs > 0 ? Math.max(1, (durationMs / totalMs) * 100) : 0
            return (
              <div key={p.id} className="flex items-center gap-2">
                <div className="w-32 text-xs text-slate-500 truncate text-right shrink-0">{p.name || `שלב ${i + 1}`}</div>
                <div className="flex-1 h-5 bg-slate-100 rounded relative overflow-hidden">
                  <div className={`absolute h-full rounded ${BAR_COLORS[i % BAR_COLORS.length]} opacity-80`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }} />
                </div>
                <div className="text-xs text-slate-400 w-16 text-left shrink-0">{p.durationWeeks}שב'</div>
              </div>
            )
          })}
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-2">
          <span>{fmtDate(start)}</span>
          <span>{fmtDate(projectEnd)}</span>
        </div>
      </div>
    </div>
  )
}
