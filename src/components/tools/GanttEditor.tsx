import { useRef, useState, useEffect } from 'react'
import { Plus, Trash2, ChevronRight, ChevronLeft, FolderDown, RefreshCw } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface GanttTask {
  id: string
  name: string
  start: string
  end: string
  color: string
  category: string
}

interface DbProject {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  status: string
}

interface DbTask {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  created_at: string
}

const STATUS_COLOR: Record<string, string> = {
  todo: '#94a3b8', in_progress: '#3b82f6', review: '#f59e0b',
  done: '#10b981', blocked: '#ef4444',
}

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316','#6366f1']
const CATEGORIES = ['תכנון','ביצוע','בדיקה','הגשה','ישיבה','תיאום','אחר']

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
}

export function GanttEditor() {
  const colorIdx = useRef(0)
  const today = new Date().toISOString().slice(0, 10)

  const [tasks, setTasks] = useState<GanttTask[]>([
    { id: '1', name: 'תכנון קונספט', start: today, end: addDays(today, 7), color: '#3b82f6', category: 'תכנון' },
    { id: '2', name: 'אישור לקוח', start: addDays(today, 5), end: addDays(today, 8), color: '#10b981', category: 'ישיבה' },
    { id: '3', name: 'פיתוח תכניות', start: addDays(today, 8), end: addDays(today, 21), color: '#f59e0b', category: 'ביצוע' },
  ])

  const [form, setForm] = useState({ name: '', start: today, end: addDays(today, 7), category: 'תכנון' })
  const [viewStart, setViewStart] = useState(today)
  const VIEW_DAYS = 42

  const viewEnd = addDays(viewStart, VIEW_DAYS)

  // ── Dashboard / Supabase integration ──
  const [dbProjects, setDbProjects] = useState<DbProject[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [loadingDb, setLoadingDb] = useState(false)
  const [dbNote, setDbNote] = useState<string | null>(null)

  async function loadProjects() {
    setLoadingDb(true)
    setDbNote(null)
    const { data, error } = await supabase
      .from('projects')
      .select('id,name,start_date,end_date,status')
      .order('start_date', { ascending: true })
    setLoadingDb(false)
    if (error) { setDbNote('לא ניתן לטעון פרויקטים — התחבר כדי לסנכרן עם הדשבורד'); return }
    const rows = (data ?? []) as DbProject[]
    setDbProjects(rows)
    if (rows.length === 0) setDbNote('אין פרויקטים בדשבורד עדיין')
  }

  useEffect(() => { loadProjects() }, [])

  // Import all projects as phase bars (uses project start/end dates from the Dashboard)
  function importProjectsAsPhases() {
    const phases: GanttTask[] = dbProjects
      .filter(p => p.start_date)
      .map(p => ({
        id: 'proj-' + p.id,
        name: p.name,
        start: p.start_date!.slice(0, 10),
        end: (p.end_date ?? addDays(p.start_date!.slice(0, 10), 30)).slice(0, 10),
        color: COLORS[colorIdx.current++ % COLORS.length],
        category: 'ביצוע',
      }))
    if (phases.length === 0) { setDbNote('אין פרויקטים עם תאריך התחלה'); return }
    setTasks(phases)
    setViewStart(phases[0].start)
  }

  // Import the tasks of one project (uses each task's created_at → due_date span)
  async function importProjectTasks(projectId: string) {
    if (!projectId) return
    setLoadingDb(true)
    setDbNote(null)
    const { data, error } = await supabase
      .from('tasks')
      .select('id,title,status,priority,due_date,created_at')
      .eq('project_id', projectId)
    setLoadingDb(false)
    if (error) { setDbNote('לא ניתן לטעון משימות'); return }
    const rows = (data ?? []) as DbTask[]
    if (rows.length === 0) { setDbNote('לפרויקט זה אין משימות'); return }
    const imported: GanttTask[] = rows.map(t => {
      const start = (t.created_at ?? today).slice(0, 10)
      const end = t.due_date ? t.due_date.slice(0, 10) : addDays(start, 7)
      return {
        id: 'task-' + t.id,
        name: t.title,
        start,
        end: end <= start ? addDays(start, 1) : end,
        color: STATUS_COLOR[t.status] ?? COLORS[colorIdx.current++ % COLORS.length],
        category: t.status === 'done' ? 'הגשה' : 'ביצוע',
      }
    })
    setTasks(imported)
    const earliest = imported.reduce((a, b) => (a.start < b.start ? a : b)).start
    setViewStart(earliest)
  }

  function addTask() {
    if (!form.name.trim() || !form.start || !form.end) return
    if (form.end <= form.start) return
    setTasks(ts => [...ts, {
      id: Math.random().toString(36).slice(2),
      ...form,
      color: COLORS[colorIdx.current++ % COLORS.length],
    }])
    setForm(f => ({ ...f, name: '' }))
  }

  function deleteTask(id: string) {
    setTasks(ts => ts.filter(t => t.id !== id))
  }

  // Generate week labels
  const weekStarts: string[] = []
  let d = viewStart
  while (d < viewEnd) {
    weekStarts.push(d)
    d = addDays(d, 7)
  }

  const dayWidth = 18 // px per day
  const labelWidth = 140

  function taskLeft(t: GanttTask) {
    const start = t.start < viewStart ? viewStart : t.start
    return daysBetween(viewStart, start) * dayWidth
  }

  function taskWidth(t: GanttTask) {
    const start = t.start < viewStart ? viewStart : t.start
    const end = t.end > viewEnd ? viewEnd : t.end
    const w = daysBetween(start, end) * dayWidth
    return Math.max(w, 4)
  }

  function taskVisible(t: GanttTask) {
    return t.end > viewStart && t.start < viewEnd
  }

  const todayLeft = daysBetween(viewStart, today)

  return (
    <div className="flex flex-col gap-4" dir="rtl">
      {/* Dashboard sync bar */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2 text-purple-700">
          <FolderDown className="w-4 h-4" />
          <span className="text-sm font-semibold">סנכרון עם הדשבורד</span>
        </div>
        <div className="flex-1 min-w-40">
          <label className="text-xs text-slate-500 mb-1 block">ייבא משימות מפרויקט</label>
          <select
            value={selectedProject}
            onChange={e => { setSelectedProject(e.target.value); importProjectTasks(e.target.value) }}
            disabled={loadingDb || dbProjects.length === 0}
            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          >
            <option value="">— בחר פרויקט —</option>
            {dbProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button
          onClick={importProjectsAsPhases}
          disabled={loadingDb || dbProjects.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
        >
          <FolderDown className="w-4 h-4" />
          כל הפרויקטים כשלבים
        </button>
        <button
          onClick={loadProjects}
          disabled={loadingDb}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg text-sm font-medium transition"
          title="רענן"
        >
          <RefreshCw className={`w-4 h-4 ${loadingDb ? 'animate-spin' : ''}`} />
        </button>
        {dbNote && <span className="text-xs text-slate-500 w-full">{dbNote}</span>}
      </div>

      {/* Add task form */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">הוסף משימה</h4>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-32">
            <label className="text-xs text-slate-500 mb-1 block">שם משימה</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="שם המשימה..."
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">קטגוריה</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">התחלה</label>
            <input
              type="date"
              value={form.start}
              onChange={e => setForm(f => ({ ...f, start: e.target.value }))}
              className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">סיום</label>
            <input
              type="date"
              value={form.end}
              onChange={e => setForm(f => ({ ...f, end: e.target.value }))}
              className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={addTask}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" />
            הוסף
          </button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Navigation */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50">
          <button
            onClick={() => setViewStart(v => addDays(v, -14))}
            className="p-1 rounded hover:bg-slate-200 transition"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-sm font-medium text-slate-700">
            {formatDate(viewStart)} — {formatDate(viewEnd)}
          </span>
          <button
            onClick={() => setViewStart(v => addDays(v, 14))}
            className="p-1 rounded hover:bg-slate-200 transition"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <div style={{ minWidth: labelWidth + VIEW_DAYS * dayWidth + 16 }}>
            {/* Header row: week labels */}
            <div className="flex border-b border-slate-100" style={{ paddingRight: labelWidth }}>
              {weekStarts.map(ws => (
                <div
                  key={ws}
                  className="text-xs text-slate-500 py-1 px-1 border-r border-slate-100"
                  style={{ width: 7 * dayWidth }}
                >
                  {formatDate(ws)}
                </div>
              ))}
            </div>

            {/* Day columns header */}
            <div className="flex border-b border-slate-200 bg-slate-50" style={{ paddingRight: labelWidth }}>
              {Array.from({ length: VIEW_DAYS }, (_, i) => {
                const day = addDays(viewStart, i)
                const isToday = day === today
                const dow = new Date(day).getDay()
                const isWeekend = dow === 5 || dow === 6
                return (
                  <div
                    key={i}
                    className={`text-center py-1 text-[10px] border-r border-slate-100 ${
                      isToday ? 'bg-blue-100 text-blue-700 font-bold' :
                      isWeekend ? 'text-slate-300 bg-slate-50' : 'text-slate-400'
                    }`}
                    style={{ width: dayWidth, minWidth: dayWidth }}
                  >
                    {new Date(day).getDate()}
                  </div>
                )
              })}
            </div>

            {/* Task rows */}
            {tasks.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">הוסף משימה ראשונה</div>
            ) : (
              tasks.map(task => (
                <div key={task.id} className="flex items-center border-b border-slate-50 hover:bg-slate-50 group" style={{ height: 40 }}>
                  {/* Task label */}
                  <div
                    className="flex items-center gap-2 px-3 shrink-0 text-sm"
                    style={{ width: labelWidth, minWidth: labelWidth }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: task.color }} />
                    <span className="truncate text-slate-700 text-xs font-medium">{task.name}</span>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="mr-auto opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Timeline track */}
                  <div className="relative flex-1" style={{ height: 40 }}>
                    {/* Today line */}
                    {todayLeft >= 0 && todayLeft <= VIEW_DAYS && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-blue-400 z-10 pointer-events-none"
                        style={{ right: todayLeft * dayWidth }}
                      />
                    )}

                    {/* Weekend bands */}
                    {Array.from({ length: VIEW_DAYS }, (_, i) => {
                      const day = addDays(viewStart, i)
                      const dow = new Date(day).getDay()
                      if (dow !== 5 && dow !== 6) return null
                      return (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 bg-slate-50 pointer-events-none"
                          style={{ right: i * dayWidth, width: dayWidth }}
                        />
                      )
                    })}

                    {/* Task bar */}
                    {taskVisible(task) && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 rounded-md flex items-center px-2 overflow-hidden"
                        style={{
                          right: taskLeft(task),
                          width: taskWidth(task),
                          height: 24,
                          background: task.color,
                          opacity: 0.85,
                        }}
                      >
                        <span className="text-white text-[10px] font-medium truncate" style={{ direction: 'rtl' }}>
                          {task.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {tasks.map(t => (
          <span key={t.id} className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-full px-2.5 py-1">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
            {t.name} · {formatDate(t.start)}–{formatDate(t.end)}
          </span>
        ))}
      </div>
    </div>
  )
}
