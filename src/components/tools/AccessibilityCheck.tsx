import { useToolState } from '@/hooks/useToolState'

type ItemResult = 'compliant' | 'non_compliant' | 'na' | 'pending'

interface ACheck {
  id: string
  label: string
  detail?: string
  result: ItemResult
  notes: string
}

interface ASection {
  id: string
  title: string
  items: ACheck[]
}

interface State {
  buildingType: string
  sections: ASection[]
}

const RESULT_META: Record<ItemResult, { label: string; color: string }> = {
  compliant:     { label: 'עומד',       color: 'bg-green-100 text-green-700 border-green-200' },
  non_compliant: { label: 'אינו עומד',  color: 'bg-red-100 text-red-700 border-red-200' },
  na:            { label: 'לא רלוונטי', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  pending:       { label: 'לא נבדק',   color: 'bg-amber-50 text-amber-600 border-amber-200' },
}

const ORDER: ItemResult[] = ['pending', 'compliant', 'non_compliant', 'na']

function mk(id: string, label: string, detail?: string): ACheck {
  return { id, label, detail, result: 'pending', notes: '' }
}

const INITIAL_SECTIONS: ASection[] = [
  {
    id: 'entrance', title: 'כניסה ומסדרון כניסה',
    items: [
      mk('e1', 'שביל גישה נגיש מחניה לכניסה', "רוחב מינ. 1.50מ'"),
      mk('e2', 'שיפוע שביל גישה', 'מקס. 1:14'),
      mk('e3', 'פרק כניסה ראשי נגיש', 'ללא מדרגות / עם רמפה'),
      mk('e4', 'דלת כניסה — רוחב מינ. 90 ס"מ'),
      mk('e5', 'ידית דלת — גובה 80-110 ס"מ'),
      mk('e6', 'תאורה מספקת בכניסה', 'מינ. 200 לוקס'),
    ],
  },
  {
    id: 'corridors', title: 'מסדרונות ומעברים',
    items: [
      mk('c1', 'רוחב מסדרון', "מינ. 1.20מ' פנוי"),
      mk('c2', 'גובה פנוי', "מינ. 2.10מ'"),
      mk('c3', 'פינות — תשריט פינה לכיסא גלגלים'),
      mk('c4', 'סוגי רצפה — מפלס אחיד, לא חלקה'),
      mk('c5', 'ניגוד צבעים בין רצפה לקיר'),
    ],
  },
  {
    id: 'elevation', title: 'מעליות ועליות',
    items: [
      mk('el1', 'מעלית נגישה — מידות תא', 'מינ. 110×140 ס"מ'),
      mk('el2', 'לוח כפתורי מעלית — גובה', '0.90-1.10מ'),
      mk('el3', 'כפתורים עם ברייל ותאורה'),
      mk('el4', 'הודעה קולית מעלית'),
      mk('el5', 'רמפה (אם אין מעלית) — שיפוע', 'מקס. 1:12'),
      mk('el6', 'ידיות רמפה — גובה', '0.85-1.00מ'),
    ],
  },
  {
    id: 'toilets', title: 'שירותים נגישים',
    items: [
      mk('t1', 'שירותי נכים — מידות', 'מינ. 165×200 ס"מ'),
      mk('t2', 'מקום לכיסא גלגלים ליד אסלה', 'מינ. 90 ס"מ'),
      mk('t3', 'ידיות תמיכה ליד אסלה'),
      mk('t4', 'כיור — גובה', 'מקס. 86 ס"מ מרצפה'),
      mk('t5', 'ברז ידנית / מגע'),
      mk('t6', 'מראה — מגיעה לגובה 100 ס"מ'),
      mk('t7', 'דלת שירותים — נפתחת החוצה'),
    ],
  },
  {
    id: 'parking', title: 'חנייה נגישה',
    items: [
      mk('p1', 'מקום חנייה נגיש', 'רוחב מינ. 3.40מ'),
      mk('p2', 'תלאי / שילוט לחנייה נגישה'),
      mk('p3', 'מרחק מחנייה לכניסה', 'מינ. אפשרי'),
    ],
  },
  {
    id: 'signage', title: 'שילוט ומידע',
    items: [
      mk('sg1', 'שילוט נגישות בכניסה'),
      mk('sg2', 'לוחות מידע — גובה', '1.40-1.60מ'),
      mk('sg3', 'שילוט — ניגוד צבעים מספק'),
      mk('sg4', 'תאורת חירום'),
    ],
  },
]

const DEFAULT: State = { buildingType: 'public', sections: INITIAL_SECTIONS }

export default function AccessibilityCheck({ projectId }: { projectId: string | null }) {
  const { state, setState, loading, saving } = useToolState('accessibility-check', projectId, DEFAULT)
  const { buildingType, sections } = state

  const cycleResult = (sId: string, iId: string, cur: ItemResult) => {
    const next = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length]
    setState(s => ({ ...s, sections: s.sections.map(sec => sec.id === sId
      ? { ...sec, items: sec.items.map(it => it.id === iId ? { ...it, result: next } : it) }
      : sec) }))
  }

  const setNotes = (sId: string, iId: string, notes: string) =>
    setState(s => ({ ...s, sections: s.sections.map(sec => sec.id === sId
      ? { ...sec, items: sec.items.map(it => it.id === iId ? { ...it, notes } : it) }
      : sec) }))

  const allItems = sections.flatMap(s => s.items).filter(i => i.result !== 'na')
  const compliant = allItems.filter(i => i.result === 'compliant').length
  const nonCompliant = allItems.filter(i => i.result === 'non_compliant').length
  const checked = compliant + nonCompliant
  const score = checked > 0 ? (compliant / checked) * 100 : 0

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-5" dir="rtl">
      {saving && <div className="text-xs text-slate-400 text-left">שומר...</div>}
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">סוג מבנה</label>
          <select value={buildingType} onChange={e => setState(s => ({ ...s, buildingType: e.target.value }))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="public">מבנה ציבורי</option>
            <option value="residential">מגורים (מעל 4 יח"ד)</option>
            <option value="commercial">מסחרי</option>
          </select>
        </div>
        <div className="text-xs text-slate-500">תקן ישראלי 1918 — נגישות לבנייה ולסביבה</div>
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-700">ציון עמידה בדרישות</span>
          <span className={`font-bold text-lg ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
            {Math.round(score)}%
          </span>
        </div>
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${score}%` }} />
        </div>
        <div className="flex gap-4 mt-2 text-xs text-slate-500">
          <span className="text-green-600">{compliant} עומד</span>
          <span className="text-red-600">{nonCompliant} אינו עומד</span>
          <span>{allItems.filter(i => i.result === 'pending').length} לא נבדק</span>
        </div>
      </div>

      {sections.map(section => (
        <div key={section.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800 text-sm">{section.title}</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {section.items.map(item => (
              <div key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                <button
                  onClick={() => cycleResult(section.id, item.id, item.result)}
                  className={`mt-0.5 shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer transition-colors ${RESULT_META[item.result].color}`}
                >
                  {RESULT_META[item.result].label}
                </button>
                <div className="flex-1">
                  <div className={`text-sm ${item.result === 'non_compliant' ? 'text-red-700 font-medium' : item.result === 'na' ? 'text-slate-400' : 'text-slate-700'}`}>
                    {item.label}
                    {item.detail && <span className="text-xs text-slate-400 mr-1">— {item.detail}</span>}
                  </div>
                  {item.result === 'non_compliant' && (
                    <input value={item.notes} onChange={e => setNotes(section.id, item.id, e.target.value)}
                      placeholder="פרט את הבעיה ופעולה נדרשת..."
                      className="mt-1 w-full border border-red-200 rounded px-2 py-1 text-xs bg-red-50 focus:outline-none focus:ring-1 focus:ring-red-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
