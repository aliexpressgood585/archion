import { useToolState } from '@/hooks/useToolState'

type PhaseStatus = 'pending' | 'active' | 'complete'

interface SubTask {
  label: string
  done: boolean
}

interface Phase {
  id: string
  label: string
  pct: number
  status: PhaseStatus
  subTasks: SubTask[]
}

interface State {
  phases: Phase[]
}

const INITIAL_PHASES: Phase[] = [
  { id: '1', label: 'בחינה מוקדמת', pct: 5, status: 'pending', subTasks: [
    { label: 'ניתוח תכנית מוקדם', done: false },
    { label: 'בדיקת זכויות בנייה', done: false },
    { label: 'פגישת לקוח ראשונית', done: false },
  ]},
  { id: '2', label: 'תכנון מוקדם', pct: 15, status: 'pending', subTasks: [
    { label: 'חלופות תכנון', done: false },
    { label: 'תוכנית קונספט', done: false },
    { label: 'אישור לקוח', done: false },
  ]},
  { id: '3', label: 'פיתוח תכנון', pct: 20, status: 'pending', subTasks: [
    { label: 'תוכניות מפורטות', done: false },
    { label: 'תיאום יועצים', done: false },
    { label: 'חזיתות וחתכים', done: false },
    { label: 'אישור לקוח', done: false },
  ]},
  { id: '4', label: 'הגשה להיתר', pct: 15, status: 'pending', subTasks: [
    { label: 'הכנת מסמכי הגשה', done: false },
    { label: 'תיאום יועצים להיתר', done: false },
    { label: 'הגשה לועדה', done: false },
    { label: 'מעקב הערות', done: false },
  ]},
  { id: '5', label: 'תכנון לביצוע', pct: 20, status: 'pending', subTasks: [
    { label: 'תוכניות ביצוע', done: false },
    { label: 'מפרטים טכניים', done: false },
    { label: 'כמויות ותמחור', done: false },
    { label: 'מסמכי מכרז', done: false },
  ]},
  { id: '6', label: 'מכרז קבלנים', pct: 5, status: 'pending', subTasks: [
    { label: 'הפצת מסמכי מכרז', done: false },
    { label: 'פגישות הבהרה', done: false },
    { label: 'בחינת הצעות', done: false },
    { label: 'המלצה לקבלן', done: false },
  ]},
  { id: '7', label: 'פיקוח עליון', pct: 20, status: 'pending', subTasks: [
    { label: 'כינוס ראשון', done: false },
    { label: 'ביקורות שוטפות', done: false },
    { label: 'אישור חומרים', done: false },
    { label: 'פיקוח על שינויים', done: false },
  ]},
  { id: '8', label: 'מסירה וסיום', pct: 0, status: 'pending', subTasks: [
    { label: 'ביקור טרום-מסירה', done: false },
    { label: 'רשימת ליקויים', done: false },
    { label: 'אישור מסירה', done: false },
    { label: 'תיק מבנה', done: false },
  ]},
]

const STATUS_STYLES: Record<PhaseStatus, string> = {
  pending:  'bg-slate-100 text-slate-600',
  active:   'bg-blue-100 text-blue-700',
  complete: 'bg-green-100 text-green-700',
}
const STATUS_LABELS: Record<PhaseStatus, string> = {
  pending:  'ממתין',
  active:   'פעיל',
  complete: 'הושלם',
}

const DEFAULT: State = { phases: INITIAL_PHASES }

export default function PhaseTracker({ projectId }: { projectId: string | null }) {
  const { state, setState, loading, saving } = useToolState('phase-tracker', projectId, DEFAULT)
  const { phases } = state

  const cycleStatus = (id: string) =>
    setState(s => ({ ...s, phases: s.phases.map(p => p.id === id
      ? { ...p, status: p.status === 'pending' ? 'active' : p.status === 'active' ? 'complete' : 'pending' }
      : p) }))

  const toggleSub = (phaseId: string, idx: number) =>
    setState(s => ({ ...s, phases: s.phases.map(p => p.id === phaseId
      ? { ...p, subTasks: p.subTasks.map((sub, i) => i === idx ? { ...sub, done: !sub.done } : sub) }
      : p) }))

  const completePct = phases.filter(p => p.status === 'complete').reduce((s, p) => s + p.pct, 0)
  const activePct = phases.find(p => p.status === 'active')?.pct ?? 0
  const estimatedProgress = completePct + activePct * 0.5

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4" dir="rtl">
      {saving && <div className="text-xs text-slate-400 text-left">שומר...</div>}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-700">התקדמות כוללת</span>
          <span className="text-lg font-bold text-blue-700">{Math.round(estimatedProgress)}%</span>
        </div>
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-l from-blue-500 to-blue-400 rounded-full transition-all duration-300"
            style={{ width: `${estimatedProgress}%` }} />
        </div>
        <div className="flex gap-4 mt-2 text-xs text-slate-500">
          <span>{phases.filter(p => p.status === 'complete').length} שלבים הושלמו</span>
          <span>{phases.filter(p => p.status === 'active').length} שלבים פעילים</span>
          <span>{phases.filter(p => p.status === 'pending').length} שלבים ממתינים</span>
        </div>
      </div>

      <div className="space-y-2">
        {phases.map((phase) => {
          const subDone = phase.subTasks.filter(s => s.done).length
          const subTotal = phase.subTasks.length
          return (
            <div key={phase.id} className={`rounded-xl border overflow-hidden transition-all ${
              phase.status === 'complete' ? 'border-green-200' :
              phase.status === 'active' ? 'border-blue-300 shadow-sm' : 'border-slate-200'
            }`}>
              <div className={`flex items-center gap-3 px-4 py-3 ${
                phase.status === 'complete' ? 'bg-green-50' :
                phase.status === 'active' ? 'bg-blue-50' : 'bg-white'
              }`}>
                <button onClick={() => cycleStatus(phase.id)}
                  className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors cursor-pointer ${STATUS_STYLES[phase.status]}`}
                  title="לחץ לשינוי סטטוס">
                  {phase.status === 'complete' ? '✓' : phase.status === 'active' ? '▶' : '○'}
                </button>
                <div className="flex-1">
                  <div className="font-medium text-slate-800">{phase.label}</div>
                  <div className="text-xs text-slate-500">{subDone}/{subTotal} משימות בוצעו · {phase.pct}% מהפרויקט</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[phase.status]}`}>
                  {STATUS_LABELS[phase.status]}
                </span>
              </div>

              <div className="px-4 pb-3 pt-2 bg-white border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {phase.subTasks.map((sub, idx) => (
                    <label key={idx} className="flex items-center gap-2 cursor-pointer py-0.5 text-sm group">
                      <input type="checkbox" checked={sub.done} onChange={() => toggleSub(phase.id, idx)}
                        className="w-4 h-4 rounded text-blue-600 cursor-pointer" />
                      <span className={sub.done ? 'line-through text-slate-400' : 'text-slate-600 group-hover:text-slate-800'}>
                        {sub.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
