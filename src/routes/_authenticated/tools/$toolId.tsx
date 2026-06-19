import { createFileRoute, Link } from '@tanstack/react-router'
import { lazy, Suspense, useState, useRef } from 'react'
import { ArrowRight, Upload, Trash2, X, FolderOpen, Eye } from 'lucide-react'
import { FileViewer } from '@/components/viewers/FileViewer'

const BIMStudio       = lazy(() => import('@/components/tools/BIMStudio').then(m => ({ default: m.BIMStudio })))
const FloorPlanEditor = lazy(() => import('@/components/tools/FloorPlanEditor').then(m => ({ default: m.FloorPlanEditor })))
const GanttEditor     = lazy(() => import('@/components/tools/GanttEditor').then(m => ({ default: m.GanttEditor })))
const Viewer3D        = lazy(() => import('@/components/tools/Viewer3D').then(m => ({ default: m.Viewer3D })))
const ImageEditor     = lazy(() => import('@/components/tools/ImageEditor').then(m => ({ default: m.ImageEditor })))
const SpreadsheetEditor = lazy(() => import('@/components/tools/SpreadsheetEditor').then(m => ({ default: m.SpreadsheetEditor })))
const ClashDetective  = lazy(() => import('@/components/tools/ClashDetective').then(m => ({ default: m.ClashDetective })))
const LayoutEditor    = lazy(() => import('@/components/tools/LayoutEditor').then(m => ({ default: m.LayoutEditor })))
const SketchUp3D      = lazy(() => import('@/components/tools/SketchUp3D').then(m => ({ default: m.SketchUp3D })))

export const Route = createFileRoute('/_authenticated/tools/$toolId')({
  component: ToolDetailPage,
})

type ToolType =
  | 'floor-plan'
  | '3d-viewer'
  | 'render-3d'
  | 'photoshop'
  | 'spreadsheet'
  | 'layout'
  | 'clash-bim'
  | 'render-gallery'
  | 'gantt'

interface ToolDef {
  label: string
  icon: string
  color: string
  bg: string
  type: ToolType
  description: string
  tip: string
  formats: string[]
  acceptedMime: string
}

const TOOLS: Record<string, ToolDef> = {
  archicad: {
    label: 'ArchiCAD / Revit — BIM Studio',
    icon: '🏗️', color: 'text-purple-600', bg: 'bg-purple-600',
    type: 'floor-plan',
    description: 'תכנון BIM מלא — ציור תוכנית קומה, קירות פרמטריים, דלתות, חלונות, חתכים, חזיתות. ייצוא PDF ו-DXF.',
    tip: 'ציור חדרים וקירות • הוסף דלתות וחלונות • מידות אוטומטיות • ייצוא PDF/DXF',
    formats: ['pln', 'rvt', 'ifc', 'dwg', 'dxf'],
    acceptedMime: '.pln,.rvt,.ifc,.dwg,.dxf,.pdf,.png,.jpg',
  },
  excel: {
    label: 'Microsoft Excel',
    icon: '📊', color: 'text-green-700', bg: 'bg-green-600',
    type: 'spreadsheet',
    description: 'גיליון אלקטרוני מלא — נוסחאות, עיצוב, ייבוא/ייצוא XLSX/CSV',
    tip: 'גיליון מלא עם נוסחאות SUM/IF/VLOOKUP/AVERAGE • ייבא XLSX/CSV • ייצוא לקובץ',
    formats: ['xlsx', 'xls', 'csv', 'ods'],
    acceptedMime: '.xlsx,.xls,.csv,.ods',
  },
  photoshop: {
    label: 'Adobe Photoshop',
    icon: '🎨', color: 'text-blue-700', bg: 'bg-blue-600',
    type: 'photoshop',
    description: 'עריכת תמונות מקצועית מלאה — שכבות, מסכות, פילטרים, Selection, Clone, עקומות',
    tip: 'Photopea — תחליף Photoshop מלא: שכבות, מסכות, פילטרים, PSD • גרור קובץ לפתיחה',
    formats: ['psd', 'psb', 'jpg', 'png', 'tiff', 'webp'],
    acceptedMime: '.psd,.psb,.jpg,.jpeg,.png,.tiff,.webp,.svg',
  },
  lumion: {
    label: 'Lumion / Enscape — 3D Renderer',
    icon: '🌅', color: 'text-yellow-600', bg: 'bg-yellow-500',
    type: 'render-3d',
    description: 'ויזואליזציה אדריכלית בזמן אמת — ייבוא GLB/OBJ, חומרים PBR, תאורת סביבה',
    tip: 'גרור GLB/OBJ/STL לטעינה • ערוך חומרים ותאורה • ייצא תמונה ברזולוציה גבוהה',
    formats: ['glb', 'gltf', 'obj', 'stl'],
    acceptedMime: '.glb,.gltf,.obj,.stl,.fbx',
  },
  sketchup: {
    label: 'SketchUp Pro',
    icon: '✏️', color: 'text-red-500', bg: 'bg-red-400',
    type: '3d-viewer',
    description: 'מודלינג תלת-ממדי — מסה מהירה, גרור GLB/OBJ לצפייה, ייצוא',
    tip: 'גרור GLB/OBJ/STL לצפייה תלת-ממדית מיידית • סיבוב, זום, שינוי חומרים',
    formats: ['glb', 'gltf', 'obj', 'stl', 'skp'],
    acceptedMime: '.glb,.gltf,.obj,.stl,.skp',
  },
  indesign: {
    label: 'Adobe InDesign — Layout Studio',
    icon: '📖', color: 'text-pink-700', bg: 'bg-pink-600',
    type: 'layout',
    description: 'עיצוב פרסומים — דף רב-עמודי, טקסט, תמונות, מלבנים, ייצוא PDF',
    tip: 'בחר כלי (טקסט/תמונה/מלבן) • גרור ליצירה • ערוך מאפיינים בפאנל הימני • ייצוא PDF',
    formats: ['pdf', 'jpg', 'png'],
    acceptedMime: '.pdf,.jpg,.jpeg,.png,.webp',
  },
  vray: {
    label: 'V-Ray / Corona — Photo Renderer',
    icon: '✨', color: 'text-indigo-600', bg: 'bg-indigo-600',
    type: 'render-3d',
    description: 'רנדור פוטו-ריאליסטי — חומרים PBR, HDRI, עומק שדה, ייצוא PNG',
    tip: 'גרור GLB/OBJ לטעינה • ערוך חומרים ותאורה • הגבר חשיפה • ייצא PNG',
    formats: ['glb', 'gltf', 'obj', 'stl'],
    acceptedMime: '.glb,.gltf,.obj,.stl',
  },
  navisworks: {
    label: 'Navisworks — BIM Coordination',
    icon: '🔍', color: 'text-gray-600', bg: 'bg-gray-700',
    type: 'clash-bim',
    description: 'תיאום BIM — IFC מרובה דיסציפלינות, Clash Detective, דוח PDF',
    tip: 'הוסף אלמנטים לפי דיסציפלינה • הרץ Clash Detective • ייצא דוח PDF',
    formats: ['ifc', 'glb', 'gltf', 'obj'],
    acceptedMime: '.ifc,.glb,.gltf,.obj,.nwd,.nwc',
  },
}

interface LocalFile { name: string; url: string; type: string }

function Loader() {
  return <div className="flex items-center justify-center h-48 text-slate-400 text-sm">טוען כלי...</div>
}

function ToolDetailPage() {
  const { toolId } = Route.useParams()
  const tool = TOOLS[toolId]
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<LocalFile[]>([])
  const [viewing, setViewing] = useState<LocalFile | null>(null)
  const [dragging, setDragging] = useState(false)

  if (!tool) {
    return (
      <div className="p-8 text-center text-slate-500" dir="rtl">
        <p className="text-lg font-medium">כלי לא נמצא</p>
        <Link to="/tools" className="text-blue-600 text-sm mt-2 inline-block hover:underline">← חזור לכלים</Link>
      </div>
    )
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return
    const newFiles = Array.from(fileList).map(f => ({
      name: f.name, url: URL.createObjectURL(f), type: f.type,
    }))
    setFiles(prev => [...newFiles, ...prev])
    if (newFiles.length === 1) setViewing(newFiles[0])
  }

  function removeFile(url: string) {
    URL.revokeObjectURL(url)
    setFiles(prev => prev.filter(f => f.url !== url))
    if (viewing?.url === url) setViewing(null)
  }

  const isGallery = tool.type === 'render-gallery'
  const showEmbeddedTool = !isGallery && files.length === 0

  function renderEmbeddedTool() {
    switch (tool.type) {
      case 'floor-plan':   return <BIMStudio />
      case 'gantt':        return <GanttEditor />
      case '3d-viewer':    return <SketchUp3D />
      case 'render-3d':    return <Viewer3D />
      case 'photoshop':    return <ImageEditor />
      case 'spreadsheet':  return <SpreadsheetEditor />
      case 'layout':       return <LayoutEditor />
      case 'clash-bim':    return <ClashDetective />
      default:             return null
    }
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className={`${tool.bg} text-white`}>
        <div className="max-w-7xl mx-auto px-6 py-5">
          <Link to="/tools" className="flex items-center gap-1 text-white/70 hover:text-white text-sm mb-3 w-fit transition">
            <ArrowRight className="w-4 h-4" />
            כל הכלים
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl shrink-0">
              {tool.icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{tool.label}</h1>
              <p className="text-white/80 text-sm mt-0.5">{tool.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2">
              <span className="text-lg">💡</span>
              <p className="text-sm text-blue-700">{tool.tip}</p>
            </div>

            {isGallery && files.length === 0 && (
              <div
                className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 py-16 transition cursor-pointer ${
                  dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-white hover:border-blue-300'
                }`}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className={`w-16 h-16 ${tool.bg} rounded-2xl flex items-center justify-center text-3xl`}>{tool.icon}</div>
                <div className="text-center">
                  <p className="font-semibold text-slate-700">גרור קבצים לכאן</p>
                  <p className="text-sm text-slate-400 mt-1">{tool.formats.map(f => `.${f}`).join(', ')}</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
                  <FolderOpen className="w-4 h-4" />בחר קבצים
                </button>
              </div>
            )}

            {showEmbeddedTool && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 overflow-hidden">
                <Suspense fallback={<Loader />}>
                  {renderEmbeddedTool()}
                </Suspense>
              </div>
            )}

            {viewing && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <p className="text-sm font-medium text-slate-700 truncate">{viewing.name}</p>
                  <button onClick={() => setViewing(null)} className="p-1 rounded hover:bg-slate-200 transition text-slate-500 shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4">
                  <Suspense fallback={<Loader />}>
                    {tool.type === 'photoshop'
                      ? <ImageEditor />
                      : tool.type === '3d-viewer'
                        ? <SketchUp3D />
                        : tool.type === 'render-3d'
                        ? <Viewer3D />
                        : <FileViewer url={viewing.url} fileName={viewing.name} fileType={viewing.type} />
                    }
                  </Suspense>
                </div>
              </div>
            )}

            {isGallery && files.length > 0 && !viewing && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {files.map(f => (
                  <div key={f.url} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white cursor-pointer aspect-video" onClick={() => setViewing(f)}>
                    {f.type.startsWith('video/') ? (
                      <video src={f.url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                      <Eye className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    <button onClick={e => { e.stopPropagation(); removeFile(f.url) }}
                      className="absolute top-1.5 left-1.5 p-1 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition text-white">
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <p className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-1.5 py-1 truncate">{f.name}</p>
                  </div>
                ))}
                <div className="rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition aspect-video"
                  onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span className="text-xs text-slate-400">הוסף קבצים</span>
                </div>
              </div>
            )}
          </div>

          <div className="lg:w-72 shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm sticky top-6">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 text-sm">קבצים</h3>
                <p className="text-xs text-slate-400 mt-0.5">{files.length} קבצים</p>
              </div>
              <div className="p-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed transition text-sm font-medium ${
                    dragging ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <Upload className="w-4 h-4" />העלה קובץ
                </button>
              </div>
              <div className="px-3 pb-3 max-h-96 overflow-y-auto space-y-1">
                {files.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">אין קבצים עדיין</p>
                ) : (
                  files.map(f => (
                    <div key={f.url}
                      className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer group transition ${
                        viewing?.url === f.url ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => setViewing(f)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {f.type.startsWith('image/') ? (
                          <img src={f.url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="text-base">{tool.icon}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 flex-1 min-w-0 truncate">{f.name}</p>
                      <button onClick={e => { e.stopPropagation(); removeFile(f.url) }}
                        className="p-0.5 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" hidden multiple accept={tool.acceptedMime}
        onChange={e => handleFiles(e.target.files)} />
    </div>
  )
}
