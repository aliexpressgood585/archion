import { useRef, useState, useEffect, useCallback } from 'react'
import {
  Square, MousePointer, Trash2, Download, RotateCcw,
  Minus, DoorOpen, AlignLeft, Type, ZoomIn, ZoomOut, Undo2, Redo2, FileText
} from 'lucide-react'

const SCALE = 40 // px per meter
const SNAP = SCALE
const WALL_T = 8  // wall thickness in px (= 20cm)
const SVG_W = 1600
const SVG_H = 1000

type ToolType = 'select' | 'wall' | 'room' | 'door' | 'window' | 'text'

interface Room {
  kind: 'room'
  id: string
  x: number; y: number; w: number; h: number
  name: string
  roomType: RoomTypeKey
}

interface Wall {
  kind: 'wall'
  id: string
  x1: number; y1: number; x2: number; y2: number
}

interface Door {
  kind: 'door'
  id: string
  x: number; y: number
  angle: number
}

interface WindowEl {
  kind: 'window'
  id: string
  x: number; y: number
  angle: number
}

interface TextEl {
  kind: 'text'
  id: string
  x: number; y: number
  text: string
}

type Element = Room | Wall | Door | WindowEl | TextEl

type RoomTypeKey =
  | 'living' | 'bedroom' | 'bathroom' | 'kitchen'
  | 'hallway' | 'dining' | 'office' | 'storage' | 'balcony' | 'entrance'

const ROOM_TYPES: Record<RoomTypeKey, { label: string; fill: string }> = {
  living:   { label: 'סלון',       fill: '#dcfce7' },
  bedroom:  { label: 'חדר שינה',   fill: '#dbeafe' },
  bathroom: { label: 'חדר אמבטיה', fill: '#cffafe' },
  kitchen:  { label: 'מטבח',       fill: '#fef9c3' },
  hallway:  { label: 'מסדרון',     fill: '#f3f4f6' },
  dining:   { label: 'פינת אוכל',  fill: '#fce7f3' },
  office:   { label: 'משרד',       fill: '#ede9fe' },
  storage:  { label: 'מחסן',       fill: '#ffedd5' },
  balcony:  { label: 'מרפסת',      fill: '#d1fae5' },
  entrance: { label: 'כניסה',      fill: '#fee2e2' },
}

const ROOM_TYPE_KEYS = Object.keys(ROOM_TYPES) as RoomTypeKey[]

function snap(v: number) { return Math.round(v / SNAP) * SNAP }

function uid() { return Math.random().toString(36).slice(2) }

export function FloorPlanEditor() {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [elements, setElements] = useState<Element[]>([])
  const [history, setHistory] = useState<Element[][]>([[]])
  const [histIdx, setHistIdx] = useState(0)

  const [tool, setTool] = useState<ToolType>('room')
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedRoomType, setSelectedRoomType] = useState<RoomTypeKey>('living')

  // Wall drawing
  const [wallAnchor, setWallAnchor] = useState<{ x: number; y: number } | null>(null)
  const [wallPreview, setWallPreview] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)

  // Room drawing
  const [roomAnchor, setRoomAnchor] = useState<{ x: number; y: number } | null>(null)
  const [roomPreview, setRoomPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  // Drag move
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null)

  // Viewport
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ mx: number; my: number; px: number; py: number } | null>(null)
  const spaceDown = useRef(false)

  // Text editing
  const [textInput, setTextInput] = useState('')
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null)

  // Push to history
  const pushHistory = useCallback((els: Element[]) => {
    setHistory(h => {
      const next = h.slice(0, histIdx + 1)
      next.push(els)
      setHistIdx(next.length - 1)
      return next
    })
    setElements(els)
  }, [histIdx])

  function undo() {
    if (histIdx <= 0) return
    const ni = histIdx - 1
    setHistIdx(ni)
    setElements(history[ni])
  }

  function redo() {
    if (histIdx >= history.length - 1) return
    const ni = histIdx + 1
    setHistIdx(ni)
    setElements(history[ni])
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === ' ') { spaceDown.current = true; e.preventDefault() }
      if (e.key === 'Escape') { setSelected(null); setWallAnchor(null); setWallPreview(null); setRoomAnchor(null); setRoomPreview(null); setTextPos(null) }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selected) {
          const next = elements.filter(el => el.id !== selected)
          pushHistory(next)
          setSelected(null)
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo() }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Z')) { e.preventDefault(); redo() }
      if (!e.ctrlKey && !e.metaKey) {
        if (e.key === 'v' || e.key === 'V') setTool('select')
        if (e.key === 'w' || e.key === 'W') setTool('wall')
        if (e.key === 'r' || e.key === 'R') setTool('room')
        if (e.key === 'd' || e.key === 'D') setTool('door')
        if (e.key === 'n' || e.key === 'N') setTool('window')
        if (e.key === 't' || e.key === 'T') setTool('text')
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === ' ') spaceDown.current = false
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp) }
  }, [selected, elements, histIdx, history])

  function getSvgCoords(e: React.MouseEvent): { x: number; y: number } {
    const rect = svgRef.current!.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / zoom - pan.x,
      y: (e.clientY - rect.top) / zoom - pan.y,
    }
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => Math.max(0.2, Math.min(4, z * delta)))
  }

  function onMouseDown(e: React.MouseEvent) {
    // Middle mouse or space+drag = pan
    if (e.button === 1 || spaceDown.current) {
      setPanning(true)
      setPanStart({ mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y })
      e.preventDefault()
      return
    }
    if (e.button !== 0) return

    const { x, y } = getSvgCoords(e)
    const sx = snap(x), sy = snap(y)

    if (tool === 'wall') {
      setWallAnchor({ x: sx, y: sy })
    } else if (tool === 'room') {
      setRoomAnchor({ x: sx, y: sy })
    } else if (tool === 'select') {
      // Check if clicking an element
      const hit = [...elements].reverse().find(el => {
        if (el.kind === 'room') return x >= el.x && x <= el.x + el.w && y >= el.y && y <= el.y + el.h
        if (el.kind === 'wall') {
          const dx = el.x2 - el.x1, dy = el.y2 - el.y1
          const len = Math.sqrt(dx * dx + dy * dy)
          if (len === 0) return false
          const t = ((x - el.x1) * dx + (y - el.y1) * dy) / (len * len)
          const tc = Math.max(0, Math.min(1, t))
          const cx = el.x1 + tc * dx, cy = el.y1 + tc * dy
          return Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) < 12
        }
        if (el.kind === 'door' || el.kind === 'window')
          return Math.sqrt((x - el.x) ** 2 + (y - el.y) ** 2) < 20
        if (el.kind === 'text')
          return Math.abs(x - el.x) < 60 && Math.abs(y - el.y) < 16
        return false
      })
      if (hit) {
        setSelected(hit.id)
        setDragging({ id: hit.id, ox: x, oy: y })
      } else {
        setSelected(null)
      }
    } else if (tool === 'door') {
      const el: Door = { kind: 'door', id: uid(), x: sx, y: sy, angle: 0 }
      pushHistory([...elements, el])
    } else if (tool === 'window') {
      const el: WindowEl = { kind: 'window', id: uid(), x: sx, y: sy, angle: 0 }
      pushHistory([...elements, el])
    } else if (tool === 'text') {
      setTextPos({ x: sx, y: sy })
    }
  }

  function onMouseMove(e: React.MouseEvent) {
    if (panning && panStart) {
      const dx = (e.clientX - panStart.mx) / zoom
      const dy = (e.clientY - panStart.my) / zoom
      setPan({ x: panStart.px + dx, y: panStart.py + dy })
      return
    }

    const { x, y } = getSvgCoords(e)
    const sx = snap(x), sy = snap(y)

    if (tool === 'wall' && wallAnchor) {
      setWallPreview({ x1: wallAnchor.x, y1: wallAnchor.y, x2: sx, y2: sy })
    } else if (tool === 'room' && roomAnchor) {
      setRoomPreview({
        x: Math.min(roomAnchor.x, sx), y: Math.min(roomAnchor.y, sy),
        w: Math.abs(sx - roomAnchor.x), h: Math.abs(sy - roomAnchor.y),
      })
    } else if (tool === 'select' && dragging) {
      const dx = sx - snap(dragging.ox)
      const dy = sy - snap(dragging.oy)
      if (dx !== 0 || dy !== 0) {
        setDragging(d => d ? { ...d, ox: x, oy: y } : null)
        setElements(prev => prev.map(el => {
          if (el.id !== dragging.id) return el
          if (el.kind === 'room') return { ...el, x: el.x + dx, y: el.y + dy }
          if (el.kind === 'wall') return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy }
          if (el.kind === 'door' || el.kind === 'window' || el.kind === 'text') return { ...el, x: el.x + dx, y: el.y + dy }
          return el
        }))
      }
    }
  }

  function onMouseUp(_e: React.MouseEvent) {
    if (panning) { setPanning(false); setPanStart(null); return }

    if (tool === 'wall' && wallAnchor && wallPreview) {
      const len = Math.sqrt((wallPreview.x2 - wallPreview.x1) ** 2 + (wallPreview.y2 - wallPreview.y1) ** 2)
      if (len >= SNAP) {
        const el: Wall = { kind: 'wall', id: uid(), ...wallPreview }
        pushHistory([...elements, el])
      }
      setWallAnchor(null)
      setWallPreview(null)
    } else if (tool === 'room' && roomAnchor && roomPreview) {
      if (roomPreview.w >= SNAP && roomPreview.h >= SNAP) {
        const el: Room = {
          kind: 'room', id: uid(), ...roomPreview,
          name: ROOM_TYPES[selectedRoomType].label,
          roomType: selectedRoomType,
        }
        pushHistory([...elements, el])
        setSelected(el.id)
      }
      setRoomAnchor(null)
      setRoomPreview(null)
    } else if (tool === 'select' && dragging) {
      pushHistory([...elements])
      setDragging(null)
    }
  }

  function confirmText() {
    if (textPos && textInput.trim()) {
      const el: TextEl = { kind: 'text', id: uid(), x: textPos.x, y: textPos.y, text: textInput }
      pushHistory([...elements, el])
    }
    setTextPos(null)
    setTextInput('')
  }

  function exportPng() {
    const svg = svgRef.current!
    const clone = svg.cloneNode(true) as SVGElement
    clone.setAttribute('width', String(SVG_W))
    clone.setAttribute('height', String(SVG_H))
    clone.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`)
    const serialized = new XMLSerializer().serializeToString(clone)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = SVG_W; canvas.height = SVG_H
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = 'white'; ctx.fillRect(0, 0, SVG_W, SVG_H)
      ctx.drawImage(img, 0, 0)
      const a = document.createElement('a')
      a.download = 'floor-plan.png'
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serialized)
  }

  function exportSvg() {
    const svg = svgRef.current!
    const serialized = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([serialized], { type: 'image/svg+xml' })
    const a = document.createElement('a')
    a.download = 'floor-plan.svg'
    a.href = URL.createObjectURL(blob)
    a.click()
  }

  function exportPdf() {
    const svg = svgRef.current!
    const clone = svg.cloneNode(true) as SVGElement
    clone.setAttribute('width', String(SVG_W))
    clone.setAttribute('height', String(SVG_H))
    clone.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`)
    const serialized = new XMLSerializer().serializeToString(clone)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = SVG_W; canvas.height = SVG_H
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = 'white'; ctx.fillRect(0, 0, SVG_W, SVG_H)
      ctx.drawImage(img, 0, 0)
      const dataUrl = canvas.toDataURL('image/png')
      const roomRows = rooms.map(r =>
        `<tr><td>${r.name}</td><td>${(r.w / SCALE).toFixed(1)} × ${(r.h / SCALE).toFixed(1)}</td><td>${((r.w / SCALE) * (r.h / SCALE)).toFixed(1)} מ"ר</td></tr>`
      ).join('')
      const win = window.open('', '_blank')
      if (!win) return
      win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8">
  <title>תכנית קומה — הגשה</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20mm; direction: rtl; color: #111; }
    h1 { font-size: 18pt; border-bottom: 2px solid #333; padding-bottom: 6px; margin-bottom: 4px; }
    .meta { font-size: 10pt; color: #555; margin-bottom: 12px; }
    img { max-width: 100%; height: auto; display: block; border: 1px solid #ccc; }
    h2 { font-size: 13pt; margin-top: 20px; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    th { background: #eee; padding: 6px 10px; border: 1px solid #ccc; text-align: right; }
    td { padding: 5px 10px; border: 1px solid #ddd; }
    tr:nth-child(even) td { background: #f9f9f9; }
    tfoot td { font-weight: bold; background: #eee; border-top: 2px solid #ccc; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <h1>תכנית קומה — הגשה</h1>
  <div class="meta">תאריך: ${new Date().toLocaleDateString('he-IL')} &nbsp;|&nbsp; ${rooms.length} חדרים &nbsp;|&nbsp; סה"כ: ${totalArea.toFixed(1)} מ"ר</div>
  <img src="${dataUrl}" />
  ${rooms.length > 0 ? `
  <h2>טבלת חדרים</h2>
  <table>
    <thead><tr><th>שם החדר</th><th>מידות (מ׳)</th><th>שטח</th></tr></thead>
    <tbody>${roomRows}</tbody>
    <tfoot><tr><td colspan="2">סה"כ שטח</td><td>${totalArea.toFixed(1)} מ"ר</td></tr></tfoot>
  </table>` : ''}
</body>
</html>`)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 500)
    }
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serialized)
  }

  function exportDxf() {
    const S = SCALE
    const T = WALL_T / 2 / S
    const parts: string[] = [
      '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC',
      '0\nSECTION\n2\nENTITIES',
    ]
    function line(layer: string, x1: number, y1: number, x2: number, y2: number) {
      parts.push(`0\nLINE\n8\n${layer}\n10\n${x1.toFixed(4)}\n20\n${y1.toFixed(4)}\n30\n0\n11\n${x2.toFixed(4)}\n21\n${y2.toFixed(4)}\n31\n0`)
    }
    function arc(layer: string, cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
      parts.push(`0\nARC\n8\n${layer}\n10\n${cx.toFixed(4)}\n20\n${cy.toFixed(4)}\n30\n0\n40\n${r.toFixed(4)}\n50\n${startAngle.toFixed(2)}\n51\n${endAngle.toFixed(2)}`)
    }
    function text(layer: string, x: number, y: number, h: number, txt: string) {
      parts.push(`0\nTEXT\n8\n${layer}\n10\n${x.toFixed(4)}\n20\n${y.toFixed(4)}\n30\n0\n40\n${h.toFixed(4)}\n1\n${txt}`)
    }
    elements.forEach(el => {
      if (el.kind === 'wall') {
        const dx = el.x2 - el.x1, dy = el.y2 - el.y1
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len === 0) return
        const nx = (-dy / len) * T, ny = (dx / len) * T
        const x1 = el.x1 / S, y1 = -el.y1 / S, x2 = el.x2 / S, y2 = -el.y2 / S
        line('WALLS', x1 + nx, y1 + ny, x2 + nx, y2 + ny)
        line('WALLS', x1 - nx, y1 - ny, x2 - nx, y2 - ny)
        line('WALLS', x1 + nx, y1 + ny, x1 - nx, y1 - ny)
        line('WALLS', x2 + nx, y2 + ny, x2 - nx, y2 - ny)
      }
      if (el.kind === 'room') {
        const x = el.x / S, y = -el.y / S, w = el.w / S, h = el.h / S
        line('ROOMS', x, y, x + w, y)
        line('ROOMS', x + w, y, x + w, y - h)
        line('ROOMS', x + w, y - h, x, y - h)
        line('ROOMS', x, y - h, x, y)
        text('LABELS', x + w / 2, y - h / 2, 0.3, el.name)
        text('LABELS', x + w / 2, y - h / 2 - 0.35, 0.25, `${((el.w / S) * (el.h / S)).toFixed(1)} m2`)
      }
      if (el.kind === 'door') {
        const θ = (el.angle * Math.PI) / 180
        const cx = el.x / S, cy = -el.y / S
        // Frame line: from door pos in frame direction
        line('DOORS', cx, cy, cx + Math.sin(θ), cy + Math.cos(θ))
        // Swing arc: quarter circle from open position to frame position
        const startAngle = ((360 - el.angle) % 360)
        const endAngle = ((90 - el.angle + 360) % 360)
        arc('DOORS', cx, cy, 1.0, startAngle, endAngle)
      }
      if (el.kind === 'window') {
        const θ = (el.angle * Math.PI) / 180
        const cx = el.x / S, cy = -el.y / S
        const hw = 0.5 // half-width in meters
        const px = Math.cos(θ), py = -Math.sin(θ) // perpendicular in DXF
        const ox = hw * Math.sin(θ), oy = hw * Math.cos(θ) // along window
        // Three parallel lines representing window glazing
        for (const off of [-0.05, 0, 0.05]) {
          line('WINDOWS', cx - ox + off * px, cy - oy + off * py, cx + ox + off * px, cy + oy + off * py)
        }
      }
      if (el.kind === 'text') {
        text('ANNOTATIONS', el.x / S, -el.y / S, 0.35, el.text)
      }
    })
    parts.push('0\nENDSEC\n0\nEOF')
    const blob = new Blob([parts.join('\n')], { type: 'application/dxf' })
    const a = document.createElement('a')
    a.download = 'floor-plan.dxf'
    a.href = URL.createObjectURL(blob)
    a.click()
  }

  const rooms = elements.filter((el): el is Room => el.kind === 'room')
  const totalArea = rooms.reduce((s, r) => s + (r.w / SCALE) * (r.h / SCALE), 0)
  const sel = elements.find(el => el.id === selected)

  const toolButtons: { t: ToolType; label: string; short: string; icon: React.ReactNode }[] = [
    { t: 'select', label: 'בחירה (V)',   short: 'V', icon: <MousePointer className="w-4 h-4" /> },
    { t: 'wall',   label: 'קיר (W)',     short: 'W', icon: <Minus className="w-4 h-4" /> },
    { t: 'room',   label: 'חדר (R)',     short: 'R', icon: <Square className="w-4 h-4" /> },
    { t: 'door',   label: 'דלת (D)',     short: 'D', icon: <DoorOpen className="w-4 h-4" /> },
    { t: 'window', label: 'חלון (N)',    short: 'N', icon: <AlignLeft className="w-4 h-4" /> },
    { t: 'text',   label: 'טקסט (T)',   short: 'T', icon: <Type className="w-4 h-4" /> },
  ]

  const cursor = panning || spaceDown.current ? 'grab'
    : tool === 'select' ? 'default'
    : tool === 'text' ? 'text'
    : 'crosshair'

  return (
    <div className="flex flex-col gap-3" dir="rtl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-800 rounded-xl px-3 py-2">
        {toolButtons.map(({ t, label, icon }) => (
          <button
            key={t}
            onClick={() => setTool(t)}
            title={label}
            className={`p-2 rounded-lg transition ${tool === t ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
          >
            {icon}
          </button>
        ))}

        <div className="w-px h-5 bg-slate-600 mx-1" />

        <button onClick={undo} title="בטל (Ctrl+Z)" disabled={histIdx <= 0}
          className="p-2 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-30 transition">
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={redo} title="חזור (Ctrl+Y)" disabled={histIdx >= history.length - 1}
          className="p-2 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-30 transition">
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-600 mx-1" />

        <button onClick={() => setZoom(z => Math.min(4, z * 1.2))} title="הגדל"
          className="p-2 rounded-lg text-slate-300 hover:bg-slate-700 transition">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={() => setZoom(z => Math.max(0.2, z / 1.2))} title="הקטן"
          className="p-2 rounded-lg text-slate-300 hover:bg-slate-700 transition">
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-slate-400 text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>

        <div className="w-px h-5 bg-slate-600 mx-1" />

        {selected && (
          <button onClick={() => { pushHistory(elements.filter(el => el.id !== selected)); setSelected(null) }}
            className="p-2 rounded-lg text-red-400 hover:bg-slate-700 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        <button onClick={() => { pushHistory([]); setSelected(null) }} title="נקה הכל"
          className="p-2 rounded-lg text-slate-300 hover:bg-slate-700 transition">
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        <span className="text-slate-400 text-xs hidden sm:block">
          {rooms.length} חדרים • {totalArea.toFixed(1)} מ"ר
        </span>

        <button onClick={exportPdf}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-xs font-medium transition">
          <FileText className="w-3.5 h-3.5" />
          הגשה
        </button>
        <button onClick={exportDxf}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition">
          <Download className="w-3.5 h-3.5" />
          DXF
        </button>
        <button onClick={exportSvg}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-xs font-medium transition">
          <Download className="w-3.5 h-3.5" />
          SVG
        </button>
        <button onClick={exportPng}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition">
          <Download className="w-3.5 h-3.5" />
          PNG
        </button>
      </div>

      {/* Room type selector when room tool active */}
      {tool === 'room' && (
        <div className="flex flex-wrap gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          <span className="text-xs text-slate-500 self-center ml-1">סוג חדר:</span>
          {ROOM_TYPE_KEYS.map(k => (
            <button
              key={k}
              onClick={() => setSelectedRoomType(k)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition border ${
                selectedRoomType === k
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
              }`}
              style={{ borderRight: `3px solid ${ROOM_TYPES[k].fill === '#f3f4f6' ? '#94a3b8' : ROOM_TYPES[k].fill}` }}
            >
              {ROOM_TYPES[k].label}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        {/* SVG Canvas */}
        <div
          ref={containerRef}
          className="flex-1 border border-slate-200 rounded-xl overflow-hidden bg-white"
          style={{ height: 560, position: 'relative' }}
          onWheel={onWheel}
        >
          <svg
            ref={svgRef}
            width={SVG_W}
            height={SVG_H}
            style={{
              cursor,
              display: 'block',
              transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
              transformOrigin: '0 0',
              width: SVG_W,
              height: SVG_H,
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={() => {
              setWallAnchor(null); setWallPreview(null)
              setRoomAnchor(null); setRoomPreview(null)
              if (dragging) { pushHistory([...elements]); setDragging(null) }
            }}
          >
            <defs>
              <pattern id="fp-sm" width={SNAP} height={SNAP} patternUnits="userSpaceOnUse">
                <path d={`M ${SNAP} 0 L 0 0 0 ${SNAP}`} fill="none" stroke="#f1f5f9" strokeWidth="0.8" />
              </pattern>
              <pattern id="fp-lg" width={SNAP * 5} height={SNAP * 5} patternUnits="userSpaceOnUse">
                <rect width={SNAP * 5} height={SNAP * 5} fill="url(#fp-sm)" />
                <path d={`M ${SNAP * 5} 0 L 0 0 0 ${SNAP * 5}`} fill="none" stroke="#e2e8f0" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width={SVG_W} height={SVG_H} fill="url(#fp-lg)" />

            {/* Rooms */}
            {elements.filter((el): el is Room => el.kind === 'room').map(room => (
              <g key={room.id} onClick={e => { if (tool === 'select') { e.stopPropagation(); setSelected(room.id) } }} style={{ cursor: tool === 'select' ? 'move' : 'default' }}>
                <rect
                  x={room.x} y={room.y} width={room.w} height={room.h}
                  fill={ROOM_TYPES[room.roomType].fill}
                  stroke={selected === room.id ? '#3b82f6' : '#64748b'}
                  strokeWidth={selected === room.id ? 2.5 : 1.5}
                />
                <text
                  x={room.x + room.w / 2} y={room.y + room.h / 2 - (room.h > 60 ? 9 : 0)}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={Math.min(14, room.w / 7, room.h / 3.5)} fill="#1e293b" fontWeight="600"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {room.name}
                </text>
                {room.h > 55 && (
                  <text
                    x={room.x + room.w / 2} y={room.y + room.h / 2 + 13}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={Math.min(10, room.w / 9)} fill="#64748b"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {((room.w / SCALE) * (room.h / SCALE)).toFixed(1)} מ"ר
                  </text>
                )}
                {selected === room.id && (
                  <>
                    {/* Top dimension */}
                    <line x1={room.x} y1={room.y - 16} x2={room.x + room.w} y2={room.y - 16} stroke="#3b82f6" strokeWidth={1} markerEnd="url(#arrow)" markerStart="url(#arrow)" />
                    <text x={room.x + room.w / 2} y={room.y - 22} textAnchor="middle" fontSize={10} fill="#3b82f6" style={{ userSelect: 'none' }}>
                      {(room.w / SCALE).toFixed(1)} מ׳
                    </text>
                    {/* Left dimension */}
                    <line x1={room.x - 16} y1={room.y} x2={room.x - 16} y2={room.y + room.h} stroke="#3b82f6" strokeWidth={1} />
                    <text x={room.x - 22} y={room.y + room.h / 2} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#3b82f6" style={{ userSelect: 'none' }}>
                      {(room.h / SCALE).toFixed(1)} מ׳
                    </text>
                    {/* Resize handle corners */}
                    {[
                      [room.x, room.y], [room.x + room.w, room.y],
                      [room.x, room.y + room.h], [room.x + room.w, room.y + room.h]
                    ].map(([cx, cy], i) => (
                      <rect key={i} x={cx - 4} y={cy - 4} width={8} height={8} fill="white" stroke="#3b82f6" strokeWidth={1.5} style={{ pointerEvents: 'none' }} />
                    ))}
                  </>
                )}
              </g>
            ))}

            {/* Walls — double-line (architectural style) */}
            {elements.filter((el): el is Wall => el.kind === 'wall').map(wall => {
              const dx = wall.x2 - wall.x1, dy = wall.y2 - wall.y1
              const len = Math.sqrt(dx * dx + dy * dy)
              if (len === 0) return null
              const nx = (-dy / len) * WALL_T / 2
              const ny = (dx / len) * WALL_T / 2
              const pts = [
                `${wall.x1 + nx},${wall.y1 + ny}`,
                `${wall.x2 + nx},${wall.y2 + ny}`,
                `${wall.x2 - nx},${wall.y2 - ny}`,
                `${wall.x1 - nx},${wall.y1 - ny}`,
              ].join(' ')
              const isSelected = selected === wall.id
              const mx = (wall.x1 + wall.x2) / 2
              const my = (wall.y1 + wall.y2) / 2
              return (
                <g key={wall.id} onClick={e => { if (tool === 'select') { e.stopPropagation(); setSelected(wall.id) } }}
                   style={{ cursor: tool === 'select' ? 'move' : 'default' }}>
                  <polygon points={pts}
                    fill={isSelected ? '#dbeafe' : '#94a3b8'}
                    stroke={isSelected ? '#3b82f6' : '#334155'}
                    strokeWidth={isSelected ? 1.5 : 1}
                  />
                  {isSelected && (
                    <text x={mx} y={my - WALL_T / 2 - 6} textAnchor="middle" fontSize={10} fill="#3b82f6" style={{ userSelect: 'none' }}>
                      {(len / SCALE).toFixed(1)} מ׳
                    </text>
                  )}
                </g>
              )
            })}

            {/* Doors */}
            {elements.filter((el): el is Door => el.kind === 'door').map(door => (
              <g
                key={door.id}
                transform={`translate(${door.x},${door.y}) rotate(${door.angle})`}
                onClick={e => { if (tool === 'select') { e.stopPropagation(); setSelected(door.id) } }}
                style={{ cursor: tool === 'select' ? 'move' : 'default' }}
              >
                {/* Door frame line */}
                <line x1={0} y1={0} x2={0} y2={-SCALE} stroke={selected === door.id ? '#3b82f6' : '#1e293b'} strokeWidth={3} />
                {/* Door swing arc */}
                <path
                  d={`M 0 0 L ${SCALE} 0 A ${SCALE} ${SCALE} 0 0 0 0 ${-SCALE}`}
                  fill="none"
                  stroke={selected === door.id ? '#3b82f6' : '#64748b'}
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                />
              </g>
            ))}

            {/* Windows */}
            {elements.filter((el): el is WindowEl => el.kind === 'window').map(win => (
              <g
                key={win.id}
                transform={`translate(${win.x},${win.y}) rotate(${win.angle})`}
                onClick={e => { if (tool === 'select') { e.stopPropagation(); setSelected(win.id) } }}
                style={{ cursor: tool === 'select' ? 'move' : 'default' }}
              >
                {/* Window: double line */}
                <rect x={-SCALE / 2} y={-5} width={SCALE} height={10} fill="white" stroke={selected === win.id ? '#3b82f6' : '#1e293b'} strokeWidth={1.5} />
                <line x1={-SCALE / 2} y1={0} x2={SCALE / 2} y2={0} stroke={selected === win.id ? '#3b82f6' : '#1e293b'} strokeWidth={1} />
              </g>
            ))}

            {/* Texts */}
            {elements.filter((el): el is TextEl => el.kind === 'text').map(t => (
              <text
                key={t.id}
                x={t.x} y={t.y}
                fontSize={14} fill={selected === t.id ? '#3b82f6' : '#1e293b'}
                fontFamily="sans-serif"
                style={{ cursor: tool === 'select' ? 'move' : 'default', userSelect: 'none' }}
                onClick={e => { if (tool === 'select') { e.stopPropagation(); setSelected(t.id) } }}
              >
                {t.text}
              </text>
            ))}

            {/* Wall preview — double-line */}
            {wallPreview && (() => {
              const dx = wallPreview.x2 - wallPreview.x1, dy = wallPreview.y2 - wallPreview.y1
              const len = Math.sqrt(dx * dx + dy * dy)
              if (len === 0) return null
              const nx = (-dy / len) * WALL_T / 2, ny = (dx / len) * WALL_T / 2
              const pts = [
                `${wallPreview.x1 + nx},${wallPreview.y1 + ny}`,
                `${wallPreview.x2 + nx},${wallPreview.y2 + ny}`,
                `${wallPreview.x2 - nx},${wallPreview.y2 - ny}`,
                `${wallPreview.x1 - nx},${wallPreview.y1 - ny}`,
              ].join(' ')
              return <polygon points={pts} fill="#93c5fd" stroke="#3b82f6" strokeWidth={1} opacity={0.6} />
            })()}

            {/* Room preview */}
            {roomPreview && roomPreview.w > 0 && roomPreview.h > 0 && (
              <rect
                x={roomPreview.x} y={roomPreview.y} width={roomPreview.w} height={roomPreview.h}
                fill={ROOM_TYPES[selectedRoomType].fill} fillOpacity={0.5}
                stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3"
              />
            )}

            {/* Scale bar */}
            <g transform={`translate(40, ${SVG_H - 40})`}>
              <rect x={0} y={-8} width={SCALE * 5} height={16} fill="white" opacity={0.85} />
              <line x1={0} y1={0} x2={SCALE * 5} y2={0} stroke="#1e293b" strokeWidth={2} />
              <line x1={0} y1={-5} x2={0} y2={5} stroke="#1e293b" strokeWidth={2} />
              <line x1={SCALE * 5} y1={-5} x2={SCALE * 5} y2={5} stroke="#1e293b" strokeWidth={2} />
              <text x={SCALE * 5 / 2} y={-10} textAnchor="middle" fontSize={10} fill="#1e293b">5 מ׳</text>
            </g>

            {elements.length === 0 && !wallAnchor && !roomAnchor && (
              <text x={SVG_W / 2} y={SVG_H / 2} textAnchor="middle" fontSize={16} fill="#94a3b8">
                בחר כלי וציר על הבד — 1 ריבוע = 1 מטר
              </text>
            )}
          </svg>

          {/* Text input overlay */}
          {textPos && (
            <div
              style={{
                position: 'absolute',
                left: (textPos.x + pan.x) * zoom,
                top: (textPos.y + pan.y) * zoom,
                zIndex: 10,
              }}
            >
              <input
                autoFocus
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmText(); if (e.key === 'Escape') { setTextPos(null); setTextInput('') } }}
                onBlur={confirmText}
                className="px-2 py-1 border-2 border-blue-500 rounded text-sm outline-none bg-white shadow"
                placeholder="הכנס טקסט..."
                style={{ minWidth: 120 }}
              />
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="w-48 shrink-0 flex flex-col gap-3">
          {/* Selected element panel */}
          {sel && sel.kind === 'room' && (
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
              <p className="text-xs font-semibold text-slate-700">חדר נבחר</p>
              <input
                value={sel.name}
                onChange={e => setElements(prev => prev.map(el => el.id === sel.id ? { ...el, name: e.target.value } as Room : el))}
                className="px-2 py-1 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex flex-col gap-1">
                <select
                  value={sel.roomType}
                  onChange={e => setElements(prev => prev.map(el => el.id === sel.id
                    ? { ...el as Room, roomType: e.target.value as RoomTypeKey, name: ROOM_TYPES[e.target.value as RoomTypeKey].label }
                    : el
                  ))}
                  className="px-2 py-1 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ROOM_TYPE_KEYS.map(k => (
                    <option key={k} value={k}>{ROOM_TYPES[k].label}</option>
                  ))}
                </select>
              </div>
              {/* Exact dimension inputs */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400">רוחב (מ׳)</label>
                <input
                  type="number" step={0.1} min={0.1}
                  value={(sel.w / SCALE).toFixed(1)}
                  onChange={e => {
                    const v = parseFloat(e.target.value)
                    if (!isNaN(v) && v > 0)
                      setElements(prev => prev.map(el => el.id === sel.id ? { ...el as Room, w: Math.round(v * SCALE) } : el))
                  }}
                  className="px-2 py-1 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <label className="text-[10px] text-slate-400">עומק (מ׳)</label>
                <input
                  type="number" step={0.1} min={0.1}
                  value={(sel.h / SCALE).toFixed(1)}
                  onChange={e => {
                    const v = parseFloat(e.target.value)
                    if (!isNaN(v) && v > 0)
                      setElements(prev => prev.map(el => el.id === sel.id ? { ...el as Room, h: Math.round(v * SCALE) } : el))
                  }}
                  className="px-2 py-1 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs font-semibold text-slate-700">
                {((sel.w / SCALE) * (sel.h / SCALE)).toFixed(1)} מ"ר
              </p>
            </div>
          )}
          {sel && sel.kind === 'door' && (
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
              <p className="text-xs font-semibold text-slate-700">דלת נבחרת</p>
              <label className="text-xs text-slate-500">זווית</label>
              <input type="range" min={0} max={360} value={sel.angle}
                onChange={e => setElements(prev => prev.map(el => el.id === sel.id ? { ...el as Door, angle: Number(e.target.value) } : el))}
                className="w-full"
              />
              <span className="text-xs text-slate-600 text-center">{sel.angle}°</span>
            </div>
          )}
          {sel && sel.kind === 'window' && (
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
              <p className="text-xs font-semibold text-slate-700">חלון נבחר</p>
              <label className="text-xs text-slate-500">זווית</label>
              <input type="range" min={0} max={360} value={sel.angle}
                onChange={e => setElements(prev => prev.map(el => el.id === sel.id ? { ...el as WindowEl, angle: Number(e.target.value) } : el))}
                className="w-full"
              />
              <span className="text-xs text-slate-600 text-center">{sel.angle}°</span>
            </div>
          )}

          {/* Room summary */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-1.5 flex-1 overflow-auto">
            <p className="text-xs font-semibold text-slate-700 mb-1">רשימת חדרים</p>
            {rooms.length === 0 ? (
              <p className="text-xs text-slate-400">אין חדרים עדיין</p>
            ) : rooms.map(r => (
              <div key={r.id} className={`flex items-center gap-1.5 px-1.5 py-1 rounded-lg cursor-pointer transition ${selected === r.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                onClick={() => setSelected(r.id)}>
                <div className="w-3 h-3 rounded-sm shrink-0 border border-slate-300" style={{ background: ROOM_TYPES[r.roomType].fill }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{r.name}</p>
                  <p className="text-[10px] text-slate-400">{((r.w / SCALE) * (r.h / SCALE)).toFixed(1)} מ"ר</p>
                </div>
              </div>
            ))}
            {rooms.length > 0 && (
              <div className="border-t border-slate-100 pt-1.5 mt-0.5">
                <p className="text-xs font-semibold text-slate-700">סה"כ: {totalArea.toFixed(1)} מ"ר</p>
              </div>
            )}
          </div>

          {/* Keyboard shortcuts */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-slate-500 mb-1.5">קיצורי מקלדת</p>
            {[['V','בחירה'],['W','קיר'],['R','חדר'],['D','דלת'],['N','חלון'],['T','טקסט'],['Del','מחיקה'],['Ctrl+Z','בטל']].map(([k,v]) => (
              <div key={k} className="flex justify-between text-[10px] text-slate-500">
                <kbd className="bg-white border border-slate-200 rounded px-1">{k}</kbd>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
