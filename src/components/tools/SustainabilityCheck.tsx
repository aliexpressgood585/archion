import { useState } from 'react'

type ItemStatus = 'yes' | 'no' | 'partial' | 'na'

interface SItem {
  id: string
  label: string
  points: number
  status: ItemStatus
  notes: string
}

interface SSection {
  id: string
  title: string
  emoji: string
  items: SItem[]
}

const STATUS_META: Record<ItemStatus, { label: string; color: string; pts: number }> = {
  yes:     { label: 'כן',          color: 'bg-green-100 text-green-700',  pts: 1.0 },
  partial: { label: 'חלקי',        color: 'bg-amber-100 text-amber-700',  pts: 0.5 },
  no:      { label: 'לא',          color: 'bg-red-100 text-red-700',      pts: 0   },
  na:      { label: 'לא רלוונטי', color: 'bg-slate-100 text-slate-500',  pts: 0   },
}

const ORDER: ItemStatus[] = ['na', 'yes', 'partial', 'no']

function mk(label: string, points = 1): SItem {
  return { id: crypto.randomUUID(), label, points, status: 'na', notes: '' }
}

const INITIAL: SSection[] = [
  {
    id: 'energy', title: 'אנרגיה', emoji: '⚡',
    items: [
      mk('בידוד תרמי לפי תקן 1045 (ערכי U)', 2),
      mk('שמשות בבידוד כפול (DGU) לכל פתחי הגג/זכוכית', 2),
      mk('מערכת סולארית לחימום מים', 1),
      mk('פאנלים פוטו-וולטאיים', 2),
      mk('תאורה LED בכל המבנה', 1),
      mk('חיישני נוכחות / ניהול אנרגיה', 1),
      mk('הצללה חיצונית פעילה / אלמנטים אדריכליים', 1),
    ],
  },
  {
    id: 'water', title: 'מים', emoji: '💧',
    items: [
      mk('איסוף מי גשמים לשימוש חוזר', 2),
      mk('מיחזור מי אפור', 2),
      mk('ברזים ואסלות חסכוניות', 1),
      mk('השקיה עם חיישני לחות / טפטוף', 1),
      mk('גינה בצמחייה מקומית / ממעטת בהשקיה', 1),
    ],
  },
  {
    id: 'materials', title: 'חומרים', emoji: '🧱',
    items: [
      mk('שימוש בחומרים ממוחזרים', 1),
      mk('ייצור מקומי — מרחק מקס. 500 ק"מ', 1),
      mk('עץ מוסמך FSC', 1),
      mk('צבעים / דבקים דלי VOC', 1),
      mk('ניהול פסולת בנייה ומיחזורה', 1),
    ],
  },
  {
    id: 'site', title: 'אתר ושטחים ירוקים', emoji: '🌿',
    items: [
      mk('גג ירוק / גינת גג', 2),
      mk('שטחי חדירת מים לקרקע', 1),
      mk('חניות לאופניים / תחנות טעינה לרכב חשמלי', 1),
      mk('קרבה לתחבורה ציבורית', 1),
      mk('שמירה על עצים קיימים', 1),
    ],
  },
  {
    id: 'indoor', title: 'איכות פנים', emoji: '🏠',
    items: [
      mk('אוורור טבעי / מכני בכל החדרים', 1),
      mk('תאורה טבעית לפחות 75% מהחדרים', 1),
      mk('ניטור CO₂ / איכות אוויר', 1),
      mk('חומרים ומוצרים דלי אלרגנים', 1),
      mk('אקוסטיקה — מחיצות ובידוד קולי', 1),
    ],
  },
]

const RATING = [
  { min: 80, label: 'ירוק מצוין', color: 'text-green-700', desc: 'LEED Gold / BREEAM Very Good' },
  { min: 60, label: 'ירוק טוב',   color: 'text-green-600', desc: 'LEED Silver / BREEAM Good' },
  { min: 40, label: 'ירוק בסיסי', color: 'text-amber-600', desc: 'עמידה בתקן ישראלי מינימלי' },
  { min: 0,  label: 'דורש שיפור', color: 'text-red-600',   desc: 'יש לשפר פריטים מרכזיים' },
]

export default function SustainabilityCheck() {
  const [sections, setSections] = useState<SSection[]>(INITIAL)

  const cycleStatus = (sId: string, iId: string, cur: ItemStatus) => {
    const next = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length]
    setSections(ss => ss.map(s => s.id === sId
      ? { ...s, items: s.items.map(it => it.id === iId ? { ...it, status: next } : it) }
      : s))
  }

  const allItems = sections.flatMap(s => s.items).filter(i => i.status !== 'na')
  const maxPoints = allItems.reduce((s, i) => s + i.points, 0)
  const earned = allItems.reduce((s, i) => s + i.points * STATUS_META[i.status].pts, 0)
  const score = maxPoints > 0 ? (earned / maxPoints) * 100 : 0
  const rating = RATING.find(r => score >= r.min)!

  return (
    <div className="space-y-5" dir="rtl">
      {/* Score */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-700">ציון קיימות</span>
          <div className="text-left">
            <span className={`font-bold text-xl ${rating.color}`}>{Math.round(score)}%</span>
            <span className={`text-sm font-semibold mr-2 ${rating.color}`}> — {rating.label}</span>
          </div>
        </div>
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-lime-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${score}%` }} />
        </div>
        <div className="text-xs text-slate-500 mt-1">{rating.desc} · {Math.round(earned)}/{maxPoints} נקודות</div>
      </div>

      {sections.map(section => {
        const sItems = section.items.filter(i => i.status !== 'na')
        const sEarned = sItems.reduce((sum, i) => sum + i.points * STATUS_META[i.status].pts, 0)
        const sMax = sItems.reduce((sum, i) => sum + i.points, 0)
        return (
          <div key={section.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 text-sm">{section.emoji} {section.title}</h3>
              <span className="text-xs text-slate-500">{Math.round(sEarned)}/{sMax} נקודות</span>
            </div>
            <div className="divide-y divide-slate-100">
              {section.items.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                  <button
                    onClick={() => cycleStatus(section.id, item.id, item.status)}
                    className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${STATUS_META[item.status].color}`}
                  >
                    {STATUS_META[item.status].label}
                  </button>
                  <div className="flex-1 text-sm text-slate-700">{item.label}</div>
                  {item.points > 1 && (
                    <span className="text-xs text-slate-400 shrink-0">{item.points} נק'</span>
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
