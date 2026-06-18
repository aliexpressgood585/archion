import { useToolState } from '@/hooks/useToolState'

interface LineItem { id: string; name: string; pct: number; custom: boolean }
interface State { totalBudget: string; template: string; items: LineItem[] }

const TEMPLATES: Record<string, { name: string; items: { name: string; pct: number }[] }> = {
  residential: { name: 'דיור', items: [
    { name: 'עבודות עפר ויסודות', pct: 8 }, { name: 'שלד ובטון', pct: 20 },
    { name: 'עבודות בנאות', pct: 10 }, { name: 'עבודות גג ואיטום', pct: 5 },
    { name: 'גמרים פנים', pct: 18 }, { name: 'אלומיניום וזכוכית', pct: 8 },
    { name: 'חשמל ותקשורת', pct: 8 }, { name: 'אינסטלציה', pct: 7 },
    { name: 'מיזוג אוויר', pct: 6 }, { name: 'מעלית', pct: 4 },
    { name: 'שטחים חיצוניים', pct: 4 }, { name: 'גג ירוק / פרגולה', pct: 2 },
  ]},
  commercial: { name: 'מסחרי', items: [
    { name: 'עבודות עפר ויסודות', pct: 7 }, { name: 'שלד ובטון', pct: 22 },
    { name: 'חיפוי חוץ', pct: 10 }, { name: 'גמרים פנים', pct: 15 },
    { name: 'אלומיניום וזכוכית', pct: 10 }, { name: 'חשמל ותקשורת', pct: 12 },
    { name: 'אינסטלציה', pct: 6 }, { name: 'מיזוג מרכזי', pct: 10 },
    { name: 'מעליות ומדרגות נעות', pct: 5 }, { name: 'שטחים חיצוניים ונגישות', pct: 3 },
  ]},
  renovation: { name: 'שיפוץ', items: [
    { name: 'הריסה ופינוי', pct: 8 }, { name: 'עבודות בנאות', pct: 12 },
    { name: 'גמרים רצפה', pct: 15 }, { name: 'גמרים קירות', pct: 10 },
    { name: 'תקרה', pct: 8 }, { name: 'אלומיניום ודלתות', pct: 12 },
    { name: 'חשמל', pct: 10 }, { name: 'אינסטלציה', pct: 8 },
    { name: 'מיזוג', pct: 8 }, { name: 'ריהוט מובנה', pct: 9 },
  ]},
}

function buildItems(t: string): LineItem[] {
  return (TEMPLATES[t]?.items ?? []).map(item => ({ id: crypto.randomUUID(), name: item.name, pct: item.pct, custom: false }))
}

const DEFAULT: State = { totalBudget: '', template: 'residential', items: buildItems('residential') }

export default function BudgetBreakdown({ projectId }: { projectId: string | null }) {
  const { state, setState, loading, saving } = useToolState('budget-breakdown', projectId, DEFAULT)
  const { totalBudget, template, items } = state

  const changeTemplate = (t: string) => setState(s => ({ ...s, template: t, items: buildItems(t) }))
  const updatePct = (id: string, val: string) =>
    setState(s => ({ ...s, items: s.items.map(it => it.id === id ? { ...it, pct: parseFloat(val) || 0, custom: true } : it) }))

  const budget = parseFloat(totalBudget.replace(/,/g, '')) || 0
  const totalPct = items.reduce((s, it) => s + it.pct, 0)
  const surplus = 100 - totalPct

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-5" dir="rtl">
      {saving && <div className="text-xs text-slate-400 text-left">שומר...</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">תקציב כולל (₪)</label>
          <input type="text" value={totalBudget} onChange={e => setState(s => ({ ...s, totalBudget: e.target.value }))}
            placeholder="3,000,000"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">תבנית</label>
          <select value={template} onChange={e => changeTemplate(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {Object.entries(TEMPLATES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-right font-medium">תחום עבודה</th>
              <th className="px-3 py-2 text-center font-medium w-24">% מהתקציב</th>
              <th className="px-3 py-2 text-left font-medium">סכום (₪)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                <td className="px-3 py-2">{it.name}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" max="100" step="0.5" value={it.pct}
                      onChange={e => updatePct(it.id, e.target.value)}
                      className="w-16 border border-slate-200 rounded px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <span className="text-slate-400">%</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-left font-semibold text-slate-700">
                  {budget > 0 ? `₪${Math.round(budget * it.pct / 100).toLocaleString('he-IL')}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className={`font-bold border-t-2 ${Math.abs(surplus) < 0.5 ? 'bg-green-50' : 'bg-red-50'}`}>
              <td className="px-3 py-2">סה"כ</td>
              <td className={`px-3 py-2 text-center text-lg ${Math.abs(surplus) < 0.5 ? 'text-green-700' : 'text-red-600'}`}>{totalPct.toFixed(1)}%</td>
              <td className="px-3 py-2 text-left text-emerald-700">{budget > 0 ? `₪${Math.round(budget).toLocaleString('he-IL')}` : '—'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {Math.abs(surplus) > 0.5 && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${surplus > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {surplus > 0 ? `⚠️ נותרו ${surplus.toFixed(1)}% לא מוקצים` : `⚠️ חריגה של ${Math.abs(surplus).toFixed(1)}% מהתקציב!`}
        </div>
      )}
    </div>
  )
}
