import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { Download } from 'lucide-react'

interface ExcelViewerProps {
  url: string
  fileName?: string
}

export function ExcelViewer({ url, fileName }: ExcelViewerProps) {
  const [sheets, setSheets] = useState<string[]>([])
  const [activeSheet, setActiveSheet] = useState('')
  const [rows, setRows] = useState<unknown[][]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wb, setWb] = useState<XLSX.WorkBook | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res = await fetch(url)
        const buf = await res.arrayBuffer()
        const workbook = XLSX.read(buf, { type: 'array' })
        setWb(workbook)
        setSheets(workbook.SheetNames)
        setActiveSheet(workbook.SheetNames[0])
        setLoading(false)
      } catch {
        setError('לא ניתן לטעון את הקובץ')
        setLoading(false)
      }
    }
    load()
  }, [url])

  useEffect(() => {
    if (!wb || !activeSheet) return
    const ws = wb.Sheets[activeSheet]
    const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 })
    setRows(data)
  }, [wb, activeSheet])

  if (loading) return (
    <div className="flex items-center justify-center h-48 bg-slate-100 rounded-lg">
      <p className="text-slate-500">טוען גיליון...</p>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-48 bg-red-50 rounded-lg border border-red-200">
      <p className="text-red-600">{error}</p>
    </div>
  )

  const headers = (rows[0] as string[]) ?? []
  const dataRows = rows.slice(1)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {sheets.map(s => (
            <button
              key={s}
              onClick={() => setActiveSheet(s)}
              className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition ${
                s === activeSheet ? 'bg-green-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <a href={url} download={fileName} className="p-1.5 rounded hover:bg-slate-700 transition text-white shrink-0">
          <Download className="w-4 h-4" />
        </a>
      </div>
      <div className="overflow-auto rounded-lg border border-slate-200 max-h-[60vh]">
        <table className="text-xs border-collapse min-w-full">
          <thead>
            <tr className="bg-green-50 sticky top-0">
              <th className="border border-slate-200 px-2 py-1 text-slate-400 bg-slate-50 w-8">#</th>
              {headers.map((h, i) => (
                <th key={i} className="border border-slate-200 px-3 py-1.5 text-slate-700 font-semibold text-right whitespace-nowrap">
                  {String(h ?? '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-slate-200 px-2 py-1 text-slate-400 text-center">{ri + 1}</td>
                {headers.map((_, ci) => (
                  <td key={ci} className="border border-slate-200 px-3 py-1 text-slate-700 whitespace-nowrap">
                    {String((row as unknown[])[ci] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
