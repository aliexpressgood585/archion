import { useRef, useState, useEffect, useCallback } from 'react'
import {
  Sun, Building2, Play, RotateCcw, Download, Plus, Trash2, Clock, Mountain,
} from 'lucide-react'

// ---- Constants ----
const CANVAS_W = 600
const CANVAS_H = 500
const CELL = 10          // px per ground grid cell
const SCALE = 5          // px per meter (1m = 5px)
const COLS = Math.floor(CANVAS_W / CELL)
const ROWS = Math.floor(CANVAS_H / CELL)
const DAY_START = 6      // 06:00
const DAY_END = 18       // 18:00
const SUN_SAMPLES = 13   // sun positions sampled across the day
const LATITUDE = 32      // Israel ~32°N

const MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]

interface Building {
  id: string
  x: number      // px (top-left)
  y: number
  w: number      // px
  d: number      // px (depth)
  height: number // meters
}

interface DragState {
  id: string
  mode: 'move' | 'resize' | 'create'
  startX: number
  startY: number
  origX: number
  origY: number
  origW: number
  origD: number
}

function uid() { return Math.random().toString(36).slice(2) }

// ---- Sun model ----
// Solar declination (deg) by month index (approx mid-month value).
const DECLINATION = [-20.9, -13, -2.4, 9.4, 18.8, 23.1, 21.2, 13.5, 2.2, -9.6, -18.9, -23]

// Returns sun altitude (rad) and azimuth (rad, measured from south, +west / -east)
// for a given hour and month at LATITUDE. Northern hemisphere: noon sun in the south.
function sunPosition(hour: number, month: number) {
  const lat = (LATITUDE * Math.PI) / 180
  const dec = (DECLINATION[month] * Math.PI) / 180
  const H = ((hour - 12) * 15 * Math.PI) / 180 // hour angle (rad), 15°/hour
  const sinAlt =
    Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H)
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt)))
  // azimuth measured from south, positive toward west
  const cosAz =
    (Math.sin(dec) - Math.sin(altitude) * Math.sin(lat)) /
    (Math.cos(altitude) * Math.cos(lat) || 1e-6)
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz)))
  if (H < 0) az = -az // morning -> sun in the east (negative)
  return { altitude, azimuth: az }
}

// Direction (in screen px space) pointing from a ground point TOWARD the sun.
// Screen: +x = east (right), +y = south (down). Sun azimuth from south.
function sunScreenDir(azimuth: number) {
  // toward-sun vector: south component = cos(az), east component = sin(az)
  const east = Math.sin(azimuth)
  const south = Math.cos(azimuth)
  // screen: x grows east, y grows south
  return { dx: east, dy: south }
}

// ---- Colormap: 0 (shaded) -> 1 (full sun) ----
function colormap(t: number): [number, number, number] {
  // deep blue/purple -> cyan -> green -> yellow -> red
  const stops: Array<[number, [number, number, number]]> = [
    [0.0, [49, 46, 129]],   // indigo-900
    [0.25, [37, 99, 235]],  // blue-600
    [0.5, [16, 185, 129]],  // emerald-500
    [0.75, [250, 204, 21]], // yellow-400
    [1.0, [239, 68, 68]],   // red-500
  ]
  const tc = Math.max(0, Math.min(1, t))
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i]
    const [b, cb] = stops[i + 1]
    if (tc >= a && tc <= b) {
      const f = (tc - a) / (b - a || 1)
      return [
        Math.round(ca[0] + (cb[0] - ca[0]) * f),
        Math.round(ca[1] + (cb[1] - ca[1]) * f),
        Math.round(ca[2] + (cb[2] - ca[2]) * f),
      ]
    }
  }
  return stops[stops.length - 1][1]
}

const DEFAULT_BUILDINGS: Building[] = [
  { id: uid(), x: 120, y: 130, w: 90, d: 70, height: 24 },
  { id: uid(), x: 300, y: 90, w: 70, d: 110, height: 36 },
  { id: uid(), x: 250, y: 280, w: 120, d: 80, height: 14 },
]

export function FormaAnalysis() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [buildings, setBuildings] = useState<Building[]>(DEFAULT_BUILDINGS)
  const [hour, setHour] = useState(12)
  const [month, setMonth] = useState(5) // June
  const [heatmap, setHeatmap] = useState<Float32Array | null>(null)
  const [metrics, setMetrics] = useState<{ avgHours: number; goodPct: number; shadePct: number } | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  // ---- Core analysis: compute per-cell fraction of daylight with direct sun ----
  const runAnalysis = useCallback((bs: Building[]): Float32Array => {
    const grid = new Float32Array(COLS * ROWS)

    // Precompute valid (above-horizon) sun samples for the chosen month.
    const samples: Array<{ altitude: number; dir: { dx: number; dy: number } }> = []
    for (let s = 0; s < SUN_SAMPLES; s++) {
      const h = DAY_START + (s / (SUN_SAMPLES - 1)) * (DAY_END - DAY_START)
      const { altitude, azimuth } = sunPosition(h, month)
      if (altitude <= 0.02) continue // sun below horizon -> no direct light
      samples.push({ altitude, dir: sunScreenDir(azimuth) })
    }
    const totalSamples = samples.length || 1

    for (let cy = 0; cy < ROWS; cy++) {
      for (let cx = 0; cx < COLS; cx++) {
        // ground point at cell center (px)
        const px = cx * CELL + CELL / 2
        const py = cy * CELL + CELL / 2
        let litCount = 0

        for (const { altitude, dir } of samples) {
          const tanAlt = Math.tan(altitude)
          let blocked = false
          // March from the cell toward the sun, step by step, looking for an
          // occluding building. Max shadow reach ~ tallest building / tan(alt).
          const maxH = 60 // generous cap (m)
          const maxDistPx = (maxH / Math.max(tanAlt, 1e-3)) * SCALE
          const stepPx = CELL / 2
          const steps = Math.min(400, Math.ceil(maxDistPx / stepPx))
          for (let st = 1; st <= steps && !blocked; st++) {
            const sx = px + dir.dx * stepPx * st
            const sy = py + dir.dy * stepPx * st
            if (sx < 0 || sx > CANVAS_W || sy < 0 || sy > CANVAS_H) {
              if (sx < -50 || sx > CANVAS_W + 50 || sy < -50 || sy > CANVAS_H + 50) break
            }
            const distM = (Math.hypot(sx - px, sy - py)) / SCALE
            const neededH = distM * tanAlt // building height needed to occlude
            for (const b of bs) {
              if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.d) {
                if (b.height >= neededH) { blocked = true }
                break
              }
            }
          }
          if (!blocked) litCount++
        }
        grid[cy * COLS + cx] = litCount / totalSamples
      }
    }
    return grid
  }, [month])

  const doRun = useCallback(() => {
    const grid = runAnalysis(buildings)
    setHeatmap(grid)
    // metrics
    let sum = 0, good = 0, shade = 0
    const daylight = DAY_END - DAY_START
    for (let i = 0; i < grid.length; i++) {
      sum += grid[i]
      if (grid[i] > 0.5) good++
      if (grid[i] < 0.25) shade++
    }
    const n = grid.length
    setMetrics({
      avgHours: (sum / n) * daylight,
      goodPct: (good / n) * 100,
      shadePct: (shade / n) * 100,
    })
  }, [buildings, runAnalysis])

  // initial analysis on mount
  useEffect(() => {
    doRun()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Rendering ----
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.fillStyle = '#f1f5f9'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // heatmap cells
    if (heatmap) {
      for (let cy = 0; cy < ROWS; cy++) {
        for (let cx = 0; cx < COLS; cx++) {
          const v = heatmap[cy * COLS + cx]
          const [r, g, b] = colormap(v)
          ctx.fillStyle = `rgb(${r},${g},${b})`
          ctx.fillRect(cx * CELL, cy * CELL, CELL, CELL)
        }
      }
    }

    // grid lines (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    for (let x = 0; x <= CANVAS_W; x += CELL * 4) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke()
    }
    for (let y = 0; y <= CANVAS_H; y += CELL * 4) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke()
    }

    // buildings
    for (const b of buildings) {
      ctx.fillStyle = selected === b.id ? 'rgba(71,85,105,0.92)' : 'rgba(51,65,85,0.9)'
      ctx.fillRect(b.x, b.y, b.w, b.d)
      ctx.strokeStyle = selected === b.id ? '#3b82f6' : '#1e293b'
      ctx.lineWidth = selected === b.id ? 2 : 1.5
      ctx.strokeRect(b.x, b.y, b.w, b.d)
      // height label
      ctx.fillStyle = '#f8fafc'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${b.height}מ׳`, b.x + b.w / 2, b.y + b.d / 2)
      // resize handle
      if (selected === b.id) {
        ctx.fillStyle = '#3b82f6'
        ctx.fillRect(b.x + b.w - 5, b.y + b.d - 5, 10, 10)
      }
    }

    // sun direction indicator (arrow from center toward sun)
    const { altitude, azimuth } = sunPosition(hour, month)
    if (altitude > 0) {
      const dir = sunScreenDir(azimuth)
      const cxp = CANVAS_W / 2, cyp = CANVAS_H / 2
      const len = 36
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(cxp, cyp)
      ctx.lineTo(cxp + dir.dx * len, cyp + dir.dy * len)
      ctx.stroke()
    }
  }, [buildings, heatmap, selected, hour, month])

  // ---- Mouse interaction (move / resize / create buildings) ----
  function getCoords(e: React.MouseEvent) {
    const cv = canvasRef.current
    if (!cv) return { x: 0, y: 0 }
    const rect = cv.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    }
  }

  function onMouseDown(e: React.MouseEvent) {
    const { x, y } = getCoords(e)
    // check resize handle of selected
    if (selected) {
      const b = buildings.find(bb => bb.id === selected)
      if (b && x >= b.x + b.w - 8 && x <= b.x + b.w + 4 && y >= b.y + b.d - 8 && y <= b.y + b.d + 4) {
        setDrag({ id: b.id, mode: 'resize', startX: x, startY: y, origX: b.x, origY: b.y, origW: b.w, origD: b.d })
        return
      }
    }
    const hit = [...buildings].reverse().find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.d)
    if (hit) {
      setSelected(hit.id)
      setDrag({ id: hit.id, mode: 'move', startX: x, startY: y, origX: hit.x, origY: hit.y, origW: hit.w, origD: hit.d })
    } else {
      // start creating a new building by drag
      const id = uid()
      setBuildings(prev => [...prev, { id, x, y, w: 1, d: 1, height: 12 }])
      setSelected(id)
      setDrag({ id, mode: 'create', startX: x, startY: y, origX: x, origY: y, origW: 0, origD: 0 })
    }
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!drag) return
    const { x, y } = getCoords(e)
    const dx = x - drag.startX
    const dy = y - drag.startY
    setBuildings(prev => prev.map(b => {
      if (b.id !== drag.id) return b
      if (drag.mode === 'move') {
        return { ...b, x: Math.max(0, Math.min(CANVAS_W - b.w, drag.origX + dx)), y: Math.max(0, Math.min(CANVAS_H - b.d, drag.origY + dy)) }
      }
      if (drag.mode === 'resize') {
        return { ...b, w: Math.max(20, drag.origW + dx), d: Math.max(20, drag.origD + dy) }
      }
      // create
      return {
        ...b,
        x: Math.min(drag.startX, x),
        y: Math.min(drag.startY, y),
        w: Math.max(8, Math.abs(x - drag.startX)),
        d: Math.max(8, Math.abs(y - drag.startY)),
      }
    }))
  }

  function onMouseUp() {
    if (drag && drag.mode === 'create') {
      // discard too-small accidental buildings
      setBuildings(prev => prev.filter(b => !(b.id === drag.id && (b.w < 16 || b.d < 16))))
    }
    setDrag(null)
  }

  // ---- Actions ----
  function addBuilding() {
    const id = uid()
    setBuildings(prev => [...prev, { id, x: CANVAS_W / 2 - 45, y: CANVAS_H / 2 - 35, w: 90, d: 70, height: 12 }])
    setSelected(id)
  }

  function deleteBuilding(id: string) {
    setBuildings(prev => prev.filter(b => b.id !== id))
    if (selected === id) setSelected(null)
  }

  function setHeight(id: string, height: number) {
    setBuildings(prev => prev.map(b => b.id === id ? { ...b, height } : b))
  }

  function resetScene() {
    setBuildings(DEFAULT_BUILDINGS.map(b => ({ ...b, id: uid() })))
    setHeatmap(null)
    setMetrics(null)
    setSelected(null)
  }

  function exportPng() {
    const cv = canvasRef.current
    if (!cv) return
    const url = cv.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = 'forma-solar-analysis.png'
    a.click()
  }

  const sun = sunPosition(hour, month)
  const altDeg = Math.round((sun.altitude * 180) / Math.PI)

  return (
    <div dir="rtl" className="flex h-full flex-col gap-3 bg-slate-50 p-3 text-slate-800">
      {/* Toolbar */}
      <div className="flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2">
        <Sun className="h-5 w-5 text-amber-400" />
        <span className="ml-2 text-sm font-semibold text-slate-100">ניתוח חשיפה לשמש</span>
        <div className="mx-2 h-5 w-px bg-slate-700" />
        <button onClick={addBuilding} className="flex items-center gap-1 rounded-lg p-2 text-sm text-slate-300 hover:bg-slate-700" title="הוסף מבנה">
          <Plus className="h-4 w-4" /> מבנה
        </button>
        <button onClick={doRun} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500" title="הרץ ניתוח">
          <Play className="h-4 w-4" /> הרץ ניתוח
        </button>
        <button onClick={resetScene} className="rounded-lg p-2 text-slate-300 hover:bg-slate-700" title="איפוס">
          <RotateCcw className="h-4 w-4" />
        </button>
        <button onClick={exportPng} className="flex items-center gap-1 rounded-lg p-2 text-sm text-slate-300 hover:bg-slate-700" title="ייצוא PNG">
          <Download className="h-4 w-4" /> ייצוא PNG
        </button>
      </div>

      <div className="flex flex-1 gap-3 overflow-hidden">
        {/* Canvas + legend */}
        <div className="flex flex-col gap-2">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            className="cursor-crosshair rounded-2xl border border-slate-200 shadow-sm"
            style={{ width: CANVAS_W, height: CANVAS_H }}
          />
          {/* Legend */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <span className="text-xs text-slate-500">צל מלא</span>
            <div
              className="h-3 flex-1 rounded-full"
              style={{ background: 'linear-gradient(to left, rgb(49,46,129), rgb(37,99,235), rgb(16,185,129), rgb(250,204,21), rgb(239,68,68))' }}
            />
            <span className="text-xs text-slate-500">שמש מלאה</span>
            <span className="mr-2 text-[11px] text-slate-400">קנה מידה: 1מ׳ = {SCALE}px</span>
          </div>
        </div>

        {/* Side panel */}
        <div className="flex w-72 flex-col gap-3 overflow-y-auto">
          {/* Sun controls */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Sun className="h-4 w-4 text-amber-500" /> בקרת שמש
            </div>
            <label className="mb-1 flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" /> שעה: {String(hour).padStart(2, '0')}:00
            </label>
            <input
              type="range" min={DAY_START} max={DAY_END} step={1} value={hour}
              onChange={e => setHour(Number(e.target.value))}
              className="mb-3 w-full accent-amber-500"
            />
            <label className="mb-1 block text-xs text-slate-500">חודש</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="mb-2 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
            >
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Mountain className="h-3 w-3" /> גובה השמש: {altDeg > 0 ? `${altDeg}°` : 'מתחת לאופק'}
            </div>
          </div>

          {/* Metrics */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="mb-2 text-sm font-semibold text-slate-700">מדדים</div>
            {metrics ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">ממוצע שעות שמש</span>
                  <span className="font-semibold">{metrics.avgHours.toFixed(1)} שע׳</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">שטח מואר (&gt;50%)</span>
                  <span className="font-semibold text-emerald-600">{metrics.goodPct.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">שטח מוצל (&lt;25%)</span>
                  <span className="font-semibold text-indigo-600">{metrics.shadePct.toFixed(0)}%</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">הרץ ניתוח לקבלת מדדים</p>
            )}
          </div>

          {/* Buildings list */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Building2 className="h-4 w-4 text-slate-500" /> מבנים ({buildings.length})
            </div>
            <div className="space-y-2">
              {buildings.map((b, i) => (
                <div
                  key={b.id}
                  onClick={() => setSelected(b.id)}
                  className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm ${
                    selected === b.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200'
                  }`}
                >
                  <span className="text-slate-500">מבנה {i + 1}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <input
                      type="number" min={1} max={60} value={b.height}
                      onChange={e => setHeight(b.id, Math.max(1, Number(e.target.value)))}
                      onClick={e => e.stopPropagation()}
                      className="w-14 rounded border border-slate-200 px-1 py-0.5 text-xs"
                    />
                    <span className="text-xs text-slate-400">מ׳</span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteBuilding(b.id) }}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {buildings.length === 0 && (
                <p className="text-xs text-slate-400">אין מבנים. הוסף מבנה או צייר על הקנבס.</p>
              )}
            </div>
          </div>

          <p className="px-1 text-[11px] leading-relaxed text-slate-400">
            צייר מבנה על ידי גרירה בקנבס, או הזז/שנה גודל מבנה קיים. גובה המבנה משפיע על אורך הצל
            (L = h / tan(α)) לאורך כל שעות היום.
          </p>
        </div>
      </div>
    </div>
  )
}
