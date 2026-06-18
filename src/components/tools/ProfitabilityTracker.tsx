import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

interface CostLine {
  id: string
  category: string
  description: string
  amount: string
}

const CATEGORIES = ['כ"א — אדריכל בכיר', 'כ"א — אדריכל', 'כ"א — מתכנן', 'יועצים חיצוניים', 'הוצאות משרד', 'פלוטים / הדפסות', 'תוכנה', 'נסיעות', 'אחר']

function newLine(category = 'כ"א — אדריכל'): CostLine {
  return { id: crypto.randomUUID(), category, description: '', amount: '' }
}

export default function ProfitabilityTracker() {
  const [contractValue, setContractValue] = useState('')
  const [paidSoFar, setPaidSoFar] = useState('')
  const [costs, setCosts] = useState<CostLine[]>([
    newLine('כ"א — אדריכל בכיר'),
    newLine('כ"א — אדריכל'),
    newLine('יועצים חיצוניים'),
    newLine('הוצאות משרד'),
  ])

  const add = () => setCosts(c => [...c, newLine()])
  const remove = (id: string) => setCosts(c => c.filter(x => x.id !== id))
  const update = (id: string, field: keyof CostLine, value: string) =>
    setCosts(c => c.map(x => x.id === id ? { ...x, [field]: value } : x))

  const contract = parseFloat(contractValue.replace(/,/g, '')) || 0
  const paid = parseFloat(paidSoFar.replace(/,/g, '')) || 0
  const totalCosts = costs.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0)
  const grossProfit = contract - totalCosts
  const grossMargin = contract > 0 ? (grossProfit / contract) * 100 : 0
  const cashFlow = paid - totalCosts
  const vat = contract * 0.17

  const byCat: Record<string, number> = {}
  for (const c of costs) {
    byCat[c.category] = (byCat[c.category] || 0) + (parseFloat(c.amount) || 0)
  }

  const fmt = (n: number) => n !== 0 ? `₪${Math.round(Math.abs(n)).toLocaleString('he-IL')}` : '₪0'
  const fmtSigned = (n: number) => `${n >= 0 ? '+' : '-'}${fmt(n)}`

  return (
    <div className="space-y-5" dir="rtl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">שווי חוזה (ללא מע"מ, ₪)</label>
          <input type="text" value={contractValue} onChange={e => setContractValue(e.target.value)} placeholder="150,000"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">שולם עד כה (₪)</label>
          <input type="text" value={paidSoFar} onChange={e => setPaidSoFar(e.target.value)} placeholder="60,000"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Costs table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-right font-medium">קטגוריה</th>
              <th className="px-3 py-2 text-right font-medium">תיאור</th>
              <th className="px-3 py-2 text-left font-medium w-32">סכום (₪)</th>
              <th className="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {costs.map((c, i) => (
              <tr key={c.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                <td className="px-3 py-1.5">
                  <select value={c.category} onChange={e => update(c.id, 'category', e.target.value)}
                    className="border border-slate-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                    {CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
                  </select>
                </td>
                <td className="px-3 py-1.5">
                  <input value={c.description} onChange={e => update(c.id, 'description', e.target.value)} placeholder="פרט..."
                    className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </td>
                <td className="px-3 py-1.5">
                  <input type="number" value={c.amount} onChange={e => update(c.id, 'amount', e.target.value)} placeholder="0"
                    className="w-full border border-slate-200 rounded px-2 py-1 text-sm text-left focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </td>
                <td className="px-2 py-1.5">
                  <button onClick={() => remove(c.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold">
              <td className="px-3 py-2 text-slate-700" colSpan={2}>סה"כ עלויות</td>
              <td className="px-3 py-2 text-left text-red-700">{fmt(totalCosts)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <button onClick={add}
        className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
        <Plus className="w-4 h-4" /> הוסף עלות
      </button>

      {/* Results */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
          <div className="text-xl font-bold text-blue-700">{fmt(contract)}</div>
          <div className="text-xs text-blue-600 mt-1">שווי חוזה</div>
          <div className="text-xs text-blue-400 mt-0.5">+מע"מ: {fmt(vat)}</div>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center border border-red-100">
          <div className="text-xl font-bold text-red-700">{fmt(totalCosts)}</div>
          <div className="text-xs text-red-600 mt-1">סה"כ עלויות</div>
        </div>
        <div className={`rounded-xl p-4 text-center border ${grossProfit >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
          <div className={`text-xl font-bold ${grossProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmtSigned(grossProfit)}</div>
          <div className="text-xs text-slate-500 mt-1">רווח גולמי</div>
          <div className={`text-xs font-medium mt-0.5 ${grossMargin >= 30 ? 'text-green-600' : grossMargin >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
            {grossMargin.toFixed(1)}% מרווח
          </div>
        </div>
        <div className={`rounded-xl p-4 text-center border ${cashFlow >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50 border-orange-100'}`}>
          <div className={`text-xl font-bold ${cashFlow >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>{fmtSigned(cashFlow)}</div>
          <div className="text-xs text-slate-500 mt-1">תזרים (שולם − עלויות)</div>
        </div>
      </div>

      {/* By category */}
      {Object.keys(byCat).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm font-medium text-slate-700 mb-3">עלויות לפי קטגוריה</div>
          {Object.entries(byCat).sort(([, a], [, b]) => b - a).map(([cat, amt]) => (
            <div key={cat} className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-0">
              <span className="text-sm text-slate-600 flex-1">{cat}</span>
              <span className="text-sm font-medium">{fmt(amt)}</span>
              <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-400 rounded-full" style={{ width: `${totalCosts > 0 ? (amt / totalCosts) * 100 : 0}%` }} />
              </div>
              <span className="text-xs text-slate-400 w-10 text-left">{totalCosts > 0 ? ((amt / totalCosts) * 100).toFixed(0) : 0}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
