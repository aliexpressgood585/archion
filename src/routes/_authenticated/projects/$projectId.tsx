import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  ArrowRight, Building2, Calendar, DollarSign, FileText,
  MessageSquare, CheckSquare, Plus, X, Upload, Paperclip,
} from 'lucide-react'
import type { Project, Client, Task, Invoice, Document, Comment } from '@/integrations/supabase/types'

export const Route = createFileRoute('/_authenticated/projects/$projectId')({
  component: ProjectDetailPage,
})

type Tab = 'overview' | 'tasks' | 'budget' | 'documents' | 'comments'

const TAB_LABELS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'סקירה כללית', icon: Building2 },
  { id: 'tasks', label: 'משימות', icon: CheckSquare },
  { id: 'budget', label: 'תקציב', icon: DollarSign },
  { id: 'documents', label: 'מסמכים', icon: FileText },
  { id: 'comments', label: 'הערות', icon: MessageSquare },
]

const STATUS_LABELS: Record<Project['status'], string> = {
  planning: 'תכנון', active: 'פעיל', on_hold: 'מושהה', completed: 'הושלם', cancelled: 'בוטל',
}
const STATUS_COLORS: Record<Project['status'], string> = {
  planning: 'bg-yellow-100 text-yellow-800', active: 'bg-green-100 text-green-800',
  on_hold: 'bg-orange-100 text-orange-800', completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
}

const TASK_STATUS_LABELS: Record<Task['status'], string> = {
  todo: 'לביצוע', in_progress: 'בתהליך', done: 'הושלם', cancelled: 'בוטל',
}
const PRIORITY_LABELS: Record<Task['priority'], string> = {
  low: 'נמוכה', medium: 'בינונית', high: 'גבוהה', urgent: 'דחופה',
}
const PRIORITY_COLORS: Record<Task['priority'], string> = {
  low: 'bg-slate-100 text-slate-600', medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700', urgent: 'bg-red-100 text-red-700',
}

const INVOICE_STATUS_LABELS: Record<Invoice['status'], string> = {
  draft: 'טיוטה', sent: 'נשלח', paid: 'שולם', overdue: 'באיחור', cancelled: 'בוטל',
}
const INVOICE_STATUS_COLORS: Record<Invoice['status'], string> = {
  draft: 'bg-slate-100 text-slate-600', sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700', overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-400',
}

function TaskColumn({
  title,
  tasks,
  status,
  onAddTask,
}: {
  title: string
  tasks: Task[]
  status: Task['status']
  onAddTask: (status: Task['status']) => void
}) {
  return (
    <div className="flex-1 min-w-64 bg-slate-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-700 text-sm">
          {title} <span className="text-slate-400 font-normal">({tasks.length})</span>
        </h3>
        <button
          onClick={() => onAddTask(status)}
          className="p-1 rounded-lg hover:bg-slate-200 transition"
          title="הוסף משימה"
        >
          <Plus className="w-4 h-4 text-slate-500" />
        </button>
      </div>
      <div className="space-y-2">
        {tasks.map(task => (
          <div key={task.id} className="bg-white rounded-lg p-3 shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-700 leading-snug">{task.title}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority]}`}>
                {PRIORITY_LABELS[task.priority]}
              </span>
              {task.due_date && (
                <span className="text-xs text-slate-400">{formatDate(task.due_date)}</span>
              )}
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-6 text-slate-300 text-xs">אין משימות</div>
        )}
      </div>
    </div>
  )
}

function ProjectDetailPage() {
  const { projectId } = Route.useParams()
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [project, setProject] = useState<(Project & { clients: Client | null }) | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [savingComment, setSavingComment] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskFormStatus, setTaskFormStatus] = useState<Task['status']>('todo')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskPriority, setTaskPriority] = useState<Task['priority']>('medium')
  const [taskDue, setTaskDue] = useState('')
  const [savingTask, setSavingTask] = useState(false)

  const orgId = profile?.organization_id

  useEffect(() => {
    if (!orgId || !projectId) return
    async function fetchAll() {
      setLoading(true)
      const [projRes, tasksRes, invoicesRes, docsRes, commentsRes] = await Promise.all([
        supabase.from('projects').select('*, clients(*)').eq('id', projectId).single(),
        supabase.from('tasks').select('*').eq('project_id', projectId).order('sort_order'),
        supabase.from('invoices').select('*').eq('project_id', projectId).order('issue_date', { ascending: false }),
        supabase.from('documents').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
        supabase.from('comments').select('*').eq('project_id', projectId).order('created_at'),
      ])
      setProject(projRes.data as (Project & { clients: Client | null }) | null)
      setTasks((tasksRes.data as Task[]) ?? [])
      setInvoices((invoicesRes.data as Invoice[]) ?? [])
      setDocuments((docsRes.data as Document[]) ?? [])
      setComments((commentsRes.data as Comment[]) ?? [])
      setLoading(false)
    }
    fetchAll()
  }, [orgId, projectId])

  const handleAddComment = async () => {
    if (!newComment.trim() || !profile || !orgId) return
    setSavingComment(true)
    await supabase.from('comments').insert({
      organization_id: orgId,
      project_id: projectId,
      author_id: profile.id,
      content: newComment.trim(),
    })
    const { data } = await supabase.from('comments').select('*').eq('project_id', projectId).order('created_at')
    setComments((data as Comment[]) ?? [])
    setNewComment('')
    setSavingComment(false)
  }

  const handleAddTask = async () => {
    if (!taskTitle.trim() || !profile || !orgId) return
    setSavingTask(true)
    await supabase.from('tasks').insert({
      organization_id: orgId,
      project_id: projectId,
      title: taskTitle.trim(),
      status: taskFormStatus,
      priority: taskPriority,
      due_date: taskDue || null,
      created_by: profile.id,
      sort_order: tasks.length,
    })
    const { data } = await supabase.from('tasks').select('*').eq('project_id', projectId).order('sort_order')
    setTasks((data as Task[]) ?? [])
    setShowTaskModal(false)
    setTaskTitle('')
    setTaskPriority('medium')
    setTaskDue('')
    setSavingTask(false)
  }

  const openAddTask = (status: Task['status']) => {
    setTaskFormStatus(status)
    setShowTaskModal(true)
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto" dir="rtl">
        <div className="h-8 w-48 bg-slate-100 rounded animate-pulse mb-4" />
        <div className="h-48 bg-slate-50 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6 text-center text-slate-500" dir="rtl">
        פרויקט לא נמצא
      </div>
    )
  }

  const todoTasks = tasks.filter(t => t.status === 'todo')
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const doneTasks = tasks.filter(t => t.status === 'done')
  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const budgetRemaining = (project.budget ?? 0) - totalInvoiced

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Back + Title */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => history.back()}
          className="p-1.5 hover:bg-slate-100 rounded-lg transition"
        >
          <ArrowRight className="w-5 h-5 text-slate-500" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[project.status]}`}>
          {STATUS_LABELS[project.status]}
        </span>
      </div>
      {project.clients?.name && (
        <p className="text-slate-500 text-sm mb-6 mr-9">{project.clients.name}</p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto">
        {TAB_LABELS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h2 className="font-semibold text-slate-800 mb-4">פרטי הפרויקט</h2>
              <dl className="space-y-3">
                {project.description && (
                  <div>
                    <dt className="text-xs text-slate-400 font-medium mb-1">תיאור</dt>
                    <dd className="text-sm text-slate-700">{project.description}</dd>
                  </div>
                )}
                {project.address && (
                  <div>
                    <dt className="text-xs text-slate-400 font-medium mb-1">כתובת</dt>
                    <dd className="text-sm text-slate-700">{project.address}</dd>
                  </div>
                )}
                {project.area_sqm && (
                  <div>
                    <dt className="text-xs text-slate-400 font-medium mb-1">שטח</dt>
                    <dd className="text-sm text-slate-700">{project.area_sqm} מ״ר</dd>
                  </div>
                )}
                {project.permit_number && (
                  <div>
                    <dt className="text-xs text-slate-400 font-medium mb-1">מספר היתר</dt>
                    <dd className="text-sm text-slate-700">{project.permit_number}</dd>
                  </div>
                )}
              </dl>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {project.start_date && (
                <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-xs text-slate-400">התחלה</p>
                    <p className="text-sm font-semibold text-slate-700">{formatDate(project.start_date)}</p>
                  </div>
                </div>
              )}
              {project.end_date && (
                <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="text-xs text-slate-400">סיום</p>
                    <p className="text-sm font-semibold text-slate-700">{formatDate(project.end_date)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          {project.clients && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h2 className="font-semibold text-slate-800 mb-4">פרטי לקוח</h2>
              <p className="font-medium text-slate-700 mb-1">{project.clients.name}</p>
              {project.clients.email && (
                <p className="text-sm text-slate-500">{project.clients.email}</p>
              )}
              {project.clients.phone && (
                <p className="text-sm text-slate-500">{project.clients.phone}</p>
              )}
              {project.clients.address && (
                <p className="text-sm text-slate-500 mt-1">{project.clients.address}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          <TaskColumn title="לביצוע" tasks={todoTasks} status="todo" onAddTask={openAddTask} />
          <TaskColumn title="בתהליך" tasks={inProgressTasks} status="in_progress" onAddTask={openAddTask} />
          <TaskColumn title="הושלם" tasks={doneTasks} status="done" onAddTask={openAddTask} />
        </div>
      )}

      {/* Budget Tab */}
      {activeTab === 'budget' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 text-center">
              <p className="text-xs text-slate-400 mb-1">תקציב כולל</p>
              <p className="text-2xl font-bold text-slate-800">
                {project.budget ? formatCurrency(project.budget, project.budget_currency) : '—'}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 text-center">
              <p className="text-xs text-slate-400 mb-1">סה״כ חשבוניות</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalInvoiced)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 text-center">
              <p className="text-xs text-slate-400 mb-1">שולם</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 text-center">
              <p className="text-xs text-slate-400 mb-1">יתרה</p>
              <p className={`text-2xl font-bold ${budgetRemaining >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                {formatCurrency(budgetRemaining)}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">חשבוניות פרויקט</h2>
            {invoices.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">אין חשבוניות לפרויקט זה</p>
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
                      <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-3 font-mono">{inv.invoice_number}</td>
                        <td className="py-3 text-slate-500">{formatDate(inv.issue_date)}</td>
                        <td className="py-3 font-medium">{formatCurrency(inv.total, inv.currency)}</td>
                        <td className="py-3">
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
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium cursor-pointer transition">
              <Upload className="w-4 h-4" />
              העלאת מסמך
              <input type="file" className="hidden" multiple />
            </label>
          </div>
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <Paperclip className="w-12 h-12 mb-3 opacity-30" />
              <p>אין מסמכים עדיין</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map(doc => (
                <div key={doc.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3 hover:shadow-sm transition">
                  <FileText className="w-8 h-8 text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{doc.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(doc.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comments Tab */}
      {activeTab === 'comments' && (
        <div className="max-w-2xl space-y-4">
          {comments.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-8">אין הערות עדיין</p>
          )}
          {comments.map(comment => (
            <div key={comment.id} className="bg-white rounded-xl border border-slate-100 p-4">
              <p className="text-sm text-slate-700">{comment.content}</p>
              <p className="text-xs text-slate-400 mt-2">{formatDate(comment.created_at)}</p>
            </div>
          ))}
          <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-3">
            <textarea
              rows={3}
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="הוסף הערה..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button
              onClick={handleAddComment}
              disabled={savingComment || !newComment.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
            >
              {savingComment ? 'שומר...' : 'שלח הערה'}
            </button>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">משימה חדשה</h2>
              <button onClick={() => setShowTaskModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">כותרת</label>
                <input
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="שם המשימה"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">עמודה</label>
                <select
                  value={taskFormStatus}
                  onChange={e => setTaskFormStatus(e.target.value as Task['status'])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {(['todo', 'in_progress', 'done'] as Task['status'][]).map(s => (
                    <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">עדיפות</label>
                <select
                  value={taskPriority}
                  onChange={e => setTaskPriority(e.target.value as Task['priority'])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {(['low', 'medium', 'high', 'urgent'] as Task['priority'][]).map(p => (
                    <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">תאריך יעד</label>
                <input
                  type="date"
                  value={taskDue}
                  onChange={e => setTaskDue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  ביטול
                </button>
                <button
                  onClick={handleAddTask}
                  disabled={savingTask || !taskTitle.trim()}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition"
                >
                  {savingTask ? 'שומר...' : 'הוסף משימה'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
