import { useRef, useState, useEffect, useCallback } from 'react'
import {
  MousePointer, Minus, Square, DoorOpen, Ruler, Type,
  Undo2, Redo2, Trash2, RotateCcw, ZoomIn, ZoomOut, Download, FileText
} from 'lucide-react'

const SCALE = 40      // px per meter
const SVG_W = 1400
const SVG_H = 700
const GROUND_Y = 400  // Y coordinate of ground level in SVG

type ToolType = 'select' | 'wall' | 'floor' | 'opening' | 'dim' | 'text'
type OpeningType = 'door' | 'window'

interface WallEl {
  kind: 'wall'
  id: string
  x1: number; y1: number; x2: number; y2: number
}

interface FloorEl {
  kind: 'floor'
  id: string
  x1: number; y1: number; x2: number; y2: number
}

interface OpeningEl {
  kind: 'opening'
  id: string
  x: number; y: number
  w: number; h: number
  openingType: OpeningType
}

interface DimEl {
  kind: 'dim'
  id: string
  x1: number; y1: number; x2: number; y2: number
}

interface TextEl {
  kind: 'text'
  id: string
  x: number; y: number
  text: string
}

type SectionElement = WallEl | FloorEl | OpeningEl | DimEl | TextEl

function uid() { return Math.random().toString(36).slice(2) }
function snapV(v: number) { return Math.round(v / (SCALE / 2)) * (SCALE / 2) }

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

function metersLabel(px: number) {
  return (Math.abs(px) / SCALE).toFixed(1) + ' מ׳'
}

function heightAboveGround(svgY: number) {
  return (GROUND_Y - svgY) / SCALE
}

// Default scene: building elevation with walls, floors, openings, dims
function buildDefaultScene(): SectionElement[] {
  const left = 200
  const right = 900
  const groundY = GROUND_Y
  const roof = groundY - 3 * SCALE   // 3m building height
  const slab1 = groundY - 120         // 3m up = 120px (3*40)
  const slab2 = groundY - 240         // 6m up

  const els: SectionElement[] = [
    // Ground floor outline
    { kind: 'wall', id: uid(), x1: left, y1: groundY, x2: left, y2: roof },
    { kind: 'wall', id: uid(), x1: right, y1: groundY, x2: right, y2: roof },
    { kind: 'wall', id: uid(), x1: left, y1: roof, x2: right, y2: roof },
    { kind: 'wall', id: uid(), x1: left, y1: groundY, x2: right, y2: groundY },

    // Floor slabs
    { kind: 'floor', id: uid(), x1: left, y1: slab1, x2: right, y2: slab1 },
    { kind: 'floor', id: uid(), x1: left, y1: slab2, x2: right, y2: slab2 },

    // Window openings (ground floor)
    { kind: 'opening', id: uid(), x: left + 80, y: groundY - 150, w: 80, h: 80, openingType: 'window' },
    { kind: 'opening', id: uid(), x: right - 160, y: groundY - 150, w: 80, h: 80, openingType: 'window' },

    // Window on upper floor
    { kind: 'opening', id: uid(), x: left + 200, y: slab2 - 100, w: 80, h: 80, openingType: 'window' },

    // Door on ground floor
    { kind: 'opening', id: uid(), x: (left + right) / 2 - 40, y: groundY - 120, w: 80, h: 120, openingType: 'door' },

    // Dimension: building width
    { kind: 'dim', id: uid(), x1: left, y1: groundY + 50, x2: right, y2: groundY + 50 },

    // Dimension: floor-to-floor height
    { kind: 'dim', id: uid(), x1: right + 50, y1: slab1, x2: right + 50, y2: groundY },

    // Dimension: total height
    { kind: 'dim', id: uid(), x1: right + 100, y1: roof, x2: right + 100, y2: groundY },

    // Ground line label
    { kind: 'text', id: uid(), x: left - 10, y: groundY + 20, text: '± 0.00 — קרקע' },
  ]
  return els
}

export function SectionEditor() {
  const svgRef = useRef<SVGSVGElement>(null)

  const [elements, setElements] = useState<SectionElement[]>(() => buildDefaultScene())
  const [history, setHistory] = useState<SectionElement[][]>(() => [buildDefaultScene()])
  const [histIdx, setHistIdx] = useState(0)

  const [tool, setTool] = useState<ToolType>('select')
  const [openingSubtype, setOpeningSubtype] = useState<OpeningType>('window')
  const [selected, setSelected] = useState<string | null>(null)

  // Drawing state
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null)
  const [preview, setPreview] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)

  // Drag
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null)

  // Viewport
  const [zoom, setZoom] = useState(0.75)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ mx: number; my: number; px: number; py: number } | null>(null)
  const spaceDown = useRef(false)

  // Text
  const [textInput, setTextInput] = useState('')
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null)

  const pushHistory = useCallback((els: SectionElement[]) => {
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === ' ') { spaceDown.current = true; e.preventDefault() }
      if (e.key === 'Escape') {
        setSelected(null); setAnchor(null); setPreview(null); setTextPos(null)
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selected) {
          pushHistory(elements.filter(el => el.id !== selected))
          setSelected(null)
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo() }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Z')) { e.preventDefault(); redo() }
      if (!e.ctrlKey && !e.metaKey) {
        if (e.key === 's' || e.key === 'S') setTool('select')
        if (e.key === 'w' || e.key === 'W') setTool('wall')
        if (e.key === 'f' || e.key === 'F') setTool('floor')
        if (e.key === 'o' || e.key === 'O') setTool('opening')
        if (e.key === 'd' || e.key === 'D') setTool('dim')
        if (e.key === 't' || e.key === 'T') setTool('text')
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === ' ') spaceDown.current = false
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp) }
  }, [selected, elements, histIdx, history, pushHistory])

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

  function hitTest(x: number, y: number): SectionElement | undefined {
    return [...elements].reverse().find(el => {
      if (el.kind === 'wall' || el.kind === 'floor' || el.kind === 'dim') {
        const dx = el.x2 - el.x1, dy = el.y2 - el.y1
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len === 0) return false
        const t = ((x - el.x1) * dx + (y - el.y1) * dy) / (len * len)
        const tc = Math.max(0, Math.min(1, t))
        const cx = el.x1 + tc * dx, cy = el.y1 + tc * dy
        return Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) < 12
      }
      if (el.kind === 'opening') {
        return x >= el.x && x <= el.x + el.w && y >= el.y - el.h && y <= el.y
      }
      if (el.kind === 'text') {
        return Math.abs(x - el.x) < 80 && Math.abs(y - el.y) < 16
      }
      return false
    })
  }

  function onMouseDown(e: React.MouseEvent) {
    if (e.button === 1 || spaceDown.current) {
      setPanning(true)
      setPanStart({ mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y })
      e.preventDefault()
      return
    }
    if (e.button !== 0) return

    const { x, y } = getSvgCoords(e)
    const sx = snapV(x), sy = snapV(y)

    if (tool === 'select') {
      const hit = hitTest(x, y)
      if (hit) {
        setSelected(hit.id)
        setDragging({ id: hit.id, ox: x, oy: y })
      } else {
        setSelected(null)
      }
    } else if (tool === 'wall' || tool === 'floor' || tool === 'dim') {
      setAnchor({ x: sx, y: sy })
    } else if (tool === 'opening') {
      const w = openingSubtype === 'door' ? 80 : 80
      const h = openingSubtype === 'door' ? 120 : 80
      const el: OpeningEl = { kind: 'opening', id: uid(), x: sx - w / 2, y: sy, w, h, openingType: openingSubtype }
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
    const sx = snapV(x), sy = snapV(y)

    if ((tool === 'wall' || tool === 'floor' || tool === 'dim') && anchor) {
      // Constrain wall and floor to H/V lines
      if (tool === 'wall') {
        const dx = Math.abs(sx - anchor.x)
        const dy = Math.abs(sy - anchor.y)
        if (dy > dx) {
          setPreview({ x1: anchor.x, y1: anchor.y, x2: anchor.x, y2: sy })
        } else {
          setPreview({ x1: anchor.x, y1: anchor.y, x2: sx, y2: anchor.y })
        }
      } else if (tool === 'floor') {
        setPreview({ x1: anchor.x, y1: anchor.y, x2: sx, y2: anchor.y })
      } else {
        setPreview({ x1: anchor.x, y1: anchor.y, x2: sx, y2: sy })
      }
    } else if (tool === 'select' && dragging) {
      const dsx = snapV(x) - snapV(dragging.ox)
      const dsy = snapV(y) - snapV(dragging.oy)
      if (dsx !== 0 || dsy !== 0) {
        setDragging(d => d ? { ...d, ox: x, oy: y } : null)
        setElements(prev => prev.map(el => {
          if (el.id !== dragging.id) return el
          if (el.kind === 'wall' || el.kind === 'floor' || el.kind === 'dim')
            return { ...el, x1: el.x1 + dsx, y1: el.y1 + dsy, x2: el.x2 + dsx, y2: el.y2 + dsy }
          if (el.kind === 'opening') return { ...el, x: el.x + dsx, y: el.y + dsy }
          if (el.kind === 'text') return { ...el, x: el.x + dsx, y: el.y + dsy }
          return el
        }))
      }
    }
  }

  function onMouseUp(_e: React.MouseEvent) {
    if (panning) { setPanning(false); setPanStart(null); return }

    if ((tool === 'wall' || tool === 'floor' || tool === 'dim') && anchor && preview) {
      const length = dist(preview.x1, preview.y1, preview.x2, preview.y2)
      if (length >= SCALE / 2) {
        let el: SectionElement
        if (tool === 'wall') {
          el = { kind: 'wall', id: uid(), ...preview }
        } else if (tool === 'floor') {
          el = { kind: 'floor', id: uid(), ...preview }
        } else {
          el = { kind: 'dim', id: uid(), ...preview }
        }
        pushHistory([...elements, el])
      }
      setAnchor(null)
      setPreview(null)
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
      a.download = 'section.png'; a.href = canvas.toDataURL('image/png'); a.click()
    }
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serialized)
  }

  function exportSvg() {
    const serialized = new XMLSerializer().serializeToString(svgRef.current!)
    const blob = new Blob([serialized], { type: 'image/svg+xml' })
    const a = document.createElement('a')
    a.download = 'section.svg'; a.href = URL.createObjectURL(blob); a.click()
  }

  function exportDxf() {
    const S = SCALE
    const parts: string[] = [
      '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC',
      '0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n5\n' +
        ['WALLS','FLOORS','OPENINGS','DIMS','ANNOTATIONS'].map(n =>
          `0\nLAYER\n2\n${n}\n70\n0\n62\n7\n6\nCONTINUOUS`
        ).join('\n') +
        '\n0\nENDTAB\n0\nENDSEC',
      '0\nSECTION\n2\nENTITIES',
    ]

    function line(layer: string, x1: number, y1: number, x2: number, y2: number) {
      parts.push(`0\nLINE\n8\n${layer}\n10\n${x1.toFixed(4)}\n20\n${y1.toFixed(4)}\n30\n0\n11\n${x2.toFixed(4)}\n21\n${y2.toFixed(4)}\n31\n0`)
    }
    function dxfText(layer: string, x: number, y: number, h: number, txt: string) {
      parts.push(`0\nTEXT\n8\n${layer}\n10\n${x.toFixed(4)}\n20\n${y.toFixed(4)}\n30\n0\n40\n${h.toFixed(4)}\n1\n${txt}`)
    }

    // Convert SVG coords to DXF: flip Y (DXF Y up, SVG Y down), divide by scale
    const toD = (px: number) => px / S
    const toY = (svgY: number) => -(svgY - GROUND_Y) / S

    elements.forEach(el => {
      if (el.kind === 'wall') {
        line('WALLS', toD(el.x1), toY(el.y1), toD(el.x2), toY(el.y2))
      }
      if (el.kind === 'floor') {
        line('FLOORS', toD(el.x1), toY(el.y1), toD(el.x2), toY(el.y2))
      }
      if (el.kind === 'opening') {
        const x = toD(el.x), y = toY(el.y), w = toD(el.w), h = toD(el.h)
        line('OPENINGS', x, y, x + w, y)
        line('OPENINGS', x + w, y, x + w, y + h)
        line('OPENINGS', x + w, y + h, x, y + h)
        line('OPENINGS', x, y + h, x, y)
      }
      if (el.kind === 'dim') {
        const d = dist(el.x1, el.y1, el.x2, el.y2)
        const mx = (el.x1 + el.x2) / 2, my = (el.y1 + el.y2) / 2
        line('DIMS', toD(el.x1), toY(el.y1), toD(el.x2), toY(el.y2))
        dxfText('DIMS', toD(mx), toY(my), 0.25, metersLabel(d))
      }
      if (el.kind === 'text') {
        dxfText('ANNOTATIONS', toD(el.x), toY(el.y), 0.3, el.text)
      }
    })

    parts.push('0\nENDSEC\n0\nEOF')
    const blob = new Blob([parts.join('\n')], { type: 'application/dxf' })
    const a = document.createElement('a')
    a.download = 'section.dxf'; a.href = URL.createObjectURL(blob); a.click()
  }

  const sel = elements.find(el => el.id === selected)

  const toolButtons: { t: ToolType; label: string; icon: React.ReactNode }[] = [
    { t: 'select',  label: 'בחירה (S)',    icon: <MousePointer className="w-4 h-4" /> },
    { t: 'wall',    label: 'קיר (W)',       icon: <Minus className="w-4 h-4" /> },
    { t: 'floor',   label: 'תקרה/רצפה (F)', icon: <Square className="w-4 h-4" /> },
    { t: 'opening', label: 'פתח (O)',       icon: <DoorOpen className="w-4 h-4" /> },
    { t: 'dim',     label: 'מידה (D)',      icon: <Ruler className="w-4 h-4" /> },
    { t: 'text',    label: 'טקסט (T)',      icon: <Type className="w-4 h-4" /> },
  ]

  const cursor = panning || spaceDown.current ? 'grab'
    : tool === 'select' ? 'default'
    : tool === 'text' ? 'text'
    : 'crosshair'

  // Render opening SVG
  function renderOpening(el: OpeningEl) {
    const { x, y, w, h, openingType, id } = el
    const isSelected = selected === id
    const stroke = isSelected ? '#3b82f6' : '#1e293b'
    const top = y - h

    if (openingType === 'door') {
      return (
        <g key={id}
          style={{ cursor: tool === 'select' ? 'move' : 'default' }}
          onClick={e => { if (tool === 'select') { e.stopPropagation(); setSelected(id) } }}
        >
          {/* Door white fill */}
          <rect x={x} y={top} width={w} height={h} fill="white" stroke={stroke} strokeWidth={1.5} />
          {/* Two vertical lines for door frame */}
          <line x1={x + 8} y1={top} x2={x + 8} y2={y} stroke={stroke} strokeWidth={1} />
          <line x1={x + w - 8} y1={top} x2={x + w - 8} y2={y} stroke={stroke} strokeWidth={1} />
          {/* Curved sill arc */}
          <path
            d={`M ${x + 10} ${y} Q ${x + w / 2} ${y + 20} ${x + w - 10} ${y}`}
            fill="none" stroke={stroke} strokeWidth={1.5}
          />
          {/* Door label */}
          <text x={x + w / 2} y={top + h / 2} textAnchor="middle" dominantBaseline="middle"
            fontSize={9} fill="#64748b" style={{ pointerEvents: 'none', userSelect: 'none' }}>
            דלת
          </text>
        </g>
      )
    }
    // Window
    return (
      <g key={id}
        style={{ cursor: tool === 'select' ? 'move' : 'default' }}
        onClick={e => { if (tool === 'select') { e.stopPropagation(); setSelected(id) } }}
      >
        <rect x={x} y={top} width={w} height={h} fill="white" stroke={stroke} strokeWidth={1.5} />
        {/* Cross lines */}
        <line x1={x + w / 2} y1={top} x2={x + w / 2} y2={y} stroke={stroke} strokeWidth={1} />
        <line x1={x} y1={top + h / 2} x2={x + w} y2={top + h / 2} stroke={stroke} strokeWidth={1} />
        <text x={x + w / 2} y={top + h / 2 + 20} textAnchor="middle" dominantBaseline="middle"
          fontSize={9} fill="#64748b" style={{ pointerEvents: 'none', userSelect: 'none' }}>
          חלון
        </text>
      </g>
    )
  }

  function renderDim(el: DimEl) {
    const { x1, y1, x2, y2, id } = el
    const isSelected = selected === id
    const stroke = isSelected ? '#3b82f6' : '#475569'
    const length = dist(x1, y1, x2, y2)
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
    const dx = (x2 - x1) / length, dy = (y2 - y1) / length
    const nx = -dy, ny = dx
    const offset = 18
    const lx1 = x1 + nx * offset, ly1 = y1 + ny * offset
    const lx2 = x2 + nx * offset, ly2 = y2 + ny * offset
    const label = metersLabel(length)

    return (
      <g key={id}
        style={{ cursor: tool === 'select' ? 'move' : 'default' }}
        onClick={e => { if (tool === 'select') { e.stopPropagation(); setSelected(id) } }}
      >
        {/* Witness lines */}
        <line x1={x1} y1={y1} x2={lx1} y2={ly1} stroke={stroke} strokeWidth={1} strokeDasharray="3 2" />
        <line x1={x2} y1={y2} x2={lx2} y2={ly2} stroke={stroke} strokeWidth={1} strokeDasharray="3 2" />
        {/* Dimension line */}
        <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke={stroke} strokeWidth={1.5}
          markerStart="url(#dim-arrow)" markerEnd="url(#dim-arrow)" />
        {/* Ticks at ends */}
        <line x1={lx1 - nx * 5} y1={ly1 - ny * 5} x2={lx1 + nx * 5} y2={ly1 + ny * 5} stroke={stroke} strokeWidth={1.5} />
        <line x1={lx2 - nx * 5} y1={ly2 - ny * 5} x2={lx2 + nx * 5} y2={ly2 + ny * 5} stroke={stroke} strokeWidth={1.5} />
        {/* Label */}
        <rect x={mx + nx * (offset + 4) - 22} y={my + ny * (offset + 4) - 8} width={44} height={14}
          fill="white" fillOpacity={0.85} rx={2} />
        <text x={mx + nx * (offset + 4)} y={my + ny * (offset + 4)} textAnchor="middle"
          dominantBaseline="middle" fontSize={9} fill={stroke} fontFamily="sans-serif"
          style={{ userSelect: 'none', pointerEvents: 'none' }}>
          {label}
        </text>
      </g>
    )
  }

  // Grid lines for section view: horizontal lines for each floor height
  const gridLines: React.ReactNode[] = []
  for (let m = -2; m <= 12; m++) {
    const y = GROUND_Y - m * SCALE
    if (y < 0 || y > SVG_H) continue
    gridLines.push(
      <line key={`hg-${m}`} x1={0} y1={y} x2={SVG_W} y2={y}
        stroke={m === 0 ? '#94a3b8' : '#e2e8f0'} strokeWidth={m === 0 ? 1.5 : 0.7} />
    )
    gridLines.push(
      <text key={`ht-${m}`} x={12} y={y - 3} fontSize={9} fill={m === 0 ? '#64748b' : '#cbd5e1'}
        style={{ userSelect: 'none' }}>
        {m === 0 ? '±0.00' : `+${m.toFixed(1)}`}
      </text>
    )
  }
  // Vertical grid every meter
  for (let i = 0; i <= SVG_W; i += SCALE) {
    gridLines.push(
      <line key={`vg-${i}`} x1={i} y1={0} x2={i} y2={SVG_H}
        stroke="#f1f5f9" strokeWidth={0.6} />
    )
  }

  return (
    <div className="flex flex-col gap-3" dir="rtl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-800 rounded-xl px-3 py-2">
        {toolButtons.map(({ t, label, icon }) => (
          <button key={t} onClick={() => setTool(t)} title={label}
            className={`p-2 rounded-lg transition ${tool === t ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
            {icon}
          </button>
        ))}

        {/* Opening sub-type selector */}
        {tool === 'opening' && (
          <>
            <div className="w-px h-5 bg-slate-600 mx-1" />
            <button onClick={() => setOpeningSubtype('window')}
              className={`px-2 py-1 rounded-lg text-xs transition ${openingSubtype === 'window' ? 'bg-blue-500 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
              חלון
            </button>
            <button onClick={() => setOpeningSubtype('door')}
              className={`px-2 py-1 rounded-lg text-xs transition ${openingSubtype === 'door' ? 'bg-blue-500 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
              דלת
            </button>
          </>
        )}

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
          {elements.length} אלמנטים
        </span>

        <button onClick={exportDxf}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition">
          <FileText className="w-3.5 h-3.5" />DXF
        </button>
        <button onClick={exportSvg}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-xs font-medium transition">
          <Download className="w-3.5 h-3.5" />SVG
        </button>
        <button onClick={exportPng}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition">
          <Download className="w-3.5 h-3.5" />PNG
        </button>
      </div>

      <div className="flex gap-3">
        {/* SVG Canvas */}
        <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden bg-white"
          style={{ height: 560, position: 'relative' }}
          onWheel={onWheel}>
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
              setAnchor(null); setPreview(null)
              if (dragging) { pushHistory([...elements]); setDragging(null) }
            }}
          >
            <defs>
              <marker id="dim-arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#475569" />
              </marker>
            </defs>

            {/* Background */}
            <rect width={SVG_W} height={SVG_H} fill="#fafafa" />

            {/* Grid */}
            {gridLines}

            {/* Ground fill */}
            <rect x={0} y={GROUND_Y} width={SVG_W} height={SVG_H - GROUND_Y} fill="#d4c5a0" fillOpacity={0.2} />

            {/* Elements */}
            {elements.map(el => {
              if (el.kind === 'wall') {
                const isSelected = selected === el.id
                return (
                  <line key={el.id}
                    x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2}
                    stroke={isSelected ? '#3b82f6' : '#334155'}
                    strokeWidth={8}
                    strokeLinecap="round"
                    style={{ cursor: tool === 'select' ? 'move' : 'default' }}
                    onClick={e => { if (tool === 'select') { e.stopPropagation(); setSelected(el.id) } }}
                  />
                )
              }
              if (el.kind === 'floor') {
                const isSelected = selected === el.id
                const minX = Math.min(el.x1, el.x2)
                const w = Math.abs(el.x2 - el.x1)
                return (
                  <rect key={el.id}
                    x={minX} y={el.y1 - 6} width={w} height={12}
                    fill={isSelected ? '#93c5fd' : '#94a3b8'}
                    stroke={isSelected ? '#3b82f6' : '#64748b'}
                    strokeWidth={1}
                    style={{ cursor: tool === 'select' ? 'move' : 'default' }}
                    onClick={e => { if (tool === 'select') { e.stopPropagation(); setSelected(el.id) } }}
                  />
                )
              }
              if (el.kind === 'opening') return renderOpening(el)
              if (el.kind === 'dim') return renderDim(el)
              if (el.kind === 'text') {
                const isSelected = selected === el.id
                return (
                  <text key={el.id}
                    x={el.x} y={el.y}
                    fontSize={13} fill={isSelected ? '#3b82f6' : '#1e293b'}
                    fontFamily="sans-serif"
                    style={{ cursor: tool === 'select' ? 'move' : 'default', userSelect: 'none' }}
                    onClick={e => { if (tool === 'select') { e.stopPropagation(); setSelected(el.id) } }}
                  >
                    {el.text}
                  </text>
                )
              }
              return null
            })}

            {/* Preview while drawing */}
            {preview && (tool === 'wall') && (
              <line x1={preview.x1} y1={preview.y1} x2={preview.x2} y2={preview.y2}
                stroke="#3b82f6" strokeWidth={8} strokeLinecap="round" opacity={0.5} strokeDasharray="8 4" />
            )}
            {preview && (tool === 'floor') && (() => {
              const minX = Math.min(preview.x1, preview.x2)
              const w = Math.abs(preview.x2 - preview.x1)
              return <rect x={minX} y={preview.y1 - 6} width={w} height={12}
                fill="#93c5fd" stroke="#3b82f6" strokeWidth={1} opacity={0.6} />
            })()}
            {preview && (tool === 'dim') && (
              <line x1={preview.x1} y1={preview.y1} x2={preview.x2} y2={preview.y2}
                stroke="#475569" strokeWidth={1.5} strokeDasharray="5 3" opacity={0.7} />
            )}

            {/* Scale bar */}
            <g transform={`translate(40, ${SVG_H - 35})`}>
              <rect x={-5} y={-12} width={SCALE * 5 + 10} height={20} fill="white" fillOpacity={0.9} rx={3} />
              <line x1={0} y1={0} x2={SCALE * 5} y2={0} stroke="#1e293b" strokeWidth={2} />
              <line x1={0} y1={-5} x2={0} y2={5} stroke="#1e293b" strokeWidth={2} />
              <line x1={SCALE * 5} y1={-5} x2={SCALE * 5} y2={5} stroke="#1e293b" strokeWidth={2} />
              {[0,1,2,3,4,5].map(i => (
                <line key={i} x1={SCALE * i} y1={-3} x2={SCALE * i} y2={3} stroke="#1e293b" strokeWidth={1} />
              ))}
              <text x={SCALE * 5 / 2} y={-14} textAnchor="middle" fontSize={10} fill="#1e293b">5 מ׳</text>
            </g>
          </svg>

          {/* Text input overlay */}
          {textPos && (
            <div style={{
              position: 'absolute',
              left: (textPos.x + pan.x) * zoom,
              top: (textPos.y + pan.y) * zoom,
              zIndex: 10,
            }}>
              <input
                autoFocus
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') confirmText()
                  if (e.key === 'Escape') { setTextPos(null); setTextInput('') }
                }}
                onBlur={confirmText}
                className="px-2 py-1 border-2 border-blue-500 rounded text-sm outline-none bg-white shadow"
                placeholder="הכנס טקסט..."
                style={{ minWidth: 140 }}
              />
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="w-52 shrink-0 flex flex-col gap-3">
          {/* Selected element info */}
          {sel && (
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
              <p className="text-xs font-semibold text-slate-700">
                {sel.kind === 'wall' ? 'קיר' :
                  sel.kind === 'floor' ? 'רצפה/תקרה' :
                  sel.kind === 'opening' ? (sel.openingType === 'door' ? 'דלת' : 'חלון') :
                  sel.kind === 'dim' ? 'מידה' : 'טקסט'} נבחר
              </p>

              {(sel.kind === 'wall' || sel.kind === 'dim') && (
                <p className="text-xs text-slate-500">
                  אורך: {metersLabel(dist(sel.x1, sel.y1, sel.x2, sel.y2))}
                </p>
              )}

              {sel.kind === 'floor' && (
                <>
                  <p className="text-xs text-slate-500">
                    גובה מקרקע: {heightAboveGround(sel.y1).toFixed(2)} מ׳
                  </p>
                  <p className="text-xs text-slate-500">
                    רוחב: {metersLabel(Math.abs(sel.x2 - sel.x1))}
                  </p>
                </>
              )}

              {sel.kind === 'opening' && (
                <>
                  <p className="text-xs text-slate-500">
                    גובה תחתית מקרקע: {heightAboveGround(sel.y).toFixed(2)} מ׳
                  </p>
                  <p className="text-xs text-slate-500">
                    רוחב: {(sel.w / SCALE).toFixed(2)} מ׳ | גובה: {(sel.h / SCALE).toFixed(2)} מ׳
                  </p>
                  <div className="flex gap-1">
                    {(['door', 'window'] as OpeningType[]).map(t => (
                      <button key={t}
                        onClick={() => setElements(prev => prev.map(el =>
                          el.id === sel.id && el.kind === 'opening'
                            ? { ...el, openingType: t, w: t === 'door' ? 80 : 80, h: t === 'door' ? 120 : 80 }
                            : el
                        ))}
                        className={`flex-1 py-1 rounded text-xs transition ${sel.openingType === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        {t === 'door' ? 'דלת' : 'חלון'}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {sel.kind === 'text' && (
                <input
                  value={sel.text}
                  onChange={e => setElements(prev => prev.map(el =>
                    el.id === sel.id && el.kind === 'text' ? { ...el, text: e.target.value } : el
                  ))}
                  className="px-2 py-1 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          )}

          {/* Element list */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-1.5 flex-1 overflow-auto">
            <p className="text-xs font-semibold text-slate-700 mb-1">אלמנטים ({elements.length})</p>
            {elements.length === 0 ? (
              <p className="text-xs text-slate-400">אין אלמנטים</p>
            ) : elements.map((el, i) => {
              const label =
                el.kind === 'wall' ? `קיר ${(dist(el.x1, el.y1, el.x2, el.y2) / SCALE).toFixed(1)}מ׳` :
                el.kind === 'floor' ? `רצפה +${heightAboveGround(el.y1).toFixed(1)}מ׳` :
                el.kind === 'opening' ? (el.openingType === 'door' ? 'דלת' : 'חלון') :
                el.kind === 'dim' ? `מידה ${metersLabel(dist(el.x1, el.y1, el.x2, el.y2))}` :
                `טקסט "${el.text.slice(0, 14)}"`

              const color =
                el.kind === 'wall' ? '#334155' :
                el.kind === 'floor' ? '#94a3b8' :
                el.kind === 'opening' ? '#64748b' :
                el.kind === 'dim' ? '#475569' : '#1e293b'

              return (
                <div key={el.id}
                  className={`flex items-center gap-1.5 px-1.5 py-1 rounded-lg cursor-pointer transition ${selected === el.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  onClick={() => setSelected(el.id)}>
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
                  <p className="text-xs text-slate-600 truncate flex-1">{label}</p>
                  <span className="text-[9px] text-slate-300">{i + 1}</span>
                </div>
              )
            })}
          </div>

          {/* Shortcuts */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-slate-500 mb-1.5">קיצורי מקלדת</p>
            {[
              ['S','בחירה'], ['W','קיר'], ['F','רצפה'],
              ['O','פתח'], ['D','מידה'], ['T','טקסט'],
              ['Del','מחיקה'], ['Ctrl+Z','בטל'], ['Space+גרור','הזזה'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-[10px] text-slate-500 mb-0.5">
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
