import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Trash2, FileText, Download, GripVertical, ChevronUp, ChevronDown, Printer } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/tools/sheets')({
  component: SheetSetPage,
})

type DrawingType = 'floor-plan' | 'section' | 'elevation' | 'detail' | 'site-plan' | 'other'

interface Sheet {
  id: string
  number: string
  title: string
  type: DrawingType
  scale: string
  revision: string
  status: 'draft' | 'issued' | 'approved' | 'superseded'
  note: string
}

const TYPE_LABELS: Record<DrawingType, string> = {
  'floor-plan': 'תוכנית קומה',
  'section': 'חתך',
  'elevation': 'חזית / אלווציה',
  'detail': 'פירוט',
  'site-plan': 'תוכנית מצב',
  'other': 'אחר',
}

const STATUS_LABELS: Record<Sheet['status'], string> = {
  draft: 'טיוטה',
  issued: 'הוצא',
  approved: 'מאושר',
  superseded: 'מבוטל',
}

const STATUS_COLORS: Record<Sheet['status'], string> = {
  draft: 'bg-slate-100 text-slate-600',
  issued: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  superseded: 'bg-red-100 text-red-600',
}

const DEFAULT_SHEETS: Sheet[] = [
  { id: '1', number: 'A-01', title: 'תוכנית קומת קרקע', type: 'floor-plan', scale: '1:100', revision: '0', status: 'issued', note: '' },
  { id: '2', number: 'A-02', title: 'תוכנית קומה ראשונה', type: 'floor-plan', scale: '1:100', revision: '0', status: 'draft', note: '' },
  { id: '3', number: 'A-03', title: 'תוכנית גג', type: 'floor-plan', scale: '1:100', revision: '0', status: 'draft', note: '' },
  { id: '4', number: 'A-10', title: 'חתך א–א', type: 'section', scale: '1:100', revision: '0', status: 'draft', note: '' },
  { id: '5', number: 'A-11', title: 'חתך ב–ב', type: 'section', scale: '1:100', revision: '0', status: 'draft', note: '' },
  { id: '6', number: 'A-20', title: 'חזית צפון', type: 'elevation', scale: '1:100', revision: '0', status: 'draft', note: '' },
  { id: '7', number: 'A-21', title: 'חזית דרום', type: 'elevation', scale: '1:100', revision: '0', status: 'draft', note: '' },
  { id: '8', number: 'A-22', title: 'חזית מזרח', type: 'elevation', scale: '1:100', revision: '0', status: 'draft', note: '' },
  { id: '9', number: 'A-23', title: 'חזית מערב', type: 'elevation', scale: '1:100', revision: '0', status: 'draft', note: '' },
]

function uid() { return Math.random().toString(36).slice(2) }

function SheetSetPage() {
  const [sheets, setSheets] = useState<Sheet[]>(DEFAULT_SHEETS)
  const [projectName, setProjectName] = useState('')
  const [architectName, setArchitectName] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Sheet>>({})

  function addSheet() {
    const newSheet: Sheet = {
      id: uid(),
      number: `A-${String(sheets.length + 1).padStart(2, '0')}`,
      title: 'גיליון חדש',
      type: 'other',
      scale: '1:100',
      revision: '0',
      status: 'draft',
      note: '',
    }
    setSheets(s => [...s, newSheet])
    startEdit(newSheet)
  }

  function startEdit(sheet: Sheet) {
    setEditing(sheet.id)
    setEditData({ ...sheet })
  }

  function commitEdit() {
    if (!editing) return
    setSheets(s => s.map(sh => sh.id === editing ? { ...sh, ...editData } as Sheet : sh))
    setEditing(null)
    setEditData({})
  }

  function deleteSheet(id: string) {
    setSheets(s => s.filter(sh => sh.id !== id))
  }

  function moveSheet(id: string, dir: -1 | 1) {
    setSheets(prev => {
      const i = prev.findIndex(s => s.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  function printSheetList() {
    const rows = sheets.map(s =>
      `<tr><td>${s.number}</td><td>${s.title}</td><td>${TYPE_LABELS[s.type]}</td><td>${s.scale}</td><td>${s.revision}</td><td>${STATUS_LABELS[s.status]}</td><td>${s.note}</td></tr>`
    ).join('')
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8">
  <title>רשימת גיליונות — ${projectName || 'פרויקט'}</title>
  <style>
    body { font-family: Arial, sans-serif; direction: rtl; margin: 15mm; color: #111; }
    h1 { font-size: 16pt; margin-bottom: 4px; }
    .meta { font-size: 9pt; color: #555; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    th { background: #1e293b; color: white; padding: 6px 8px; text-align: right; }
    td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    .issued { color: #1d4ed8; } .approved { color: #15803d; } .superseded { color: #dc2626; }
    @media print { body { margin: 10mm; } }
  </style>
</head>
<body>
  <h1>סט גיליונות — ${projectName || 'פרויקט'}</h1>
  <div class="meta">אדריכל: ${architectName || '—'} &nbsp;|&nbsp; תאריך: ${new Date().toLocaleDateString('he-IL')} &nbsp;|&nbsp; סה"כ ${sheets.length} גיליונות</div>
  <table>
    <thead><tr><th>מספר</th><th>שם התוכנית</th><th>סוג</th><th>מאסטב</th><th>מהדורה</th><th>סטטוס</th><th>הערות</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 400)
  }

  function exportCsv() {
    const header = 'מספר,שם התוכנית,סוג,מאסטב,מהדורה,סטטוס,הערות'
    const rows = sheets.map(s =>
      [s.number, s.title, TYPE_LABELS[s.type], s.scale, s.revision, STATUS_LABELS[s.status], s.note]
        .map(v => v.includes(',') ? `"${v}"` : v).join(',')
    )
    const blob = new Blob(['﻿' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.download = 'sheet-set.csv'
    a.href = URL.createObjectURL(blob)
    a.click()
  }

  const grouped = (Object.keys(TYPE_LABELS) as DrawingType[]).map(type => ({
    type,
    label: TYPE_LABELS[type],
    sheets: sheets.filter(s => s.type === type),
  })).filter(g => g.sheets.length > 0)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sheet Set — סט גיליונות</h1>
          <p className="text-slate-500 text-sm mt-0.5">ניהול וארגון כל גיליונות ההגשה של הפרויקט</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={printSheetList} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition">
            <Printer className="w-4 h-4" />
            הדפסת רשימה
          </button>
          <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-xl text-sm font-medium transition">
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button onClick={addSheet} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition">
            <Plus className="w-4 h-4" />
            הוסף גיליון
          </button>
        </div>
      </div>

      {/* Project info strip */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-4">
        <div className="flex-1 min-w-48">
          <label className="text-xs text-slate-500 mb-1 block">שם הפרויקט</label>
          <input value={projectName} onChange={e => setProjectName(e.target.value)}
            placeholder="לדוגמה: מגדל המגורים הרצל"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex-1 min-w-48">
          <label className="text-xs text-slate-500 mb-1 block">אדריכל אחראי</label>
          <input value={architectName} onChange={e => setArchitectName(e.target.value)}
            placeholder="שם האדריכל"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-end">
          <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-center">
            <div className="text-xl font-bold text-slate-800">{sheets.length}</div>
            <div className="text-xs text-slate-500">גיליונות</div>
          </div>
        </div>
        <div className="flex items-end">
          <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-center">
            <div className="text-xl font-bold text-green-700">{sheets.filter(s => s.status === 'approved').length}</div>
            <div className="text-xs text-green-600">מאושרים</div>
          </div>
        </div>
        <div className="flex items-end">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-center">
            <div className="text-xl font-bold text-blue-700">{sheets.filter(s => s.status === 'issued').length}</div>
            <div className="text-xs text-blue-600">הוצאו</div>
          </div>
        </div>
      </div>

      {/* Sheet groups */}
      {grouped.map(group => (
        <div key={group.type} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <h2 className="font-semibold text-slate-700 text-sm">{group.label}</h2>
            <span className="text-xs text-slate-400 bg-slate-200 rounded-full px-2 py-0.5">{group.sheets.length}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500 font-medium">
                <th className="px-4 py-2 text-right w-8"></th>
                <th className="px-4 py-2 text-right">מספר</th>
                <th className="px-4 py-2 text-right flex-1">שם התוכנית</th>
                <th className="px-4 py-2 text-right">מאסטב</th>
                <th className="px-4 py-2 text-right">מהדורה</th>
                <th className="px-4 py-2 text-right">סטטוס</th>
                <th className="px-4 py-2 text-right">הערות</th>
                <th className="px-4 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {group.sheets.map(sheet => {
                const idx = sheets.findIndex(s => s.id === sheet.id)
                return editing === sheet.id ? (
                  <tr key={sheet.id} className="bg-blue-50 border-b border-slate-100">
                    <td className="px-2 py-1 text-slate-300"><GripVertical className="w-4 h-4" /></td>
                    <td className="px-2 py-1">
                      <input value={editData.number ?? ''} onChange={e => setEditData(d => ({ ...d, number: e.target.value }))}
                        className="w-20 px-2 py-1 border border-blue-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </td>
                    <td className="px-2 py-1">
                      <input value={editData.title ?? ''} onChange={e => setEditData(d => ({ ...d, title: e.target.value }))}
                        className="w-full px-2 py-1 border border-blue-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </td>
                    <td className="px-2 py-1">
                      <input value={editData.scale ?? ''} onChange={e => setEditData(d => ({ ...d, scale: e.target.value }))}
                        className="w-20 px-2 py-1 border border-blue-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </td>
                    <td className="px-2 py-1">
                      <input value={editData.revision ?? ''} onChange={e => setEditData(d => ({ ...d, revision: e.target.value }))}
                        className="w-12 px-2 py-1 border border-blue-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </td>
                    <td className="px-2 py-1">
                      <select value={editData.status ?? 'draft'} onChange={e => setEditData(d => ({ ...d, status: e.target.value as Sheet['status'] }))}
                        className="px-2 py-1 border border-blue-300 rounded-lg text-xs bg-white focus:outline-none">
                        {(Object.keys(STATUS_LABELS) as Sheet['status'][]).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input value={editData.note ?? ''} onChange={e => setEditData(d => ({ ...d, note: e.target.value }))}
                        className="w-full px-2 py-1 border border-blue-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </td>
                    <td className="px-2 py-1">
                      <button onClick={commitEdit} className="px-2 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium">שמור</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={sheet.id} className="border-b border-slate-50 hover:bg-slate-50 group cursor-pointer" onDoubleClick={() => startEdit(sheet)}>
                    <td className="px-2 py-2.5">
                      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => moveSheet(sheet.id, -1)} disabled={idx === 0} className="text-slate-400 hover:text-slate-600 disabled:opacity-20"><ChevronUp className="w-3 h-3" /></button>
                        <button onClick={() => moveSheet(sheet.id, 1)} disabled={idx === sheets.length - 1} className="text-slate-400 hover:text-slate-600 disabled:opacity-20"><ChevronDown className="w-3 h-3" /></button>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600 font-semibold">{sheet.number}</td>
                    <td className="px-4 py-2.5 text-slate-800 font-medium">{sheet.title}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{sheet.scale}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{sheet.revision}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[sheet.status]}`}>
                        {STATUS_LABELS[sheet.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{sheet.note || '—'}</td>
                    <td className="px-2 py-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => startEdit(sheet)} className="p-1 text-slate-400 hover:text-blue-600 transition text-xs">עריכה</button>
                      <button onClick={() => deleteSheet(sheet.id)} className="p-1 text-slate-400 hover:text-red-500 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}

      {sheets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <FileText className="w-16 h-16 mb-3 opacity-20" />
          <p className="font-medium">אין גיליונות עדיין</p>
          <button onClick={addSheet} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">הוסף גיליון ראשון</button>
        </div>
      )}
    </div>
  )
}
