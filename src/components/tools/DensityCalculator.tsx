import { useToolState } from '@/hooks/useToolState'

interface State {
  plotArea: string
  far: string
  coverage: string
  floors: string
  avgUnit: string
}

const DEFAULT: State = { plotArea: '', far: '', coverage: '', floors: '', avgUnit: '100' }

export default function DensityCalculator({ projectId }: { projectId: string | null }) {
  const { state, setState, loading, saving } = useToolState('density-calculator', projectId, DEFAULT)
  const { plotArea, far, coverage, floors, avgUnit } = state

  const set = (field: keyof State) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setState(s => ({ ...s, [field]: e.target.value }))

  const plot = parseFloat(plotArea) || 0
  const farVal = parseFloat(far) || 0
  const covPct = parseFloat(coverage) || 0
  const floorCount = parseFloat(floors) || 0
  const avgUnitArea = parseFloat(avgUnit) || 100

  const maxBuildArea = plot * farVal
  const maxFootprint = plot * covPct / 100
  const estUnits = avgUnitArea > 0 ? Math.floor(maxBuildArea / avgUnitArea) : 0
  const avgFloorArea = floorCount > 0 ? maxBuildArea / floorCount : 0

  const row = (label: string, value: string, sub?: string) => (
    <div className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="text-left">
        <span className="font-bold text-slate-800">{value}</span>
        {sub && <span className="text-xs text-slate-400 mr-1">{sub}</span>}
      </div>
    </div>
  )

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6" dir="rtl">
      {saving && <div className="text-xs text-slate-400 text-left">שומר...</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">שטח מגרש (מ"ר)</label>
          <input type="number" value={plotArea} onChange={set('plotArea')} placeholder="למשל: 600"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">מקדם ניצול (FAR)</label>
          <input type="number" step="0.1" value={far} onChange={set('far')} placeholder="למשל: 2.5"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">אחוזי כיסוי (%)</label>
          <input type="number" min="0" max="100" value={coverage} onChange={set('coverage')} placeholder="למשל: 40"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">מספר קומות מותר</label>
          <input type="number" value={floors} onChange={set('floors')} placeholder="למשל: 6"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">שטח ממוצע ליחידה (מ"ר)</label>
          <input type="number" value={avgUnit} onChange={set('avgUnit')} placeholder="100"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">תוצאות חישוב</h3>
        {row('שטח מגרש', `${plot > 0 ? plot.toLocaleString('he-IL') : '—'} מ"ר`)}
        {row('שטח בנייה מקסימלי', maxBuildArea > 0 ? `${Math.round(maxBuildArea).toLocaleString('he-IL')} מ"ר` : '—', farVal > 0 ? `(FAR ${farVal})` : '')}
        {row('שטח כיסוי מקסימלי', maxFootprint > 0 ? `${Math.round(maxFootprint).toLocaleString('he-IL')} מ"ר` : '—', covPct > 0 ? `(${covPct}%)` : '')}
        {row('שטח ממוצע לקומה', avgFloorArea > 0 ? `${Math.round(avgFloorArea).toLocaleString('he-IL')} מ"ר` : '—')}
        {row('מספר יחידות משוער', estUnits > 0 ? `${estUnits} יח"ד` : '—', `(שטח ממוצע ${avgUnitArea} מ"ר)`)}
      </div>

      {plot > 0 && farVal > 0 && covPct > 0 && floorCount > 0 && (
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 text-sm text-blue-700">
          <strong>ניתוח:</strong> ניתן לבנות{' '}
          <strong>{Math.round(maxBuildArea).toLocaleString('he-IL')} מ"ר</strong> ב-{Math.round(floorCount)} קומות,
          עם טביעת רגל מקסימלית של{' '}
          <strong>{Math.round(maxFootprint).toLocaleString('he-IL')} מ"ר</strong> ({covPct}% כיסוי).
          {estUnits > 0 && ` אומדן של ${estUnits} יחידות דיור.`}
        </div>
      )}
    </div>
  )
}
