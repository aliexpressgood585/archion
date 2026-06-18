import { useState } from 'react'

type ItemResult = 'pass' | 'fail' | 'na' | 'pending'

interface CheckItem {
  id: string
  label: string
  result: ItemResult
  notes: string
}

interface Section {
  id: string
  title: string
  items: CheckItem[]
}

const RESULT_META: Record<ItemResult, { label: string; color: string }> = {
  pass:    { label: 'תקין',    color: 'bg-green-100 text-green-700 border-green-200' },
  fail:    { label: 'ליקוי',   color: 'bg-red-100 text-red-700 border-red-200' },
  na:      { label: 'לא רלוונטי', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  pending: { label: 'לא נבדק', color: 'bg-amber-50 text-amber-600 border-amber-200' },
}

const INITIAL_SECTIONS: Section[] = [
  {
    id: 's1', title: 'עבודות עפר ויסודות',
    items: [
      { id: 'i1', label: 'גובה ביסוס תואם תוכניות', result: 'pending', notes: '' },
      { id: 'i2', label: 'עומק כיסוי לפי ספציפיקציה', result: 'pending', notes: '' },
      { id: 'i3', label: 'ניקוז תקין', result: 'pending', notes: '' },
    ],
  },
  {
    id: 's2', title: 'שלד ובטון',
    items: [
      { id: 'i4', label: 'עמודים ותקרות בהתאם לתוכניות', result: 'pending', notes: '' },
      { id: 'i5', label: 'כיסוי ברזל תקין', result: 'pending', notes: '' },
      { id: 'i6', label: 'תעודות ניסוי בטון', result: 'pending', notes: '' },
      { id: 'i7', label: 'פתחים ומעברים לפי תוכניות', result: 'pending', notes: '' },
    ],
  },
  {
    id: 's3', title: 'עבודות בנאות',
    items: [
      { id: 'i8',  label: 'עובי קירות תואם תוכניות', result: 'pending', notes: '' },
      { id: 'i9',  label: 'אנכיות ישרות', result: 'pending', notes: '' },
      { id: 'i10', label: 'פתחי חלונות ודלתות בגודל הנדרש', result: 'pending', notes: '' },
    ],
  },
  {
    id: 's4', title: 'איטום',
    items: [
      { id: 'i11', label: 'שכבות איטום לפי מפרט', result: 'pending', notes: '' },
      { id: 'i12', label: 'בדיקת נזילות', result: 'pending', notes: '' },
    ],
  },
  {
    id: 's5', title: 'אינסטלציה',
    items: [
      { id: 'i13', label: 'מיקום שקעים ונקודות לפי תוכנית', result: 'pending', notes: '' },
      { id: 'i14', label: 'בדיקת לחץ צנרת', result: 'pending', notes: '' },
      { id: 'i15', label: 'ניקוז ושיפועים', result: 'pending', notes: '' },
    ],
  },
  {
    id: 's6', title: 'חשמל',
    items: [
      { id: 'i16', label: 'מיקום קופסאות ולוחות', result: 'pending', notes: '' },
      { id: 'i17', label: 'כבלים לפי מפרט', result: 'pending', notes: '' },
    ],
  },
  {
    id: 's7', title: 'גמרים',
    items: [
      { id: 'i18', label: 'גמרי ריצוף תואמים מפרט', result: 'pending', notes: '' },
      { id: 'i19', label: 'גמרי קירות תואמים מפרט', result: 'pending', notes: '' },
      { id: 'i20', label: 'תקרות תואמות מפרט', result: 'pending', notes: '' },
    ],
  },
]

export default function InspectionChecklist() {
  const [projectName, setProjectName] = useState('')
  const [inspDate, setInspDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [inspector, setInspector] = useState('')
  const [sections, setSections] = useState<Section[]>(INITIAL_SECTIONS)

  const setResult = (sectionId: string, itemId: string, result: ItemResult) =>
    setSections(ss => ss.map(s => s.id === sectionId
      ? { ...s, items: s.items.map(it => it.id === itemId ? { ...it, result } : it) }
      : s))

  const setNotes = (sectionId: string, itemId: string, notes: string) =>
    setSections(ss => ss.map(s => s.id === sectionId
      ? { ...s, items: s.items.map(it => it.id === itemId ? { ...it, notes } : it) }
      : s))

  const allItems = sections.flatMap(s => s.items)
  const passed = allItems.filter(i => i.result === 'pass').length
  const failed = allItems.filter(i => i.result === 'fail').length
  const total = allItems.filter(i => i.result !== 'na').length

  const ORDER: ItemResult[] = ['pending', 'pass', 'fail', 'na']
  const cycleResult = (sId: string, iId: string, cur: ItemResult) => {
    const next = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length]
    setResult(sId, iId, next)
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">פרויקט</label>
          <input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="שם הפרויקט"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">תאריך ביקור</label>
          <input type="date" value={inspDate} onChange={e => setInspDate(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">מפקח</label>
          <input value={inspector} onChange={e => setInspector(e.target.value)} placeholder="שם המפקח"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'תקין', count: passed, color: 'bg-green-50 text-green-700 border-green-100' },
          { label: 'ליקויים', count: failed, color: 'bg-red-50 text-red-700 border-red-100' },
          { label: 'נבדקו', count: `${passed + failed}/${total}`, color: 'bg-blue-50 text-blue-700 border-blue-100' },
        ].map(({ label, count, color }) => (
          <div key={label} className={`rounded-xl p-3 text-center border ${color}`}>
            <div className="text-2xl font-bold">{count}</div>
            <div className="text-xs mt-0.5 font-medium">{label}</div>
          </div>
        ))}
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
                  title="לחץ לשינוי תוצאה"
                >
                  {RESULT_META[item.result].label}
                </button>
                <div className="flex-1">
                  <div className="text-sm text-slate-700">{item.label}</div>
                  {item.result === 'fail' && (
                    <input
                      value={item.notes}
                      onChange={e => setNotes(section.id, item.id, e.target.value)}
                      placeholder="פרט את הליקוי..."
                      className="mt-1 w-full border border-red-200 rounded px-2 py-1 text-xs text-slate-600 bg-red-50 focus:outline-none focus:ring-1 focus:ring-red-400"
                    />
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
