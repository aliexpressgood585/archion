import { useRef, useState, useCallback, useEffect } from 'react'
import {
  Layers, AlertTriangle, Play, Eye, EyeOff,
  CheckCircle, Download, RotateCcw,
} from 'lucide-react'

const SVG_W = 700
const SVG_H = 500

type DisciplineKey = 'arch' | 'struct' | 'plumb' | 'elec'

interface Discipline {
  label: string
  color: string
  fill: string
  example: string
}

const DISCIPLINES: Record<DisciplineKey, Discipline> = {
  arch:   { label: 'אדריכלות',          color: '#64748b', fill: '#cbd5e1', example: 'קירות' },
  struct: { label: 'קונסטרוקציה',        color: '#2563eb', fill: '#bfdbfe', example: 'קורות/עמודים' },
  plumb:  { label: 'מערכות אינסטלציה',   color: '#ea580c', fill: '#fed7aa', example: 'צנרת/תעלות' },
  elec:   { label: 'חשמל',               color: '#16a34a', fill: '#bbf7d0', example: 'כבילה/תעלות' },
}

const DISCIPLINE_KEYS = Object.keys(DISCIPLINES) as DisciplineKey[]

type Severity = 'hard' | 'medium' | 'soft'
type ClashStatus = 'new' | 'active' | 'reviewed' | 'resolved'

const STATUS_ORDER: ClashStatus[] = ['new', 'active', 'reviewed', 'resolved']

const STATUS_META: Record<ClashStatus, { label: string; cls: string }> = {
  new:      { label: 'חדש',  cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  active:   { label: 'פעיל', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  reviewed: { label: 'נבדק', cls: 'bg-sky-100 text-sky-700 border-sky-200' },
  resolved: { label: 'טופל', cls: 'bg-green-100 text-green-700 border-green-200' },
}

const SEVERITY_META: Record<Severity, { label: string; cls: string; dot: string }> = {
  hard:   { label: 'חמורה', cls: 'bg-red-100 text-red-700 border-red-200',      dot: '#dc2626' },
  medium: { label: 'בינונית', cls: 'bg-orange-100 text-orange-700 border-orange-200', dot: '#ea580c' },
  soft:   { label: 'קלה',   cls: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: '#ca8a04' },
}

interface ElementBox {
  id: string
  discipline: DisciplineKey
  x: number; y: number; w: number; h: number
}

interface Clash {
  id: string
  a: string
  b: string
  da: DisciplineKey
  db: DisciplineKey
  ox: number; oy: number; ow: number; oh: number
  area: number
  severity: Severity
  status: ClashStatus
}

function uid() { return Math.random().toString(36).slice(2) }

function severityFor(area: number): Severity {
  if (area >= 4000) return 'hard'
  if (area >= 1200) return 'medium'
  return 'soft'
}

/** Axis-aligned rectangle intersection. Returns the overlap rect or null. */
function intersect(a: ElementBox, b: ElementBox): { x: number; y: number; w: number; h: number } | null {
  if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
    const x = Math.max(a.x, b.x)
    const y = Math.max(a.y, b.y)
    const w = Math.min(a.x + a.w, b.x + b.w) - x
    const h = Math.min(a.y + a.h, b.y + b.h) - y
    return { x, y, w, h }
  }
  return null
}

function detectClashes(els: ElementBox[]): Clash[] {
  const out: Clash[] = []
  for (let i = 0; i < els.length; i++) {
    for (let j = i + 1; j < els.length; j++) {
      const a = els[i], b = els[j]
      if (a.discipline === b.discipline) continue // test set A vs set B only
      const o = intersect(a, b)
      if (!o) continue
      const area = o.w * o.h
      out.push({
        id: uid(),
        a: a.id, b: b.id, da: a.discipline, db: b.discipline,
        ox: o.x, oy: o.y, ow: o.w, oh: o.h,
        area, severity: severityFor(area), status: 'new',
      })
    }
  }
  return out
}

const SEED: ElementBox[] = [
  { id: 'a1', discipline: 'arch',   x: 60,  y: 60,  w: 240, h: 36 },
  { id: 'a2', discipline: 'arch',   x: 60,  y: 60,  w: 36,  h: 320 },
  { id: 's1', discipline: 'struct', x: 150, y: 130, w: 320, h: 40 },
  { id: 's2', discipline: 'struct', x: 420, y: 60,  w: 40,  h: 300 },
  { id: 'p1', discipline: 'plumb',  x: 200, y: 140, w: 180, h: 30 },
  { id: 'p2', discipline: 'plumb',  x: 360, y: 250, w: 240, h: 28 },
  { id: 'e1', discipline: 'elec',   x: 430, y: 110, w: 26,  h: 220 },
  { id: 'e2', discipline: 'elec',   x: 80,  y: 300, w: 300, h: 24 },
]

export function ClashDetective() {
  const svgRef = useRef<SVGSVGElement>(null)

  const [elements, setElements] = useState<ElementBox[]>(SEED)
  const [clashes, setClashes] = useState<Clash[]>([])
  const [activeLayer, setActiveLayer] = useState<DisciplineKey>('plumb')
  const [visible, setVisible] = useState<Record<DisciplineKey, boolean>>({
    arch: true, struct: true, plumb: true, elec: true,
  })
  const [selectedClash, setSelectedClash] = useState<string | null>(null)

  // drag-to-create
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null)
  const [preview, setPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  const runDetection = useCallback((els: ElementBox[]) => {
    setClashes(prev => {
      const fresh = detectClashes(els)
      // preserve status of pairs that survive between runs
      return fresh.map(c => {
        const old = prev.find(p =>
          (p.a === c.a && p.b === c.b) || (p.a === c.b && p.b === c.a))
        return old ? { ...c, id: old.id, status: old.status } : c
      })
    })
  }, [])

  // run once on mount so the report is populated immediately
  useEffect(() => {
    setClashes(detectClashes(SEED))
  }, [])

  function getCoords(e: React.MouseEvent): { x: number; y: number } {
    const rect = svgRef.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * SVG_W,
      y: ((e.clientY - rect.top) / rect.height) * SVG_H,
    }
  }

  function onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return
    const { x, y } = getCoords(e)
    setAnchor({ x, y })
    setPreview({ x, y, w: 0, h: 0 })
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!anchor) return
    const { x, y } = getCoords(e)
    setPreview({
      x: Math.min(anchor.x, x), y: Math.min(anchor.y, y),
      w: Math.abs(x - anchor.x), h: Math.abs(y - anchor.y),
    })
  }

  function onMouseUp() {
    if (anchor && preview && preview.w >= 12 && preview.h >= 12) {
      const el: ElementBox = {
        id: uid(), discipline: activeLayer,
        x: preview.x, y: preview.y, w: preview.w, h: preview.h,
      }
      setElements(prev => {
        const next = [...prev, el]
        runDetection(next)
        return next
      })
    }
    setAnchor(null)
    setPreview(null)
  }

  function cycleStatus(id: string) {
    setClashes(prev => prev.map(c => {
      if (c.id !== id) return c
      const idx = STATUS_ORDER.indexOf(c.status)
      return { ...c, status: STATUS_ORDER[(idx + 1) % STATUS_ORDER.length] }
    }))
  }

  function clearAll() {
    setElements([])
    setClashes([])
    setSelectedClash(null)
  }

  function exportCsv() {
    const header = ['clash_id', 'discipline_a', 'discipline_b', 'overlap_area', 'severity', 'status']
    const rows = clashes.map((c, i) => [
      `התנגשות ${i + 1}`,
      DISCIPLINES[c.da].label,
      DISCIPLINES[c.db].label,
      Math.round(c.area).toString(),
      SEVERITY_META[c.severity].label,
      STATUS_META[c.status].label,
    ])
    const csv = [header, ...rows]
      .map(r => r.map(f => `"${f.replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.download = 'clash-report.csv'
    a.href = URL.createObjectURL(blob)
    a.click()
  }

  // derived stats
  const total = clashes.length
  const hard = clashes.filter(c => c.severity === 'hard').length
  const medium = clashes.filter(c => c.severity === 'medium').length
  const resolved = clashes.filter(c => c.status === 'resolved').length

  const sel = clashes.find(c => c.id === selectedClash) ?? null
  const highlightIds = new Set(sel ? [sel.a, sel.b] : [])

  return (
    <div className="flex flex-col gap-3" dir="rtl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-800 rounded-xl px-3 py-2">
        <span className="flex items-center gap-1.5 text-slate-300 text-xs font-medium ml-1">
          <Layers className="w-4 h-4" /> דיסציפלינה:
        </span>
        {DISCIPLINE_KEYS.map(k => (
          <div key={k} className="flex items-center">
            <button
              onClick={() => setActiveLayer(k)}
              title={`צייר על שכבת ${DISCIPLINES[k].label}`}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-r-lg text-xs font-medium transition ${
                activeLayer === k ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: DISCIPLINES[k].color }} />
              {DISCIPLINES[k].label}
            </button>
            <button
              onClick={() => setVisible(v => ({ ...v, [k]: !v[k] }))}
              title={visible[k] ? 'הסתר שכבה' : 'הצג שכבה'}
              className="p-1.5 rounded-l-lg text-slate-300 hover:bg-slate-700 transition"
            >
              {visible[k] ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>
        ))}

        <div className="w-px h-5 bg-slate-600 mx-1" />

        <button
          onClick={() => runDetection(elements)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
        >
          <Play className="w-3.5 h-3.5" />
          הרץ בדיקת התנגשויות
        </button>

        <button onClick={clearAll} title="נקה הכל"
          className="p-2 rounded-lg text-slate-300 hover:bg-slate-700 transition">
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        <button
          onClick={exportCsv}
          disabled={clashes.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-30 text-white rounded-lg text-xs font-medium transition"
        >
          <Download className="w-3.5 h-3.5" />
          ייצוא דוח
        </button>
      </div>

      <div className="flex gap-3">
        {/* SVG plan view */}
        <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden bg-white">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="w-full"
            style={{ height: 500, display: 'block', cursor: 'crosshair', touchAction: 'none' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={() => { setAnchor(null); setPreview(null) }}
          >
            <defs>
              <pattern id="cd-grid" width={25} height={25} patternUnits="userSpaceOnUse">
                <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#f1f5f9" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width={SVG_W} height={SVG_H} fill="url(#cd-grid)" />

            {/* Discipline elements */}
            {elements.map(el => {
              if (!visible[el.discipline]) return null
              const d = DISCIPLINES[el.discipline]
              const hot = highlightIds.has(el.id)
              return (
                <g key={el.id}>
                  <rect
                    x={el.x} y={el.y} width={el.w} height={el.h}
                    fill={d.fill} fillOpacity={0.75}
                    stroke={hot ? '#dc2626' : d.color}
                    strokeWidth={hot ? 3 : 1.5}
                    rx={2}
                  >
                    {hot && (
                      <animate attributeName="stroke-opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
                    )}
                  </rect>
                </g>
              )
            })}

            {/* Overlap regions (red) — all clashes, or just the selected one */}
            {clashes.map(c => {
              if (!visible[c.da] || !visible[c.db]) return null
              const isSel = c.id === selectedClash
              if (selectedClash && !isSel) return null
              return (
                <rect
                  key={c.id}
                  x={c.ox} y={c.oy} width={c.ow} height={c.oh}
                  fill="#dc2626" fillOpacity={isSel ? 0.55 : 0.32}
                  stroke="#b91c1c" strokeWidth={isSel ? 2 : 1}
                  style={{ pointerEvents: 'none' }}
                >
                  {isSel && (
                    <animate attributeName="fill-opacity" values="0.55;0.2;0.55" dur="1s" repeatCount="indefinite" />
                  )}
                </rect>
              )
            })}

            {/* Creation preview */}
            {preview && preview.w > 0 && preview.h > 0 && (
              <rect
                x={preview.x} y={preview.y} width={preview.w} height={preview.h}
                fill={DISCIPLINES[activeLayer].fill} fillOpacity={0.5}
                stroke={DISCIPLINES[activeLayer].color} strokeWidth={2} strokeDasharray="6 3"
              />
            )}

            {elements.length === 0 && (
              <text x={SVG_W / 2} y={SVG_H / 2} textAnchor="middle" fontSize={14} fill="#94a3b8">
                גרור ליצירת אלמנט בשכבת «{DISCIPLINES[activeLayer].label}»
              </text>
            )}
          </svg>
        </div>

        {/* Clash report panel */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          {/* Summary counters */}
          <div className="grid grid-cols-4 gap-1.5">
            <div className="bg-white border border-slate-200 rounded-xl px-2 py-2 text-center">
              <p className="text-lg font-bold text-slate-800">{total}</p>
              <p className="text-[10px] text-slate-400">סה"כ</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-2 py-2 text-center">
              <p className="text-lg font-bold text-red-600">{hard}</p>
              <p className="text-[10px] text-slate-400">חמורות</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-2 py-2 text-center">
              <p className="text-lg font-bold text-orange-600">{medium}</p>
              <p className="text-[10px] text-slate-400">בינוניות</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-2 py-2 text-center">
              <p className="text-lg font-bold text-green-600">{resolved}</p>
              <p className="text-[10px] text-slate-400">טופלו</p>
            </div>
          </div>

          {/* Report list */}
          <div className="bg-white border border-slate-200 rounded-xl p-2 flex flex-col gap-1.5 flex-1 overflow-auto" style={{ maxHeight: 440 }}>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 px-1 mb-0.5">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
              דוח התנגשויות
            </p>
            {clashes.length === 0 ? (
              <p className="text-xs text-slate-400 px-1 py-4 text-center">
                אין התנגשויות. הוסף אלמנטים והרץ בדיקה.
              </p>
            ) : clashes.map((c, i) => {
              const isSel = c.id === selectedClash
              const sev = SEVERITY_META[c.severity]
              const st = STATUS_META[c.status]
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedClash(isSel ? null : c.id)}
                  className={`rounded-lg border px-2 py-1.5 cursor-pointer transition ${
                    isSel ? 'border-blue-400 bg-blue-50' : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                      <span className="w-2 h-2 rounded-full" style={{ background: sev.dot }} />
                      התנגשות {i + 1}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${sev.cls}`}>
                      {sev.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500">
                    <span style={{ color: DISCIPLINES[c.da].color }}>{DISCIPLINES[c.da].label}</span>
                    <span className="text-slate-300">✕</span>
                    <span style={{ color: DISCIPLINES[c.db].color }}>{DISCIPLINES[c.db].label}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-slate-400">חפיפה: {Math.round(c.area)} יח"ר</span>
                    <button
                      onClick={e => { e.stopPropagation(); cycleStatus(c.id) }}
                      className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border transition ${st.cls}`}
                      title="לחץ לשינוי סטטוס"
                    >
                      {c.status === 'resolved' && <CheckCircle className="w-3 h-3" />}
                      {st.label}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
            <p className="text-[10px] font-semibold text-slate-500 mb-1.5">מקרא שכבות</p>
            {DISCIPLINE_KEYS.map(k => (
              <div key={k} className="flex items-center justify-between text-[10px] text-slate-500 py-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm border border-slate-300" style={{ background: DISCIPLINES[k].fill }} />
                  {DISCIPLINES[k].label}
                </span>
                <span className="text-slate-400">{DISCIPLINES[k].example}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
