import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth-context'
import {
  Plus, X, Trash2, Package, DollarSign
} from 'lucide-react'

interface Specification {
  id: string
  project_id: string
  organization_id: string
  name: string
  section: string
  content: string
  notes: string | null
  created_at: string
  updated_at: string
}

interface BOMItem {
  id: string
  project_id: string
  organization_id: string
  category: string
  item_name: string
  description: string | null
  quantity: number
  unit: string
  unit_price: number | null
  currency: string
  total_price: number | null
  supplier: string | null
  status: 'pending' | 'ordered' | 'delivered' | 'installed'
  notes: string | null
  created_at: string
  updated_at: string
}

const BOM_STATUS = {
  pending: 'ממתין',
  ordered: 'הוזמן',
  delivered: 'התקבל',
  installed: 'הותקן',
}

const BOM_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  ordered: 'bg-blue-100 text-blue-800',
  delivered: 'bg-purple-100 text-purple-800',
  installed: 'bg-green-100 text-green-800',
}

export function ProjectSpecs({ projectId }: { projectId: string }) {
  const { profile } = useAuth()
  const [specs, setSpecs] = useState<Specification[]>([])
  const [bomItems, setBOMItems] = useState<BOMItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'specs' | 'bom'>('specs')
  const [showSpecModal, setShowSpecModal] = useState(false)
  const [showBOMModal, setShowBOMModal] = useState(false)
  const [specForm, setSpecForm] = useState({ name: '', section: '', content: '' })
  const [bomForm, setBOMForm] = useState({
    category: '',
    item_name: '',
    quantity: 1,
    unit: 'unit',
    unit_price: 0,
    supplier: '',
  })
  const [saving, setSaving] = useState(false)

  const orgId = profile?.organization_id

  async function fetchData() {
    if (!orgId || !projectId) return
    const [specRes, bomRes] = await Promise.all([
      supabase
        .from('project_specifications' as any)
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order') as any,
      supabase
        .from('project_bom' as any)
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order') as any,
    ])

    setSpecs((specRes.data as Specification[]) ?? [])
    setBOMItems((bomRes.data as BOMItem[]) ?? [])
  }

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [orgId, projectId])

  const handleCreateSpec = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId || !specForm.name.trim()) return

    setSaving(true)
    const { error } = await (supabase
      .from('project_specifications' as any)
      .insert({
        organization_id: orgId,
        project_id: projectId,
        name: specForm.name,
        section: specForm.section,
        content: specForm.content,
        created_by: profile?.id,
      }) as any)

    setSaving(false)
    if (!error) {
      setShowSpecModal(false)
      setSpecForm({ name: '', section: '', content: '' })
      fetchData()
    }
  }

  const handleCreateBOM = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId || !bomForm.item_name.trim()) return

    setSaving(true)
    const total_price = bomForm.unit_price && bomForm.quantity
      ? bomForm.unit_price * bomForm.quantity
      : null

    const { error } = await (supabase
      .from('project_bom' as any)
      .insert({
        organization_id: orgId,
        project_id: projectId,
        category: bomForm.category,
        item_name: bomForm.item_name,
        quantity: bomForm.quantity,
        unit: bomForm.unit,
        unit_price: bomForm.unit_price || null,
        currency: 'ILS',
        total_price,
        supplier: bomForm.supplier || null,
        created_by: profile?.id,
      }) as any)

    setSaving(false)
    if (!error) {
      setShowBOMModal(false)
      setBOMForm({
        category: '',
        item_name: '',
        quantity: 1,
        unit: 'unit',
        unit_price: 0,
        supplier: '',
      })
      fetchData()
    }
  }

  const handleDeleteSpec = async (specId: string) => {
    const { error } = await (supabase
      .from('project_specifications' as any)
      .delete()
      .eq('id', specId) as any)

    if (!error) {
      fetchData()
    }
  }

  const handleDeleteBOM = async (bomId: string) => {
    const { error } = await (supabase
      .from('project_bom' as any)
      .delete()
      .eq('id', bomId) as any)

    if (!error) {
      fetchData()
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {(['specs', 'bom'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 font-medium text-sm transition border-b-2 ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            {tab === 'specs' ? 'מפרטים' : 'רשימת ציוד'}
          </button>
        ))}
      </div>

      {/* Specs Tab */}
      {activeTab === 'specs' && (
        <div className="space-y-4">
          <button
            onClick={() => setShowSpecModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" />
            מפרט חדש
          </button>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : specs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>אין מפרטים</p>
            </div>
          ) : (
            <div className="space-y-3">
              {specs.map(spec => (
                <div key={spec.id} className="bg-white rounded-lg border border-slate-200 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800">{spec.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{spec.section}</p>
                      <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{spec.content}</p>
                      {spec.notes && (
                        <p className="text-xs text-slate-600 mt-2 italic">הערה: {spec.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteSpec(spec.id)}
                      className="p-1.5 rounded hover:bg-red-50 transition ml-2"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Spec Modal */}
          {showSpecModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">מפרט חדש</h3>
                  <button onClick={() => setShowSpecModal(false)} className="p-1">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
                <form onSubmit={handleCreateSpec} className="p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">שם</label>
                    <input
                      value={specForm.name}
                      onChange={e => setSpecForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="שם המפרט"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">קטגוריה</label>
                    <input
                      value={specForm.section}
                      onChange={e => setSpecForm(f => ({ ...f, section: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="חומרים, גדלים, צבעים וכו'"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">תוכן</label>
                    <textarea
                      rows={4}
                      value={specForm.content}
                      onChange={e => setSpecForm(f => ({ ...f, content: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="תיאור תכונות וספציפיקציות..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowSpecModal(false)}
                      className="flex-1 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                    >
                      ביטול
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition"
                    >
                      {saving ? 'שומר...' : 'צור'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BOM Tab */}
      {activeTab === 'bom' && (
        <div className="space-y-4">
          <button
            onClick={() => setShowBOMModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" />
            פריט חדש
          </button>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : bomItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>אין פריטים ברשימה</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right text-xs text-slate-400 border-b border-slate-200">
                    <th className="pb-3 font-medium">שם הפריט</th>
                    <th className="pb-3 font-medium">קטגוריה</th>
                    <th className="pb-3 font-medium text-center">כמות</th>
                    <th className="pb-3 font-medium text-right">מחיר יחיד</th>
                    <th className="pb-3 font-medium text-right">סה״כ</th>
                    <th className="pb-3 font-medium">סטטוס</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {bomItems.map(item => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3">{item.item_name}</td>
                      <td className="py-3 text-slate-600">{item.category}</td>
                      <td className="py-3 text-center">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-3 text-right font-mono">
                        {item.unit_price ? `₪${item.unit_price.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3 text-right font-semibold">
                        {item.total_price ? `₪${item.total_price.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${BOM_STATUS_COLORS[item.status]}`}>
                          {BOM_STATUS[item.status]}
                        </span>
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => handleDeleteBOM(item.id)}
                          className="p-1 rounded hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-600" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* BOM Summary */}
          {bomItems.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">סה״כ עלות:</span>
                <span className="font-semibold text-slate-800">
                  ₪{bomItems.reduce((sum, item) => sum + (item.total_price ?? 0), 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>
                  {bomItems.filter(i => i.status === 'installed').length} / {bomItems.length} התקנו
                </span>
              </div>
            </div>
          )}

          {/* BOM Modal */}
          {showBOMModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">פריט חדש</h3>
                  <button onClick={() => setShowBOMModal(false)} className="p-1">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
                <form onSubmit={handleCreateBOM} className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">קטגוריה</label>
                      <input
                        value={bomForm.category}
                        onChange={e => setBOMForm(f => ({ ...f, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="דלתות, חלונות וכו'"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">שם הפריט *</label>
                      <input
                        value={bomForm.item_name}
                        onChange={e => setBOMForm(f => ({ ...f, item_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="שם הפריט"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">כמות</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={bomForm.quantity}
                        onChange={e => setBOMForm(f => ({ ...f, quantity: parseFloat(e.target.value) }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">יחידה</label>
                      <input
                        value={bomForm.unit}
                        onChange={e => setBOMForm(f => ({ ...f, unit: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="יח"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">מחיר יחידה</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bomForm.unit_price}
                        onChange={e => setBOMForm(f => ({ ...f, unit_price: parseFloat(e.target.value) }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ספק</label>
                    <input
                      value={bomForm.supplier}
                      onChange={e => setBOMForm(f => ({ ...f, supplier: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="שם הספק"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowBOMModal(false)}
                      className="flex-1 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                    >
                      ביטול
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition"
                    >
                      {saving ? 'שומר...' : 'צור'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
