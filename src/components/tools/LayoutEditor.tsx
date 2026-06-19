import { useRef, useState } from 'react'
import {
  Type, Image, Square, Trash2, Download, Plus, ChevronLeft, ChevronRight,
  AlignLeft, AlignCenter, AlignRight, MousePointer, Minus, Circle,
  BringToFront, SendToBack, Columns, Underline,
} from 'lucide-react'

type ItemKind = 'text' | 'image' | 'rect' | 'ellipse' | 'line'
type Tool = 'select' | 'text' | 'image' | 'rect' | 'ellipse' | 'line'

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
  fontFamily?: string
  fontWeight?: string
  fontStyle?: string
  textDecoration?: string
  color?: string
  textBg?: string
  bg?: string
  borderColor?: string
  borderWidth?: number
  borderRadius?: number
  align?: 'left' | 'center' | 'right' | 'justify'
  opacity?: number
  leading?: number
  tracking?: number
  columns?: number
  colGap?: number
  zIndex?: number
}

interface ParaStyle {
  name: string
  fontSize: number
  fontFamily: string
  fontWeight: string
  fontStyle: string
  color: string
  leading: number
  tracking: number
}

const PARA_STYLES: ParaStyle[] = [
  { name: 'גוף טקסט',    fontSize: 11, fontFamily: 'serif',       fontWeight: 'normal', fontStyle: 'normal',  color: '#1e293b', leading: 1.6, tracking: 0 },
  { name: 'כותרת 1',     fontSize: 36, fontFamily: 'sans-serif',   fontWeight: 'bold',   fontStyle: 'normal',  color: '#0f172a', leading: 1.15,tracking:-0.5 },
  { name: 'כותרת 2',     fontSize: 24, fontFamily: 'sans-serif',   fontWeight: 'bold',   fontStyle: 'normal',  color: '#1e293b', leading: 1.2, tracking: 0 },
  { name: 'כותרת 3',     fontSize: 16, fontFamily: 'sans-serif',   fontWeight: 'bold',   fontStyle: 'normal',  color: '#334155', leading: 1.3, tracking: 0 },
  { name: 'כיתוב',       fontSize: 9,  fontFamily: 'sans-serif',   fontWeight: 'normal', fontStyle: 'italic',  color: '#64748b', leading: 1.4, tracking: 0 },
  { name: 'ציטוט',       fontSize: 18, fontFamily: 'Georgia, serif',fontWeight: 'normal', fontStyle: 'italic',  color: '#475569', leading: 1.5, tracking: 0.3 },
  { name: 'כותרת-על',    fontSize: 10, fontFamily: 'sans-serif',   fontWeight: 'bold',   fontStyle: 'normal',  color: '#64748b', leading: 1.4, tracking: 2 },
  { name: 'הערת שוליים', fontSize: 8,  fontFamily: 'serif',        fontWeight: 'normal', fontStyle: 'normal',  color: '#94a3b8', leading: 1.3, tracking: 0 },
]

const FONT_FAMILIES = ['sans-serif', 'serif', 'monospace', 'Georgia, serif', 'Arial, sans-serif', 'Times New Roman, serif', 'Courier New, monospace']

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
  const [showParaStyles, setShowParaStyles] = useState(false)
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
    return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom }
  }

  function handleCanvasDown(e: React.MouseEvent) {
    const pt = svgPt(e)
    if (tool === 'select') { setSelected(null); return }
    setDrawing(pt)
    setPreview({ x: pt.x, y: pt.y, w: 0, h: 0 })
  }

  function handleCanvasMove(e: React.MouseEvent) {
    if (dragging) {
      const pt = svgPt(e)
      setItems(prev => prev.map(it => it.id === dragging.id
        ? { ...it, x: Math.round((pt.x - dragging.ox) / 10) * 10, y: Math.round((pt.y - dragging.oy) / 10) * 10 }
        : it))
      return
    }
    if (resizing) {
      const dx = e.clientX - resizing.startX
      const dy = e.clientY - resizing.startY
      setItems(prev => prev.map(it => it.id === resizing.id
        ? { ...it, w: Math.max(20, resizing.startW + dx / zoom), h: Math.max(10, resizing.startH + dy / zoom) }
        : it))
      return
    }
    if (drawing) {
      const pt = svgPt(e)
      setPreview({ x: Math.min(drawing.x, pt.x), y: Math.min(drawing.y, pt.y), w: Math.abs(pt.x - drawing.x), h: Math.abs(pt.y - drawing.y) })
    }
  }

  function handleCanvasUp(_e: React.MouseEvent) {
    setDragging(null)
    setResizing(null)
    if (!drawing || !preview || preview.w < 8 || preview.h < 8) { setDrawing(null); setPreview(null); return }
    const newItem: LayoutItem = {
      id: uid(), kind: tool === 'text' ? 'text' : tool === 'image' ? 'image' : tool === 'ellipse' ? 'ellipse' : tool === 'line' ? 'line' : 'rect',
      ...preview,
      content: tool === 'text' ? 'לחץ פעמיים לעריכה' : undefined,
      fontSize: 14, fontFamily: 'sans-serif', color: '#1e293b', textBg: 'transparent',
      bg: tool === 'rect' ? '#e2e8f0' : tool === 'ellipse' ? '#dbeafe' : 'transparent',
      borderColor: tool === 'line' ? '#1e293b' : '#94a3b8',
      borderWidth: tool === 'line' ? 2 : 1, borderRadius: 0,
      align: 'right', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none',
      opacity: 1, leading: 1.5, tracking: 0, columns: 1, colGap: 16,
      zIndex: items.length,
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
    setItems(p => p.map(it => it.id === selected ? { ...it, src: URL.createObjectURL(file) } : it))
    e.target.value = ''
  }

  function deleteSelected() { if (!selected) return; setItems(p => p.filter(it => it.id !== selected)); setSelected(null) }
  function addPage() { setPages(p => [...p, []]); setPageIdx(pages.length) }
  function removePage() { if (pages.length <= 1) return; setPages(p => p.filter((_, i) => i !== pageIdx)); setPageIdx(Math.max(0, pageIdx - 1)) }

  function updateSel(patch: Partial<LayoutItem>) {
    if (!selected) return
    setItems(p => p.map(it => it.id === selected ? { ...it, ...patch } : it))
  }

  function applyParaStyle(style: ParaStyle) {
    updateSel({ fontSize: style.fontSize, fontFamily: style.fontFamily, fontWeight: style.fontWeight, fontStyle: style.fontStyle, color: style.color, leading: style.leading, tracking: style.tracking })
    setShowParaStyles(false)
  }

  function bringForward() {
    if (!selected) return
    setItems(p => {
      const sorted = [...p].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
      const idx = sorted.findIndex(i => i.id === selected)
      if (idx >= sorted.length - 1) return p
      const next = sorted[idx + 1]
      return p.map(it => it.id === selected ? { ...it, zIndex: next.zIndex ?? 0 } : it.id === next.id ? { ...it, zIndex: sel?.zIndex ?? 0 } : it)
    })
  }

  function sendBackward() {
    if (!selected) return
    setItems(p => {
      const sorted = [...p].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
      const idx = sorted.findIndex(i => i.id === selected)
      if (idx <= 0) return p
      const prev = sorted[idx - 1]
      return p.map(it => it.id === selected ? { ...it, zIndex: prev.zIndex ?? 0 } : it.id === prev.id ? { ...it, zIndex: sel?.zIndex ?? 0 } : it)
    })
  }

  function duplicateSelected() {
    if (!sel) return
    const copy = { ...sel, id: uid(), x: sel.x + 20, y: sel.y + 20, zIndex: items.length }
    setItems(p => [...p, copy])
    setSelected(copy.id)
  }

  function exportPDF() { window.print() }

  const TOOLS: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: 'select',  icon: <MousePointer className="w-4 h-4" />, label: 'בחר' },
    { id: 'text',    icon: <Type className="w-4 h-4" />, label: 'מסגרת טקסט' },
    { id: 'image',   icon: <Image className="w-4 h-4" />, label: 'תמונה' },
    { id: 'rect',    icon: <Square className="w-4 h-4" />, label: 'מלבן' },
    { id: 'ellipse', icon: <Circle className="w-4 h-4" />, label: 'עיגול' },
    { id: 'line',    icon: <Minus className="w-4 h-4" />, label: 'קו' },
  ]

  const sortedItems = [...items].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))

  return (
    <div className="flex bg-slate-100 rounded-xl overflow-hidden" style={{ height: '85vh' }} dir="rtl">
      {/* Left toolbar */}
      <div className="w-14 bg-white border-l border-slate-200 flex flex-col items-center py-3 gap-1 shrink-0">
        {TOOLS.map(t => (
          <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${tool === t.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
            {t.icon}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={bringForward} disabled={!selected} title="העבר קדימה" className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30"><BringToFront className="w-4 h-4" /></button>
        <button onClick={sendBackward} disabled={!selected} title="שלח אחורה" className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30"><SendToBack className="w-4 h-4" /></button>
        <button onClick={duplicateSelected} disabled={!selected} title="שכפל" className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 text-lg">⧉</button>
        <button onClick={deleteSelected} disabled={!selected} title="מחק" className="w-10 h-10 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
        <button onClick={exportPDF} title="הדפס / ייצוא PDF" className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"><Download className="w-4 h-4" /></button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto flex flex-col items-center py-4 gap-3">
        {/* Page navigation bar */}
        <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm text-xs font-medium text-slate-700 shrink-0">
          <button onClick={() => setPageIdx(Math.max(0, pageIdx - 1))} disabled={pageIdx === 0} className="disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          <span>עמוד {pageIdx + 1} / {pages.length}</span>
          <button onClick={() => setPageIdx(Math.min(pages.length - 1, pageIdx + 1))} disabled={pageIdx === pages.length - 1} className="disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={addPage} className="text-blue-600 hover:text-blue-700 flex items-center gap-0.5"><Plus className="w-3.5 h-3.5" />עמוד</button>
          {pages.length > 1 && <button onClick={removePage} className="text-red-500 hover:text-red-600">מחק עמוד</button>}
          <div className="w-px h-4 bg-slate-200 mx-1" />
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="text-slate-500 px-1">+</button>
          <span className="text-slate-400">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="text-slate-500 px-1">−</button>
          <div className="w-px h-4 bg-slate-200 mx-1" />
          {[0.5, 0.75, 1.0, 1.25].map(z => (
            <button key={z} onClick={() => setZoom(z)} className={`text-xs px-1.5 py-0.5 rounded ${zoom === z ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:bg-slate-100'}`}>{z * 100}%</button>
          ))}
        </div>

        {/* A4 Canvas */}
        <div
          ref={canvasRef}
          className="bg-white shadow-xl relative shrink-0"
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
            {/* Margin guides */}
            {[40, A4_W - 40].map(x => <line key={x} x1={x * zoom} y1={0} x2={x * zoom} y2={A4_H * zoom} stroke="#bfdbfe" strokeWidth="0.5" strokeDasharray="4,4" />)}
            {[40, A4_H - 40].map(y => <line key={y} x1={0} y1={y * zoom} x2={A4_W * zoom} y2={y * zoom} stroke="#bfdbfe" strokeWidth="0.5" strokeDasharray="4,4" />)}
          </svg>

          {/* Items sorted by z-index */}
          {sortedItems.map(it => (
            <div
              key={it.id}
              className={`absolute ${selected === it.id ? 'outline outline-2 outline-blue-500 outline-offset-1' : ''}`}
              style={{ left: it.x * zoom, top: it.y * zoom, width: it.w * zoom, height: it.h * zoom, opacity: it.opacity ?? 1, cursor: tool === 'select' ? 'move' : 'default', zIndex: it.zIndex ?? 0 }}
              onMouseDown={e => handleItemDown(e, it.id)}
            >
              {it.kind === 'text' && (
                <div
                  contentEditable={selected === it.id}
                  suppressContentEditableWarning
                  onBlur={e => updateSel({ content: e.currentTarget.innerHTML })}
                  dangerouslySetInnerHTML={selected !== it.id ? { __html: it.content ?? '' } : undefined}
                  style={{
                    width: '100%', height: '100%',
                    fontSize: (it.fontSize ?? 14) * zoom,
                    fontFamily: it.fontFamily ?? 'sans-serif',
                    fontWeight: it.fontWeight ?? 'normal',
                    fontStyle: it.fontStyle ?? 'normal',
                    textDecoration: it.textDecoration ?? 'none',
                    color: it.color ?? '#1e293b',
                    textAlign: it.align as 'left' | 'center' | 'right',
                    direction: 'rtl',
                    overflow: 'hidden',
                    outline: 'none',
                    padding: 6 * zoom,
                    boxSizing: 'border-box',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    lineHeight: it.leading ?? 1.5,
                    letterSpacing: `${(it.tracking ?? 0) * zoom}px`,
                    background: it.textBg ?? 'transparent',
                    columnCount: (it.columns ?? 1) > 1 ? it.columns : undefined,
                    columnGap: (it.columns ?? 1) > 1 ? `${(it.colGap ?? 16) * zoom}px` : undefined,
                  }}
                >
                  {selected === it.id ? undefined : undefined}
                </div>
              )}
              {it.kind === 'image' && (
                it.src
                  ? <img src={it.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: (it.borderRadius ?? 0) * zoom, border: `${(it.borderWidth ?? 0) * zoom}px solid ${it.borderColor ?? 'transparent'}` }} />
                  : <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 gap-1" style={{ fontSize: 11 * zoom, borderRadius: (it.borderRadius ?? 0) * zoom, border: `1px dashed #94a3b8` }}><Image className="w-6 h-6 opacity-40" /><span>לחץ לבחור תמונה</span></div>
              )}
              {it.kind === 'rect' && (
                <div style={{ width: '100%', height: '100%', background: it.bg ?? '#e2e8f0', border: `${(it.borderWidth ?? 1) * zoom}px solid ${it.borderColor ?? '#94a3b8'}`, borderRadius: (it.borderRadius ?? 0) * zoom }} />
              )}
              {it.kind === 'ellipse' && (
                <div style={{ width: '100%', height: '100%', background: it.bg ?? '#dbeafe', border: `${(it.borderWidth ?? 1) * zoom}px solid ${it.borderColor ?? '#93c5fd'}`, borderRadius: '50%' }} />
              )}
              {it.kind === 'line' && (
                <div style={{ width: '100%', height: 0, borderTop: `${(it.borderWidth ?? 2) * zoom}px solid ${it.borderColor ?? '#1e293b'}`, marginTop: it.h * zoom / 2 }} />
              )}

              {/* Resize handle */}
              {selected === it.id && it.kind !== 'line' && (
                <div
                  className="absolute bottom-0 left-0 w-3 h-3 bg-blue-500 rounded-sm cursor-se-resize"
                  style={{ transform: 'translate(-50%, 50%)' }}
                  onMouseDown={e => { e.stopPropagation(); handleResizeDown(e, it.id) }}
                />
              )}
            </div>
          ))}

          {/* Drawing preview */}
          {preview && preview.w > 2 && preview.h > 2 && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: preview.x * zoom, top: preview.y * zoom,
                width: preview.w * zoom, height: preview.h * zoom,
                border: '2px dashed #3b82f6',
                borderRadius: tool === 'ellipse' ? '50%' : 0,
                background: 'rgba(59,130,246,0.05)',
              }}
            />
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-56 bg-white border-r border-slate-200 p-3 overflow-y-auto shrink-0 text-xs">
        <p className="font-semibold text-slate-500 uppercase tracking-wide mb-3">מאפיינים</p>

        {!sel ? (
          <div className="text-slate-400 text-center mt-8 space-y-2">
            <p>בחר אלמנט לעריכה</p>
            <p className="text-slate-300">כלים זמינים: טקסט, תמונה, מלבן, עיגול, קו</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Paragraph styles */}
            {sel.kind === 'text' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-500">סגנון פסקה</label>
                  <button onClick={() => setShowParaStyles(v => !v)} className="text-blue-600 text-xs">{ showParaStyles ? 'סגור' : 'הצג' }</button>
                </div>
                {showParaStyles && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden mb-1">
                    {PARA_STYLES.map(s => (
                      <button key={s.name} onClick={() => applyParaStyle(s)}
                        className="w-full text-right px-2 py-1.5 hover:bg-blue-50 text-xs border-b border-slate-100 last:border-0 transition"
                        style={{ fontFamily: s.fontFamily, fontWeight: s.fontWeight, fontStyle: s.fontStyle }}>
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {sel.kind === 'text' && (
              <>
                <div>
                  <label className="text-slate-500 block mb-1">גופן</label>
                  <select value={sel.fontFamily ?? 'sans-serif'} onChange={e => updateSel({ fontFamily: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs">
                    {FONT_FAMILIES.map(f => <option key={f} value={f}>{f.split(',')[0]}</option>)}
                  </select>
                </div>
                <div className="flex gap-1.5">
                  <div className="flex-1">
                    <label className="text-slate-500 block mb-1">גודל</label>
                    <input type="number" min={6} max={200} value={sel.fontSize ?? 14}
                      onChange={e => updateSel({ fontSize: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded" />
                  </div>
                  <div className="flex-1">
                    <label className="text-slate-500 block mb-1">רווח שורה</label>
                    <input type="number" min={0.8} max={4} step={0.05} value={sel.leading ?? 1.5}
                      onChange={e => updateSel({ leading: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded" />
                  </div>
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">מרווח אותיות (Tracking)</label>
                  <input type="range" min={-2} max={10} step={0.1} value={sel.tracking ?? 0}
                    onChange={e => updateSel({ tracking: Number(e.target.value) })}
                    className="w-full" />
                  <span className="text-slate-400">{(sel.tracking ?? 0).toFixed(1)}</span>
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">צבע טקסט</label>
                  <input type="color" value={sel.color ?? '#1e293b'} onChange={e => updateSel({ color: e.target.value })} className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">רקע תיבה</label>
                  <input type="color" value={sel.textBg && sel.textBg !== 'transparent' ? sel.textBg : '#ffffff'} onChange={e => updateSel({ textBg: e.target.value })} className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                </div>
                <div className="flex gap-1">
                  {(['B','I','U'] as const).map(f => (
                    <button key={f} onClick={() => {
                      if (f === 'B') updateSel({ fontWeight: sel.fontWeight === 'bold' ? 'normal' : 'bold' })
                      if (f === 'I') updateSel({ fontStyle: sel.fontStyle === 'italic' ? 'normal' : 'italic' })
                      if (f === 'U') updateSel({ textDecoration: sel.textDecoration === 'underline' ? 'none' : 'underline' })
                    }}
                      className={`flex-1 py-1.5 rounded border text-xs transition font-bold ${
                        (f === 'B' && sel.fontWeight === 'bold') || (f === 'I' && sel.fontStyle === 'italic') || (f === 'U' && sel.textDecoration === 'underline')
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      } ${f === 'I' ? 'italic' : f === 'U' ? 'underline' : ''}`}>
                      {f}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {(['right','center','left','justify'] as const).map(a => (
                    <button key={a} onClick={() => updateSel({ align: a })}
                      className={`flex-1 py-1.5 rounded border text-xs flex items-center justify-center transition ${sel.align === a ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      {a === 'right' ? <AlignRight className="w-3 h-3" /> : a === 'center' ? <AlignCenter className="w-3 h-3" /> : a === 'left' ? <AlignLeft className="w-3 h-3" /> : <span className="text-xs">⬛</span>}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-slate-500 flex items-center gap-1 mb-1"><Columns className="w-3 h-3" />עמודות</label>
                  <div className="flex gap-1">
                    {[1, 2, 3].map(n => (
                      <button key={n} onClick={() => updateSel({ columns: n })}
                        className={`flex-1 py-1 rounded border text-xs transition ${sel.columns === n ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                  {(sel.columns ?? 1) > 1 && (
                    <div className="mt-1">
                      <label className="text-slate-400 block mb-1">רווח עמודה (px)</label>
                      <input type="number" min={4} max={60} value={sel.colGap ?? 16}
                        onChange={e => updateSel({ colGap: Number(e.target.value) })}
                        className="w-full px-2 py-1 border border-slate-200 rounded" />
                    </div>
                  )}
                </div>
              </>
            )}

            {sel.kind === 'image' && (
              <button onClick={() => fileRef.current?.click()} className="w-full py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
                החלף תמונה
              </button>
            )}

            {(sel.kind === 'rect' || sel.kind === 'ellipse') && (
              <>
                <div>
                  <label className="text-slate-500 block mb-1">מילוי</label>
                  <input type="color" value={sel.bg ?? '#e2e8f0'} onChange={e => updateSel({ bg: e.target.value })} className="w-full h-8 rounded border border-slate-200 cursor-pointer" />
                </div>
              </>
            )}

            {(sel.kind === 'rect' || sel.kind === 'ellipse' || sel.kind === 'line' || sel.kind === 'image') && (
              <>
                <div>
                  <label className="text-slate-500 block mb-1">מסגרת</label>
                  <div className="flex gap-1.5">
                    <input type="color" value={sel.borderColor ?? '#94a3b8'} onChange={e => updateSel({ borderColor: e.target.value })} className="flex-1 h-8 rounded border border-slate-200 cursor-pointer" />
                    <input type="number" min={0} max={20} value={sel.borderWidth ?? 1} onChange={e => updateSel({ borderWidth: Number(e.target.value) })} className="w-14 px-2 py-1 border border-slate-200 rounded" />
                  </div>
                </div>
                {sel.kind !== 'line' && (
                  <div>
                    <label className="text-slate-500 block mb-1">עיגול פינות</label>
                    <input type="range" min={0} max={100} value={sel.borderRadius ?? 0} onChange={e => updateSel({ borderRadius: Number(e.target.value) })} className="w-full" />
                    <span className="text-slate-400">{sel.borderRadius ?? 0}px</span>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="text-slate-500 block mb-1">שקיפות</label>
              <input type="range" min={0.05} max={1} step={0.05} value={sel.opacity ?? 1}
                onChange={e => updateSel({ opacity: Number(e.target.value) })}
                className="w-full" />
              <span className="text-slate-400">{Math.round((sel.opacity ?? 1) * 100)}%</span>
            </div>

            <div>
              <label className="text-slate-500 block mb-1.5">מיקום ומידות</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['x', 'y', 'w', 'h'] as const).map(k => (
                  <div key={k}>
                    <label className="text-slate-400 block">{k === 'x' ? 'שמאל' : k === 'y' ? 'למעלה' : k === 'w' ? 'רוחב' : 'גובה'}</label>
                    <input type="number" value={Math.round((sel as unknown as Record<string, number>)[k])}
                      onChange={e => updateSel({ [k]: Number(e.target.value) })}
                      className="w-full px-1.5 py-1 border border-slate-200 rounded" />
                  </div>
                ))}
              </div>
            </div>

            <button onClick={deleteSelected} className="w-full py-1.5 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-medium hover:bg-red-100 transition">
              מחק אלמנט
            </button>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImageFile} />
      <style>{`@media print { body > *:not(.print-area) { display:none; } }`}</style>
    </div>
  )
}
