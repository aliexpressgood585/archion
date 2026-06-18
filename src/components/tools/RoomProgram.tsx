import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

interface Space {
  id: string
  zone: string
  name: string
  count: string
  reqArea: string
  notes: string
}

const ZONES = ['ציבורי', 'פרטי', 'שירות', 'תנועה', 'חיצוני']

function newSpace(): Space {
  return { id: crypto.randomUUID(), zone: 'ציבורי', name: '', count: '1', reqArea: '', notes: '' }
}

export default function RoomProgram() {
  const [spaces, setSpaces] = useState<Space[]>([newSpace()])
  const [available, setAvailable] = useState('')

  const add = () => setSpaces(s => [...s, newSpace()])
  const remove = (id: string) => setSpaces(s => s.filter(x => x.id !== id))
  const update = (id: string, field: keyof Space, value: string) =>
    setSpaces(s => s.map(x => x.id === id ? { ...x, [field]: value } : x))

  const spaceArea = (s: Space) => (parseFloat(s.count) || 1) * (parseFloat(s.reqArea) || 0)
  const totalRequired = spaces.reduce((sum, s) => sum + spaceArea(s), 0)
  const availableArea = parseFloat(available) || 0
  const diff = availableArea - totalRequired

  const byZone: Record<string, number> = {}
  for (const s of spaces) {
    byZone[s.zone] = (byZone[s.zone] || 0) + spaceArea(s)
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">שטח בנייה זמין (מ"ר)</label>
          <input type="number" value={available} onChange={e => setAvailable(e.target.value)} placeholder="למשל: 250"
            className="w-48 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-right font-medium">אזור</th>
              <th className="px-3 py-2 text-right font-medium">שם מרחב</th>
              <th className="px-3 py-2 text-center font-medium w-16">כמות</th>
              <th className="px-3 py-2 text-center font-medium w-24">שטח (מ"ר)</th>
              <th className="px-3 py-2 text-center font-medium w-24">סה"כ</th>
              <th className="px-3 py-2 text-right font-medium">הערות</th>
              <th className="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {spaces.map((s, i) => (
              <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                <td className="px-3 py-1.5">
                  <select value={s.zone} onChange={e => update(s.id, 'zone', e.target.value)}
                    className="border border-slate-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                    {ZONES.map(z => <option key={z}>{z}</option>)}
                  </select>
                </td>
                <td className="px-3 py-1.5">
                  <input value={s.name} onChange={e => update(s.id, 'name', e.target.value)} placeholder="שם חדר / מרחב"
                    className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </td>
                <td className="px-3 py-1.5">
                  <input type="number" min="1" value={s.count} onChange={e => update(s.id, 'count', e.target.value)}
                    className="w-full border border-slate-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </td>
                <td className="px-3 py-1.5">
                  <input type="number" value={s.reqArea} onChange={e => update(s.id, 'reqArea', e.target.value)} placeholder="0"
                    className="w-full border border-slate-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </td>
                <td className="px-3 py-1.5 text-center font-semibold text-blue-700">
                  {spaceArea(s) > 0 ? spaceArea(s).toFixed(1) : '—'}
                </td>
                <td className="px-3 py-1.5">
                  <input value={s.notes} onChange={e => update(s.id, 'notes', e.target.value)} placeholder="הערה..."
                    className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </td>
                <td className="px-2 py-1.5">
                  <button onClick={() => remove(s.id)} disabled={spaces.length === 1}
                    className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={add}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
        <Plus className="w-4 h-4" />
        הוסף מרחב
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm font-medium text-slate-600 mb-3">לפי אזור</div>
          {Object.entries(byZone).map(([zone, area]) => (
            <div key={zone} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0 text-sm">
              <span className="text-slate-600">{zone}</span>
              <span className="font-semibold">{area.toFixed(1)} מ"ר</span>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
            <div className="text-2xl font-bold text-blue-700">{totalRequired.toFixed(1)} מ"ר</div>
            <div className="text-sm text-blue-600 mt-1">שטח נדרש כולל</div>
          </div>
          {availableArea > 0 && (
            <div className={`rounded-xl p-4 text-center border ${diff >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
              <div className={`text-2xl font-bold ${diff >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {diff >= 0 ? '+' : ''}{diff.toFixed(1)} מ"ר
              </div>
              <div className={`text-sm mt-1 ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {diff >= 0 ? 'עודף שטח' : 'חסר שטח'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
