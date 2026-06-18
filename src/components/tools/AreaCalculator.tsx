import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

interface Room {
  id: string
  name: string
  floor: string
  length: string
  width: string
  category: string
}

const CATEGORIES = ['מגורים', 'שירות', 'מחסן', 'מסדרון', 'חיצוני']

function newRoom(): Room {
  return { id: crypto.randomUUID(), name: '', floor: 'קרקע', length: '', width: '', category: 'מגורים' }
}

export default function AreaCalculator() {
  const [rooms, setRooms] = useState<Room[]>([newRoom()])
  const [netFactor, setNetFactor] = useState('0.85')

  const add = () => setRooms(r => [...r, newRoom()])
  const remove = (id: string) => setRooms(r => r.filter(x => x.id !== id))
  const update = (id: string, field: keyof Room, value: string) =>
    setRooms(r => r.map(x => x.id === id ? { ...x, [field]: value } : x))

  const area = (r: Room) => {
    const l = parseFloat(r.length) || 0
    const w = parseFloat(r.width) || 0
    return l * w
  }

  const totalGross = rooms.reduce((s, r) => s + area(r), 0)
  const totalNet = totalGross * (parseFloat(netFactor) || 1)

  const floors = [...new Set(rooms.map(r => r.floor))].sort()

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          מקדם נטו/ברוטו
          <input
            type="number"
            min="0.5"
            max="1"
            step="0.01"
            value={netFactor}
            onChange={e => setNetFactor(e.target.value)}
            className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center"
          />
        </label>
        <span className="text-xs text-slate-400">(ברירת מחדל 0.85 = נטו 85% מהברוטו)</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-right font-medium">שם חדר</th>
              <th className="px-3 py-2 text-right font-medium">קומה</th>
              <th className="px-3 py-2 text-right font-medium">קטגוריה</th>
              <th className="px-3 py-2 text-right font-medium">אורך (מ')</th>
              <th className="px-3 py-2 text-right font-medium">רוחב (מ')</th>
              <th className="px-3 py-2 text-right font-medium">שטח (מ"ר)</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((r, i) => (
              <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                <td className="px-3 py-1.5">
                  <input
                    value={r.name}
                    onChange={e => update(r.id, 'name', e.target.value)}
                    placeholder="למשל: סלון"
                    className="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    value={r.floor}
                    onChange={e => update(r.id, 'floor', e.target.value)}
                    placeholder="קרקע"
                    className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <select
                    value={r.category}
                    onChange={e => update(r.id, 'category', e.target.value)}
                    className="border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="number"
                    value={r.length}
                    onChange={e => update(r.id, 'length', e.target.value)}
                    placeholder="0.00"
                    className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="number"
                    value={r.width}
                    onChange={e => update(r.id, 'width', e.target.value)}
                    placeholder="0.00"
                    className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="px-3 py-1.5 text-center font-semibold text-blue-700">
                  {area(r).toFixed(2)}
                </td>
                <td className="px-2 py-1.5">
                  <button
                    onClick={() => remove(r.id)}
                    disabled={rooms.length === 1}
                    className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={add}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        הוסף חדר
      </button>

      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
          <div className="text-2xl font-bold text-blue-700">{totalGross.toFixed(2)} מ"ר</div>
          <div className="text-sm text-blue-600 mt-1">שטח ברוטו כולל</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
          <div className="text-2xl font-bold text-slate-700">{totalNet.toFixed(2)} מ"ר</div>
          <div className="text-sm text-slate-500 mt-1">שטח נטו (×{netFactor})</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-sm font-medium text-slate-600 mb-2">לפי קומות</div>
          {floors.map(fl => {
            const flTotal = rooms.filter(r => r.floor === fl).reduce((s, r) => s + area(r), 0)
            return (
              <div key={fl} className="flex justify-between text-sm py-0.5">
                <span className="text-slate-500">קומה {fl}</span>
                <span className="font-medium">{flTotal.toFixed(2)} מ"ר</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
