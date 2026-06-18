import { useState } from 'react'
import { useToolState } from '@/hooks/useToolState'

interface DocItem {
  id: string
  label: string
  mandatory: boolean
  checked: boolean
  submitted: boolean
  notes: string
}

interface DocSection {
  id: string
  title: string
  items: DocItem[]
}

interface State {
  sections: DocSection[]
}

function makeItem(label: string, mandatory = true): DocItem {
  return { id: crypto.randomUUID(), label, mandatory, checked: false, submitted: false, notes: '' }
}

const INITIAL_SECTIONS: DocSection[] = [
  {
    id: 'forms', title: 'טפסים ובקשות',
    items: [
      makeItem('טופס בקשה להיתר (טופס 1)'),
      makeItem('הצהרת בעלות / ייפוי כוח'),
      makeItem('מסמך זהות מגיש הבקשה'),
      makeItem('אישור מזמין הבנייה'),
    ],
  },
  {
    id: 'ownership', title: 'מסמכי בעלות / זכויות',
    items: [
      makeItem('נסח טאבו / הסכם שכירות'),
      makeItem('מסמכי חברה (לתאגיד)'),
    ],
  },
  {
    id: 'drawings', title: 'תוכניות',
    items: [
      makeItem('תוכנית מצב קיים'),
      makeItem('תוכניות מצב מוצע — קומות'),
      makeItem('חזיתות'),
      makeItem('חתכים (לפחות 2)'),
      makeItem('תוכנית מגרש ומדידה'),
      makeItem('תוכנית גינון ועצים'),
      makeItem('תוכנית חניה ונגישות'),
    ],
  },
  {
    id: 'consultants', title: 'חוות דעת יועצים',
    items: [
      makeItem('חוות דעת קונסטרוקטור'),
      makeItem('חוות דעת יועץ ביוב / אינסטלציה'),
      makeItem('חוות דעת יועץ חשמל'),
      makeItem('חוות דעת יועץ נגישות'),
      makeItem('חוות דעת יועץ בטיחות אש'),
      makeItem('חוות דעת יועץ מיזוג', false),
    ],
  },
  {
    id: 'approvals', title: 'אישורים ממוסדות',
    items: [
      makeItem('אישור רשות כבאות'),
      makeItem('אישור משרד הבריאות', false),
      makeItem('אישור משרד החינוך', false),
      makeItem('אישור מתכנן מחוזי', false),
      makeItem('אישור ועדת שימור'),
    ],
  },
  {
    id: 'technical', title: 'מסמכים טכניים',
    items: [
      makeItem('חישובי שטח ונפח'),
      makeItem('מפרט טכני'),
      makeItem('חישוב עמידות רעידות אדמה', false),
      makeItem('בדיקת קרקע', false),
    ],
  },
  {
    id: 'fees', title: 'אגרות ותשלומים',
    items: [
      makeItem('אגרת בקשה'),
      makeItem('אגרת היתר (לאחר אישור)'),
      makeItem('ערבות ביצוע', false),
    ],
  },
]

const DEFAULT: State = { sections: INITIAL_SECTIONS }

export default function PermitChecklist({ projectId }: { projectId: string | null }) {
  const { state, setState, loading, saving } = useToolState('permit-checklist', projectId, DEFAULT)
  const { sections } = state
  const [showOnlyPending, setShowOnlyPending] = useState(false)

  const toggle = (sId: string, iId: string, field: 'checked' | 'submitted') =>
    setState(s => ({ ...s, sections: s.sections.map(sec => sec.id === sId
      ? { ...sec, items: sec.items.map(it => it.id === iId ? { ...it, [field]: !it[field] } : it) }
      : sec) }))

  const setNotes = (sId: string, iId: string, notes: string) =>
    setState(s => ({ ...s, sections: s.sections.map(sec => sec.id === sId
      ? { ...sec, items: sec.items.map(it => it.id === iId ? { ...it, notes } : it) }
      : sec) }))

  const allItems = sections.flatMap(s => s.items)
  const mandatoryItems = allItems.filter(i => i.mandatory)
  const checkedMandatory = mandatoryItems.filter(i => i.checked).length
  const progress = mandatoryItems.length > 0 ? (checkedMandatory / mandatoryItems.length) * 100 : 0

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-5" dir="rtl">
      {saving && <div className="text-xs text-slate-400 text-left">שומר...</div>}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-700">שלמות מסמכים חובה</span>
          <span className="font-bold text-blue-700">{checkedMandatory}/{mandatoryItems.length}</span>
        </div>
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-xs text-slate-500 mt-1">{Math.round(progress)}% הושלם</div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={showOnlyPending} onChange={e => setShowOnlyPending(e.target.checked)}
          className="w-4 h-4 rounded text-blue-600" />
        <span className="text-sm text-slate-600">הצג רק מסמכים שטרם הוכנו</span>
      </label>

      {sections.map(section => {
        const visible = section.items.filter(it => !showOnlyPending || !it.checked)
        if (visible.length === 0) return null
        return (
          <div key={section.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 text-sm">{section.title}</h3>
              <span className="text-xs text-slate-500">
                {section.items.filter(i => i.checked).length}/{section.items.length}
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {visible.map(item => (
                <div key={item.id} className={`px-4 py-2.5 ${item.checked ? 'bg-green-50/40' : ''}`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={item.checked} onChange={() => toggle(section.id, item.id, 'checked')}
                      className="mt-0.5 w-4 h-4 rounded text-blue-600 cursor-pointer shrink-0" />
                    <div className="flex-1">
                      <div className={`text-sm flex items-center gap-2 ${item.checked ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                        {item.label}
                        {!item.mandatory && <span className="text-xs text-slate-400 font-normal no-underline">(לא חובה)</span>}
                      </div>
                      {item.checked && (
                        <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
                          <input type="checkbox" checked={item.submitted} onChange={() => toggle(section.id, item.id, 'submitted')}
                            className="w-3.5 h-3.5 rounded text-green-600 cursor-pointer" />
                          <span className="text-xs text-slate-500">הוגש לועדה</span>
                        </label>
                      )}
                    </div>
                    {item.checked && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full shrink-0">
                        {item.submitted ? 'הוגש' : 'מוכן'}
                      </span>
                    )}
                  </div>
                  {item.checked && (
                    <input value={item.notes} onChange={e => setNotes(section.id, item.id, e.target.value)}
                      placeholder="מספר מסמך / הערה..."
                      className="mt-1.5 w-full border border-slate-200 rounded px-2 py-1 text-xs text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
