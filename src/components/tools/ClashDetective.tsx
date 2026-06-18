import { useRef, useState, useCallback, useEffect } from 'react'
import {
  Layers, AlertTriangle, Play, Eye, EyeOff,
  CheckCircle, Download, RotateCcw, FileText, Filter,
  ChevronDown, ChevronUp, MessageSquare, Settings, Upload,
} from 'lucide-react'

const SVG_W = 700
const SVG_H = 520

type DisciplineKey = 'arch' | 'struct' | 'mep_plumb' | 'mep_hvac' | 'mep_elec'

interface Discipline {
  label: string
  labelShort: string
  color: string
  fill: string
  example: string
}

const DISCIPLINES: Record<DisciplineKey, Discipline> = {
  arch:      { label: 'אדריכלות',        labelShort: 'אדריכל', color: '#475569', fill: '#e2e8f0', example: 'קירות / תקרות' },
  struct:    { label: 'קונסטרוקציה',      labelShort: 'קונסטר', color: '#1d4ed8', fill: '#bfdbfe', example: 'קורות / עמודים' },
  mep_plumb: { label: 'אינסטלציה',        labelShort: 'אינסטל', color: '#b45309', fill: '#fde68a', example: 'צנרת / מאגרים' },
  mep_hvac:  { label: 'מיזוג אוויר',     labelShort: 'מיזוג',  color: '#0369a1', fill: '#bae6fd', example: 'תעלות / מזגנים' },
  mep_elec:  { label: 'חשמל / IT',        labelShort: 'חשמל',   color: '#15803d', fill: '#bbf7d0', example: 'כבילה / מתגים' },
}

const DISCIPLINE_KEYS = Object.keys(DISCIPLINES) as DisciplineKey[]

type Severity = 'hard' | 'medium' | 'soft'
type ClashStatus = 'new' | 'active' | 'reviewed' | 'resolved'
type Level = 'קרקע' | 'קומה 1' | 'קומה 2' | 'גג' | 'מרתף'

const LEVELS: Level[] = ['מרתף', 'קרקע', 'קומה 1', 'קומה 2', 'גג']

const STATUS_ORDER: ClashStatus[] = ['new', 'active', 'reviewed', 'resolved']

const STATUS_META: Record<ClashStatus, { label: string; cls: string; icon?: string }> = {
  new:      { label: 'חדש',  cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  active:   { label: 'פעיל', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  reviewed: { label: 'נבדק', cls: 'bg-sky-100 text-sky-700 border-sky-200' },
  resolved: { label: 'טופל', cls: 'bg-green-100 text-green-700 border-green-200', icon: '✓' },
}

const SEVERITY_META: Record<Severity, { label: string; cls: string; dot: string; priority: number }> = {
  hard:   { label: 'חמורה',   cls: 'bg-red-100 text-red-700 border-red-200',          dot: '#dc2626', priority: 3 },
  medium: { label: 'בינונית', cls: 'bg-orange-100 text-orange-700 border-orange-200', dot: '#ea580c', priority: 2 },
  soft:   { label: 'קלה',    cls: 'bg-yellow-100 text-yellow-700 border-yellow-200',  dot: '#ca8a04', priority: 1 },
}

interface ElementBox {
  id: string
  discipline: DisciplineKey
  level: Level
  x: number; y: number; w: number; h: number
  label?: string
}

interface ClashComment {
  author: string
  date: string
  text: string
}

interface Clash {
  id: string
  a: string; b: string
  da: DisciplineKey; db: DisciplineKey
  levelA: Level; levelB: Level
  ox: number; oy: number; ow: number; oh: number
  area: number
  severity: Severity
  status: ClashStatus
  comments: ClashComment[]
  assignedTo: string
}

function uid() { return Math.random().toString(36).slice(2, 8).toUpperCase() }

function severityFor(area: number): Severity {
  if (area >= 3600) return 'hard'
  if (area >= 1000) return 'medium'
  return 'soft'
}

function intersect(a: ElementBox, b: ElementBox) {
  if (a.level !== b.level) return null
  if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
    const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y)
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
      if (a.discipline === b.discipline) continue
      const o = intersect(a, b)
      if (!o) continue
      const area = o.w * o.h
      out.push({
        id: `CL-${uid()}`,
        a: a.id, b: b.id,
        da: a.discipline, db: b.discipline,
        levelA: a.level, levelB: b.level,
        ox: o.x, oy: o.y, ow: o.w, oh: o.h,
        area, severity: severityFor(area),
        status: 'new',
        comments: [],
        assignedTo: '',
      })
    }
  }
  return out
}

// Realistic building seed
const SEED: ElementBox[] = [
  // Architecture — walls
  { id: 'a1', discipline: 'arch', level: 'קומה 1', x: 50,  y: 50,  w: 600, h: 20,  label: 'קיר צפון' },
  { id: 'a2', discipline: 'arch', level: 'קומה 1', x: 50,  y: 50,  w: 20,  h: 420, label: 'קיר מערב' },
  { id: 'a3', discipline: 'arch', level: 'קומה 1', x: 50,  y: 450, w: 600, h: 20,  label: 'קיר דרום' },
  { id: 'a4', discipline: 'arch', level: 'קומה 1', x: 630, y: 50,  w: 20,  h: 420, label: 'קיר מזרח' },
  // Structural — beams
  { id: 's1', discipline: 'struct', level: 'קומה 1', x: 130, y: 130, w: 440, h: 30, label: 'קורה ראשית B1' },
  { id: 's2', discipline: 'struct', level: 'קומה 1', x: 350, y: 50,  w: 30,  h: 420, label: 'עמוד C1' },
  { id: 's3', discipline: 'struct', level: 'קומה 1', x: 130, y: 290, w: 440, h: 28, label: 'קורה B2' },
  // MEP Plumbing
  { id: 'p1', discipline: 'mep_plumb', level: 'קומה 1', x: 200, y: 145, w: 180, h: 16, label: 'צינור קר D110' },
  { id: 'p2', discipline: 'mep_plumb', level: 'קומה 1', x: 360, y: 60,  w: 16,  h: 290, label: 'עמוד צנרת V1' },
  // HVAC ducts
  { id: 'h1', discipline: 'mep_hvac', level: 'קומה 1', x: 150, y: 300, w: 280, h: 25, label: 'תעלת אספקה SA-1' },
  { id: 'h2', discipline: 'mep_hvac', level: 'קומה 1', x: 440, y: 120, w: 25,  h: 200, label: 'תעלת RA-1' },
  // Electrical
  { id: 'e1', discipline: 'mep_elec', level: 'קומה 1', x: 355, y: 100, w: 24,  h: 200, label: 'תעלת כבלים EL-1' },
  { id: 'e2', discipline: 'mep_elec', level: 'קומה 1', x: 90,  y: 300, w: 350, h: 18, label: 'כבל אמת CW-2' },
]

const ASSIGNEES = ['', 'יוסי כהן', 'מירה לוי', 'אבי גולן', 'שרה דוד', 'נדב ברק']

export function ClashDetective() {
  const svgRef = useRef<SVGSVGElement>(null)

  const [elements, setElements] = useState<ElementBox[]>(SEED)
  const [clashes, setClashes] = useState<Clash[]>([])
  const [activeLayer, setActiveLayer] = useState<DisciplineKey>('mep_plumb')
  const [activeLevel, setActiveLevel] = useState<Level>('קומה 1')
  const [visible, setVisible] = useState<Record<DisciplineKey, boolean>>({
    arch: true, struct: true, mep_plumb: true, mep_hvac: true, mep_elec: true,
  })
  const [selectedClash, setSelectedClash] = useState<string | null>(null)
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<ClashStatus | 'all'>('all')
  const [showCommentPanel, setShowCommentPanel] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [showRules, setShowRules] = useState(false)
  const [tolerance, setTolerance] = useState(0)
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [viewMode, setViewMode] = useState<'plan' | '3d-hint'>('plan')
  const [showFilters, setShowFilters] = useState(false)

  // drag-to-create
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null)
  const [preview, setPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  const runDetection = useCallback((els: ElementBox[], tol = tolerance) => {
    const adjusted = tol > 0
      ? els.map(e => ({ ...e, x: e.x - tol, y: e.y - tol, w: e.w + tol * 2, h: e.h + tol * 2 }))
      : els
    setClashes(prev => {
      const fresh = detectClashes(adjusted)
      return fresh.map(c => {
        const old = prev.find(p => (p.a === c.a && p.b === c.b) || (p.a === c.b && p.b === c.a))
        return old ? { ...c, id: old.id, status: old.status, comments: old.comments, assignedTo: old.assignedTo } : c
      })
    })
  }, [tolerance])

  useEffect(() => { setClashes(detectClashes(SEED)) }, [])

  function animatedScan() {
    setScanning(true)
    setScanProgress(0)
    let p = 0
    const iv = setInterval(() => {
      p += Math.random() * 18 + 5
      if (p >= 100) {
        clearInterval(iv)
        setScanProgress(100)
        setTimeout(() => { setScanning(false); runDetection(elements) }, 300)
      } else {
        setScanProgress(Math.min(p, 95))
      }
    }, 80)
  }

  function getCoords(e: React.MouseEvent) {
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
    setPreview({ x: Math.min(anchor.x, x), y: Math.min(anchor.y, y), w: Math.abs(x - anchor.x), h: Math.abs(y - anchor.y) })
  }

  function onMouseUp() {
    if (anchor && preview && preview.w >= 12 && preview.h >= 12) {
      const el: ElementBox = { id: `EL-${uid()}`, discipline: activeLayer, level: activeLevel, x: preview.x, y: preview.y, w: preview.w, h: preview.h }
      setElements(prev => { const next = [...prev, el]; runDetection(next); return next })
    }
    setAnchor(null); setPreview(null)
  }

  function cycleStatus(id: string) {
    setClashes(prev => prev.map(c => {
      if (c.id !== id) return c
      return { ...c, status: STATUS_ORDER[(STATUS_ORDER.indexOf(c.status) + 1) % STATUS_ORDER.length] }
    }))
  }

  function addComment(clashId: string) {
    if (!newComment.trim()) return
    setClashes(prev => prev.map(c => c.id !== clashId ? c : {
      ...c,
      comments: [...c.comments, { author: 'אני', date: new Date().toLocaleDateString('he-IL'), text: newComment.trim() }],
    }))
    setNewComment('')
  }

  function exportCsv() {
    const header = ['מס', 'מזהה', 'שכבה A', 'שכבה B', 'קומה', 'שטח (יח"ר)', 'חומרה', 'סטטוס', 'מוקצה ל']
    const rows = clashes.map((c, i) => [
      String(i + 1), c.id,
      DISCIPLINES[c.da].label, DISCIPLINES[c.db].label,
      c.levelA,
      Math.round(c.area).toString(),
      SEVERITY_META[c.severity].label,
      STATUS_META[c.status].label,
      c.assignedTo || '—',
    ])
    const csv = [header, ...rows].map(r => r.map(f => `"${String(f).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.download = `clash-report-${new Date().toISOString().slice(0, 10)}.csv`
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    a.click()
  }

  function exportPdf() {
    const win = window.open('', '_blank')
    if (!win) return
    const rows = visibleClashes.map((c, i) => `
      <tr>
        <td>${i + 1}</td><td>${c.id}</td>
        <td>${DISCIPLINES[c.da].label}</td><td>${DISCIPLINES[c.db].label}</td>
        <td>${c.levelA}</td><td>${Math.round(c.area)}</td>
        <td>${SEVERITY_META[c.severity].label}</td>
        <td>${STATUS_META[c.status].label}</td>
        <td>${c.assignedTo || '—'}</td>
      </tr>`).join('')
    win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8">
      <title>דוח התנגשויות BIM</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;direction:rtl}
        h1{font-size:18px;color:#1e293b}table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:right}
        th{background:#f1f5f9;font-weight:bold}</style></head>
      <body><h1>דוח התנגשויות BIM — ${new Date().toLocaleDateString('he-IL')}</h1>
      <p>סה"כ: ${total} | חמורות: ${hard} | טופלו: ${resolved}</p>
      <table><thead><tr><th>#</th><th>מזהה</th><th>שכבה A</th><th>שכבה B</th><th>קומה</th><th>שטח</th><th>חומרה</th><th>סטטוס</th><th>אחראי</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`)
    win.document.close()
    win.print()
  }

  const total    = clashes.length
  const hard     = clashes.filter(c => c.severity === 'hard').length
  const medium   = clashes.filter(c => c.severity === 'medium').length
  const resolved = clashes.filter(c => c.status === 'resolved').length
  const pct      = total > 0 ? Math.round((resolved / total) * 100) : 0

  const visibleClashes = clashes.filter(c => {
    if (filterSeverity !== 'all' && c.severity !== filterSeverity) return false
    if (filterStatus !== 'all' && c.status !== filterStatus) return false
    return true
  })

  const sel = clashes.find(c => c.id === selectedClash) ?? null
  const highlightIds = new Set(sel ? [sel.a, sel.b] : [])

  return (
    <div className="flex flex-col gap-3" dir="rtl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-800 rounded-xl px-3 py-2">
        {/* Discipline selector */}
        <span className="text-slate-400 text-xs font-medium ml-1">שכבה:</span>
        {DISCIPLINE_KEYS.map(k => (
          <div key={k} className="flex items-center">
            <button onClick={() => setActiveLayer(k)} title={DISCIPLINES[k].label}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-r-lg text-xs font-medium transition ${activeLayer === k ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: DISCIPLINES[k].color }} />
              {DISCIPLINES[k].labelShort}
            </button>
            <button onClick={() => setVisible(v => ({ ...v, [k]: !v[k] }))} title={visible[k] ? 'הסתר' : 'הצג'}
              className="p-1.5 rounded-l-lg text-slate-300 hover:bg-slate-700 transition">
              {visible[k] ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
          </div>
        ))}

        <div className="w-px h-5 bg-slate-600" />

        {/* Level selector */}
        <select value={activeLevel} onChange={e => setActiveLevel(e.target.value as Level)}
          className="bg-slate-700 text-white text-xs rounded-lg px-2 py-1.5 border-0">
          {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        <div className="w-px h-5 bg-slate-600" />

        <button onClick={animatedScan} disabled={scanning}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition">
          <Play className="w-3.5 h-3.5" />
          {scanning ? `סורק... ${Math.round(scanProgress)}%` : 'הרץ בדיקה'}
        </button>

        <button onClick={() => setShowRules(r => !r)} title="הגדרות סבילות"
          className="p-2 rounded-lg text-slate-300 hover:bg-slate-700 transition">
          <Settings className="w-3.5 h-3.5" />
        </button>

        <button onClick={() => { setElements([]); setClashes([]); setSelectedClash(null) }} title="נקה"
          className="p-2 rounded-lg text-slate-300 hover:bg-slate-700 transition">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button onClick={() => { setElements(SEED); setClashes(detectClashes(SEED)); setSelectedClash(null) }} title="טען דוגמה"
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-slate-300 hover:bg-slate-700 text-xs transition">
          <Upload className="w-3 h-3" /> טען IFC
        </button>

        <div className="flex-1" />

        <button onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition ${showFilters ? 'bg-slate-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
          <Filter className="w-3.5 h-3.5" /> סינון
        </button>
        <button onClick={exportCsv} disabled={clashes.length === 0}
          className="flex items-center gap-1.5 px-2 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-30 text-white rounded-lg text-xs font-medium transition">
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
        <button onClick={exportPdf} disabled={clashes.length === 0}
          className="flex items-center gap-1.5 px-2 py-1.5 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-30 text-white rounded-lg text-xs font-medium transition">
          <FileText className="w-3.5 h-3.5" /> PDF
        </button>
      </div>

      {/* Rules bar */}
      {showRules && (
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
          <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><Settings className="w-3.5 h-3.5" /> כללי בדיקה</span>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>סבילות:</span>
            <input type="range" min={0} max={20} value={tolerance} onChange={e => setTolerance(Number(e.target.value))} className="w-28 accent-blue-500" />
            <span className="w-8 font-mono">{tolerance}px</span>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <input type="checkbox" defaultChecked className="accent-blue-500" /> בדוק אדריכלות vs קונסטרוקציה
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <input type="checkbox" defaultChecked className="accent-blue-500" /> בדוק MEP vs MEP
          </label>
        </div>
      )}

      {/* Filter bar */}
      {showFilters && (
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
          <span className="text-xs font-semibold text-slate-500">חומרה:</span>
          {(['all', 'hard', 'medium', 'soft'] as const).map(s => (
            <button key={s} onClick={() => setFilterSeverity(s)}
              className={`text-xs px-2 py-0.5 rounded-full border transition ${filterSeverity === s ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
              {s === 'all' ? 'הכל' : SEVERITY_META[s].label}
            </button>
          ))}
          <span className="text-xs font-semibold text-slate-500 mr-2">סטטוס:</span>
          {(['all', 'new', 'active', 'reviewed', 'resolved'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`text-xs px-2 py-0.5 rounded-full border transition ${filterStatus === s ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
              {s === 'all' ? 'הכל' : STATUS_META[s].label}
            </button>
          ))}
        </div>
      )}

      {/* Scan progress */}
      {scanning && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-blue-700 font-medium">סורק קולידציות BIM...</span>
            <span className="text-xs text-blue-500">{Math.round(scanProgress)}%</span>
          </div>
          <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-100" style={{ width: `${scanProgress}%` }} />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {/* SVG plan view */}
        <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden bg-white">
          {/* View mode tabs */}
          <div className="flex border-b border-slate-100">
            {(['plan', '3d-hint'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 text-xs font-medium transition ${viewMode === m ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                {m === 'plan' ? '📐 תוכנית' : '🧊 3D (בקרוב)'}
              </button>
            ))}
            <span className="ml-auto px-3 py-1.5 text-[10px] text-slate-400">{activeLevel}</span>
          </div>

          {viewMode === '3d-hint' ? (
            <div className="h-[480px] flex flex-col items-center justify-center gap-3 bg-slate-900 text-white">
              <div className="text-5xl">🧊</div>
              <p className="font-semibold">תצוגת 3D BIM</p>
              <p className="text-sm text-white/60">בקרוב — טען GLB/IFC בכלי הצפייה 3D</p>
            </div>
          ) : (
            <svg
              ref={svgRef}
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="w-full"
              style={{ height: 480, display: 'block', cursor: 'crosshair', touchAction: 'none' }}
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

              {elements.filter(el => el.level === activeLevel).map(el => {
                if (!visible[el.discipline]) return null
                const d = DISCIPLINES[el.discipline]
                const hot = highlightIds.has(el.id)
                return (
                  <g key={el.id}>
                    <rect x={el.x} y={el.y} width={el.w} height={el.h}
                      fill={d.fill} fillOpacity={0.75}
                      stroke={hot ? '#dc2626' : d.color}
                      strokeWidth={hot ? 3 : 1.5} rx={2} />
                    {el.label && el.w > 60 && (
                      <text x={el.x + el.w / 2} y={el.y + el.h / 2 + 4} textAnchor="middle"
                        fontSize={9} fill={d.color} fontWeight="600">
                        {el.label}
                      </text>
                    )}
                  </g>
                )
              })}

              {clashes.filter(c => c.levelA === activeLevel).map(c => {
                if (!visible[c.da] || !visible[c.db]) return null
                const isSel = c.id === selectedClash
                if (selectedClash && !isSel) return null
                return (
                  <g key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedClash(isSel ? null : c.id)}>
                    <rect x={c.ox} y={c.oy} width={c.ow} height={c.oh}
                      fill="#dc2626" fillOpacity={isSel ? 0.55 : 0.35}
                      stroke="#b91c1c" strokeWidth={isSel ? 2 : 1} />
                    {isSel && (
                      <text x={c.ox + c.ow / 2} y={c.oy + c.oh / 2 + 4} textAnchor="middle"
                        fontSize={9} fill="white" fontWeight="bold">{c.id}</text>
                    )}
                  </g>
                )
              })}

              {preview && preview.w > 0 && preview.h > 0 && (
                <rect x={preview.x} y={preview.y} width={preview.w} height={preview.h}
                  fill={DISCIPLINES[activeLayer].fill} fillOpacity={0.5}
                  stroke={DISCIPLINES[activeLayer].color} strokeWidth={2} strokeDasharray="6 3" />
              )}

              {elements.filter(e => e.level === activeLevel).length === 0 && (
                <text x={SVG_W / 2} y={SVG_H / 2} textAnchor="middle" fontSize={13} fill="#94a3b8">
                  גרור ליצירת אלמנט בשכבת «{DISCIPLINES[activeLayer].label}» | {activeLevel}
                </text>
              )}
            </svg>
          )}
        </div>

        {/* Right panel */}
        <div className="w-80 shrink-0 flex flex-col gap-2">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-1">
            <div className="bg-white border border-slate-200 rounded-xl px-2 py-2 text-center">
              <p className="text-base font-bold text-slate-800">{total}</p>
              <p className="text-[10px] text-slate-400">סה"כ</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-2 py-2 text-center">
              <p className="text-base font-bold text-red-600">{hard}</p>
              <p className="text-[10px] text-slate-400">חמורות</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-2 py-2 text-center">
              <p className="text-base font-bold text-orange-600">{medium}</p>
              <p className="text-[10px] text-slate-400">בינוניות</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-2 py-2 text-center">
              <p className="text-base font-bold text-green-600">{resolved}</p>
              <p className="text-[10px] text-slate-400">טופלו</p>
            </div>
          </div>

          {/* Progress bar */}
          {total > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl px-3 py-2">
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>קדמת טיפול</span><span>{pct}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {/* Selected clash detail */}
          {sel && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-800">{sel.id}</span>
                <button onClick={() => setSelectedClash(null)} className="text-blue-400 hover:text-blue-600 text-lg leading-none">×</button>
              </div>
              <div className="flex gap-1.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${SEVERITY_META[sel.severity].cls}`}>{SEVERITY_META[sel.severity].label}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_META[sel.status].cls}`}>{STATUS_META[sel.status].label}</span>
              </div>
              <div className="text-[11px] text-slate-600 space-y-0.5">
                <div className="flex gap-1"><span style={{ color: DISCIPLINES[sel.da].color }}>{DISCIPLINES[sel.da].label}</span><span>✕</span><span style={{ color: DISCIPLINES[sel.db].color }}>{DISCIPLINES[sel.db].label}</span></div>
                <div>קומה: {sel.levelA} | שטח: {Math.round(sel.area)} יח"ר</div>
              </div>
              <div className="flex gap-1">
                <select value={sel.assignedTo} onChange={e => setClashes(prev => prev.map(c => c.id === sel.id ? { ...c, assignedTo: e.target.value } : c))}
                  className="flex-1 text-[10px] border border-slate-200 rounded-lg px-1.5 py-1">
                  {ASSIGNEES.map(a => <option key={a} value={a}>{a || 'הקצה לאחראי...'}</option>)}
                </select>
                <button onClick={() => cycleStatus(sel.id)}
                  className={`text-[10px] px-2 py-1 rounded-lg border font-medium transition ${STATUS_META[sel.status].cls}`}>
                  הבא ›
                </button>
              </div>
              <button onClick={() => setShowCommentPanel(p => !p)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-blue-700 hover:bg-blue-100 rounded-lg transition">
                <MessageSquare className="w-3.5 h-3.5" /> הערות ({sel.comments.length})
                {showCommentPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showCommentPanel && (
                <div className="space-y-1.5">
                  {sel.comments.map((cm, i) => (
                    <div key={i} className="bg-white rounded-lg px-2 py-1.5 text-[11px] border border-blue-100">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                        <span>{cm.author}</span><span>{cm.date}</span>
                      </div>
                      <p className="text-slate-700">{cm.text}</p>
                    </div>
                  ))}
                  <div className="flex gap-1">
                    <input value={newComment} onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addComment(sel.id)}
                      placeholder="הוסף הערה..." className="flex-1 text-[11px] border border-slate-200 rounded-lg px-2 py-1" />
                    <button onClick={() => addComment(sel.id)} className="px-2 py-1 bg-blue-600 text-white rounded-lg text-[11px]">שלח</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Clash list */}
          <div className="bg-white border border-slate-200 rounded-xl p-2 flex flex-col gap-1 overflow-auto flex-1" style={{ maxHeight: sel ? 200 : 380 }}>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 px-1 mb-0.5">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
              דוח התנגשויות
              <span className="text-slate-400 font-normal">({visibleClashes.length})</span>
            </p>
            {visibleClashes.length === 0 ? (
              <p className="text-xs text-slate-400 px-1 py-4 text-center">אין התנגשויות מסוננות</p>
            ) : visibleClashes.map((c, i) => {
              const isSel = c.id === selectedClash
              const sev = SEVERITY_META[c.severity]
              const st  = STATUS_META[c.status]
              return (
                <div key={c.id} onClick={() => { setSelectedClash(isSel ? null : c.id); setShowCommentPanel(false) }}
                  className={`rounded-lg border px-2 py-1.5 cursor-pointer transition ${isSel ? 'border-blue-400 bg-blue-50' : 'border-slate-100 hover:bg-slate-50'}`}>
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                      <span className="w-2 h-2 rounded-full" style={{ background: sev.dot }} />
                      {c.id}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${sev.cls}`}>{sev.label}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400">
                    <span style={{ color: DISCIPLINES[c.da].color }}>{DISCIPLINES[c.da].labelShort}</span>
                    <span>✕</span>
                    <span style={{ color: DISCIPLINES[c.db].color }}>{DISCIPLINES[c.db].labelShort}</span>
                    <span className="mr-auto">{c.levelA}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    {c.assignedTo && <span className="text-[10px] text-slate-400">{c.assignedTo}</span>}
                    <button onClick={e => { e.stopPropagation(); cycleStatus(c.id) }}
                      className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border transition ${st.cls} mr-auto`}>
                      {c.status === 'resolved' && <CheckCircle className="w-2.5 h-2.5" />}
                      {st.label}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
            <p className="text-[10px] font-semibold text-slate-500 mb-1">מקרא שכבות</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {DISCIPLINE_KEYS.map(k => (
                <div key={k} className="flex items-center justify-between text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm border border-slate-300 shrink-0" style={{ background: DISCIPLINES[k].fill }} />
                    {DISCIPLINES[k].labelShort}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
