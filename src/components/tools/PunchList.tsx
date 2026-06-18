import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useToolState } from '@/hooks/useToolState'

type ItemStatus = 'open' | 'in_progress' | 'resolved' | 'verified'

interface PunchItem {
  id: string
  num: number
  location: string
  description: string
  contractor: string
  dueDate: string
  status: ItemStatus
  notes: string
}

interface State {
  items: PunchItem[]
}

const STATUS_META: Record<ItemStatus, { label: string; color: string }> = {
  open:        { label: 'פתוח',     color: 'bg-red-100 text-red-700' },
  in_progress: { label: 'בטיפול',  color: 'bg-amber-100 text-amber-700' },
  resolved:    { label: 'טופל',     color: 'bg-blue-100 text-blue-700' },
  verified:    { label: 'אומת',     color: 'bg-green-100 text-green-700' },
}

const DEFAULT: State = {
  items: [{ id: crypto.randomUUID(), num: 1, location: '', description: '', contractor: '', dueDate: '', status: 'open', notes: '' }],
}

export default function PunchList({ projectId }: { projectId: string | null }) {
  const { state, setState, loading, saving } = useToolState('punch-list', projectId, DEFAULT)
  const { items } = state
  const [filterStatus, setFilterStatus] = useState<ItemStatus | 'all'>('all')
  const [filterContractor, setFilterContractor] = useState('')

  const nextNum = () => (items.length > 0 ? Math.max(...items.map(i => i.num)) : 0) + 1

  const add = () => setState(s => ({ ...s, items: [...s.items, { id: crypto.randomUUID(), num: nextNum(), location: '', description: '', contractor: '', dueDate: '', status: 'open', notes: '' }] }))
  const remove = (id: string) => setState(s => ({ ...s, items: s.items.filter(x => x.id !== id) }))
  const update = (id: string, field: keyof PunchItem, value: string) =>
    setState(s => ({ ...s, items: s.items.map(x => x.id === id ? { ...x, [field]: value } : x) }))
  const cycleStatus = (id: string) => {
    const order: ItemStatus[] = ['open', 'in_progress', 'resolved', 'verified']
    setState(s => ({ ...s, items: s.items.map(x => {
      if (x.id !== id) return x
      const idx = order.indexOf(x.status)
      return { ...x, status: order[(idx + 1) % order.length] }
    }) }))
  }

  const contractors = [...new Set(items.map(i => i.contractor).filter(Boolean))]
  const filtered = items.filter(i =>
    (filterStatus === 'all' || i.status === filterStatus) &&
    (filterContractor === '' || i.contractor === filterContractor)
  )
  const counts = {
    open: items.filter(i => i.status === 'open').length,
    in_progress: items.filter(i => i.status === 'in_progress').length,
    resolved: items.filter(i => i.status === 'resolved').length,
    verified: items.filter(i => i.status === 'verified').length,
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-5" dir="rtl">
      {saving && <div className="text-xs text-slate-400 text-left">שומר...</div>}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.keys(STATUS_META) as ItemStatus[]).map(s => (
          <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
            className={`rounded-xl p-3 text-center border transition-all ${filterStatus === s ? 'ring-2 ring-offset-1 ring-blue-400' : ''} ${STATUS_META[s].color.replace('text-', 'border-').replace('bg-', 'bg-')}`}>
            <div className="text-2xl font-bold">{counts[s]}</div>
            <div className="text-xs font-medium mt-0.5">{STATUS_META[s].label}</div>
          </button>
        ))}
      </div>

      {contractors.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-500">סינון קבלן:</span>
          <button onClick={() => setFilterContractor('')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterContractor === '' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            הכל
          </button>
          {contractors.map(c => (
            <button key={c} onClick={() => setFilterContractor(filterContractor === c ? '' : c)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterContractor === c ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(item => (
          <div key={item.id} className={`rounded-xl border overflow-hidden ${item.status === 'verified' ? 'opacity-70' : ''}`}>
            <div className={`flex items-center gap-3 px-3 py-2 ${item.status === 'open' ? 'bg-red-50' : item.status === 'in_progress' ? 'bg-amber-50' : item.status === 'resolved' ? 'bg-blue-50' : 'bg-green-50'}`}>
              <span className="text-xs font-bold text-slate-500 w-6 shrink-0">#{item.num}</span>
              <button onClick={() => cycleStatus(item.id)}
                className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors shrink-0 ${STATUS_META[item.status].color}`}
                title="לחץ לשינוי סטטוס">
                {STATUS_META[item.status].label}
              </button>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input value={item.location} onChange={e => update(item.id, 'location', e.target.value)} placeholder="מיקום (קומה, חדר...)"
                  className="border border-slate-200 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <input value={item.description} onChange={e => update(item.id, 'description', e.target.value)} placeholder="תיאור הליקוי"
                  className="border border-slate-200 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <input value={item.contractor} onChange={e => update(item.id, 'contractor', e.target.value)} placeholder="קבלן אחראי"
                  className="border border-slate-200 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <input type="date" value={item.dueDate} onChange={e => update(item.id, 'dueDate', e.target.value)}
                  className="border border-slate-200 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <button onClick={() => remove(item.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {(item.notes || item.status !== 'open') && (
              <div className="px-3 pb-2 pt-1 bg-white border-t border-slate-100">
                <input value={item.notes} onChange={e => update(item.id, 'notes', e.target.value)} placeholder="הערות נוספות..."
                  className="w-full border border-slate-100 rounded px-2 py-1 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50" />
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={add}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
        <Plus className="w-4 h-4" /> הוסף ליקוי
      </button>
    </div>
  )
}
