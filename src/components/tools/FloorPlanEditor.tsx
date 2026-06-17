import { useRef, useState } from 'react'
import { Square, MousePointer, Trash2, Download, RotateCcw } from 'lucide-react'

const SCALE = 40 // px per meter
const SNAP = SCALE

interface Room {
  id: string
  x: number; y: number; w: number; h: number
  name: string
  fill: string
}

const FILLS = [
  '#dbeafe','#dcfce7','#fef9c3','#fce7f3','#ede9fe',
  '#ffedd5','#cffafe','#fee2e2','#ecfdf5','#fdf4ff',
]

function snapV(v: number) { return Math.round(v / SNAP) * SNAP }

export function FloorPlanEditor() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [tool, setTool] = useState<'room' | 'select'>('room')
  const [selected, setSelected] = useState<string | null>(null)
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null)
  const [preview, setPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const colorIdx = useRef(0)

  function svgXY(e: React.MouseEvent) {
    const rect = svgRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function onMouseDown(e: React.MouseEvent) {
    if (tool !== 'room') return
    const { x, y } = svgXY(e)
    setAnchor({ x: snapV(x), y: snapV(y) })
    setSelected(null)
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!anchor) return
    const { x, y } = svgXY(e)
    const ex = snapV(x), ey = snapV(y)
    setPreview({
      x: Math.min(anchor.x, ex), y: Math.min(anchor.y, ey),
      w: Math.abs(ex - anchor.x), h: Math.abs(ey - anchor.y),
    })
  }

  function onMouseUp() {
    if (anchor && preview && preview.w >= SNAP && preview.h >= SNAP) {
      const id = Math.random().toString(36).slice(2)
      setRooms(rs => [...rs, {
        id, ...preview,
        name: 'חדר', fill: FILLS[colorIdx.current++ % FILLS.length],
      }])
      setSelected(id)
    }
    setAnchor(null)
    setPreview(null)
  }

  function deleteSelected() {
    setRooms(rs => rs.filter(r => r.id !== selected))
    setSelected(null)
  }

  function roomArea(r: Room) { return ((r.w / SCALE) * (r.h / SCALE)).toFixed(1) }
  function totalArea() { return rooms.reduce((s, r) => s + (r.w / SCALE) * (r.h / SCALE), 0).toFixed(1) }

  function exportPng() {
    const svg = svgRef.current!
    const serialized = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 1200; canvas.height = 800
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, 1200, 800)
      ctx.drawImage(img, 0, 0)
      const a = document.createElement('a')
      a.download = 'floor-plan.png'
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serialized)
  }

  const sel = rooms.find(r => r.id === selected)

  return (
    <div className="flex flex-col gap-3" dir="rtl">
      {/* Toolbar */}
      <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2">
        <button
          onClick={() => setTool('room')}
          title="ציור חדר"
          className={`p-2 rounded-lg transition ${tool === 'room' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
        >
          <Square className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTool('select')}
          title="בחירה"
          className={`p-2 rounded-lg transition ${tool === 'select' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
        >
          <MousePointer className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-slate-600 mx-1" />
        <button
          onClick={() => { setRooms([]); setSelected(null) }}
          title="נקה הכל"
          className="p-2 rounded-lg text-slate-300 hover:bg-slate-700 transition"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        {selected && (
          <button onClick={deleteSelected} className="p-2 rounded-lg text-red-400 hover:bg-slate-700 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <div className="flex-1" />
        <span className="text-slate-400 text-xs">
          {rooms.length} חדרים • {totalArea()} מ"ר
        </span>
        <button
          onClick={exportPng}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
        >
          <Download className="w-3.5 h-3.5" />
          ייצוא PNG
        </button>
      </div>

      <p className="text-center text-xs text-slate-400">
        {tool === 'room' ? '✏️ גרור לציור חדר — רשת: 1 ריבוע = 1 מטר' : '👆 לחץ על חדר לבחירה ועריכה'}
      </p>

      {/* Canvas */}
      <div className="border border-slate-200 rounded-xl overflow-auto bg-white" style={{ height: 500 }}>
        <svg
          ref={svgRef}
          width={1200}
          height={800}
          style={{ cursor: tool === 'room' ? 'crosshair' : 'default', display: 'block' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <defs>
            <pattern id="fp-sm" width={SNAP} height={SNAP} patternUnits="userSpaceOnUse">
              <path d={`M ${SNAP} 0 L 0 0 0 ${SNAP}`} fill="none" stroke="#f1f5f9" strokeWidth="1" />
            </pattern>
            <pattern id="fp-lg" width={SNAP * 5} height={SNAP * 5} patternUnits="userSpaceOnUse">
              <rect width={SNAP * 5} height={SNAP * 5} fill="url(#fp-sm)" />
              <path d={`M ${SNAP * 5} 0 L 0 0 0 ${SNAP * 5}`} fill="none" stroke="#e2e8f0" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#fp-lg)" />

          {/* Rooms */}
          {rooms.map(room => (
            <g
              key={room.id}
              onClick={e => { e.stopPropagation(); setSelected(room.id) }}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={room.x} y={room.y} width={room.w} height={room.h}
                fill={room.fill}
                stroke={selected === room.id ? '#3b82f6' : '#64748b'}
                strokeWidth={selected === room.id ? 2.5 : 1.5}
              />
              <text
                x={room.x + room.w / 2} y={room.y + room.h / 2 - (room.h > 60 ? 9 : 0)}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={Math.min(14, room.w / 7, room.h / 3.5)}
                fill="#1e293b" fontWeight="600"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {room.name}
              </text>
              {room.h > 55 && (
                <text
                  x={room.x + room.w / 2} y={room.y + room.h / 2 + 13}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={Math.min(11, room.w / 9)}
                  fill="#64748b"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {roomArea(room)} מ"ר
                </text>
              )}
              {selected === room.id && (
                <>
                  <text x={room.x + room.w / 2} y={room.y - 7} textAnchor="middle" fontSize={10} fill="#3b82f6" style={{ userSelect: 'none' }}>
                    {(room.w / SCALE).toFixed(1)} מ׳
                  </text>
                  <text x={room.x - 7} y={room.y + room.h / 2} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#3b82f6" style={{ userSelect: 'none' }}>
                    {(room.h / SCALE).toFixed(1)} מ׳
                  </text>
                </>
              )}
            </g>
          ))}

          {/* Drawing preview */}
          {preview && preview.w > 0 && preview.h > 0 && (
            <rect
              x={preview.x} y={preview.y} width={preview.w} height={preview.h}
              fill="#dbeafe" fillOpacity={0.5}
              stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3"
            />
          )}

          {rooms.length === 0 && !anchor && (
            <text x={600} y={400} textAnchor="middle" fontSize={15} fill="#94a3b8">
              גרור ליצירת חדר ראשון
            </text>
          )}
        </svg>
      </div>

      {/* Selected room panel */}
      {sel && (
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
          <label className="text-sm font-medium text-slate-700 shrink-0">שם חדר:</label>
          <input
            value={sel.name}
            onChange={e => setRooms(rs => rs.map(r => r.id === sel.id ? { ...r, name: e.target.value } : r))}
            className="flex-1 min-w-0 max-w-44 px-2 py-1 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-slate-500 shrink-0">
            {(sel.w / SCALE).toFixed(1)}מ × {(sel.h / SCALE).toFixed(1)}מ = <strong>{roomArea(sel)} מ"ר</strong>
          </span>
          <div className="flex gap-1.5 shrink-0">
            {FILLS.map(f => (
              <button
                key={f}
                onClick={() => setRooms(rs => rs.map(r => r.id === sel.id ? { ...r, fill: f } : r))}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${sel.fill === f ? 'border-blue-500 scale-125' : 'border-slate-200 hover:scale-110'}`}
                style={{ background: f }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {rooms.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {rooms.map(r => (
            <div key={r.id} className="rounded-lg border border-slate-100 bg-white px-3 py-2 flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: r.fill, border: '1px solid #94a3b8' }} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">{r.name}</p>
                <p className="text-xs text-slate-400">{roomArea(r)} מ"ר</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
