import { useState } from 'react'

type SpecStatus = 'included' | 'partial' | 'missing' | 'na'

interface SpecItem {
  id: string
  label: string
  standard?: string
  status: SpecStatus
  notes: string
}

interface SpecSection {
  id: string
  title: string
  emoji: string
  items: SpecItem[]
}

const STATUS_META: Record<SpecStatus, { label: string; color: string }> = {
  included: { label: 'כלול',   color: 'bg-green-100 text-green-700 border-green-200' },
  partial:  { label: 'חלקי',   color: 'bg-amber-100 text-amber-700 border-amber-200' },
  missing:  { label: 'חסר',    color: 'bg-red-100 text-red-700 border-red-200' },
  na:       { label: 'לא רלוונטי', color: 'bg-slate-100 text-slate-500 border-slate-200' },
}

const ORDER: SpecStatus[] = ['na', 'included', 'partial', 'missing']

function mk(label: string, standard?: string): SpecItem {
  return { id: crypto.randomUUID(), label, standard, status: 'na', notes: '' }
}

const INITIAL: SpecSection[] = [
  {
    id: 'structural', title: 'קונסטרוקציה', emoji: '🏗',
    items: [
      mk('מפרט בטון — תערובת, עמידות, כיסוי', 'IS 118'),
      mk('מפרט ברזל — סוג, ציפוי', 'IS 10'),
      mk('מפרט ריצוף טרומי (אם ישים)'),
      mk('מפרט עבודות עפר — נשיאות קרקע'),
      mk('מפרט יציקות מיוחדות'),
    ],
  },
  {
    id: 'masonry', title: 'בנאות ועבודות קרמיקה', emoji: '🧱',
    items: [
      mk('מפרט בלוקים — סוג, מידה, עמידות'),
      mk('מפרט טיח — סוג, שכבות, עובי'),
      mk('מפרט אריחים — ריצוף'),
      mk('מפרט אריחים — חיפוי קירות'),
      mk('מפרט איטום — תת-רצפה, גג, שירותים'),
    ],
  },
  {
    id: 'aluminum', title: 'אלומיניום וזכוכית', emoji: '🪟',
    items: [
      mk('מפרט פרופיל אלומיניום — סדרה, ציפוי'),
      mk('מפרט זכוכית — עובי, סוג (כפולה / בטיחות)', 'IS 966'),
      mk('מפרט דלתות כניסה'),
      mk('מפרט גגון / קונסטרוקציית זכוכית'),
      mk('ערכי U לחלונות'),
    ],
  },
  {
    id: 'plumbing', title: 'אינסטלציה סניטרית', emoji: '🚿',
    items: [
      mk('מפרט צנרת קרה/חמה', 'IS 1099'),
      mk('מפרט ביוב ונקז'),
      mk('מפרט מחממי מים — ממוסחר / סולארי'),
      mk('מפרט מסנן מים'),
      mk('מפרט גינון ואגירת גשם'),
    ],
  },
  {
    id: 'electrical', title: 'חשמל וחזקים/חלשים', emoji: '⚡',
    items: [
      mk('מפרט לוח חשמל — TA'),
      mk('מפרט כבלים — סוג, חתך'),
      mk('מפרט תאורה — טיפוסים'),
      mk('מפרט מצלמות / אינטרקום / אזעקה'),
      mk('מפרט תחנות טעינה לרכב חשמלי'),
    ],
  },
  {
    id: 'hvac', title: 'מיזוג אוויר ואוורור', emoji: '❄️',
    items: [
      mk('מפרט יחידות מיזוג — COP / SEER'),
      mk('מפרט ונטילציה מרכזית / עצמאית'),
      mk('מפרט מאווררים ומניפות'),
      mk('מפרט חדר מכונות'),
      mk('חישוב עומסי חום (אם נדרש)'),
    ],
  },
  {
    id: 'finishes', title: 'גמרים ועבודות נגרות', emoji: '🪵',
    items: [
      mk('מפרט ריהוט מובנה — ארונות מטבח'),
      mk('מפרט דלתות פנים — חומר, גימור'),
      mk('מפרט מסגרות / אדנות'),
      mk('מפרט צבעים — סוג, מספר שכבות'),
      mk('מפרט פרגולה / קונסטרוקציית מתכת'),
    ],
  },
  {
    id: 'fire', title: 'כיבוי אש ובטיחות', emoji: '🔥',
    items: [
      mk('מפרט גלאי עשן / חום'),
      mk('מפרט ממטרים (Sprinkler)'),
      mk('מפרט לחיצות ידניות'),
      mk('מפרט שילוט ותאורת חירום'),
      mk('עמידות אש דלתות ומחיצות'),
    ],
  },
]

export default function SpecChecklist() {
  const [sections, setSections] = useState<SpecSection[]>(INITIAL)

  const cycleStatus = (sId: string, iId: string, cur: SpecStatus) => {
    const next = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length]
    setSections(ss => ss.map(s => s.id === sId
      ? { ...s, items: s.items.map(it => it.id === iId ? { ...it, status: next } : it) }
      : s))
  }
  const setNotes = (sId: string, iId: string, notes: string) =>
    setSections(ss => ss.map(s => s.id === sId
      ? { ...s, items: s.items.map(it => it.id === iId ? { ...it, notes } : it) }
      : s))

  const allItems = sections.flatMap(s => s.items)
  const relevant = allItems.filter(i => i.status !== 'na')
  const included = relevant.filter(i => i.status === 'included').length
  const partial = relevant.filter(i => i.status === 'partial').length
  const missing = relevant.filter(i => i.status === 'missing').length
  const total = relevant.length
  const completePct = total > 0 ? ((included + partial * 0.5) / total) * 100 : 0

  return (
    <div className="space-y-5" dir="rtl">
      {/* Progress */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-700">שלמות מסמכי מפרט</span>
          <span className="font-bold text-blue-700">{Math.round(completePct)}%</span>
        </div>
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${completePct}%` }} />
        </div>
        <div className="flex gap-4 mt-2 text-xs">
          <span className="text-green-600">{included} כלול</span>
          <span className="text-amber-600">{partial} חלקי</span>
          <span className="text-red-600">{missing} חסר</span>
        </div>
      </div>

      {sections.map(section => {
        const sItems = section.items.filter(i => i.status !== 'na')
        const sIncluded = sItems.filter(i => i.status === 'included').length
        return (
          <div key={section.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 text-sm">{section.emoji} {section.title}</h3>
              <span className="text-xs text-slate-500">{sIncluded}/{section.items.length}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {section.items.map(item => (
                <div key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                  <button
                    onClick={() => cycleStatus(section.id, item.id, item.status)}
                    className={`mt-0.5 shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer transition-colors ${STATUS_META[item.status].color}`}
                  >
                    {STATUS_META[item.status].label}
                  </button>
                  <div className="flex-1">
                    <div className={`text-sm ${item.status === 'missing' ? 'text-red-700 font-medium' : item.status === 'na' ? 'text-slate-400' : 'text-slate-700'}`}>
                      {item.label}
                      {item.standard && <span className="text-xs text-slate-400 mr-1">({item.standard})</span>}
                    </div>
                    {item.status === 'partial' && (
                      <input value={item.notes} onChange={e => setNotes(section.id, item.id, e.target.value)}
                        placeholder="מה חסר?"
                        className="mt-1 w-full border border-amber-200 rounded px-2 py-1 text-xs bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                    )}
                    {item.status === 'missing' && (
                      <input value={item.notes} onChange={e => setNotes(section.id, item.id, e.target.value)}
                        placeholder="מה נדרש להשלים?"
                        className="mt-1 w-full border border-red-200 rounded px-2 py-1 text-xs bg-red-50 focus:outline-none focus:ring-1 focus:ring-red-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
