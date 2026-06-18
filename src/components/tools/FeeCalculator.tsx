import { useState } from 'react'

interface Phase {
  id: string
  label: string
  pct: number
  enabled: boolean
}

const BASE_PHASES: Omit<Phase, 'enabled'>[] = [
  { id: 'prelim',   label: 'בחינה מוקדמת',       pct: 5  },
  { id: 'schematic',label: 'תכנון מוקדם',          pct: 15 },
  { id: 'dd',       label: 'פיתוח תכנון',          pct: 20 },
  { id: 'permits',  label: 'הגשה להיתר',           pct: 15 },
  { id: 'cd',       label: 'תכנון לביצוע',         pct: 25 },
  { id: 'ca',       label: 'פיקוח עליון',           pct: 20 },
]

const PROJECT_RATE: Record<string, number> = {
  residential_small: 8,
  residential_large: 6.5,
  commercial: 5.5,
  public: 7,
  renovation: 9,
}

const PROJECT_LABELS: Record<string, string> = {
  residential_small: 'מגורים — עד 300 מ"ר',
  residential_large: 'מגורים — מעל 300 מ"ר',
  commercial: 'מסחרי / משרדים',
  public: 'מבנה ציבורי',
  renovation: 'שיפוץ / שדרוג',
}

export default function FeeCalculator() {
  const [projectType, setProjectType] = useState('residential_small')
  const [constructionCost, setConstructionCost] = useState('')
  const [phases, setPhases] = useState<Phase[]>(
    BASE_PHASES.map(p => ({ ...p, enabled: true }))
  )
  const [customRate, setCustomRate] = useState('')

  const togglePhase = (id: string) =>
    setPhases(ps => ps.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p))

  const basePct = parseFloat(customRate) || PROJECT_RATE[projectType] || 7
  const cost = parseFloat(constructionCost.replace(/,/g, '')) || 0
  const totalFee = cost * basePct / 100

  const enabledPctSum = phases.filter(p => p.enabled).reduce((s, p) => s + p.pct, 0)

  const feePerPhase = phases.map(p => ({
    ...p,
    amount: p.enabled ? (totalFee * p.pct / enabledPctSum) : 0,
  }))

  const selectedTotal = feePerPhase.filter(p => p.enabled).reduce((s, p) => s + p.amount, 0)
  const vat = selectedTotal * 0.17

  const fmt = (n: number) =>
    n > 0 ? `₪${Math.round(n).toLocaleString('he-IL')}` : '—'

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">סוג פרויקט</label>
          <select
            value={projectType}
            onChange={e => setProjectType(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {Object.entries(PROJECT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">עלות בנייה משוערת (₪)</label>
          <input
            type="text"
            value={constructionCost}
            onChange={e => setConstructionCost(e.target.value)}
            placeholder="1,500,000"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            אחוז שכ"ט בסיס: <span className="text-blue-600 font-bold">{customRate || basePct}%</span>
          </label>
          <input
            type="number"
            min="1"
            max="20"
            step="0.5"
            value={customRate}
            onChange={e => setCustomRate(e.target.value)}
            placeholder={String(basePct)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-400 mt-1">ברירת מחדל לפי סוג פרויקט: {PROJECT_RATE[projectType]}%</p>
        </div>
      </div>

      <div>
        <div className="text-sm font-medium text-slate-700 mb-2">שלבי שירות (בחר את השלבים הרלוונטיים)</div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-right font-medium w-8"></th>
                <th className="px-3 py-2 text-right font-medium">שלב</th>
                <th className="px-3 py-2 text-center font-medium">% משכ"ט</th>
                <th className="px-3 py-2 text-left font-medium">סכום</th>
              </tr>
            </thead>
            <tbody>
              {feePerPhase.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={() => togglePhase(p.id)}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                  </td>
                  <td className={`px-3 py-2 ${!p.enabled ? 'text-slate-400 line-through' : ''}`}>{p.label}</td>
                  <td className="px-3 py-2 text-center text-slate-500">{p.pct}%</td>
                  <td className={`px-3 py-2 text-left font-semibold ${p.enabled ? 'text-emerald-700' : 'text-slate-300'}`}>
                    {fmt(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">שכ"ט לפני מע"מ</div>
          <div className="text-xl font-bold text-slate-700">{fmt(selectedTotal)}</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">מע"מ (17%)</div>
          <div className="text-xl font-bold text-slate-700">{fmt(vat)}</div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-200">
          <div className="text-xs text-emerald-600 mb-1">סה"כ כולל מע"מ</div>
          <div className="text-2xl font-bold text-emerald-700">{fmt(selectedTotal + vat)}</div>
        </div>
      </div>
    </div>
  )
}
