import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'
import {
  FolderOpen, FileText, DollarSign, MessageSquare,
  Download, CheckSquare, Lock,
} from 'lucide-react'
import type { Project, Task, Document, Invoice } from '@/integrations/supabase/types'

export const Route = createFileRoute('/_authenticated/portal/')({
  component: PortalPage,
})

const PROJECT_STATUS_LABELS: Record<Project['status'], string> = {
  planning: 'תכנון', active: 'פעיל', on_hold: 'מושהה', completed: 'הושלם', cancelled: 'בוטל',
}
const PROJECT_STATUS_COLORS: Record<Project['status'], string> = {
  planning: 'bg-yellow-100 text-yellow-800', active: 'bg-green-100 text-green-800',
  on_hold: 'bg-orange-100 text-orange-800', completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
}

const INVOICE_STATUS_LABELS: Record<Invoice['status'], string> = {
  draft: 'טיוטה', sent: 'נשלח', paid: 'שולם', overdue: 'באיחור', cancelled: 'בוטל',
}
const INVOICE_STATUS_COLORS: Record<Invoice['status'], string> = {
  draft: 'bg-slate-100 text-slate-600', sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700', overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-400',
}

type PortalTab = 'projects' | 'documents' | 'invoices' | 'comments'

interface ProjectProgress {
  project: Project
  totalTasks: number
  doneTasks: number
}

function PortalPage() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<PortalTab>('projects')
  const [loading, setLoading] = useState(true)
  const [projectProgress, setProjectProgress] = useState<ProjectProgress[]>([])
  const [documents, setDocuments] = useState<(Document & { projects: Pick<Project, 'name'> | null })[]>([])
  const [invoices, setInvoices] = useState<(Invoice & { projects: Pick<Project, 'name'> | null })[]>([])
  const [newComment, setNewComment] = useState('')
  const [savingComment, setSavingComment] = useState(false)
  const [comments, setComments] = useState<{
    id: string
    content: string
    created_at: string
    project_id: string | null
    author_id: string
  }[]>([])

  const clientName = profile?.full_name ?? 'לקוח'

  useEffect(() => {
    if (!profile?.id) return

    async function fetchPortalData() {
      setLoading(true)
      try {
        // Fetch projects where the client is linked (via client_id matching a client with same email)
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('email', profile?.email ?? '')
          .maybeSingle()

        const clientId = clientData?.id

        if (!clientId) {
          setLoading(false)
          return
        }

        const [projectsRes, docsRes, invoicesRes, commentsRes] = await Promise.all([
          supabase.from('projects').select('*').eq('client_id', clientId).neq('status', 'cancelled'),
          supabase.from('documents').select('*, projects(name)').eq('client_id', clientId).order('created_at', { ascending: false }),
          supabase.from('invoices').select('*, projects(name)').eq('client_id', clientId).neq('status', 'cancelled').order('issue_date', { ascending: false }),
          supabase.from('comments').select('*').not('project_id', 'is', null).order('created_at', { ascending: false }).limit(50),
        ])

        const projects: Project[] = (projectsRes.data as Project[]) ?? []

        // Fetch tasks for each project
        const progressData: ProjectProgress[] = await Promise.all(
          projects.map(async (project) => {
            const { data: tasks } = await supabase
              .from('tasks')
              .select('id, status')
              .eq('project_id', project.id)
            const allTasks = (tasks as Pick<Task, 'id' | 'status'>[]) ?? []
            const done = allTasks.filter(t => t.status === 'done').length
            return {
              project,
              totalTasks: allTasks.length,
              doneTasks: done,
            }
          })
        )

        setProjectProgress(progressData)
        setDocuments(((docsRes.data as unknown) as (Document & { projects: Pick<Project, 'name'> | null })[]) ?? [])
        setInvoices(((invoicesRes.data as unknown) as (Invoice & { projects: Pick<Project, 'name'> | null })[]) ?? [])

        // Filter comments to those in the client's projects
        const projectIds = new Set(projects.map(p => p.id))
        const filteredComments = ((commentsRes.data as typeof comments) ?? [])
          .filter(c => c.project_id && projectIds.has(c.project_id))
        setComments(filteredComments)
      } catch (err) {
        console.error('Portal fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPortalData()
  }, [profile?.id, profile?.email])

  const handleDownload = async (doc: Document) => {
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !profile) return
    const firstProject = projectProgress[0]?.project
    if (!firstProject) return
    setSavingComment(true)
    await supabase.from('comments').insert({
      organization_id: firstProject.organization_id,
      project_id: firstProject.id,
      author_id: profile.id,
      content: newComment.trim(),
    })
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('project_id', firstProject.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setComments((data as typeof comments) ?? [])
    setNewComment('')
    setSavingComment(false)
  }

  const tabs: { id: PortalTab; label: string; icon: React.ElementType }[] = [
    { id: 'projects', label: 'הפרויקטים שלי', icon: FolderOpen },
    { id: 'documents', label: 'מסמכים', icon: FileText },
    { id: 'invoices', label: 'חשבוניות', icon: DollarSign },
    { id: 'comments', label: 'תקשורת', icon: MessageSquare },
  ]

  // Show "clients only" message if the logged-in user is an architect/admin
  if (profile && (profile.role === 'owner' || profile.role === 'admin')) {
    return (
      <div className="p-6 max-w-2xl mx-auto" dir="rtl">
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
          <Lock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">פורטל לקוחות</h2>
          <p className="text-slate-500">
            אזור זה מיועד ללקוחות בלבד. כמנהל, אתה יכול לצפות בתצוגת הלקוח אך אין לך פרויקטים ישירים כאן.
          </p>
          <p className="text-sm text-slate-400 mt-3">
            לקוחות מחוברים רואים כאן את הפרויקטים, המסמכים והחשבוניות שלהם.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto" dir="rtl">
        <div className="h-8 w-64 bg-slate-100 rounded animate-pulse mb-6" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-50 rounded-2xl animate-pulse mb-4" />
        ))}
      </div>
    )
  }

  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      {/* Welcome Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shrink-0">
            {getInitials(clientName)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">שלום, {clientName.split(' ')[0]}</h1>
            <p className="text-slate-500 text-sm mt-0.5">ברוך הבא לפורטל הלקוחות שלך</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {projectProgress.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{projectProgress.length}</p>
            <p className="text-xs text-slate-400 mt-1">פרויקטים פעילים</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {projectProgress.reduce((s, p) => s + p.doneTasks, 0)}
            </p>
            <p className="text-xs text-slate-400 mt-1">משימות שהושלמו</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{documents.length}</p>
            <p className="text-xs text-slate-400 mt-1">מסמכים</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
            <p className="text-lg font-bold text-slate-800">{formatCurrency(totalPaid)}</p>
            <p className="text-xs text-slate-400 mt-1">שולם</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto">
        {tabs.map(tab => {
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

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          {projectProgress.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <FolderOpen className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">אין פרויקטים כרגע</p>
              <p className="text-sm mt-1">הצוות שלנו יעדכן אותך בהמשך</p>
            </div>
          ) : (
            projectProgress.map(({ project, totalTasks, doneTasks }) => {
              const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
              return (
                <div key={project.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-800 text-lg">{project.name}</h3>
                      {project.description && (
                        <p className="text-sm text-slate-500 mt-1">{project.description}</p>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${PROJECT_STATUS_COLORS[project.status]}`}>
                      {PROJECT_STATUS_LABELS[project.status]}
                    </span>
                  </div>

                  {/* Progress */}
                  {totalTasks > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                        <span className="flex items-center gap-1">
                          <CheckSquare className="w-3.5 h-3.5" />
                          התקדמות
                        </span>
                        <span>{doneTasks}/{totalTasks} משימות • {progressPct}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    {project.start_date && (
                      <span>התחלה: {formatDate(project.start_date)}</span>
                    )}
                    {project.end_date && (
                      <span>סיום מתוכנן: {formatDate(project.end_date)}</span>
                    )}
                    {project.address && (
                      <span>כתובת: {project.address}</span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div>
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <FileText className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">אין מסמכים זמינים כרגע</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {documents.map(doc => (
                <div key={doc.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 truncate">{doc.name}</p>
                    {doc.projects?.name && (
                      <p className="text-xs text-slate-400 mt-0.5">{doc.projects.name}</p>
                    )}
                    <p className="text-xs text-slate-400">{formatDate(doc.created_at)}</p>
                  </div>
                  <button
                    onClick={() => handleDownload(doc)}
                    className="p-2 rounded-lg hover:bg-blue-50 transition shrink-0"
                    title="הורדה"
                  >
                    <Download className="w-4 h-4 text-blue-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Invoice Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-2xl p-4 text-center">
              <p className="text-lg font-bold text-blue-700">{formatCurrency(totalInvoiced)}</p>
              <p className="text-xs text-blue-500 mt-0.5">סה״כ חשבוניות</p>
            </div>
            <div className="bg-green-50 rounded-2xl p-4 text-center">
              <p className="text-lg font-bold text-green-700">{formatCurrency(totalPaid)}</p>
              <p className="text-xs text-green-500 mt-0.5">שולם</p>
            </div>
          </div>

          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <DollarSign className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">אין חשבוניות כרגע</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right text-xs text-slate-400 bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 font-medium">מספר</th>
                    <th className="px-4 py-3 font-medium">תאריך</th>
                    <th className="px-4 py-3 font-medium">סכום</th>
                    <th className="px-4 py-3 font-medium">סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono text-slate-700">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(inv.issue_date)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(inv.total, inv.currency)}</td>
                      <td className="px-4 py-3">
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
      )}

      {/* Comments Tab */}
      {activeTab === 'comments' && (
        <div className="space-y-4 max-w-2xl">
          {comments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
              <p className="font-medium">אין הודעות עדיין</p>
              <p className="text-sm mt-1">שלח הודעה לצוות שלנו</p>
            </div>
          )}
          {comments.map(comment => (
            <div key={comment.id} className="bg-white rounded-xl border border-slate-100 p-4">
              <p className="text-sm text-slate-700">{comment.content}</p>
              <p className="text-xs text-slate-400 mt-2">{formatDate(comment.created_at)}</p>
            </div>
          ))}

          {/* New Comment Form */}
          {projectProgress.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-3">
              <h3 className="text-sm font-medium text-slate-700">שלח הודעה לצוות</h3>
              <textarea
                rows={3}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="כתוב הודעה..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                onClick={handleAddComment}
                disabled={savingComment || !newComment.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
              >
                {savingComment ? 'שולח...' : 'שלח הודעה'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
