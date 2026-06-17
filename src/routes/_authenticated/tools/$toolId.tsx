import { createFileRoute, Link } from '@tanstack/react-router'
import { lazy, Suspense, useState, useRef } from 'react'
import { ArrowRight, Upload, Trash2, X, FolderOpen, Eye } from 'lucide-react'
import { FileViewer } from '@/components/viewers/FileViewer'

const FloorPlanEditor = lazy(() => import('@/components/tools/FloorPlanEditor').then(m => ({ default: m.FloorPlanEditor })))
const GanttEditor = lazy(() => import('@/components/tools/GanttEditor').then(m => ({ default: m.GanttEditor })))

export const Route = createFileRoute('/_authenticated/tools/$toolId')({
  component: ToolDetailPage,
})

type ToolType = 'floor-plan' | '3d-viewer' | 'render-gallery' | 'design-viewer' | 'gantt'

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
  revit: {
    label: 'Autodesk Revit', icon: '🏛️', color: 'text-blue-600', bg: 'bg-blue-500',
    type: 'floor-plan',
    description: 'BIM לתכנון אדריכלי, הנדסי ובינוי עם מידע מלא',
    tip: 'ציור חדרים, חישוב שטחים, ייצוא ל-PNG',
    formats: ['rvt','rfa','ifc','dwg'], acceptedMime: '.rvt,.rfa,.ifc,.dwg,.pdf,.png,.jpg',
  },
  autocad: {
    label: 'AutoCAD', icon: '📐', color: 'text-red-600', bg: 'bg-red-500',
    type: 'floor-plan',
    description: 'שרטוט דו-ממדי ותלת-ממדי — סטנדרט תעשייתי לתכניות בנייה',
    tip: 'ציור קוים, חדרים ומידות — ייצוא ל-PNG',
    formats: ['dwg','dxf'], acceptedMime: '.dwg,.dxf,.pdf,.png,.jpg',
  },
  archicad: {
    label: 'ArchiCAD', icon: '🏗️', color: 'text-purple-600', bg: 'bg-purple-500',
    type: 'floor-plan',
    description: 'BIM מבית Graphisoft — פופולרי בישראל ובאירופה',
    tip: 'ציור תוכנית קומה, חישוב שטחים',
    formats: ['pln','ifc'], acceptedMime: '.pln,.ifc,.pdf,.png,.jpg',
  },
  sketchup: {
    label: 'SketchUp Pro', icon: '✏️', color: 'text-red-500', bg: 'bg-red-400',
    type: 'floor-plan',
    description: 'מודלינג תלת-ממדי ידידותי — אידיאלי לקונספט ומצגות',
    tip: 'ציור תוכנית בסיסית, ייצוא קבצי OBJ/GLB לצפייה תלת-ממדית',
    formats: ['skp','obj','glb'], acceptedMime: '.skp,.obj,.glb,.stl,.png,.jpg',
  },
  rhino: {
    label: 'Rhino 3D + Grasshopper', icon: '🦏', color: 'text-gray-600', bg: 'bg-gray-500',
    type: '3d-viewer',
    description: 'מודלינג NURBS מתקדם — צורות מורכבות ועיצוב פרמטרי',
    tip: 'גרור קובץ OBJ, GLB, STL לצפייה תלת-ממדית מיידית',
    formats: ['3dm','obj','glb','stl'], acceptedMime: '.3dm,.obj,.glb,.gltf,.stl,.fbx',
  },
  vectorworks: {
    label: 'Vectorworks', icon: '📏', color: 'text-green-600', bg: 'bg-green-500',
    type: 'floor-plan',
    description: 'CAD/BIM רב-תכליתי — אדריכלים נוף, עיצוב פנים, תאורה',
    tip: 'ציור תוכנית קומה עם חישוב שטחים',
    formats: ['vwx','ifc'], acceptedMime: '.vwx,.ifc,.pdf,.png,.jpg',
  },
  lumion: {
    label: 'Lumion', icon: '🎨', color: 'text-yellow-600', bg: 'bg-yellow-500',
    type: 'render-gallery',
    description: 'ויזואליזציה אדריכלית מהירה — רנדרים ואנימציות בזמן אמת',
    tip: 'גרור תמונות/וידאו מ-Lumion לגלריית הרנדרים',
    formats: ['png','jpg','mp4'], acceptedMime: '.png,.jpg,.jpeg,.webp,.mp4,.mov',
  },
  enscape: {
    label: 'Enscape', icon: '🌅', color: 'text-cyan-600', bg: 'bg-cyan-500',
    type: 'render-gallery',
    description: 'רנדור בזמן אמת — פלאגין ל-Revit, SketchUp, Rhino',
    tip: 'ייבא רנדרים מ-Enscape לצפייה ושיתוף',
    formats: ['png','jpg','mp4'], acceptedMime: '.png,.jpg,.jpeg,.webp,.mp4,.mov',
  },
  vray: {
    label: 'V-Ray', icon: '✨', color: 'text-indigo-600', bg: 'bg-indigo-500',
    type: 'render-gallery',
    description: 'מנוע רנדור פיזיקלי — פוטו-ריאליסטי עבור 3ds Max, SketchUp, Rhino',
    tip: 'ייבא רנדרים פיזיקליים לצפייה ובדיקה',
    formats: ['png','jpg','exr'], acceptedMime: '.png,.jpg,.jpeg,.webp,.exr,.tiff',
  },
  corona: {
    label: 'Corona Renderer', icon: '☀️', color: 'text-yellow-700', bg: 'bg-yellow-600',
    type: 'render-gallery',
    description: 'רנדור ידידותי עם תוצאות פוטו-ריאליסטיות — פופולרי ב-3ds Max',
    tip: 'גלריית רנדרים פיזיקליים',
    formats: ['png','jpg'], acceptedMime: '.png,.jpg,.jpeg,.webp,.exr',
  },
  twinmotion: {
    label: 'Twinmotion', icon: '🎬', color: 'text-blue-500', bg: 'bg-blue-400',
    type: 'render-gallery',
    description: 'ויזואליזציה בזמן אמת מבית Epic Games — VR ואנימציה',
    tip: 'גרור וידאו ותמונות מ-Twinmotion לגלריה',
    formats: ['mp4','png','glb'], acceptedMime: '.mp4,.mov,.png,.jpg,.jpeg,.glb,.gltf',
  },
  unreal_engine: {
    label: 'Unreal Engine', icon: '🎮', color: 'text-gray-900', bg: 'bg-gray-800',
    type: 'render-gallery',
    description: 'ויזואליזציה ברמה הגבוהה ביותר — VR, AR ואנימציה מלאה',
    tip: 'ייבא רנדרים ואנימציות מ-Unreal',
    formats: ['mp4','png','glb'], acceptedMime: '.mp4,.mov,.png,.jpg,.jpeg,.glb',
  },
  d5_render: {
    label: 'D5 Render', icon: '🎨', color: 'text-pink-600', bg: 'bg-pink-500',
    type: 'render-gallery',
    description: 'ויזואליזציה מבוססת AI — סינכרון עם Revit, SketchUp',
    tip: 'גרור רנדרים מ-D5 לגלריה',
    formats: ['png','jpg','mp4'], acceptedMime: '.png,.jpg,.jpeg,.webp,.mp4',
  },
  '3ds_max': {
    label: '3ds Max', icon: '🔷', color: 'text-yellow-600', bg: 'bg-yellow-400',
    type: '3d-viewer',
    description: 'מודלינג ואנימציה תלת-ממדית — סטנדרט לרנדורים אדריכליים',
    tip: 'ייצא מ-3ds Max ל-OBJ או FBX וגרור לצפייה תלת-ממדית',
    formats: ['obj','stl','glb'], acceptedMime: '.obj,.stl,.glb,.gltf,.fbx',
  },
  photoshop: {
    label: 'Adobe Photoshop', icon: '🎨', color: 'text-blue-700', bg: 'bg-blue-600',
    type: 'design-viewer',
    description: 'עריכת תמונות ורנדורים — פוסט-פרודקשן, קולאז׳ קונספטואלי',
    tip: 'גרור תמונות PNG/JPG/WEBP לצפייה ובדיקה',
    formats: ['psd','png','jpg'], acceptedMime: '.psd,.png,.jpg,.jpeg,.webp,.svg,.tiff',
  },
  illustrator: {
    label: 'Adobe Illustrator', icon: '✏️', color: 'text-orange-600', bg: 'bg-orange-500',
    type: 'design-viewer',
    description: 'עיצוב גרפי וקטורי — תכניות צבע, לוגואים, אינפוגרפיקה',
    tip: 'גרור SVG או PDF לצפייה ישירה',
    formats: ['ai','svg','pdf'], acceptedMime: '.ai,.svg,.pdf,.eps,.png,.jpg',
  },
  indesign: {
    label: 'Adobe InDesign', icon: '📖', color: 'text-pink-700', bg: 'bg-pink-600',
    type: 'design-viewer',
    description: 'עיצוב פרסומים — פנקסי תכנון, קטלוגים, ספרי פרויקט',
    tip: 'גרור PDF לצפייה ישירה עם ניווט עמודים',
    formats: ['indd','pdf'], acceptedMime: '.indd,.idml,.pdf,.png,.jpg',
  },
  blender: {
    label: 'Blender', icon: '🍊', color: 'text-orange-600', bg: 'bg-orange-500',
    type: '3d-viewer',
    description: 'מודלינג ורנדור חינמי ופתוח — Cycles, Eevee, אנימציה',
    tip: 'ייצא מ-Blender ל-GLB/OBJ/STL וגרור לצפייה תלת-ממדית',
    formats: ['blend','glb','obj','stl'], acceptedMime: '.blend,.glb,.gltf,.obj,.stl,.fbx',
  },
}

interface LocalFile { name: string; url: string; type: string }

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

  const showTool = tool.type !== 'render-gallery' && tool.type !== 'design-viewer' && files.length === 0

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main workspace */}
          <div className="flex-1 min-w-0">
            {/* Tip bar */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2">
              <span className="text-lg">💡</span>
              <p className="text-sm text-blue-700">{tool.tip}</p>
            </div>

            {/* Drop zone when no files */}
            {files.length === 0 && (tool.type === 'render-gallery' || tool.type === 'design-viewer') && (
              <div
                className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 py-16 transition cursor-pointer ${
                  dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-white hover:border-blue-300 hover:bg-slate-50'
                }`}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className={`w-16 h-16 ${tool.bg} rounded-2xl flex items-center justify-center text-3xl`}>
                  {tool.icon}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-700">גרור קבצים לכאן</p>
                  <p className="text-sm text-slate-400 mt-1">
                    {tool.formats.map(f => `.${f}`).join(', ')}
                  </p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
                  <FolderOpen className="w-4 h-4" />
                  בחר קבצים
                </button>
              </div>
            )}

            {/* In-browser tool */}
            {showTool && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <Suspense fallback={<div className="flex items-center justify-center h-32 text-slate-400 text-sm">טוען כלי...</div>}>
                  {tool.type === 'floor-plan' && <FloorPlanEditor />}
                  {tool.type === 'gantt' && <GanttEditor />}
                  {tool.type === '3d-viewer' && (
                    <div
                      className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 py-14 cursor-pointer transition ${
                        dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
                      }`}
                      onDragOver={e => { e.preventDefault(); setDragging(true) }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <span className="text-4xl">{tool.icon}</span>
                      <p className="text-slate-600 font-medium">גרור קובץ 3D לצפייה</p>
                      <p className="text-slate-400 text-sm">{tool.formats.map(f => `.${f}`).join(' • ')}</p>
                    </div>
                  )}
                </Suspense>
              </div>
            )}

            {/* File viewer */}
            {viewing && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <p className="text-sm font-medium text-slate-700 truncate">{viewing.name}</p>
                  <button onClick={() => setViewing(null)} className="p-1 rounded hover:bg-slate-200 transition text-slate-500 shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4">
                  <FileViewer url={viewing.url} fileName={viewing.name} fileType={viewing.type} />
                </div>
              </div>
            )}

            {/* Render gallery grid */}
            {(tool.type === 'render-gallery' || tool.type === 'design-viewer') && files.length > 0 && !viewing && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {files.map(f => (
                  <div
                    key={f.url}
                    className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white cursor-pointer aspect-video"
                    onClick={() => setViewing(f)}
                  >
                    {f.type.startsWith('video/') ? (
                      <video src={f.url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                      <Eye className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); removeFile(f.url) }}
                      className="absolute top-1.5 left-1.5 p-1 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition text-white"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <p className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-1.5 py-1 truncate">
                      {f.name}
                    </p>
                  </div>
                ))}
                <div
                  className="rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition aspect-video"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span className="text-xs text-slate-400">הוסף קבצים</span>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: files list */}
          <div className="lg:w-72 shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm sticky top-6">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 text-sm">קבצים</h3>
                <p className="text-xs text-slate-400 mt-0.5">{files.length} קבצים</p>
              </div>

              {/* Upload button */}
              <div className="p-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed transition text-sm font-medium ${
                    dragging
                      ? 'border-blue-400 bg-blue-50 text-blue-600'
                      : 'border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  העלה קובץ
                </button>
              </div>

              {/* Files list */}
              <div className="px-3 pb-3 max-h-96 overflow-y-auto space-y-1">
                {files.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">אין קבצים עדיין</p>
                ) : (
                  files.map(f => (
                    <div
                      key={f.url}
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
                      <button
                        onClick={e => { e.stopPropagation(); removeFile(f.url) }}
                        className="p-0.5 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Floor plan: show after canvas too */}
              {tool.type === 'floor-plan' && files.length > 0 && (
                <div className="px-3 pb-3 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => setViewing(null)}
                    className={`w-full py-2 rounded-lg text-xs font-medium transition ${
                      !viewing ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ✏️ תוכנית קומה
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        hidden
        multiple
        accept={tool.acceptedMime}
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  )
}
