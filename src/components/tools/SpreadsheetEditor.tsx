import { useRef, useState, useCallback, useEffect } from 'react'
import { Download, Upload, Plus, Boxes, FileSpreadsheet, Search, X, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import * as XLSX from 'xlsx'
import { HyperFormula } from 'hyperformula'

const INIT_COLS = 26
const INIT_ROWS = 50
const DEFAULT_COL_W = 100
const ROW_H = 26
const ROW_HEADER_W = 48
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24]
const DEFAULT_SHEET_NAMES = ['גיליון 1', 'גיליון 2', 'גיליון 3']

function colLetter(i: number) { return String.fromCharCode(65 + i) }
function cellId(row: number, col: number) { return `${colLetter(col)}${row + 1}` }
function colLetterToIdx(letter: string) { return letter.toUpperCase().charCodeAt(0) - 65 }
function parseCellRef(ref: string): { row: number; col: number } | null {
  const m = ref.match(/^([A-Z]+)(\d+)$/i)
  if (!m) return null
  return { col: colLetterToIdx(m[1]), row: parseInt(m[2]) - 1 }
}

function rawToHF(value: string): string | number | null {
  if (!value || value === '') return null
  if (value.startsWith('=')) return value
  const num = Number(value)
  if (!isNaN(num) && value.trim() !== '') return num
  return value
}

function formatHFValue(val: unknown): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'object' && val !== null && 'type' in val) {
    return `#${(val as { type: string }).type}!`
  }
  if (typeof val === 'number') return String(Math.round(val * 1e10) / 1e10)
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
  return String(val)
}

interface CellData {
  value: string
  bold?: boolean
  italic?: boolean
  fontSize?: number
  bgColor?: string
  textColor?: string
  align?: 'right' | 'center' | 'left'
}
type Cells = Record<string, CellData>

interface SheetState {
  name: string
  cells: Cells
  numRows: number
  numCols: number
  colWidths: number[]
}

interface Selection {
  row: number
  col: number
  endRow?: number
  endCol?: number
}

function makeSheet(name: string): SheetState {
  return { name, cells: {}, numRows: INIT_ROWS, numCols: INIT_COLS, colWidths: Array(INIT_COLS).fill(DEFAULT_COL_W) }
}

export function SpreadsheetEditor() {
  const [sheets, setSheets] = useState<SheetState[]>(() => DEFAULT_SHEET_NAMES.map(makeSheet))
  const [activeSheetIdx, setActiveSheetIdx] = useState(0)
  const [selection, setSelection] = useState<Selection>({ row: 0, col: 0 })
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [selDragging, setSelDragging] = useState(false)
  const [resizingCol, setResizingCol] = useState<number | null>(null)
  const [resizeStartX, setResizeStartX] = useState(0)
  const [resizeStartW, setResizeStartW] = useState(0)
  const [showFindReplace, setShowFindReplace] = useState(false)
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [findResults, setFindResults] = useState<{ row: number; col: number }[]>([])
  const [findIdx, setFindIdx] = useState(0)

  const hfRef = useRef<HyperFormula | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const xlsxInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' })
    DEFAULT_SHEET_NAMES.forEach(n => hf.addSheet(n))
    hfRef.current = hf
  }, [])

  const activeSheet = sheets[activeSheetIdx]
  const { cells, numRows, numCols, colWidths } = activeSheet
  const selId = cellId(selection.row, selection.col)
  const selCell = cells[selId]

  function getDisplayValue(row: number, col: number): string {
    const raw = cells[cellId(row, col)]?.value ?? ''
    if (!raw) return ''
    if (raw.startsWith('=') && hfRef.current) {
      try {
        const val = hfRef.current.getCellValue({ sheet: activeSheetIdx, col, row })
        return formatHFValue(val)
      } catch { return '#ERR!' }
    }
    return raw
  }

  function syncCellToHF(sheetIdx: number, row: number, col: number, value: string) {
    if (!hfRef.current) return
    hfRef.current.setCellContents({ sheet: sheetIdx, col, row }, rawToHF(value))
  }

  function updateCellValue(row: number, col: number, value: string) {
    const id = cellId(row, col)
    setSheets(prev => prev.map((s, i) => {
      if (i !== activeSheetIdx) return s
      const nc = { ...s.cells }
      if (!value) { delete nc[id] } else { nc[id] = { ...nc[id], value } }
      return { ...s, cells: nc }
    }))
    syncCellToHF(activeSheetIdx, row, col, value)
  }

  function commitEdit(row: number, col: number, value: string) {
    if (!value && !cells[cellId(row, col)]) { setEditing(false); return }
    updateCellValue(row, col, value)
    setEditing(false)
  }

  function startEdit(row: number, col: number) {
    setEditValue(cells[cellId(row, col)]?.value ?? '')
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function updateFormat<K extends keyof CellData>(key: K, value: CellData[K]) {
    setSheets(prev => prev.map((s, i) => {
      if (i !== activeSheetIdx) return s
      return { ...s, cells: { ...s.cells, [selId]: { ...s.cells[selId], value: s.cells[selId]?.value ?? '', [key]: value } } }
    }))
  }

  const rangeSum = useCallback(() => {
    const { row, col, endRow, endCol } = selection
    if (endRow == null || endCol == null) return null
    let sum = 0, count = 0
    for (let r = Math.min(row, endRow); r <= Math.max(row, endRow); r++)
      for (let c = Math.min(col, endCol); c <= Math.max(col, endCol); c++) {
        const raw = cells[cellId(r, c)]?.value ?? ''
        if (!raw) continue
        let num: number
        if (raw.startsWith('=') && hfRef.current) {
          const v = hfRef.current.getCellValue({ sheet: activeSheetIdx, col: c, row: r })
          num = typeof v === 'number' ? v : parseFloat(formatHFValue(v))
        } else { num = parseFloat(raw) }
        if (!isNaN(num)) { sum += num; count++ }
      }
    return { sum: Math.round(sum * 1e10) / 1e10, count }
  }, [cells, selection, activeSheetIdx])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (showFindReplace && e.key === 'Escape') { setShowFindReplace(false); return }
      const tag = (e.target as HTMLElement).tagName
      const isFormulaInput = tag === 'INPUT' && (e.target as HTMLInputElement) === inputRef.current

      if ((e.ctrlKey || e.metaKey) && !editing) {
        if (e.key === 'b') { updateFormat('bold', !selCell?.bold); e.preventDefault(); return }
        if (e.key === 'i') { updateFormat('italic', !selCell?.italic); e.preventDefault(); return }
        if (e.key === 'f') { setShowFindReplace(true); e.preventDefault(); return }
      }

      if (editing && isFormulaInput) {
        if (e.key === 'Enter') { commitEdit(selection.row, selection.col, editValue); setSelection(s => ({ row: Math.min(numRows - 1, s.row + 1), col: s.col })); e.preventDefault() }
        else if (e.key === 'Tab') { commitEdit(selection.row, selection.col, editValue); setSelection(s => ({ row: s.row, col: Math.min(numCols - 1, s.col + 1) })); e.preventDefault() }
        else if (e.key === 'Escape') { setEditing(false); setEditValue(cells[selId]?.value ?? '') }
        return
      }
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'Tab') { setSelection(s => ({ row: s.row, col: Math.min(numCols - 1, s.col + 1) })); e.preventDefault() }
      else if (e.key === 'Enter' || e.key === 'F2') { startEdit(selection.row, selection.col); e.preventDefault() }
      else if (e.key === 'ArrowRight') { setEditing(false); setSelection(s => ({ row: s.row, col: Math.max(0, s.col - 1) })); e.preventDefault() }
      else if (e.key === 'ArrowLeft') { setEditing(false); setSelection(s => ({ row: s.row, col: Math.min(numCols - 1, s.col + 1) })); e.preventDefault() }
      else if (e.key === 'ArrowUp') { setEditing(false); setSelection(s => ({ row: Math.max(0, s.row - 1), col: s.col })); e.preventDefault() }
      else if (e.key === 'ArrowDown') { setEditing(false); setSelection(s => ({ row: Math.min(numRows - 1, s.row + 1), col: s.col })); e.preventDefault() }
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        setSheets(prev => prev.map((s, i) => { if (i !== activeSheetIdx) return s; const nc = { ...s.cells }; delete nc[selId]; return { ...s, cells: nc } }))
        hfRef.current?.setCellContents({ sheet: activeSheetIdx, col: selection.col, row: selection.row }, null)
      }
      else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { setEditValue(e.key); setEditing(true); setTimeout(() => inputRef.current?.focus(), 0) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing, selection, editValue, numRows, numCols, selId, cells, activeSheetIdx, showFindReplace, selCell])

  useEffect(() => {
    if (resizingCol === null) return
    function onMove(e: MouseEvent) {
      const delta = e.clientX - resizeStartX
      setSheets(prev => prev.map((s, i) => {
        if (i !== activeSheetIdx) return s
        return { ...s, colWidths: s.colWidths.map((w, ci) => ci === resizingCol ? Math.max(40, resizeStartW + delta) : w) }
      }))
    }
    function onUp() { setResizingCol(null) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [resizingCol, resizeStartX, resizeStartW, activeSheetIdx])

  function doFind(text: string) {
    if (!text) { setFindResults([]); return }
    const lower = text.toLowerCase()
    const results: { row: number; col: number }[] = []
    for (let r = 0; r < numRows; r++)
      for (let c = 0; c < numCols; c++) {
        const v = cells[cellId(r, c)]?.value ?? ''
        if (v.toLowerCase().includes(lower)) results.push({ row: r, col: c })
      }
    setFindResults(results)
    setFindIdx(0)
    if (results.length) setSelection({ row: results[0].row, col: results[0].col })
  }

  function findNext() {
    if (!findResults.length) return
    const next = (findIdx + 1) % findResults.length
    setFindIdx(next)
    setSelection({ row: findResults[next].row, col: findResults[next].col })
  }

  function doReplaceAll() {
    if (!findText) return
    const re = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    setSheets(prev => prev.map((s, i) => {
      if (i !== activeSheetIdx) return s
      const nc = { ...s.cells }
      Object.entries(nc).forEach(([id, cell]) => {
        if (cell.value.toLowerCase().includes(findText.toLowerCase())) {
          const newVal = cell.value.replace(re, replaceText)
          nc[id] = { ...cell, value: newVal }
          const parsed = parseCellRef(id)
          if (parsed) hfRef.current?.setCellContents({ sheet: activeSheetIdx, col: parsed.col, row: parsed.row }, rawToHF(newVal))
        }
      })
      return { ...s, cells: nc }
    }))
    setFindResults([])
  }

  function sortByCol(ascending: boolean) {
    const col = selection.col
    setSheets(prev => prev.map((s, i) => {
      if (i !== activeSheetIdx) return s
      const rowData: (CellData | undefined)[][] = Array.from({ length: s.numRows }, (_, r) =>
        Array.from({ length: s.numCols }, (_, c) => s.cells[cellId(r, c)])
      )
      rowData.sort((a, b) => {
        const va = a[col]?.value ?? '', vb = b[col]?.value ?? ''
        const na = Number(va), nb = Number(vb)
        if (!isNaN(na) && !isNaN(nb)) return ascending ? na - nb : nb - na
        return ascending ? va.localeCompare(vb, 'he') : vb.localeCompare(va, 'he')
      })
      const nc: Cells = {}
      rowData.forEach((row, r) => row.forEach((cell, c) => { if (cell?.value) nc[cellId(r, c)] = cell }))
      return { ...s, cells: nc }
    }))
  }

  function exportCsv() {
    let lastRow = 0
    for (let r = 0; r < numRows; r++)
      for (let c = 0; c < numCols; c++)
        if (getDisplayValue(r, c)) lastRow = r
    const rows = Array.from({ length: lastRow + 1 }, (_, r) =>
      Array.from({ length: numCols }, (_, c) => {
        const v = getDisplayValue(r, c)
        return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v
      }).join(',')
    )
    const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.download = 'spreadsheet.csv'; a.href = URL.createObjectURL(blob); a.click()
  }

  function importCsv(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const lines = (e.target?.result as string).split('\n')
      const nc: Cells = {}
      let maxC = INIT_COLS
      lines.forEach((line, r) => {
        const cols = line.split(',').map(v => v.replace(/^"|"$/g, '').trim())
        maxC = Math.max(maxC, cols.length)
        cols.forEach((val, c) => { if (val) nc[cellId(r, c)] = { value: val } })
      })
      if (hfRef.current) {
        Object.entries(nc).forEach(([id, cell]) => {
          const p = parseCellRef(id)
          if (p) hfRef.current!.setCellContents({ sheet: activeSheetIdx, col: p.col, row: p.row }, rawToHF(cell.value))
        })
      }
      setSheets(prev => prev.map((s, i) => i !== activeSheetIdx ? s : {
        ...s, cells: nc, numRows: Math.max(INIT_ROWS, lines.length + 5), numCols: maxC,
        colWidths: Array(maxC).fill(DEFAULT_COL_W)
      }))
    }
    reader.readAsText(file)
  }

  function importXlsx(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const wb = XLSX.read(new Uint8Array(e.target?.result as ArrayBuffer), { type: 'array' })
      const newHF = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' })
      const newSheets: SheetState[] = wb.SheetNames.slice(0, 5).map((name, si) => {
        const rows: (string | number | null)[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[si]], { header: 1, defval: null }) as (string | number | null)[][]
        const nc: Cells = {}
        newHF.addSheet(name)
        rows.forEach((row, r) => row.forEach((val, c) => {
          if (val !== null && val !== '') {
            const sv = String(val); nc[cellId(r, c)] = { value: sv }
            newHF.setCellContents({ sheet: si, col: c, row: r }, rawToHF(sv))
          }
        }))
        return { name, cells: nc, numRows: Math.max(INIT_ROWS, rows.length + 5), numCols: Math.max(INIT_COLS, ...rows.map(r => r.length)), colWidths: Array(Math.max(INIT_COLS, ...rows.map(r => r.length))).fill(DEFAULT_COL_W) }
      })
      while (newSheets.length < 3) { const n = `גיליון ${newSheets.length + 1}`; newHF.addSheet(n); newSheets.push(makeSheet(n)) }
      hfRef.current = newHF
      setSheets(newSheets); setActiveSheetIdx(0); setSelection({ row: 0, col: 0 })
    }
    reader.readAsArrayBuffer(file)
  }

  function exportXlsx() {
    const wb = XLSX.utils.book_new()
    sheets.forEach((sheet, si) => {
      let lastR = 0
      for (let r = 0; r < sheet.numRows; r++)
        for (let c = 0; c < sheet.numCols; c++)
          if (sheet.cells[cellId(r, c)]?.value) lastR = r
      const data = Array.from({ length: lastR + 1 }, (_, r) =>
        Array.from({ length: sheet.numCols }, (_, c) => {
          const raw = sheet.cells[cellId(r, c)]?.value ?? ''
          if (!raw) return ''
          if (raw.startsWith('=') && hfRef.current) {
            const v = hfRef.current.getCellValue({ sheet: si, col: c, row: r })
            const fv = formatHFValue(v); const n = Number(fv); return !isNaN(n) && fv !== '' ? n : fv
          }
          const n = Number(raw); return !isNaN(n) && raw.trim() !== '' ? n : raw
        })
      )
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), sheet.name)
    })
    XLSX.writeFile(wb, 'spreadsheet.xlsx')
  }

  function importBoq() {
    interface FpRoom { name: string; area: number }
    interface FpSummary { rooms: FpRoom[]; totalArea: number; wallLength: number; doorCount: number; windowCount: number }
    let fp: FpSummary | null = null
    try { const raw = localStorage.getItem('archion_floorplan'); if (raw) fp = JSON.parse(raw) as FpSummary } catch { fp = null }
    const WALL_H = 2.8
    const floorArea = fp?.totalArea ?? 120
    const wallLen = fp?.wallLength ?? 95
    const doors = fp?.doorCount ?? 8
    const windows = fp?.windowCount ?? 10
    const boq: [string, string, string, number, number][] = [
      ['1', 'עבודות עפר וחפירה', 'מ"ק', Math.round(floorArea * 0.5), 85],
      ['2', 'בטון רצפה / יסודות B-30', 'מ"ק', Math.round(floorArea * 0.2 * 10) / 10, 720],
      ['3', 'בנייה — בלוקי בטון 20 ס"מ', 'מ"ר', Math.round(wallLen * WALL_H), 145],
      ['4', 'טיח פנים וחוץ (2 צדדים)', 'מ"ר', Math.round(wallLen * WALL_H * 2), 65],
      ['5', 'ריצוף — אריחי גרניט פורצלן', 'מ"ר', Math.round(floorArea), 220],
      ['6', 'צביעה — סופרקריל', 'מ"ר', Math.round(wallLen * WALL_H * 2 + floorArea), 38],
      ['7', 'דלתות פנים', "יח'", doors, 1450],
      ['8', 'חלונות אלומיניום + זיגוג כפול', "יח'", windows, 2200],
      ['9', 'איטום גגות וחדרים רטובים', 'מ"ר', Math.round(floorArea * 0.4), 95],
      ['10', 'מערכת חשמל ותאורה', 'קומפלט', 1, 28000],
      ['11', 'אינסטלציה — מים וביוב', 'קומפלט', 1, 19500],
    ]
    const nc: Cells = {}
    const setC = (r: number, c: number, v: string, bold?: boolean) => { nc[cellId(r, c)] = { value: v, bold } }
    setC(0, 0, fp ? 'כתב כמויות — מתוך תוכנית הקומה' : 'כתב כמויות — תבנית סטנדרטית', true)
    ;['סעיף', 'תיאור', 'יחידה', 'כמות', "מחיר יח' (₪)", 'סה"כ (₪)'].forEach((h, c) => setC(2, c, h, true))
    let row = 3
    boq.forEach(([sec, desc, unit, qty, price]) => {
      setC(row, 0, sec); setC(row, 1, desc); setC(row, 2, unit)
      setC(row, 3, String(qty)); setC(row, 4, String(price)); setC(row, 5, String(qty * price))
      row++
    })
    const firstDataRow = 4, lastDataRow = row
    setC(row, 1, 'סה"כ ביניים', true); setC(row, 5, `=SUM(F${firstDataRow}:F${lastDataRow})`, true); row++
    const subtotal = boq.reduce((s, [, , , q, p]) => s + q * p, 0)
    setC(row, 1, 'מע"מ 18%'); setC(row, 5, String(Math.round(subtotal * 0.18))); row++
    setC(row, 1, 'סה"כ כולל מע"מ', true); setC(row, 5, String(Math.round(subtotal * 1.18)), true)
    if (hfRef.current) {
      Object.entries(nc).forEach(([id, cell]) => {
        const p = parseCellRef(id)
        if (p) hfRef.current!.setCellContents({ sheet: activeSheetIdx, col: p.col, row: p.row }, rawToHF(cell.value))
      })
    }
    const widths = Array(numCols).fill(DEFAULT_COL_W); widths[1] = 280; widths[5] = 130
    setSheets(prev => prev.map((s, i) => i !== activeSheetIdx ? s : {
      ...s, cells: nc, numRows: Math.max(s.numRows, row + 6), colWidths: widths
    }))
    setSelection({ row: 0, col: 0 })
  }

  const formulaBarVal = editing ? editValue : (selCell?.value ?? '')
  const rs = rangeSum()

  return (
    <div className="flex flex-col" dir="rtl" style={{ userSelect: 'none' }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 bg-slate-800 rounded-t-xl px-2 py-1.5 shrink-0">
        <button onClick={() => updateFormat('bold', !selCell?.bold)} className={`w-7 h-7 rounded text-xs font-bold transition ${selCell?.bold ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`} title="מודגש (Ctrl+B)">B</button>
        <button onClick={() => updateFormat('italic', !selCell?.italic)} className={`w-7 h-7 rounded text-xs italic transition ${selCell?.italic ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`} title="נטוי (Ctrl+I)">I</button>

        <select
          value={selCell?.fontSize ?? 12}
          onChange={e => updateFormat('fontSize', Number(e.target.value))}
          className="h-7 bg-slate-700 text-slate-200 text-xs rounded border-none outline-none px-1"
          title="גודל גופן"
        >
          {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <button onClick={() => updateFormat('align', 'right')} className={`w-7 h-7 rounded flex items-center justify-center transition ${(selCell?.align ?? 'right') === 'right' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`} title="יישור ימין"><AlignRight className="w-3.5 h-3.5" /></button>
        <button onClick={() => updateFormat('align', 'center')} className={`w-7 h-7 rounded flex items-center justify-center transition ${selCell?.align === 'center' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`} title="מרכז"><AlignCenter className="w-3.5 h-3.5" /></button>
        <button onClick={() => updateFormat('align', 'left')} className={`w-7 h-7 rounded flex items-center justify-center transition ${selCell?.align === 'left' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`} title="יישור שמאל"><AlignLeft className="w-3.5 h-3.5" /></button>

        <div className="flex items-center gap-0.5" title="צבע טקסט">
          <span className="text-slate-400 text-xs">A</span>
          <input type="color" value={selCell?.textColor ?? '#000000'} onChange={e => updateFormat('textColor', e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-none p-0" />
        </div>
        <div className="flex items-center gap-0.5" title="צבע רקע">
          <span className="text-slate-400 text-xs">⬜</span>
          <input type="color" value={selCell?.bgColor ?? '#ffffff'} onChange={e => updateFormat('bgColor', e.target.value === '#ffffff' ? undefined as unknown as string : e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-none p-0" />
        </div>

        <div className="w-px h-5 bg-slate-600 mx-0.5" />

        <button onClick={() => sortByCol(true)} className="px-2 py-1 text-slate-300 hover:bg-slate-700 rounded text-xs" title="מיין עולה">מ↑ז</button>
        <button onClick={() => sortByCol(false)} className="px-2 py-1 text-slate-300 hover:bg-slate-700 rounded text-xs" title="מיין יורד">ז↓מ</button>
        <button onClick={() => setShowFindReplace(v => !v)} className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition ${showFindReplace ? 'bg-blue-700 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
          <Search className="w-3 h-3" />חיפוש
        </button>

        <div className="w-px h-5 bg-slate-600 mx-0.5" />

        <button onClick={() => setSheets(prev => prev.map((s, i) => i === activeSheetIdx ? { ...s, numRows: s.numRows + 10 } : s))} className="flex items-center gap-1 px-2 py-1 text-slate-300 hover:bg-slate-700 rounded text-xs"><Plus className="w-3 h-3" />שורות</button>
        <button onClick={() => setSheets(prev => prev.map((s, i) => i !== activeSheetIdx ? s : { ...s, numCols: Math.min(52, s.numCols + 1), colWidths: [...s.colWidths, DEFAULT_COL_W] }))} className="flex items-center gap-1 px-2 py-1 text-slate-300 hover:bg-slate-700 rounded text-xs"><Plus className="w-3 h-3" />עמודה</button>

        <div className="w-px h-5 bg-slate-600 mx-0.5" />

        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 px-2 py-1 text-slate-300 hover:bg-slate-700 rounded text-xs"><Upload className="w-3 h-3" />CSV</button>
        <button onClick={() => xlsxInputRef.current?.click()} className="flex items-center gap-1 px-2 py-1 text-green-300 hover:bg-slate-700 rounded text-xs"><FileSpreadsheet className="w-3 h-3" />XLSX</button>
        <input ref={fileInputRef} type="file" hidden accept=".csv" onChange={e => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = '' }} />
        <input ref={xlsxInputRef} type="file" hidden accept=".xlsx,.xls" onChange={e => { const f = e.target.files?.[0]; if (f) importXlsx(f); e.target.value = '' }} />
        <button onClick={importBoq} className="flex items-center gap-1 px-2 py-1 text-amber-300 hover:bg-slate-700 rounded text-xs"><Boxes className="w-3 h-3" />BOQ</button>

        <div className="flex-1" />

        <button onClick={exportXlsx} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium"><FileSpreadsheet className="w-3.5 h-3.5" />XLSX</button>
        <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"><Download className="w-3.5 h-3.5" />CSV</button>
      </div>

      {/* Find & Replace bar */}
      {showFindReplace && (
        <div className="flex items-center gap-2 bg-yellow-50 border-x border-yellow-200 px-3 py-2 shrink-0" dir="rtl">
          <Search className="w-3.5 h-3.5 text-yellow-600 shrink-0" />
          <input
            type="text" placeholder="חפש..." value={findText}
            onChange={e => { setFindText(e.target.value); doFind(e.target.value) }}
            className="w-32 border border-yellow-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-400 bg-white"
            autoFocus
          />
          <input
            type="text" placeholder="החלף ב..." value={replaceText}
            onChange={e => setReplaceText(e.target.value)}
            className="w-32 border border-yellow-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-400 bg-white"
          />
          <button onClick={findNext} disabled={!findResults.length} className="px-2 py-1 bg-white border border-yellow-300 text-slate-700 rounded text-xs disabled:opacity-40 hover:bg-yellow-50">
            הבא {findResults.length > 0 ? `(${findIdx + 1}/${findResults.length})` : ''}
          </button>
          <button onClick={doReplaceAll} disabled={!findText} className="px-2 py-1 bg-blue-600 text-white rounded text-xs disabled:opacity-40 hover:bg-blue-700">החלף הכל</button>
          <button onClick={() => { setShowFindReplace(false); setFindResults([]) }} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Formula bar */}
      <div className="flex items-center gap-2 bg-white border-x border-slate-200 px-3 py-1.5 shrink-0">
        <div className="w-14 h-7 bg-slate-50 border border-slate-200 rounded flex items-center justify-center text-xs font-mono text-slate-600 shrink-0">{cellId(selection.row, selection.col)}</div>
        <div className="w-px h-5 bg-slate-200" />
        <span className="text-slate-400 text-xs font-mono italic shrink-0">fx</span>
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
          placeholder="ערך או נוסחה — =VLOOKUP(...), =SUMIF(...), =IF(...), =INDEX(MATCH(...))"
          dir="ltr"
        />
      </div>

      {/* Sheet tabs */}
      <div className="flex items-center bg-slate-100 border-x border-slate-200 px-2 pt-1 gap-0.5 overflow-x-auto shrink-0">
        {sheets.map((sheet, i) => (
          <button
            key={i}
            onClick={() => { setActiveSheetIdx(i); setSelection({ row: 0, col: 0 }); setEditing(false) }}
            className={`px-3 py-1.5 text-xs rounded-t-md font-medium transition whitespace-nowrap border ${
              i === activeSheetIdx
                ? 'bg-white border-slate-300 border-b-white text-slate-800 -mb-px z-10 relative'
                : 'bg-slate-200 border-transparent text-slate-500 hover:bg-slate-300 hover:text-slate-700'
            }`}
          >
            {sheet.name}
          </button>
        ))}
        <button
          onClick={() => {
            const newName = `גיליון ${sheets.length + 1}`
            hfRef.current?.addSheet(newName)
            setSheets(prev => [...prev, makeSheet(newName)])
          }}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded"
          title="הוסף גיליון"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid */}
      <div
        ref={tableRef}
        className="border border-slate-200 overflow-auto bg-white"
        style={{ height: 440 }}
      >
        <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: ROW_HEADER_W }} />
            {Array.from({ length: numCols }, (_, i) => <col key={i} style={{ width: colWidths[i] }} />)}
          </colgroup>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <th style={{ width: ROW_HEADER_W, height: ROW_H, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 11, color: '#94a3b8', textAlign: 'center' }} />
              {Array.from({ length: numCols }, (_, c) => (
                <th key={c} style={{
                  width: colWidths[c], height: ROW_H, minWidth: 40,
                  background: selection.col === c ? '#eff6ff' : '#f8fafc',
                  border: '1px solid #e2e8f0', fontSize: 11, color: '#475569', fontWeight: 600,
                  textAlign: 'center', position: 'relative', padding: 0,
                }}>
                  {colLetter(c)}
                  <div
                    style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', cursor: 'col-resize', zIndex: 1 }}
                    onMouseDown={e => { e.preventDefault(); setResizingCol(c); setResizeStartX(e.clientX); setResizeStartW(colWidths[c]) }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: numRows }, (_, r) => (
              <tr key={r}>
                <td style={{
                  width: ROW_HEADER_W, height: ROW_H,
                  background: selection.row === r ? '#eff6ff' : '#f8fafc',
                  border: '1px solid #e2e8f0', fontSize: 11, color: '#94a3b8', textAlign: 'center',
                  position: 'sticky', left: 0, zIndex: 5,
                }}>{r + 1}</td>
                {Array.from({ length: numCols }, (_, c) => {
                  const id = cellId(r, c)
                  const cell = cells[id]
                  const isSelected = selection.row === r && selection.col === c
                  const inRange = selection.endRow != null && selection.endCol != null
                    && r >= Math.min(selection.row, selection.endRow) && r <= Math.max(selection.row, selection.endRow)
                    && c >= Math.min(selection.col, selection.endCol) && c <= Math.max(selection.col, selection.endCol)
                  const isFindMatch = findResults.some(m => m.row === r && m.col === c)
                  const isEditing = isSelected && editing
                  const displayVal = isEditing ? undefined : getDisplayValue(r, c)
                  const bg = isFindMatch ? '#fef9c3' : (inRange && !isSelected ? '#eff6ff' : (cell?.bgColor ?? 'white'))

                  return (
                    <td
                      key={c}
                      style={{
                        width: colWidths[c], height: ROW_H, minWidth: 40,
                        border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                        background: bg, padding: isEditing ? 0 : '0 4px',
                        fontSize: cell?.fontSize ?? 12, fontWeight: cell?.bold ? 700 : 400,
                        fontStyle: cell?.italic ? 'italic' : 'normal',
                        color: cell?.textColor ?? '#1e293b',
                        overflow: 'hidden', whiteSpace: 'nowrap',
                        position: 'relative', cursor: 'default',
                        textAlign: cell?.align ?? 'right', verticalAlign: 'middle',
                      }}
                      onClick={() => { if (!selDragging) { setEditing(false); setSelection({ row: r, col: c }) } }}
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
                            if (e.key === 'Escape') setEditing(false)
                          }}
                          style={{
                            width: '100%', height: '100%', border: 'none', outline: 'none',
                            padding: '0 4px', fontSize: cell?.fontSize ?? 12,
                            fontWeight: cell?.bold ? 700 : 400, fontStyle: cell?.italic ? 'italic' : 'normal',
                            color: cell?.textColor ?? '#1e293b', background: cell?.bgColor ?? 'white',
                            textAlign: cell?.align ?? 'right', direction: 'rtl',
                          }}
                          autoFocus
                          dir="ltr"
                        />
                      ) : (
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayVal}</span>
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
        <span className="font-mono">{cellId(selection.row, selection.col)}</span>
        {rs !== null && (
          <span>סכום: <strong className="text-slate-700">{rs.sum}</strong> | ספירה: <strong className="text-slate-700">{rs.count}</strong></span>
        )}
        <span>{numRows} × {numCols} | HyperFormula 400+ נוסחאות</span>
      </div>
    </div>
  )
}
