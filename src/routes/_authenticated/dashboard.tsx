import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FolderOpen, CheckSquare, DollarSign, Clock, TrendingUp, AlertCircle, BarChart2 } from 'lucide-react'
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

const STATUS_BAR_COLORS: Record<Project['status'], string> = {
  planning: 'bg-yellow-400',
  active: 'bg-green-500',
  on_hold: 'bg-orange-400',
  completed: 'bg-blue-500',
  cancelled: 'bg-red-400',
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

const HEBREW_MONTHS = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ']

interface MonthRevenue {
  label: string
  total: number
  year: number
  month: number
}

interface TopClient {
  clientId: string
  clientName: string
  total: number
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

function RevenueChart({ data, loading }: { data: MonthRevenue[]; loading: boolean }) {
  if (loading) {
    return <div className="h-48 bg-slate-50 rounded-xl animate-pulse" />
  }
  const maxVal = Math.max(...data.map(d => d.total), 1)
  const W = 400
  const H = 180
  const barW = 44
  const gap = (W - data.length * barW) / (data.length + 1)

  return (
    <svg viewBox={`0 0 ${W} ${H + 30}`} className="w-full" aria-label="תרשים הכנסות">
      {data.map((d, i) => {
        const x = gap + i * (barW + gap)
        const barH = maxVal > 0 ? Math.max((d.total / maxVal) * H, 2) : 2
        const y = H - barH
        const isZero = d.total === 0
        return (
          <g key={`${d.year}-${d.month}`}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={4}
              className={isZero ? 'fill-slate-100' : 'fill-blue-500'}
            />
            {!isZero && (
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize={9}
                className="fill-slate-500"
              >
                {d.total >= 1000 ? `${Math.round(d.total / 1000)}k` : d.total}
              </text>
            )}
            <text
              x={x + barW / 2}
              y={H + 16}
              textAnchor="middle"
              fontSize={10}
              className="fill-slate-400"
            >
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
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

  // Analytics state
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthRevenue[]>([])
  const [projectsByStatus, setProjectsByStatus] = useState<{ status: Project['status']; count: number }[]>([])
  const [topClients, setTopClients] = useState<TopClient[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!profile?.organization_id) return
    const orgId = profile.organization_id
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
  }, [profile?.organization_id])

  const fetchAnalytics = useCallback(async () => {
    if (!profile?.organization_id) return
    const orgId = profile.organization_id
    setAnalyticsLoading(true)
    try {
      // Last 6 months revenue
      const now = new Date()
      const months: MonthRevenue[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push({ label: HEBREW_MONTHS[d.getMonth()], total: 0, year: d.getFullYear(), month: d.getMonth() })
      }

      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      const [{ data: paidInvoices }, { data: clientsData }] = await Promise.all([
        supabase
          .from('invoices')
          .select('total, issue_date, client_id')
          .eq('organization_id', orgId)
          .eq('status', 'paid')
          .gte('issue_date', sixMonthsAgo.toISOString().slice(0, 10)),
        supabase
          .from('clients')
          .select('id, name')
          .eq('organization_id', orgId),
      ])

      const clientNameMap = new Map<string, string>(
        (clientsData ?? []).map(c => [c.id, c.name])
      )

      const invoiceData = (paidInvoices ?? []) as { total: number; issue_date: string; client_id: string | null }[]

      invoiceData.forEach(inv => {
        if (!inv.issue_date) return
        const d = new Date(inv.issue_date)
        const m = months.find(mo => mo.year === d.getFullYear() && mo.month === d.getMonth())
        if (m) m.total += inv.total ?? 0
      })
      setMonthlyRevenue(months)

      // Projects by status
      const { data: allProjects } = await supabase
        .from('projects')
        .select('status')
        .eq('organization_id', orgId)
      const statusCounts: Partial<Record<Project['status'], number>> = {}
      ;(allProjects ?? []).forEach((p: { status: Project['status'] }) => {
        statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1
      })
      const statusList = (Object.entries(statusCounts) as [Project['status'], number][])
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count)
      setProjectsByStatus(statusList)

      // Top 3 clients by revenue
      const clientMap = new Map<string, { name: string; total: number }>()
      invoiceData.forEach(inv => {
        if (!inv.client_id) return
        const name = clientNameMap.get(inv.client_id) ?? inv.client_id
        const existing = clientMap.get(inv.client_id) ?? { name, total: 0 }
        existing.total += inv.total ?? 0
        clientMap.set(inv.client_id, existing)
      })
      const top3 = Array.from(clientMap.entries())
        .map(([clientId, { name, total }]) => ({ clientId, clientName: name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 3)
      setTopClients(top3)
    } catch (err) {
      console.error('Analytics fetch error:', err)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [profile?.organization_id])

  useEffect(() => {
    if (!profile?.organization_id) return
    fetchData()
    fetchAnalytics()
  }, [profile?.organization_id, fetchData, fetchAnalytics])

  // Realtime subscription
  useEffect(() => {
    if (!profile?.organization_id) return
    const channel = supabase
      .channel('dashboard-rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `organization_id=eq.${profile.organization_id}` },
        () => { fetchData() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile?.organization_id, fetchData])

  const greeting = profile?.full_name
    ? `שלום, ${profile.full_name.split(' ')[0]}`
    : 'שלום'

  const maxStatusCount = Math.max(...projectsByStatus.map(s => s.count), 1)

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

      {/* Analytics Section */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-blue-500" />
          ניתוח נתונים
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 lg:col-span-1">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">הכנסות — 6 חודשים אחרונים</h3>
            {analyticsLoading ? (
              <div className="h-48 bg-slate-50 rounded-xl animate-pulse" />
            ) : (
              <>
                <RevenueChart data={monthlyRevenue} loading={analyticsLoading} />
                <p className="text-xs text-slate-400 text-center mt-1">
                  סה״כ: {formatCurrency(monthlyRevenue.reduce((s, m) => s + m.total, 0))}
                </p>
              </>
            )}
          </div>

          {/* Projects by Status */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">פרויקטים לפי סטטוס</h3>
            {analyticsLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-slate-50 rounded animate-pulse" />)}
              </div>
            ) : projectsByStatus.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">אין נתונים</p>
            ) : (
              <div className="space-y-3">
                {projectsByStatus.map(({ status, count }) => (
                  <div key={status}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status]}`}>
                        {STATUS_LABELS[status]}
                      </span>
                      <span className="text-slate-500 font-medium">{count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${STATUS_BAR_COLORS[status]}`}
                        style={{ width: `${(count / maxStatusCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Clients */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">לקוחות מובילים (לפי הכנסה)</h3>
            {analyticsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-slate-50 rounded animate-pulse" />)}
              </div>
            ) : topClients.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">אין נתונים</p>
            ) : (
              <ol className="space-y-3">
                {topClients.map((client, idx) => (
                  <li key={client.clientId} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                      idx === 1 ? 'bg-slate-100 text-slate-600' :
                      'bg-orange-50 text-orange-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{client.clientName}</p>
                    </div>
                    <span className="text-sm font-semibold text-green-600 shrink-0">
                      {formatCurrency(client.total)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
