import { useToolState } from '@/hooks/useToolState'

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

interface State {
  sections: SpecSection[]
}

const STATUS_META: Record<SpecStatus, { label: string; color: string }> = {
  included: { label: 'כלול',       color: 'bg-green-100 text-green-700 border-green-200' },
  partial:  { label: 'חלקי',       color: 'bg-amber-100 text-amber-700 border-amber-200' },
  missing:  { label: 'חסר',        color: 'bg-red-100 text-red-700 border-red-200' },
  na:       { label: 'לא רלוונטי', color: 'bg-slate-100 text-slate-500 border-slate-200' },
}

const ORDER: SpecStatus[] = ['na', 'included', 'partial', 'missing']

function mk(id: string, label: string, standard?: string): SpecItem {
  return { id, label, standard, status: 'na', notes: '' }
}

const INITIAL: SpecSection[] = [
  {
    id: 'structural', title: 'קונסטרוקציה', emoji: '🏗',
    items: [
      mk('st1', 'מפרט בטון — תערובת, עמידות, כיסוי', 'IS 118'),
      mk('st2', 'מפרט ברזל — סוג, ציפוי', 'IS 10'),
      mk('st3', 'מפרט ריצוף טרומי (אם ישים)'),
      mk('st4', 'מפרט עבודות עפר — נשיאות קרקע'),
      mk('st5', 'מפרט יציקות מיוחדות'),
    ],
  },
  {
    id: 'masonry', title: 'בנאות ועבודות קרמיקה', emoji: '🧱',
    items: [
      mk('ma1', 'מפרט בלוקים — סוג, מידה, עמידות'),
      mk('ma2', 'מפרט טיח — סוג, שכבות, עובי'),
      mk('ma3', 'מפרט אריחים — ריצוף'),
      mk('ma4', 'מפרט אריחים — חיפוי קירות'),
      mk('ma5', 'מפרט איטום — תת-רצפה, גג, שירותים'),
    ],
  },
  {
    id: 'aluminum', title: 'אלומיניום וזכוכית', emoji: '🪟',
    items: [
      mk('al1', 'מפרט פרופיל אלומיניום — סדרה, ציפוי'),
      mk('al2', 'מפרט זכוכית — עובי, סוג (כפולה / בטיחות)', 'IS 966'),
      mk('al3', 'מפרט דלתות כניסה'),
      mk('al4', 'מפרט גגון / קונסטרוקציית זכוכית'),
      mk('al5', 'ערכי U לחלונות'),
    ],
  },
  {
    id: 'plumbing', title: 'אינסטלציה סניטרית', emoji: '🚿',
    items: [
      mk('pl1', 'מפרט צנרת קרה/חמה', 'IS 1099'),
      mk('pl2', 'מפרט ביוב ונקז'),
      mk('pl3', 'מפרט מחממי מים — ממוסחר / סולארי'),
      mk('pl4', 'מפרט מסנן מים'),
      mk('pl5', 'מפרט גינון ואגירת גשם'),
    ],
  },
  {
    id: 'electrical', title: 'חשמל וחזקים/חלשים', emoji: '⚡',
    items: [
      mk('el1', 'מפרט לוח חשמל — TA'),
      mk('el2', 'מפרט כבלים — סוג, חתך'),
      mk('el3', 'מפרט תאורה — טיפוסים'),
      mk('el4', 'מפרט מצלמות / אינטרקום / אזעקה'),
      mk('el5', 'מפרט תחנות טעינה לרכב חשמלי'),
    ],
  },
  {
    id: 'hvac', title: 'מיזוג אוויר ואוורור', emoji: '❄️',
    items: [
      mk('hv1', 'מפרט יחידות מיזוג — COP / SEER'),
      mk('hv2', 'מפרט ונטילציה מרכזית / עצמאית'),
      mk('hv3', 'מפרט מאווררים ומניפות'),
      mk('hv4', 'מפרט חדר מכונות'),
      mk('hv5', 'חישוב עומסי חום (אם נדרש)'),
    ],
  },
  {
    id: 'finishes', title: 'גמרים ועבודות נגרות', emoji: '🪵',
    items: [
      mk('fi1', 'מפרט ריהוט מובנה — ארונות מטבח'),
      mk('fi2', 'מפרט דלתות פנים — חומר, גימור'),
      mk('fi3', 'מפרט מסגרות / אדנות'),
      mk('fi4', 'מפרט צבעים — סוג, מספר שכבות'),
      mk('fi5', 'מפרט פרגולה / קונסטרוקציית מתכת'),
    ],
  },
  {
    id: 'fire', title: 'כיבוי אש ובטיחות', emoji: '🔥',
    items: [
      mk('fr1', 'מפרט גלאי עשן / חום'),
      mk('fr2', 'מפרט ממטרים (Sprinkler)'),
      mk('fr3', 'מפרט לחיצות ידניות'),
      mk('fr4', 'מפרט שילוט ותאורת חירום'),
      mk('fr5', 'עמידות אש דלתות ומחיצות'),
    ],
  },
]

const DEFAULT: State = { sections: INITIAL }

export default function SpecChecklist({ projectId }: { projectId: string | null }) {
  const { state, setState, loading, saving } = useToolState('spec-checklist', projectId, DEFAULT)
  const { sections } = state

  const cycleStatus = (sId: string, iId: string, cur: SpecStatus) => {
    const next = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length]
    setState(s => ({ ...s, sections: s.sections.map(sec => sec.id === sId
      ? { ...sec, items: sec.items.map(it => it.id === iId ? { ...it, status: next } : it) }
      : sec) }))
  }

  const setNotes = (sId: string, iId: string, notes: string) =>
    setState(s => ({ ...s, sections: s.sections.map(sec => sec.id === sId
      ? { ...sec, items: sec.items.map(it => it.id === iId ? { ...it, notes } : it) }
      : sec) }))

  const allItems = sections.flatMap(s => s.items)
  const relevant = allItems.filter(i => i.status !== 'na')
  const included = relevant.filter(i => i.status === 'included').length
  const partial = relevant.filter(i => i.status === 'partial').length
  const missing = relevant.filter(i => i.status === 'missing').length
  const total = relevant.length
  const completePct = total > 0 ? ((included + partial * 0.5) / total) * 100 : 0

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-5" dir="rtl">
      {saving && <div className="text-xs text-slate-400 text-left">שומר...</div>}
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
