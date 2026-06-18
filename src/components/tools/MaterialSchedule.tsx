import { useToolState } from '@/hooks/useToolState'
import { Plus, Trash2 } from 'lucide-react'

interface Room {
  id: string
  name: string
  floor: string
  floorFinish: string
  floorBase: string
  wallFinish: string
  ceilingFinish: string
  windowType: string
  notes: string
}

interface State {
  rooms: Room[]
}

function newRoom(): Room {
  return { id: crypto.randomUUID(), name: '', floor: 'קרקע', floorFinish: '', floorBase: '', wallFinish: '', ceilingFinish: '', windowType: '', notes: '' }
}

const COLUMNS = [
  { key: 'name',          label: 'שם חדר',       width: 'w-32' },
  { key: 'floor',         label: 'קומה',          width: 'w-20' },
  { key: 'floorFinish',   label: 'ריצוף',         width: 'w-36' },
  { key: 'floorBase',     label: 'פנלה / אבזר',   width: 'w-32' },
  { key: 'wallFinish',    label: 'טיפול קירות',   width: 'w-36' },
  { key: 'ceilingFinish', label: 'תקרה',          width: 'w-32' },
  { key: 'windowType',    label: 'חלון / דלת',    width: 'w-32' },
  { key: 'notes',         label: 'הערות',         width: 'w-40' },
] as const

const PRESETS = {
  floorFinish:   ['שיש קרמי', 'פורצלן 60×60', 'פרקט עץ', 'שיש טבעי', 'אפוקסי', 'קרמיקה', 'מוזאיקה', ''],
  wallFinish:    ['טיח + צבע', 'אריחי קרמיקה', 'שיש', 'חיפוי עץ', 'טפט', 'חיפוי GRC', 'צבע ישיר', ''],
  ceilingFinish: ['גבס קרטון', 'טיח ישיר', 'תקרה מתלה', 'חשיפת יסודות', 'גבס קשתות', 'חיפוי עץ', ''],
}

const DEFAULT: State = {
  rooms: [
    { ...newRoom(), name: 'כניסה', floorFinish: 'שיש טבעי', wallFinish: 'טיח + צבע', ceilingFinish: 'גבס קרטון' },
    { ...newRoom(), name: 'סלון',  floorFinish: 'פרקט עץ',  wallFinish: 'טיח + צבע', ceilingFinish: 'טיח ישיר' },
    { ...newRoom(), name: 'מטבח', floorFinish: 'פורצלן 60×60', wallFinish: 'אריחי קרמיקה', ceilingFinish: 'גבס קרטון' },
  ],
}

export default function MaterialSchedule({ projectId }: { projectId: string | null }) {
  const { state, setState, loading, saving } = useToolState('material-schedule', projectId, DEFAULT)
  const { rooms } = state

  const add = () => setState(s => ({ ...s, rooms: [...s.rooms, newRoom()] }))
  const remove = (id: string) => setState(s => ({ ...s, rooms: s.rooms.filter(x => x.id !== id) }))
  const update = (id: string, field: keyof Room, value: string) =>
    setState(s => ({ ...s, rooms: s.rooms.map(x => x.id === id ? { ...x, [field]: value } : x) }))

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-5" dir="rtl">
      {saving && <div className="text-xs text-slate-400 text-left">שומר...</div>}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="text-sm border-collapse" style={{ minWidth: 900 }}>
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {COLUMNS.map(col => (
                <th key={col.key} className={`px-3 py-2 text-right font-medium border-b border-slate-200 ${col.width}`}>
                  {col.label}
                </th>
              ))}
              <th className="px-2 py-2 border-b border-slate-200 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room, i) => (
              <tr key={room.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} border-b border-slate-100`}>
                <td className="px-3 py-1.5">
                  <input value={room.name} onChange={e => update(room.id, 'name', e.target.value)} placeholder="שם חדר"
                    className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </td>
                <td className="px-3 py-1.5">
                  <input value={room.floor} onChange={e => update(room.id, 'floor', e.target.value)}
                    className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </td>
                {(['floorFinish', 'floorBase', 'wallFinish', 'ceilingFinish'] as const).map(field => (
                  <td key={field} className="px-3 py-1.5">
                    <input list={`list-${field}`} value={room[field]} onChange={e => update(room.id, field, e.target.value)}
                      placeholder="בחר או הקלד..."
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    {(PRESETS as Record<string, string[]>)[field] && (
                      <datalist id={`list-${field}`}>
                        {(PRESETS as Record<string, string[]>)[field].map(p => <option key={p} value={p} />)}
                      </datalist>
                    )}
                  </td>
                ))}
                <td className="px-3 py-1.5">
                  <input value={room.windowType} onChange={e => update(room.id, 'windowType', e.target.value)} placeholder="סוג חלון..."
                    className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </td>
                <td className="px-3 py-1.5">
                  <input value={room.notes} onChange={e => update(room.id, 'notes', e.target.value)} placeholder="הערה..."
                    className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </td>
                <td className="px-2 py-1.5">
                  <button onClick={() => remove(room.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={add}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> הוסף חדר
        </button>
        <button
          onClick={() => {
            const rows = rooms.map(r =>
              [r.name, r.floor, r.floorFinish, r.floorBase, r.wallFinish, r.ceilingFinish, r.windowType, r.notes].join('\t')
            )
            const header = COLUMNS.map(c => c.label).join('\t')
            navigator.clipboard.writeText([header, ...rows].join('\n'))
          }}
          className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
          העתק לאקסל
        </button>
      </div>

      <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-600 border border-blue-100">
        <strong>טיפ:</strong> לחץ "העתק לאקסל" כדי להדביק את הלוח ישירות ב-Excel או Google Sheets.
        בשדות הגמרים ניתן לבחור מתוך הרשימה המוכנה או להקליד בחופשיות.
      </div>
    </div>
  )
}
