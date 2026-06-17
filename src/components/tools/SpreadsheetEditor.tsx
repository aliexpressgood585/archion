import { useRef, useState, useCallback, useEffect } from 'react'
import { Download, Upload, Plus, Boxes } from 'lucide-react'

const INIT_COLS = 26
const INIT_ROWS = 50
const DEFAULT_COL_W = 100
const ROW_H = 28
const ROW_HEADER_W = 48

function colLetter(i: number) {
  return String.fromCharCode(65 + i)
}

function cellId(row: number, col: number) {
  return `${colLetter(col)}${row + 1}`
}

interface CellData {
  value: string
  bold?: boolean
  italic?: boolean
}

type Cells = Record<string, CellData>

interface Selection {
  row: number
  col: number
  endRow?: number
  endCol?: number
}

function colLetterToIdx(letter: string): number {
  return letter.toUpperCase().charCodeAt(0) - 65
}

function parseCellRef(ref: string): { row: number; col: number } | null {
  const m = ref.match(/^([A-Z]+)(\d+)$/i)
  if (!m) return null
  return { col: colLetterToIdx(m[1]), row: parseInt(m[2]) - 1 }
}

function parseRange(range: string): { r1: number; c1: number; r2: number; c2: number } | null {
  const parts = range.split(':')
  if (parts.length !== 2) return null
  const a = parseCellRef(parts[0].trim())
  const b = parseCellRef(parts[1].trim())
  if (!a || !b) return null
  return { r1: Math.min(a.row, b.row), c1: Math.min(a.col, b.col), r2: Math.max(a.row, b.row), c2: Math.max(a.col, b.col) }
}

function getCellValue(cells: Cells, row: number, col: number): number {
  const raw = cells[cellId(row, col)]?.value ?? ''
  const n = parseFloat(raw)
  return isNaN(n) ? 0 : n
}

function evaluateFormula(formula: string, cells: Cells): string {
  try {
    const f = formula.slice(1).trim()

    // SUM(range)
    const sumMatch = f.match(/^SUM\(([^)]+)\)$/i)
    if (sumMatch) {
      const rng = parseRange(sumMatch[1])
      if (!rng) return '#ERR'
      let sum = 0
      for (let r = rng.r1; r <= rng.r2; r++)
        for (let c = rng.c1; c <= rng.c2; c++)
          sum += getCellValue(cells, r, c)
      return String(Math.round(sum * 10000) / 10000)
    }

    // AVERAGE(range)
    const avgMatch = f.match(/^AVERAGE\(([^)]+)\)$/i)
    if (avgMatch) {
      const rng = parseRange(avgMatch[1])
      if (!rng) return '#ERR'
      let sum = 0, count = 0
      for (let r = rng.r1; r <= rng.r2; r++)
        for (let c = rng.c1; c <= rng.c2; c++)
          { sum += getCellValue(cells, r, c); count++ }
      return count === 0 ? '0' : String(Math.round(sum / count * 10000) / 10000)
    }

    // MAX(range)
    const maxMatch = f.match(/^MAX\(([^)]+)\)$/i)
    if (maxMatch) {
      const rng = parseRange(maxMatch[1])
      if (!rng) return '#ERR'
      let max = -Infinity
      for (let r = rng.r1; r <= rng.r2; r++)
        for (let c = rng.c1; c <= rng.c2; c++)
          max = Math.max(max, getCellValue(cells, r, c))
      return max === -Infinity ? '0' : String(max)
    }

    // MIN(range)
    const minMatch = f.match(/^MIN\(([^)]+)\)$/i)
    if (minMatch) {
      const rng = parseRange(minMatch[1])
      if (!rng) return '#ERR'
      let min = Infinity
      for (let r = rng.r1; r <= rng.r2; r++)
        for (let c = rng.c1; c <= rng.c2; c++)
          min = Math.min(min, getCellValue(cells, r, c))
      return min === Infinity ? '0' : String(min)
    }

    return '#NAME?'
  } catch {
    return '#ERR'
  }
}

function displayValue(cells: Cells, row: number, col: number): string {
  const raw = cells[cellId(row, col)]?.value ?? ''
  if (raw.startsWith('=')) return evaluateFormula(raw, cells)
  return raw
}

export function SpreadsheetEditor() {
  const [cells, setCells] = useState<Cells>({})
  const [numCols, setNumCols] = useState(INIT_COLS)
  const [numRows, setNumRows] = useState(INIT_ROWS)
  const [colWidths, setColWidths] = useState<number[]>(() => Array(INIT_COLS).fill(DEFAULT_COL_W))
  const [selection, setSelection] = useState<Selection>({ row: 0, col: 0 })
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [selDragging, setSelDragging] = useState(false)
  const [resizingCol, setResizingCol] = useState<number | null>(null)
  const [resizeStartX, setResizeStartX] = useState(0)
  const [resizeStartW, setResizeStartW] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selId = cellId(selection.row, selection.col)
  const selCell = cells[selId]

  function startEdit(row: number, col: number) {
    const id = cellId(row, col)
    setEditValue(cells[id]?.value ?? '')
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function commitEdit(row: number, col: number, value: string) {
    const id = cellId(row, col)
    if (value === '' && !cells[id]) { setEditing(false); return }
    setCells(prev => ({
      ...prev,
      [id]: { ...prev[id], value },
    }))
    setEditing(false)
  }

  function toggleBold() {
    setCells(prev => ({
      ...prev,
      [selId]: { ...prev[selId], value: prev[selId]?.value ?? '', bold: !prev[selId]?.bold },
    }))
  }

  function toggleItalic() {
    setCells(prev => ({
      ...prev,
      [selId]: { ...prev[selId], value: prev[selId]?.value ?? '', italic: !prev[selId]?.italic },
    }))
  }

  // Calculate range sum for status bar
  const rangeSum = useCallback((): number | null => {
    const { row, col, endRow, endCol } = selection
    if (endRow == null || endCol == null) return null
    let sum = 0
    for (let r = Math.min(row, endRow); r <= Math.max(row, endRow); r++)
      for (let c = Math.min(col, endCol); c <= Math.max(col, endCol); c++) {
        const n = parseFloat(displayValue(cells, r, c))
        if (!isNaN(n)) sum += n
      }
    return Math.round(sum * 10000) / 10000
  }, [cells, selection])

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      const isInput = tag === 'INPUT' && (e.target as HTMLInputElement) === inputRef.current

      if (editing && isInput) {
        if (e.key === 'Enter') {
          commitEdit(selection.row, selection.col, editValue)
          setSelection(s => ({ row: Math.min(numRows - 1, s.row + 1), col: s.col }))
          e.preventDefault()
        } else if (e.key === 'Tab') {
          commitEdit(selection.row, selection.col, editValue)
          setSelection(s => ({ row: s.row, col: Math.min(numCols - 1, s.col + 1) }))
          e.preventDefault()
        } else if (e.key === 'Escape') {
          setEditing(false)
          setEditValue(cells[selId]?.value ?? '')
        }
        return
      }

      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'Tab') {
        setSelection(s => ({ row: s.row, col: Math.min(numCols - 1, s.col + 1) }))
        e.preventDefault()
      } else if (e.key === 'Enter' || e.key === 'F2') {
        startEdit(selection.row, selection.col)
        e.preventDefault()
      } else if (e.key === 'ArrowRight') {
        setEditing(false)
        setSelection(s => ({ row: s.row, col: Math.max(0, s.col - 1) }))
        e.preventDefault()
      } else if (e.key === 'ArrowLeft') {
        setEditing(false)
        setSelection(s => ({ row: s.row, col: Math.min(numCols - 1, s.col + 1) }))
        e.preventDefault()
      } else if (e.key === 'ArrowUp') {
        setEditing(false)
        setSelection(s => ({ row: Math.max(0, s.row - 1), col: s.col }))
        e.preventDefault()
      } else if (e.key === 'ArrowDown') {
        setEditing(false)
        setSelection(s => ({ row: Math.min(numRows - 1, s.row + 1), col: s.col }))
        e.preventDefault()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        setCells(prev => { const next = { ...prev }; delete next[selId]; return next })
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        setEditValue(e.key)
        setEditing(true)
        setTimeout(() => inputRef.current?.focus(), 0)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing, selection, editValue, numRows, numCols, selId, cells])

  function exportCsv() {
    const rows: string[] = []
    // Find last non-empty row to avoid exporting trailing blank rows
    let lastRow = 0
    for (let r = 0; r < numRows; r++)
      for (let c = 0; c < numCols; c++)
        if (displayValue(cells, r, c)) lastRow = r
    for (let r = 0; r <= lastRow; r++) {
      const cols: string[] = []
      for (let c = 0; c < numCols; c++) {
        const val = displayValue(cells, r, c)
        // Wrap in quotes if contains comma, quote, or newline
        cols.push(val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"` : val)
      }
      rows.push(cols.join(','))
    }
    // UTF-8 BOM (﻿) ensures Hebrew text opens correctly in Excel
    const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.download = 'spreadsheet.csv'
    a.href = URL.createObjectURL(blob)
    a.click()
  }

  function importCsv(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const lines = text.split('\n')
      const newCells: Cells = {}
      let maxCols = numCols
      lines.forEach((line, r) => {
        const cols = line.split(',').map(v => v.replace(/^"|"$/g, '').trim())
        maxCols = Math.max(maxCols, cols.length)
        cols.forEach((val, c) => {
          if (val) newCells[cellId(r, c)] = { value: val }
        })
      })
      setCells(newCells)
      setNumRows(Math.max(numRows, lines.length + 5))
      const newNumCols = Math.max(numCols, maxCols)
      setNumCols(newNumCols)
      setColWidths(Array(newNumCols).fill(DEFAULT_COL_W))
    }
    reader.readAsText(file)
  }

  function importBoq() {
    // Try to read quantities from a floor plan drawn in the Revit/AutoCAD tool
    interface FpRoom { name: string; area: number }
    interface FpSummary { rooms: FpRoom[]; totalArea: number; wallLength: number; doorCount: number; windowCount: number }
    let fp: FpSummary | null = null
    try {
      const raw = localStorage.getItem('archion_floorplan')
      if (raw) fp = JSON.parse(raw) as FpSummary
    } catch { fp = null }

    const WALL_H = 2.8 // assumed clear height in meters
    const floorArea = fp && fp.totalArea > 0 ? fp.totalArea : 120
    const wallLen = fp && fp.wallLength > 0 ? fp.wallLength : 95
    const wallArea = wallLen * WALL_H
    const doors = fp && fp.doorCount > 0 ? fp.doorCount : 8
    const windows = fp && fp.windowCount > 0 ? fp.windowCount : 10

    // Bill of Quantities rows: [section, description, unit, qty, unitPrice ₪]
    const boq: [string, string, string, number, number][] = [
      ['1', 'עבודות עפר וחפירה', 'מ"ק', Math.round(floorArea * 0.5), 85],
      ['2', 'בטון רצפה / יסודות B-30', 'מ"ק', Math.round(floorArea * 0.2 * 10) / 10, 720],
      ['3', 'בנייה — בלוקי בטון 20 ס"מ', 'מ"ר', Math.round(wallArea), 145],
      ['4', 'טיח פנים וחוץ (2 צדדים)', 'מ"ר', Math.round(wallArea * 2), 65],
      ['5', 'ריצוף — אריחי גרניט פורצלן', 'מ"ר', Math.round(floorArea), 220],
      ['6', 'צביעה — סופרקריל (קירות + תקרה)', 'מ"ר', Math.round(wallArea * 2 + floorArea), 38],
      ['7', 'דלתות פנים', 'יח׳', doors, 1450],
      ['8', 'חלונות אלומיניום + זיגוג כפול', 'יח׳', windows, 2200],
      ['9', 'איטום גגות וחדרים רטובים', 'מ"ר', Math.round(floorArea * 0.4), 95],
      ['10', 'מערכת חשמל ותאורה', 'קומפלט', 1, 28000],
      ['11', 'אינסטלציה — מים וביוב', 'קומפלט', 1, 19500],
    ]

    const newCells: Cells = {}
    const title = fp ? 'כתב כמויות — מתוך תוכנית הקומה' : 'כתב כמויות — תבנית סטנדרטית'
    newCells['A1'] = { value: title, bold: true }
    const headers = ['סעיף', 'תיאור', 'יחידה', 'כמות', 'מחיר יח׳ (₪)', 'סה"כ (₪)']
    headers.forEach((h, c) => { newCells[cellId(2, c)] = { value: h, bold: true } })

    let row = 3
    boq.forEach(([sec, desc, unit, qty, price]) => {
      newCells[cellId(row, 0)] = { value: sec }
      newCells[cellId(row, 1)] = { value: desc }
      newCells[cellId(row, 2)] = { value: unit }
      newCells[cellId(row, 3)] = { value: String(qty) }
      newCells[cellId(row, 4)] = { value: String(price) }
      newCells[cellId(row, 5)] = { value: String(Math.round(qty * price)) }
      row++
    })
    // Subtotal / VAT / total
    const firstDataRow = 4 // 1-based F4
    const lastDataRow = row // 1-based F row of last item
    newCells[cellId(row, 1)] = { value: 'סה"כ ביניים', bold: true }
    newCells[cellId(row, 5)] = { value: `=SUM(F${firstDataRow}:F${lastDataRow})`, bold: true }
    row++
    newCells[cellId(row, 1)] = { value: 'מע"מ 18%' }
    newCells[cellId(row, 5)] = { value: `=SUM(F${lastDataRow + 1}:F${lastDataRow + 1})` } // placeholder, overwritten below
    // compute VAT + grand total numerically (formula engine has no '*')
    const subtotal = boq.reduce((s, [, , , q, p]) => s + q * p, 0)
    newCells[cellId(row - 1, 5)] = { value: `=SUM(F${firstDataRow}:F${lastDataRow})`, bold: true }
    newCells[cellId(row, 5)] = { value: String(Math.round(subtotal * 0.18)) }
    row++
    newCells[cellId(row, 1)] = { value: 'סה"כ כולל מע"מ', bold: true }
    newCells[cellId(row, 5)] = { value: String(Math.round(subtotal * 1.18)), bold: true }

    setCells(newCells)
    setNumRows(Math.max(numRows, row + 6))
    const widths = Array(numCols).fill(DEFAULT_COL_W)
    widths[1] = 280 // description column wider
    widths[5] = 120
    setColWidths(widths)
    setSelection({ row: 0, col: 0 })
  }

  function onColResizeStart(e: React.MouseEvent, colIdx: number) {
    e.preventDefault()
    setResizingCol(colIdx)
    setResizeStartX(e.clientX)
    setResizeStartW(colWidths[colIdx])
  }

  useEffect(() => {
    if (resizingCol === null) return
    function onMove(e: MouseEvent) {
      const delta = e.clientX - resizeStartX
      setColWidths(ws => ws.map((w, i) => i === resizingCol ? Math.max(40, resizeStartW + delta) : w))
    }
    function onUp() { setResizingCol(null) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [resizingCol, resizeStartX, resizeStartW])

  // Address bar value
  const addrLabel = cellId(selection.row, selection.col)
  const formulaBarVal = editing ? editValue : (selCell?.value ?? '')

  const rangeS = rangeSum()

  return (
    <div className="flex flex-col" dir="rtl" style={{ userSelect: 'none' }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-800 rounded-t-xl px-3 py-2 shrink-0">
        <button
          onClick={toggleBold}
          className={`p-1.5 rounded text-xs font-bold w-7 h-7 transition ${selCell?.bold ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
          title="מודגש"
        >
          B
        </button>
        <button
          onClick={toggleItalic}
          className={`p-1.5 rounded text-xs italic w-7 h-7 transition ${selCell?.italic ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
          title="נטוי"
        >
          I
        </button>

        <div className="w-px h-5 bg-slate-600 mx-1" />

        <button
          onClick={() => { setNumRows(r => r + 10) }}
          className="flex items-center gap-1 px-2 py-1 text-slate-300 hover:bg-slate-700 rounded text-xs transition"
        >
          <Plus className="w-3 h-3" />
          שורות
        </button>
        <button
          onClick={() => {
            if (numCols >= 52) return
            setNumCols(n => n + 1)
            setColWidths(ws => [...ws, DEFAULT_COL_W])
          }}
          className="flex items-center gap-1 px-2 py-1 text-slate-300 hover:bg-slate-700 rounded text-xs transition"
        >
          <Plus className="w-3 h-3" />
          עמודה
        </button>

        <div className="w-px h-5 bg-slate-600 mx-1" />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-2 py-1 text-slate-300 hover:bg-slate-700 rounded text-xs transition"
        >
          <Upload className="w-3 h-3" />
          CSV
        </button>
        <input ref={fileInputRef} type="file" hidden accept=".csv" onChange={e => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = '' }} />

        <button
          onClick={importBoq}
          className="flex items-center gap-1 px-2 py-1 text-amber-300 hover:bg-slate-700 rounded text-xs transition"
          title="ייבא כתב כמויות מתוכנית Revit/AutoCAD"
        >
          <Boxes className="w-3 h-3" />
          ייבא BOQ
        </button>

        <div className="flex-1" />

        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
        >
          <Download className="w-3.5 h-3.5" />
          ייצוא CSV
        </button>
      </div>

      {/* Formula bar */}
      <div className="flex items-center gap-2 bg-white border-x border-slate-200 px-3 py-1.5 shrink-0">
        <div className="w-14 h-7 bg-slate-50 border border-slate-200 rounded flex items-center justify-center text-xs font-mono text-slate-600 shrink-0">
          {addrLabel}
        </div>
        <div className="w-px h-5 bg-slate-200" />
        <input
          ref={inputRef}
          value={formulaBarVal}
          onChange={e => setEditValue(e.target.value)}
          onFocus={() => { if (!editing) { setEditValue(selCell?.value ?? ''); setEditing(true) } }}
          onBlur={() => { if (editing) commitEdit(selection.row, selection.col, editValue) }}
          onKeyDown={e => {
            if (e.key === 'Enter') { commitEdit(selection.row, selection.col, editValue); e.preventDefault() }
            if (e.key === 'Escape') { setEditing(false); setEditValue(selCell?.value ?? '') }
          }}
          className="flex-1 text-xs outline-none text-slate-800 font-mono bg-transparent"
          placeholder="ערך או נוסחה (=SUM(A1:A10))"
        />
      </div>

      {/* Grid */}
      <div
        ref={tableRef}
        className="border border-slate-200 rounded-b-xl overflow-auto bg-white"
        style={{ height: 500, position: 'relative' }}
      >
        <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: ROW_HEADER_W }} />
            {Array.from({ length: numCols }, (_, i) => (
              <col key={i} style={{ width: colWidths[i] }} />
            ))}
          </colgroup>

          {/* Header row — sticky */}
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <th style={{
                width: ROW_HEADER_W, height: ROW_H,
                background: '#f8fafc', border: '1px solid #e2e8f0',
                fontSize: 11, color: '#94a3b8', textAlign: 'center',
              }} />
              {Array.from({ length: numCols }, (_, c) => (
                <th
                  key={c}
                  style={{
                    width: colWidths[c], height: ROW_H, minWidth: 40,
                    background: selection.col === c ? '#eff6ff' : '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: 11, color: '#475569', fontWeight: 600,
                    textAlign: 'center', position: 'relative', padding: 0,
                  }}
                >
                  {colLetter(c)}
                  {/* Resize handle */}
                  <div
                    style={{
                      position: 'absolute', top: 0, left: 0, width: 4, height: '100%',
                      cursor: 'col-resize', zIndex: 1,
                    }}
                    onMouseDown={e => onColResizeStart(e, c)}
                  />
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: numRows }, (_, r) => (
              <tr key={r}>
                {/* Row number */}
                <td style={{
                  width: ROW_HEADER_W, height: ROW_H,
                  background: selection.row === r ? '#eff6ff' : '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: 11, color: '#94a3b8', textAlign: 'center',
                  position: 'sticky', left: 0, zIndex: 5,
                }}>
                  {r + 1}
                </td>
                {Array.from({ length: numCols }, (_, c) => {
                  const id = cellId(r, c)
                  const cell = cells[id]
                  const isSelected = selection.row === r && selection.col === c
                  const inRange = selection.endRow != null && selection.endCol != null
                    && r >= Math.min(selection.row, selection.endRow) && r <= Math.max(selection.row, selection.endRow)
                    && c >= Math.min(selection.col, selection.endCol) && c <= Math.max(selection.col, selection.endCol)
                  const isEditing = isSelected && editing

                  return (
                    <td
                      key={c}
                      style={{
                        width: colWidths[c], height: ROW_H, minWidth: 40,
                        border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                        background: inRange && !isSelected ? '#eff6ff' : 'white',
                        padding: isEditing ? 0 : '0 4px',
                        fontSize: 12,
                        fontWeight: cell?.bold ? 700 : 400,
                        fontStyle: cell?.italic ? 'italic' : 'normal',
                        color: '#1e293b',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        position: 'relative',
                        cursor: 'default',
                        textAlign: 'left',
                        verticalAlign: 'middle',
                      }}
                      onClick={() => {
                        if (!selDragging) {
                          setEditing(false)
                          setSelection({ row: r, col: c })
                        }
                      }}
                      onDoubleClick={() => startEdit(r, c)}
                      onMouseDown={() => { setSelDragging(true); setEditing(false); setSelection({ row: r, col: c }) }}
                      onMouseEnter={() => { if (selDragging) setSelection(s => ({ ...s, endRow: r, endCol: c })) }}
                      onMouseUp={() => setSelDragging(false)}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => { if (editing) commitEdit(r, c, editValue) }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { commitEdit(r, c, editValue); setSelection(s => ({ row: Math.min(numRows - 1, s.row + 1), col: s.col })); e.preventDefault() }
                            if (e.key === 'Tab') { commitEdit(r, c, editValue); setSelection(s => ({ row: s.row, col: Math.min(numCols - 1, s.col + 1) })); e.preventDefault() }
                            if (e.key === 'Escape') { setEditing(false) }
                          }}
                          style={{
                            width: '100%', height: '100%',
                            border: 'none', outline: 'none',
                            padding: '0 4px', fontSize: 12,
                            fontWeight: cell?.bold ? 700 : 400,
                            fontStyle: cell?.italic ? 'italic' : 'normal',
                            background: 'white',
                          }}
                          autoFocus
                        />
                      ) : (
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {displayValue(cells, r, c)}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border border-t-0 border-slate-200 rounded-b-xl text-xs text-slate-500">
        <span>{addrLabel}</span>
        {rangeS !== null && (
          <span>
            סכום: <strong className="text-slate-700">{rangeS}</strong>
          </span>
        )}
        <span>{numRows} שורות × {numCols} עמודות</span>
      </div>
    </div>
  )
}
