import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

interface Layer {
  id: string
  name: string
  thickness: string
  lambda: string
}

interface Assembly {
  id: string
  name: string
  type: 'wall' | 'roof' | 'floor'
  layers: Layer[]
}

// Israeli standard IS 1045 limits (U-value W/m²K)
const STANDARD_LIMITS: Record<string, { label: string; limit: number }> = {
  wall:  { label: 'קיר חיצוני', limit: 0.54 },
  roof:  { label: 'גג / תקרה', limit: 0.40 },
  floor: { label: 'רצפה מבודדת', limit: 0.60 },
}

const MATERIALS: { name: string; lambda: number }[] = [
  { name: 'בטון רגיל',            lambda: 1.75 },
  { name: 'בלוק בטון',             lambda: 1.05 },
  { name: 'בלוק מילוי',           lambda: 0.45 },
  { name: 'לבנה קרמית',           lambda: 0.60 },
  { name: 'טיח גבס',              lambda: 0.16 },
  { name: 'טיח צמנט',             lambda: 0.87 },
  { name: 'לוח גבס (גבס-קרטון)', lambda: 0.21 },
  { name: 'בידוד XPS',            lambda: 0.033 },
  { name: 'בידוד EPS',            lambda: 0.040 },
  { name: 'בידוד צמר סלע',        lambda: 0.036 },
  { name: 'בידוד צמר זכוכית',     lambda: 0.035 },
  { name: 'עץ',                   lambda: 0.14 },
  { name: 'אלומיניום',            lambda: 230  },
  { name: 'פלדה',                 lambda: 50   },
]

function newLayer(): Layer {
  return { id: crypto.randomUUID(), name: '', thickness: '', lambda: '' }
}

function newAssembly(): Assembly {
  return { id: crypto.randomUUID(), name: 'הרכב קיר חדש', type: 'wall', layers: [newLayer()] }
}

export default function EnergyCalculator() {
  const [assemblies, setAssemblies] = useState<Assembly[]>([newAssembly()])

  const addAssembly = () => setAssemblies(a => [...a, newAssembly()])
  const removeAssembly = (id: string) => setAssemblies(a => a.filter(x => x.id !== id))
  const updateAssembly = (id: string, field: keyof Assembly, value: string) =>
    setAssemblies(a => a.map(x => x.id === id ? { ...x, [field]: value } : x))

  const addLayer = (asmId: string) =>
    setAssemblies(a => a.map(x => x.id === asmId ? { ...x, layers: [...x.layers, newLayer()] } : x))
  const removeLayer = (asmId: string, layerId: string) =>
    setAssemblies(a => a.map(x => x.id === asmId ? { ...x, layers: x.layers.filter(l => l.id !== layerId) } : x))
  const updateLayer = (asmId: string, layerId: string, field: keyof Layer, value: string) =>
    setAssemblies(a => a.map(x => x.id === asmId
      ? { ...x, layers: x.layers.map(l => l.id === layerId ? { ...l, [field]: value } : l) }
      : x))

  const calcUValue = (asm: Assembly): number | null => {
    // R_si + sum(d/lambda) + R_se
    const R_si = asm.type === 'roof' ? 0.1 : 0.13
    const R_se = asm.type === 'roof' ? 0.04 : 0.04
    let R = R_si + R_se
    for (const l of asm.layers) {
      const d = parseFloat(l.thickness) / 100 // cm to m
      const lam = parseFloat(l.lambda)
      if (!d || !lam) return null
      R += d / lam
    }
    return 1 / R
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
        <strong>תקן ישראלי 1045 — מגבלות ערך U:</strong> קיר חיצוני ≤ 0.54 | גג ≤ 0.40 | רצפה ≤ 0.60 (W/m²K)
      </div>

      {assemblies.map(asm => {
        const uVal = calcUValue(asm)
        const limit = STANDARD_LIMITS[asm.type].limit
        const pass = uVal !== null && uVal <= limit
        return (
          <div key={asm.id} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 flex items-center gap-3 flex-wrap">
              <input
                value={asm.name}
                onChange={e => updateAssembly(asm.id, 'name', e.target.value)}
                className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <select
                value={asm.type}
                onChange={e => updateAssembly(asm.id, 'type', e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(STANDARD_LIMITS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {uVal !== null && (
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  U = {uVal.toFixed(3)} {pass ? '✓ עובר' : `✗ מגבלה: ${limit}`}
                </span>
              )}
              <button onClick={() => removeAssembly(asm.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 px-1">
                <span className="col-span-5">חומר</span>
                <span className="col-span-3 text-center">עובי (ס"מ)</span>
                <span className="col-span-3 text-center">מוליכות λ (W/mK)</span>
                <span className="col-span-1"></span>
              </div>
              {asm.layers.map(layer => (
                <div key={layer.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <input
                      list={`materials-${asm.id}`}
                      value={layer.name}
                      onChange={e => {
                        updateLayer(asm.id, layer.id, 'name', e.target.value)
                        const mat = MATERIALS.find(m => m.name === e.target.value)
                        if (mat) updateLayer(asm.id, layer.id, 'lambda', String(mat.lambda))
                      }}
                      placeholder="שם חומר"
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <datalist id={`materials-${asm.id}`}>
                      {MATERIALS.map(m => <option key={m.name} value={m.name} />)}
                    </datalist>
                  </div>
                  <div className="col-span-3">
                    <input type="number" step="0.1" value={layer.thickness} onChange={e => updateLayer(asm.id, layer.id, 'thickness', e.target.value)} placeholder="20"
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-3">
                    <input type="number" step="0.001" value={layer.lambda} onChange={e => updateLayer(asm.id, layer.id, 'lambda', e.target.value)} placeholder="0.54"
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-1 text-center">
                    <button onClick={() => removeLayer(asm.id, layer.id)} disabled={asm.layers.length === 1}
                      className="text-slate-300 hover:text-red-500 disabled:opacity-30 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => addLayer(asm.id)}
                className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                <Plus className="w-3.5 h-3.5" /> הוסף שכבה
              </button>
            </div>
          </div>
        )
      })}

      <button onClick={addAssembly}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
        <Plus className="w-4 h-4" /> הוסף הרכב
      </button>
    </div>
  )
}
