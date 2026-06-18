import { useToolState } from '@/hooks/useToolState'

const ZONE_SETBACKS: Record<string, { label: string; front: number; rear: number; side: number; notes: string }> = {
  residential_a:   { label: 'מגורים א\'',   front: 5,  rear: 4,  side: 3,  notes: 'בנייה רוויה נמוכה' },
  residential_b:   { label: 'מגורים ב\'',   front: 4,  rear: 3,  side: 3,  notes: 'בנייה עירונית' },
  residential_c:   { label: 'מגורים ג\'',   front: 3,  rear: 2.5, side: 2, notes: 'בנייה צמודת קרקע' },
  commercial:      { label: 'מסחר',         front: 3,  rear: 3,  side: 0,  notes: 'ניתן לבנות על קו בנין' },
  light_industrial:{ label: 'תעשייה קלה',   front: 5,  rear: 4,  side: 3,  notes: 'כולל דרישות בטיחות' },
  public:          { label: 'מבנה ציבורי',  front: 6,  rear: 5,  side: 4,  notes: 'לפי דרישות מיוחדות' },
  agricultural:    { label: 'חקלאי',        front: 10, rear: 8,  side: 6,  notes: 'בנייה חקלאית' },
}

interface State {
  zone: string
  plotWidth: string
  plotDepth: string
  customFront: string
  customRear: string
  customSide: string
}

const DEFAULT: State = {
  zone: 'residential_b',
  plotWidth: '',
  plotDepth: '',
  customFront: '',
  customRear: '',
  customSide: '',
}

export default function SetbackCalculator({ projectId }: { projectId: string | null }) {
  const { state, setState, loading, saving } = useToolState('setback-calculator', projectId, DEFAULT)
  const { zone, plotWidth, plotDepth, customFront, customRear, customSide } = state

  const zoneData = ZONE_SETBACKS[zone]
  const front = parseFloat(customFront) || zoneData.front
  const rear  = parseFloat(customRear)  || zoneData.rear
  const side  = parseFloat(customSide)  || zoneData.side

  const width = parseFloat(plotWidth) || 0
  const depth = parseFloat(plotDepth) || 0

  const buildableWidth = Math.max(0, width - side * 2)
  const buildableDepth = Math.max(0, depth - front - rear)
  const buildableArea  = buildableWidth * buildableDepth

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6" dir="rtl">
      {saving && <div className="text-xs text-slate-400 text-left">שומר...</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">ייעוד / אזור</label>
          <select value={zone} onChange={e => setState(s => ({ ...s, zone: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {Object.entries(ZONE_SETBACKS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <p className="text-xs text-slate-400 mt-1">{zoneData.notes}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">רוחב מגרש (מ')</label>
            <input type="number" value={plotWidth} onChange={e => setState(s => ({ ...s, plotWidth: e.target.value }))} placeholder="12"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">עומק מגרש (מ')</label>
            <input type="number" value={plotDepth} onChange={e => setState(s => ({ ...s, plotDepth: e.target.value }))} placeholder="25"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm font-medium text-slate-700 mb-2">קווי בנין (ניתן לדרוס את ברירת המחדל)</div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'קדמי (מ\')', field: 'customFront' as keyof State, def: zoneData.front, val: customFront },
            { label: 'אחורי (מ\')', field: 'customRear' as keyof State, def: zoneData.rear, val: customRear },
            { label: 'צד (מ\')', field: 'customSide' as keyof State, def: zoneData.side, val: customSide },
          ].map(({ label, field, def, val }) => (
            <div key={label}>
              <label className="block text-xs text-slate-600 mb-1">{label}</label>
              <input type="number" step="0.5" value={val} onChange={e => setState(s => ({ ...s, [field]: e.target.value }))} placeholder={String(def)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-700 mb-4">אזור בנייה מותר</h3>
        <div className="relative mx-auto" style={{ maxWidth: 280 }}>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center text-xs text-slate-500" style={{ padding: `${Math.min(40, front * 8)}px ${Math.min(40, side * 8)}px ${Math.min(40, rear * 8)}px` }}>
            <div className="text-slate-400 text-xs mb-1">קו בנין קדמי: {front}מ'</div>
            <div className="border-2 border-blue-400 rounded bg-blue-50 py-6 px-2">
              <div className="font-bold text-blue-700 text-sm">אזור בנייה</div>
              {buildableArea > 0 && (
                <div className="text-blue-600 text-sm mt-1">{buildableArea.toFixed(1)} מ"ר</div>
              )}
              {buildableWidth > 0 && buildableDepth > 0 && (
                <div className="text-xs text-blue-400 mt-0.5">{buildableWidth.toFixed(1)} × {buildableDepth.toFixed(1)} מ'</div>
              )}
            </div>
            <div className="text-slate-400 text-xs mt-1">קו בנין אחורי: {rear}מ'</div>
          </div>
          <div className="text-center text-xs text-slate-400 mt-1">צד: {side}מ' | צד: {side}מ'</div>
        </div>
      </div>

      {buildableArea > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { label: 'שטח מגרש', val: `${(width * depth).toFixed(0)} מ"ר`, color: 'bg-slate-50 border-slate-200 text-slate-700' },
            { label: 'קו קדמי', val: `${front} מ'`, color: 'bg-orange-50 border-orange-100 text-orange-700' },
            { label: 'קו אחורי', val: `${rear} מ'`, color: 'bg-orange-50 border-orange-100 text-orange-700' },
            { label: 'שטח בנייה', val: `${buildableArea.toFixed(1)} מ"ר`, color: 'bg-blue-50 border-blue-100 text-blue-700' },
          ].map(({ label, val, color }) => (
            <div key={label} className={`rounded-xl p-3 border ${color}`}>
              <div className="text-xs opacity-70">{label}</div>
              <div className="font-bold text-base mt-0.5">{val}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
