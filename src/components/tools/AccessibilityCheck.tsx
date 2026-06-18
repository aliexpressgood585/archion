import { useState } from 'react'

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

const RESULT_META: Record<ItemResult, { label: string; color: string }> = {
  compliant:     { label: 'עומד',       color: 'bg-green-100 text-green-700 border-green-200' },
  non_compliant: { label: 'אינו עומד',  color: 'bg-red-100 text-red-700 border-red-200' },
  na:            { label: 'לא רלוונטי', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  pending:       { label: 'לא נבדק',   color: 'bg-amber-50 text-amber-600 border-amber-200' },
}

const ORDER: ItemResult[] = ['pending', 'compliant', 'non_compliant', 'na']

function mk(label: string, detail?: string): ACheck {
  return { id: crypto.randomUUID(), label, detail, result: 'pending', notes: '' }
}

const INITIAL: ASection[] = [
  {
    id: 'entrance', title: 'כניסה ומסדרון כניסה',
    items: [
      mk('שביל גישה נגיש מחניה לכניסה', "רוחב מינ. 1.50מ'"),
      mk('שיפוע שביל גישה', 'מקס. 1:14'),
      mk('פרק כניסה ראשי נגיש', 'ללא מדרגות / עם רמפה'),
      mk('דלת כניסה — רוחב מינ. 90 ס"מ'),
      mk('ידית דלת — גובה 80-110 ס"מ'),
      mk('תאורה מספקת בכניסה', 'מינ. 200 לוקס'),
    ],
  },
  {
    id: 'corridors', title: 'מסדרונות ומעברים',
    items: [
      mk('רוחב מסדרון', "מינ. 1.20מ' פנוי"),
      mk('גובה פנוי', "מינ. 2.10מ'"),
      mk('פינות — תשריט פינה לכיסא גלגלים'),
      mk('סוגי רצפה — מפלס אחיד, לא חלקה'),
      mk('ניגוד צבעים בין רצפה לקיר'),
    ],
  },
  {
    id: 'elevation', title: 'מעליות ועליות',
    items: [
      mk('מעלית נגישה — מידות תא', 'מינ. 110×140 ס"מ'),
      mk('לוח כפתורי מעלית — גובה', '0.90-1.10מ'),
      mk('כפתורים עם ברייל ותאורה'),
      mk('הודעה קולית מעלית'),
      mk('רמפה (אם אין מעלית) — שיפוע', 'מקס. 1:12'),
      mk('ידיות רמפה — גובה', '0.85-1.00מ'),
    ],
  },
  {
    id: 'toilets', title: 'שירותים נגישים',
    items: [
      mk('שירותי נכים — מידות', 'מינ. 165×200 ס"מ'),
      mk('מקום לכיסא גלגלים ליד אסלה', 'מינ. 90 ס"מ'),
      mk('ידיות תמיכה ליד אסלה'),
      mk('כיור — גובה', 'מקס. 86 ס"מ מרצפה'),
      mk('ברז ידנית / מגע'),
      mk('מראה — מגיעה לגובה 100 ס"מ'),
      mk('דלת שירותים — נפתחת החוצה'),
    ],
  },
  {
    id: 'parking', title: 'חנייה נגישה',
    items: [
      mk('מקום חנייה נגיש', 'רוחב מינ. 3.40מ'),
      mk('תלאי / שילוט לחנייה נגישה'),
      mk('מרחק מחנייה לכניסה', 'מינ. אפשרי'),
    ],
  },
  {
    id: 'signage', title: 'שילוט ומידע',
    items: [
      mk('שילוט נגישות בכניסה'),
      mk('לוחות מידע — גובה', '1.40-1.60מ'),
      mk('שילוט — ניגוד צבעים מספק'),
      mk('תאורת חירום'),
    ],
  },
]

export default function AccessibilityCheck() {
  const [buildingType, setBuildingType] = useState('public')
  const [sections, setSections] = useState<ASection[]>(INITIAL)

  const cycleResult = (sId: string, iId: string, cur: ItemResult) => {
    const next = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length]
    setSections(ss => ss.map(s => s.id === sId
      ? { ...s, items: s.items.map(it => it.id === iId ? { ...it, result: next } : it) }
      : s))
  }
  const setNotes = (sId: string, iId: string, notes: string) =>
    setSections(ss => ss.map(s => s.id === sId
      ? { ...s, items: s.items.map(it => it.id === iId ? { ...it, notes } : it) }
      : s))

  const allItems = sections.flatMap(s => s.items).filter(i => i.result !== 'na')
  const compliant = allItems.filter(i => i.result === 'compliant').length
  const nonCompliant = allItems.filter(i => i.result === 'non_compliant').length
  const checked = compliant + nonCompliant
  const score = checked > 0 ? (compliant / checked) * 100 : 0

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">סוג מבנה</label>
          <select value={buildingType} onChange={e => setBuildingType(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="public">מבנה ציבורי</option>
            <option value="residential">מגורים (מעל 4 יח"ד)</option>
            <option value="commercial">מסחרי</option>
          </select>
        </div>
        <div className="text-xs text-slate-500">תקן ישראלי 1918 — נגישות לבנייה ולסביבה</div>
      </div>

      {/* Score */}
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
