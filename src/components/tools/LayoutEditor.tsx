import { useRef, useState } from 'react'
import {
  Type, Image, Square, Trash2, Download, Plus, ChevronLeft, ChevronRight,
  AlignLeft, AlignCenter, AlignRight, MousePointer,
} from 'lucide-react'

type ItemKind = 'text' | 'image' | 'rect' | 'line'
type Tool = 'select' | 'text' | 'image' | 'rect'

interface LayoutItem {
  id: string
  kind: ItemKind
  x: number
  y: number
  w: number
  h: number
  content?: string
  src?: string
  fontSize?: number
  fontWeight?: string
  fontStyle?: string
  color?: string
  bg?: string
  borderColor?: string
  align?: 'left' | 'center' | 'right'
  opacity?: number
}

const A4_W = 794
const A4_H = 1123

function uid() { return Math.random().toString(36).slice(2, 9) }

export function LayoutEditor() {
  const [pages, setPages] = useState<LayoutItem[][]>([[]])
  const [pageIdx, setPageIdx] = useState(0)
  const [tool, setTool] = useState<Tool>('select')
  const [selected, setSelected] = useState<string | null>(null)
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null)
  const [resizing, setResizing] = useState<{ id: string; startX: number; startY: number; startW: number; startH: number } | null>(null)
  const [drawing, setDrawing] = useState<{ x: number; y: number } | null>(null)
  const [preview, setPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [zoom, setZoom] = useState(0.85)
  const canvasRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const items = pages[pageIdx] ?? []

  function setItems(updater: (prev: LayoutItem[]) => LayoutItem[]) {
    setPages(p => p.map((pg, i) => i === pageIdx ? updater(pg) : pg))
  }

  const sel = items.find(it => it.id === selected)

  function svgPt(e: React.MouseEvent): { x: number; y: number } {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    }
  }

  function handleCanvasDown(_e: React.MouseEvent) {
    const pt = svgPt(_e)
    if (tool === 'select') {
      setSelected(null)
      return
    }
    setDrawing(pt)
    setPreview({ x: pt.x, y: pt.y, w: 0, h: 0 })
  }

  function handleCanvasMove(e: React.MouseEvent) {
    if (dragging) {
      const pt = svgPt(e)
      setItems(prev => prev.map(it => it.id === dragging.id
        ? { ...it, x: pt.x - dragging.ox, y: pt.y - dragging.oy }
        : it))
      return
    }
    if (resizing) {
      const dx = e.clientX - resizing.startX
      const dy = e.clientY - resizing.startY
      setItems(prev => prev.map(it => it.id === resizing.id
        ? { ...it, w: Math.max(40, resizing.startW + dx / zoom), h: Math.max(20, resizing.startH + dy / zoom) }
        : it))
      return
    }
    if (drawing) {
      const pt = svgPt(e)
      setPreview({
        x: Math.min(drawing.x, pt.x),
        y: Math.min(drawing.y, pt.y),
        w: Math.abs(pt.x - drawing.x),
        h: Math.abs(pt.y - drawing.y),
      })
    }
  }

  function handleCanvasUp(_e: React.MouseEvent) {
    setDragging(null)
    setResizing(null)
    if (!drawing || !preview || preview.w < 10 || preview.h < 10) {
      setDrawing(null)
      setPreview(null)
      return
    }
    const newItem: LayoutItem = {
      id: uid(),
      kind: tool === 'text' ? 'text' : tool === 'image' ? 'image' : 'rect',
      ...preview,
      content: tool === 'text' ? 'טקסט חדש' : undefined,
      fontSize: 16,
      color: '#1e293b',
      bg: tool === 'rect' ? '#e2e8f0' : 'transparent',
      borderColor: tool === 'rect' ? '#94a3b8' : 'transparent',
      align: 'right',
      fontWeight: 'normal',
      fontStyle: 'normal',
      opacity: 1,
    }
    setItems(p => [...p, newItem])
    setSelected(newItem.id)
    setTool('select')
    setDrawing(null)
    setPreview(null)
    if (tool === 'image') fileRef.current?.click()
  }

  function handleItemDown(e: React.MouseEvent, id: string) {
    if (tool !== 'select') return
    e.stopPropagation()
    setSelected(id)
    const pt = svgPt(e)
    const it = items.find(i => i.id === id)!
    setDragging({ id, ox: pt.x - it.x, oy: pt.y - it.y })
  }

  function handleResizeDown(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const it = items.find(i => i.id === id)!
    setResizing({ id, startX: e.clientX, startY: e.clientY, startW: it.w, startH: it.h })
  }

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selected) return
    const url = URL.createObjectURL(file)
    setItems(p => p.map(it => it.id === selected ? { ...it, src: url } : it))
    e.target.value = ''
  }

  function deleteSelected() {
    if (!selected) return
    setItems(p => p.filter(it => it.id !== selected))
    setSelected(null)
  }

  function addPage() {
    setPages(p => [...p, []])
    setPageIdx(pages.length)
    setSelected(null)
  }

  function removePage() {
    if (pages.length <= 1) return
    setPages(p => p.filter((_, i) => i !== pageIdx))
    setPageIdx(Math.max(0, pageIdx - 1))
    setSelected(null)
  }

  function updateSel(patch: Partial<LayoutItem>) {
    if (!selected) return
    setItems(p => p.map(it => it.id === selected ? { ...it, ...patch } : it))
  }

  function exportPDF() {
    window.print()
  }

  const TOOLS: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <MousePointer className="w-4 h-4" />, label: 'בחר' },
    { id: 'text', icon: <Type className="w-4 h-4" />, label: 'טקסט' },
    { id: 'image', icon: <Image className="w-4 h-4" />, label: 'תמונה' },
    { id: 'rect', icon: <Square className="w-4 h-4" />, label: 'מלבן' },
  ]

  return (
    <div className="flex h-[85vh] bg-slate-100 rounded-xl overflow-hidden" dir="rtl">
      {/* Left toolbar */}
      <div className="w-14 bg-white border-l border-slate-200 flex flex-col items-center py-3 gap-2 shrink-0">
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            title={t.label}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${
              tool === t.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {t.icon}
          </button>
        ))}
        <div className="flex-1" />
        {selected && (
          <button onClick={deleteSelected} title="מחק"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button onClick={exportPDF} title="ייצוא PDF"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100">
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto flex flex-col items-center py-6 gap-4">
        {/* Page nav */}
        <div className="flex items-center gap-3 bg-white rounded-full px-4 py-2 shadow-sm text-sm font-medium text-slate-700 shrink-0">
          <button onClick={() => setPageIdx(Math.max(0, pageIdx - 1))} disabled={pageIdx === 0}
            className="disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span>עמוד {pageIdx + 1} / {pages.length}</span>
          <button onClick={() => setPageIdx(Math.min(pages.length - 1, pageIdx + 1))} disabled={pageIdx === pages.length - 1}
            className="disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={addPage} className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> עמוד
          </button>
          {pages.length > 1 && (
            <button onClick={removePage} className="text-red-500 hover:text-red-600 text-xs">מחק עמוד</button>
          )}
          <div className="w-px h-4 bg-slate-200 mx-1" />
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="text-slate-500 text-xs">+</button>
          <span className="text-xs text-slate-400">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="text-slate-500 text-xs">-</button>
        </div>

        {/* A4 Canvas */}
        <div
          ref={canvasRef}
          className="bg-white shadow-xl relative select-none"
          style={{ width: A4_W * zoom, height: A4_H * zoom, cursor: tool === 'select' ? 'default' : 'crosshair' }}
          onMouseDown={handleCanvasDown}
          onMouseMove={handleCanvasMove}
          onMouseUp={handleCanvasUp}
          onMouseLeave={handleCanvasUp}
        >
          {/* Grid */}
          <svg className="absolute inset-0 pointer-events-none" width={A4_W * zoom} height={A4_H * zoom}>
            <defs>
              <pattern id="grid" width={20 * zoom} height={20 * zoom} patternUnits="userSpaceOnUse">
                <path d={`M ${20 * zoom} 0 L 0 0 0 ${20 * zoom}`} fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Items */}
          {items.map(it => (
            <div
              key={it.id}
              className={`absolute ${selected === it.id ? 'outline outline-2 outline-blue-500' : ''}`}
              style={{
                left: it.x * zoom, top: it.y * zoom,
                width: it.w * zoom, height: it.h * zoom,
                opacity: it.opacity ?? 1,
                cursor: tool === 'select' ? 'move' : 'default',
              }}
              onMouseDown={e => handleItemDown(e, it.id)}
            >
              {it.kind === 'text' && (
                <div
                  contentEditable={selected === it.id}
                  suppressContentEditableWarning
                  onBlur={e => updateSel({ content: e.currentTarget.textContent ?? '' })}
                  style={{
                    width: '100%', height: '100%',
                    fontSize: (it.fontSize ?? 16) * zoom,
                    fontWeight: it.fontWeight ?? 'normal',
                    fontStyle: it.fontStyle ?? 'normal',
                    color: it.color ?? '#1e293b',
                    textAlign: it.align ?? 'right',
                    direction: 'rtl',
                    overflow: 'hidden',
                    outline: 'none',
                    padding: 4 * zoom,
                    boxSizing: 'border-box',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {it.content}
                </div>
              )}
              {it.kind === 'image' && (
                it.src
                  ? <img src={it.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 text-xs" style={{ fontSize: 12 * zoom }}>לחץ לבחור תמונה</div>
              )}
              {it.kind === 'rect' && (
                <div style={{
                  width: '100%', height: '100%',
                  background: it.bg ?? '#e2e8f0',
                  border: `1px solid ${it.borderColor ?? '#94a3b8'}`,
                }} />
              )}

              {/* Resize handle */}
              {selected === it.id && (
                <div
                  className="absolute bottom-0 left-0 w-3 h-3 bg-blue-500 cursor-se-resize rounded-sm"
                  onMouseDown={e => { e.stopPropagation(); handleResizeDown(e, it.id) }}
                  style={{ transform: 'translate(-50%, 50%)' }}
                />
              )}
            </div>
          ))}

          {/* Preview while drawing */}
          {preview && preview.w > 2 && preview.h > 2 && (
            <div
              className="absolute border-2 border-dashed border-blue-400 pointer-events-none"
              style={{ left: preview.x * zoom, top: preview.y * zoom, width: preview.w * zoom, height: preview.h * zoom }}
            />
          )}
        </div>
      </div>

      {/* Right panel — properties */}
      <div className="w-52 bg-white border-r border-slate-200 p-3 overflow-y-auto shrink-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">מאפיינים</p>
        {!sel ? (
          <p className="text-xs text-slate-400 text-center mt-8">בחר אלמנט</p>
        ) : (
          <div className="space-y-3">
            {sel.kind === 'text' && (
              <>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">גודל פונט</label>
                  <input type="number" min={8} max={120} value={sel.fontSize ?? 16}
                    onChange={e => updateSel({ fontSize: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">צבע</label>
                  <input type="color" value={sel.color ?? '#1e293b'}
                    onChange={e => updateSel({ color: e.target.value })}
                    className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => updateSel({ fontWeight: sel.fontWeight === 'bold' ? 'normal' : 'bold' })}
                    className={`flex-1 py-1.5 rounded text-xs font-bold border transition ${sel.fontWeight === 'bold' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600'}`}>
                    B
                  </button>
                  <button onClick={() => updateSel({ fontStyle: sel.fontStyle === 'italic' ? 'normal' : 'italic' })}
                    className={`flex-1 py-1.5 rounded text-xs italic border transition ${sel.fontStyle === 'italic' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600'}`}>
                    I
                  </button>
                </div>
                <div className="flex gap-1">
                  {(['right', 'center', 'left'] as const).map(a => (
                    <button key={a} onClick={() => updateSel({ align: a })}
                      className={`flex-1 py-1.5 rounded border transition flex items-center justify-center ${sel.align === a ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-500'}`}>
                      {a === 'right' ? <AlignRight className="w-3 h-3" /> : a === 'center' ? <AlignCenter className="w-3 h-3" /> : <AlignLeft className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              </>
            )}

            {sel.kind === 'image' && (
              <button onClick={() => fileRef.current?.click()}
                className="w-full py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
                החלף תמונה
              </button>
            )}

            {sel.kind === 'rect' && (
              <>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">מילוי</label>
                  <input type="color" value={sel.bg ?? '#e2e8f0'}
                    onChange={e => updateSel({ bg: e.target.value })}
                    className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">מסגרת</label>
                  <input type="color" value={sel.borderColor ?? '#94a3b8'}
                    onChange={e => updateSel({ borderColor: e.target.value })}
                    className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                </div>
              </>
            )}

            <div>
              <label className="text-xs text-slate-500 block mb-1">שקיפות</label>
              <input type="range" min={0.1} max={1} step={0.05} value={sel.opacity ?? 1}
                onChange={e => updateSel({ opacity: Number(e.target.value) })}
                className="w-full" />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {(['x','y','w','h'] as const).map(k => (
                <div key={k}>
                  <label className="text-xs text-slate-400 block">{k.toUpperCase()}</label>
                  <input type="number" value={Math.round((sel as any)[k])}
                    onChange={e => updateSel({ [k]: Number(e.target.value) })}
                    className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImageFile} />

      <style>{`@media print { .no-print { display: none; } }`}</style>
    </div>
  )
}
