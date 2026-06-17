import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react'

declare global {
  interface Window {
    pdfjsLib: any
  }
}

interface PdfViewerProps {
  url: string
  fileName?: string
}

export function PdfViewer({ url, fileName }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pdf, setPdf] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1.2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      loadPdf()
    }
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [url])

  async function loadPdf() {
    try {
      setLoading(true)
      setError(null)
      const pdfDoc = await window.pdfjsLib.getDocument(url).promise
      setPdf(pdfDoc)
      setNumPages(pdfDoc.numPages)
      setLoading(false)
    } catch {
      setError('לא ניתן לטעון את הקובץ')
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!pdf || !canvasRef.current) return
    async function renderPage() {
      const pdfPage = await pdf.getPage(page)
      const viewport = pdfPage.getViewport({ scale })
      const canvas = canvasRef.current!
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!
      await pdfPage.render({ canvasContext: ctx, viewport }).promise
    }
    renderPage()
  }, [pdf, page, scale])

  if (loading) return (
    <div className="flex items-center justify-center h-64 bg-slate-100 rounded-lg">
      <div className="text-slate-500">טוען PDF...</div>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-64 bg-red-50 rounded-lg border border-red-200">
      <div className="text-red-600">{error}</div>
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      {/* Controls */}
      <div className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded hover:bg-slate-700 disabled:opacity-40 transition text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-white text-sm">{page} / {numPages}</span>
          <button
            onClick={() => setPage(p => Math.min(numPages, p + 1))}
            disabled={page === numPages}
            className="p-1.5 rounded hover:bg-slate-700 disabled:opacity-40 transition text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
            className="p-1.5 rounded hover:bg-slate-700 transition text-white"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-white text-sm">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(s => Math.min(3, s + 0.2))}
            className="p-1.5 rounded hover:bg-slate-700 transition text-white"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <a
            href={url}
            download={fileName}
            className="p-1.5 rounded hover:bg-slate-700 transition text-white"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      </div>
      {/* Canvas */}
      <div className="overflow-auto bg-slate-200 rounded-lg p-4 max-h-[70vh]">
        <canvas ref={canvasRef} className="mx-auto shadow-lg" />
      </div>
    </div>
  )
}
