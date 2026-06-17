import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FolderOpen, CheckSquare, DollarSign, Clock, TrendingUp, AlertCircle } from 'lucide-react'
import type { Project, Task, Invoice } from '@/integrations/supabase/types'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
})

interface DashboardStats {
  totalProjects: number
  activeTasks: number
  totalRevenue: number
  pendingPayments: number
}

const STATUS_LABELS: Record<Project['status'], string> = {
  planning: 'תכנון',
  active: 'פעיל',
  on_hold: 'מושהה',
  completed: 'הושלם',
  cancelled: 'בוטל',
}

const STATUS_COLORS: Record<Project['status'], string> = {
  planning: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  on_hold: 'bg-orange-100 text-orange-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
}

const PRIORITY_LABELS: Record<Task['priority'], string> = {
  low: 'נמוכה',
  medium: 'בינונית',
  high: 'גבוהה',
  urgent: 'דחופה',
}

const PRIORITY_COLORS: Record<Task['priority'], string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  loading,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color: string
  loading: boolean
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
      <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        {loading ? (
          <div className="h-7 w-24 bg-slate-100 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-2xl font-bold text-slate-800">{value}</p>
        )}
        {sub && !loading && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeTasks: 0,
    totalRevenue: 0,
    pendingPayments: 0,
  })
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.organization_id) return

    const orgId = profile.organization_id

    async function fetchData() {
      try {
        const [projectsRes, tasksRes, invoicesRes] = await Promise.all([
          supabase
            .from('projects')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false }),
          supabase
            .from('tasks')
            .select('*')
            .eq('organization_id', orgId)
            .neq('status', 'done')
            .neq('status', 'cancelled')
            .not('due_date', 'is', null)
            .order('due_date', { ascending: true }),
          supabase
            .from('invoices')
            .select('*')
            .eq('organization_id', orgId),
        ])

        const projects: Project[] = projectsRes.data ?? []
        const tasks: Task[] = tasksRes.data ?? []
        const invoices: Invoice[] = invoicesRes.data ?? []

        const sevenDaysFromNow = new Date()
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
        const now = new Date()

        const upcoming = tasks.filter(t => {
          if (!t.due_date) return false
          const due = new Date(t.due_date)
          return due >= now && due <= sevenDaysFromNow
        })

        const totalRevenue = invoices
          .filter(i => i.status === 'paid')
          .reduce((sum, i) => sum + (i.total ?? 0), 0)

        const pendingPayments = invoices
          .filter(i => i.status === 'sent' || i.status === 'overdue')
          .reduce((sum, i) => sum + (i.total ?? 0), 0)

        setStats({
          totalProjects: projects.length,
          activeTasks: tasks.length,
          totalRevenue,
          pendingPayments,
        })
        setRecentProjects(projects.slice(0, 5))
        setUpcomingTasks(upcoming.slice(0, 8))
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [profile?.organization_id])

  const greeting = profile?.full_name
    ? `שלום, ${profile.full_name.split(' ')[0]}`
    : 'שלום'

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{greeting}</h1>
        <p className="text-slate-500 mt-1">הנה סקירה כללית של הפעילות שלך</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={FolderOpen}
          label="סה״כ פרויקטים"
          value={stats.totalProjects}
          color="bg-blue-50 text-blue-600"
          loading={loading}
        />
        <StatCard
          icon={CheckSquare}
          label="משימות פעילות"
          value={stats.activeTasks}
          color="bg-green-50 text-green-600"
          loading={loading}
        />
        <StatCard
          icon={TrendingUp}
          label="הכנסות שהתקבלו"
          value={formatCurrency(stats.totalRevenue)}
          color="bg-purple-50 text-purple-600"
          loading={loading}
        />
        <StatCard
          icon={DollarSign}
          label="תשלומים ממתינים"
          value={formatCurrency(stats.pendingPayments)}
          color="bg-orange-50 text-orange-600"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-500" />
            פרויקטים אחרונים
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recentProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <FolderOpen className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm">אין פרויקטים עדיין</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {recentProjects.map(project => (
                <li
                  key={project.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition cursor-pointer group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-700 truncate group-hover:text-blue-600 transition">
                      {project.name}
                    </p>
                    {project.start_date && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatDate(project.start_date)}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mr-2 ${STATUS_COLORS[project.status]}`}
                  >
                    {STATUS_LABELS[project.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            משימות קרובות (7 ימים)
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : upcomingTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <AlertCircle className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm">אין משימות קרובות</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {upcomingTasks.map(task => (
                <li
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-700 truncate">{task.title}</p>
                    {task.due_date && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatDate(task.due_date)}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mr-2 ${PRIORITY_COLORS[task.priority]}`}
                  >
                    {PRIORITY_LABELS[task.priority]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
