import { useState } from 'react'

interface UseType {
  label: string
  unit: string
  placeholder: string
  ratioLabel: string
  defaultRatio: number
  accessiblePct: number
}

const USE_TYPES: Record<string, UseType> = {
  residential_1br: { label: 'מגורים — 1-2 חד\'',   unit: 'יחידות',       placeholder: '20',   ratioLabel: 'חניה לכל יח"ד', defaultRatio: 1.0, accessiblePct: 4 },
  residential_3br: { label: 'מגורים — 3+ חד\'',    unit: 'יחידות',       placeholder: '20',   ratioLabel: 'חניה לכל יח"ד', defaultRatio: 1.5, accessiblePct: 4 },
  office:          { label: 'משרדים',               unit: 'מ"ר שטח',      placeholder: '1000', ratioLabel: 'חניה ל-100מ"ר',  defaultRatio: 3.0, accessiblePct: 4 },
  retail:          { label: 'מסחר',                 unit: 'מ"ר שטח',      placeholder: '500',  ratioLabel: 'חניה ל-100מ"ר',  defaultRatio: 5.0, accessiblePct: 4 },
  hotel:           { label: 'מלונאות',              unit: 'חדרים',        placeholder: '80',   ratioLabel: 'חניה לכל חדר',  defaultRatio: 0.5, accessiblePct: 4 },
  medical:         { label: 'מרפאה / בית חולים',    unit: 'מ"ר שטח',      placeholder: '800',  ratioLabel: 'חניה ל-100מ"ר',  defaultRatio: 4.0, accessiblePct: 4 },
  industrial:      { label: 'תעשייה / מחסנים',      unit: 'מ"ר שטח',      placeholder: '2000', ratioLabel: 'חניה ל-250מ"ר',  defaultRatio: 1.0, accessiblePct: 2 },
  school:          { label: 'חינוך',                unit: 'כיתות',        placeholder: '20',   ratioLabel: 'חניה לכיתה',    defaultRatio: 2.0, accessiblePct: 4 },
}

export default function ParkingCalculator() {
  const [useType, setUseType] = useState('residential_3br')
  const [quantity, setQuantity] = useState('')
  const [customRatio, setCustomRatio] = useState('')
  const [mixedUse, setMixedUse] = useState(false)
  const [residential, setResidential] = useState('')
  const [commercial, setCommercial] = useState('')

  const type = USE_TYPES[useType]
  const ratio = parseFloat(customRatio) || type.defaultRatio
  const qty = parseFloat(quantity) || 0

  const required = (() => {
    if (mixedUse) {
      const resUnits = parseFloat(residential) || 0
      const comArea = parseFloat(commercial) || 0
      return resUnits * 1.5 + comArea * 5 / 100
    }
    if (['office','retail','medical'].includes(useType)) return qty * ratio / 100
    if (useType === 'industrial') return qty * ratio / 250
    return qty * ratio
  })()

  const requiredRounded = Math.ceil(required)
  const accessible = Math.max(1, Math.ceil(requiredRounded * type.accessiblePct / 100))
  const regular = requiredRounded - accessible

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3 mb-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={mixedUse}
            onChange={e => setMixedUse(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600"
          />
          <span className="text-sm text-slate-600">שימוש מעורב (מגורים + מסחר)</span>
        </label>
      </div>

      {mixedUse ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">יחידות דיור</label>
            <input type="number" value={residential} onChange={e => setResidential(e.target.value)} placeholder="20"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-slate-400 mt-1">1.5 חניה ליח"ד (3+ חד')</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">שטח מסחרי (מ"ר)</label>
            <input type="number" value={commercial} onChange={e => setCommercial(e.target.value)} placeholder="300"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-slate-400 mt-1">5 חניות ל-100מ"ר</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">שימוש</label>
            <select value={useType} onChange={e => setUseType(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {Object.entries(USE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">כמות ({type.unit})</label>
            <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder={type.placeholder}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{type.ratioLabel}</label>
            <input type="number" step="0.1" value={customRatio} onChange={e => setCustomRatio(e.target.value)} placeholder={String(type.defaultRatio)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
          <div className="text-3xl font-bold text-blue-700">{requiredRounded}</div>
          <div className="text-sm text-blue-600 mt-1">מקומות חניה נדרשים</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
          <div className="text-3xl font-bold text-slate-700">{regular}</div>
          <div className="text-sm text-slate-500 mt-1">חניות רגילות</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
          <div className="text-3xl font-bold text-green-700">{accessible}</div>
          <div className="text-sm text-green-600 mt-1">חניות נגישות ({type.accessiblePct}%)</div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
        <strong>הערה:</strong> החישוב מתבסס על תקנות תכנון ובנייה סטנדרטיות. יש לבדוק את דרישות התכנית המקומית הרלוונטית לפרויקט.
      </div>
    </div>
  )
}
