import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Save } from 'lucide-react'
import { useState, useEffect } from 'react'
import { TOOLS } from '@/data/tools'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth-context'
import AreaCalculator from '@/components/tools/AreaCalculator'
import FeeCalculator from '@/components/tools/FeeCalculator'
import BudgetBreakdown from '@/components/tools/BudgetBreakdown'
import DensityCalculator from '@/components/tools/DensityCalculator'
import ParkingCalculator from '@/components/tools/ParkingCalculator'
import EnergyCalculator from '@/components/tools/EnergyCalculator'
import SetbackCalculator from '@/components/tools/SetbackCalculator'
import RoomProgram from '@/components/tools/RoomProgram'
import SchedulePlanner from '@/components/tools/SchedulePlanner'
import PhaseTracker from '@/components/tools/PhaseTracker'
import PaymentSchedule from '@/components/tools/PaymentSchedule'
import MaterialSchedule from '@/components/tools/MaterialSchedule'
import PunchList from '@/components/tools/PunchList'
import InspectionChecklist from '@/components/tools/InspectionChecklist'
import RfiLog from '@/components/tools/RfiLog'
import ChangeOrderLog from '@/components/tools/ChangeOrderLog'
import MeetingNotes from '@/components/tools/MeetingNotes'
import PermitChecklist from '@/components/tools/PermitChecklist'
import AccessibilityCheck from '@/components/tools/AccessibilityCheck'
import SustainabilityCheck from '@/components/tools/SustainabilityCheck'
import TimeTracker from '@/components/tools/TimeTracker'
import ProfitabilityTracker from '@/components/tools/ProfitabilityTracker'
import ProposalBuilder from '@/components/tools/ProposalBuilder'
import SpecChecklist from '@/components/tools/SpecChecklist'

export const Route = createFileRoute('/_authenticated/tools/$toolId')({
  component: ToolPage,
})

type ToolProps = { projectId: string | null }

const TOOL_COMPONENTS: Record<string, React.ComponentType<ToolProps>> = {
  'area-calculator':       AreaCalculator,
  'fee-calculator':        FeeCalculator,
  'budget-breakdown':      BudgetBreakdown,
  'density-calculator':    DensityCalculator,
  'parking-calculator':    ParkingCalculator,
  'energy-calculator':     EnergyCalculator,
  'setback-calculator':    SetbackCalculator,
  'room-program':          RoomProgram,
  'schedule-planner':      SchedulePlanner,
  'phase-tracker':         PhaseTracker,
  'payment-schedule':      PaymentSchedule,
  'material-schedule':     MaterialSchedule,
  'punch-list':            PunchList,
  'inspection-checklist':  InspectionChecklist,
  'rfi-log':               RfiLog,
  'change-order-log':      ChangeOrderLog,
  'meeting-notes':         MeetingNotes,
  'permit-checklist':      PermitChecklist,
  'accessibility-check':   AccessibilityCheck,
  'sustainability-check':  SustainabilityCheck,
  'time-tracker':          TimeTracker,
  'profitability-tracker': ProfitabilityTracker,
  'proposal-builder':      ProposalBuilder,
  'spec-checklist':        SpecChecklist,
}

interface Project { id: string; name: string }

function ToolPage() {
  const { toolId } = Route.useParams()
  const { profile } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState<string | null>(null)
  const toolDef = TOOLS.find(t => t.id === toolId)
  const ToolComponent = TOOL_COMPONENTS[toolId]

  useEffect(() => {
    if (!profile?.organization_id) return
    supabase
      .from('projects')
      .select('id, name')
      .eq('organization_id', profile.organization_id)
      .order('name')
      .then(({ data }) => setProjects(data ?? []))
  }, [profile?.organization_id])

  if (!toolDef || !ToolComponent) {
    return (
      <div className="p-6 text-center text-slate-500" dir="rtl">
        <p className="text-lg font-medium mb-2">כלי לא נמצא</p>
        <Link to="/tools" className="text-blue-600 hover:underline text-sm">חזרה לרשימת הכלים</Link>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto" dir="rtl">
      <div className="mb-6">
        <Link
          to="/tools"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          כל הכלים
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${toolDef.colorClass}`}>
              <span className="text-2xl">🔧</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{toolDef.titleHe}</h1>
              <p className="text-slate-500 text-sm mt-0.5">{toolDef.descHe}</p>
            </div>
          </div>

          {/* Project selector */}
          <div className="flex items-center gap-2">
            <Save className="w-4 h-4 text-slate-400" />
            <select
              value={projectId ?? ''}
              onChange={e => setProjectId(e.target.value || null)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ללא פרויקט (לא נשמר)</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
        <ToolComponent projectId={projectId} />
      </div>
    </div>
  )
}
