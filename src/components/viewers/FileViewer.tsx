import { lazy, Suspense } from 'react'
import { Download, FileIcon } from 'lucide-react'

const PdfViewer = lazy(() => import('./PdfViewer').then(m => ({ default: m.PdfViewer })))
const ModelViewer3D = lazy(() => import('./ModelViewer3D').then(m => ({ default: m.ModelViewer3D })))
const ExcelViewer = lazy(() => import('./ExcelViewer').then(m => ({ default: m.ExcelViewer })))
const IfcViewer = lazy(() => import('./IfcViewer').then(m => ({ default: m.IfcViewer })))

interface FileViewerProps {
  url: string
  fileName: string
  fileType?: string
}

function getExt(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

function getDesktopApp(ext: string): { name: string; hint: string } | null {
  const map: Record<string, { name: string; hint: string }> = {
    rvt: { name: 'Revit', hint: 'פתח עם Autodesk Revit' },
    rfa: { name: 'Revit', hint: 'פתח עם Autodesk Revit' },
    dwg: { name: 'AutoCAD', hint: 'פתח עם AutoCAD או DraftSight' },
    dxf: { name: 'AutoCAD', hint: 'פתח עם AutoCAD' },
    pln: { name: 'ArchiCAD', hint: 'פתח עם Graphisoft ArchiCAD' },
    skp: { name: 'SketchUp', hint: 'פתח עם SketchUp' },
    '3dm': { name: 'Rhino', hint: 'פתח עם Rhino 3D' },
    '3ds': { name: '3ds Max', hint: 'פתח עם Autodesk 3ds Max' },
    max: { name: '3ds Max', hint: 'פתח עם Autodesk 3ds Max' },
    blend: { name: 'Blender', hint: 'פתח עם Blender' },
    nwd: { name: 'Navisworks', hint: 'פתח עם Autodesk Navisworks' },
    nwc: { name: 'Navisworks', hint: 'פתח עם Autodesk Navisworks' },
    mpp: { name: 'MS Project', hint: 'פתח עם Microsoft Project' },
    psd: { name: 'Photoshop', hint: 'פתח עם Adobe Photoshop' },
    ai: { name: 'Illustrator', hint: 'פתח עם Adobe Illustrator' },
    indd: { name: 'InDesign', hint: 'פתח עם Adobe InDesign' },
    vmat: { name: 'Vectorworks', hint: 'פתח עם Vectorworks' },
    plan: { name: 'Chief Architect', hint: 'פתח עם Chief Architect' },
  }
  return map[ext] ?? null
}

export function FileViewer({ url, fileName, fileType }: FileViewerProps) {
  const ext = getExt(fileName)
  const mime = fileType ?? ''
  const desktopApp = getDesktopApp(ext)

  const fallback = (
    <div className="flex items-center justify-center h-24 bg-slate-100 rounded-lg">
      <div className="text-slate-400 text-sm">טוען...</div>
    </div>
  )

  // PDF
  if (ext === 'pdf' || mime.includes('pdf')) {
    return (
      <Suspense fallback={fallback}>
        <PdfViewer url={url} fileName={fileName} />
      </Suspense>
    )
  }

  // Excel / spreadsheets
  if (['xlsx', 'xls', 'csv', 'ods'].includes(ext) || mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) {
    return (
      <Suspense fallback={fallback}>
        <ExcelViewer url={url} fileName={fileName} />
      </Suspense>
    )
  }

  // IFC BIM
  if (ext === 'ifc') {
    return (
      <Suspense fallback={fallback}>
        <IfcViewer url={url} fileName={fileName} />
      </Suspense>
    )
  }

  // 3D models viewable in browser
  if (['obj', 'gltf', 'glb', 'stl'].includes(ext)) {
    return (
      <Suspense fallback={fallback}>
        <ModelViewer3D url={url} fileName={fileName} fileType={ext} />
      </Suspense>
    )
  }

  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext) || mime.startsWith('image/')) {
    return (
      <div className="rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
        <img src={url} alt={fileName} className="max-w-full max-h-[70vh] object-contain" />
      </div>
    )
  }

  // Video
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext) || mime.startsWith('video/')) {
    return (
      <div className="rounded-lg overflow-hidden bg-black">
        <video src={url} controls className="w-full max-h-[70vh]" />
      </div>
    )
  }

  // Desktop-only files
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-10 bg-slate-50 rounded-xl border border-slate-200">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
        <FileIcon className="w-8 h-8 text-slate-400" />
      </div>
      <div className="text-center">
        <p className="font-medium text-slate-700">{fileName}</p>
        {desktopApp && (
          <p className="text-sm text-slate-500 mt-1">{desktopApp.hint}</p>
        )}
        <p className="text-xs text-slate-400 mt-0.5 uppercase">{ext} קובץ</p>
      </div>
      <div className="flex items-center gap-3">
        <a
          href={url}
          download={fileName}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
        >
          <Download className="w-4 h-4" />
          הורד ופתח ב-{desktopApp?.name ?? 'תוכנה'}
        </a>
      </div>
    </div>
  )
}
