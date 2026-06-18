import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useRef, lazy, Suspense } from 'react'
import { ExternalLink, Eye, Monitor, Layers, Search, Upload, X, FolderOpen, Pencil, BarChart2 } from 'lucide-react'
import { FileViewer } from '@/components/viewers/FileViewer'

const FloorPlanEditor = lazy(() => import('@/components/tools/FloorPlanEditor').then(m => ({ default: m.FloorPlanEditor })))
const GanttEditor = lazy(() => import('@/components/tools/GanttEditor').then(m => ({ default: m.GanttEditor })))

export const Route = createFileRoute('/_authenticated/tools/')({
  component: ToolsPage,
})

type BrowserTool = 'floor-plan' | 'gantt'

interface ToolInfo {
  id: string
  label: string
  icon: string
  category: string
  description: string
  formats: string[]
  viewableInBrowser: string[]
  desktopOnly: string[]
  exportFormats: string[]
  websiteUrl?: string
  color: string
  browserTool?: BrowserTool
  badge?: string
}

const TOOLS: ToolInfo[] = [
  {
    id: 'archicad',
    label: 'ArchiCAD / Revit — BIM Studio',
    icon: '🏗️',
    category: 'BIM',
    description: 'תכנון BIM מלא — ציור תוכנית קומה, קירות פרמטריים, חתכים וחזיתות. טעינת קבצי IFC לצפייה תלת-ממדית עם בחירת אלמנטים. ייצוא PDF ו-DXF.',
    formats: ['pln', 'rvt', 'ifc', 'dwg', 'dxf'],
    viewableInBrowser: ['ifc', 'dxf'],
    desktopOnly: ['pln', 'rvt'],
    exportFormats: ['pdf', 'dxf', 'ifc', 'png'],
    websiteUrl: 'https://graphisoft.com/solutions/archicad',
    color: 'bg-purple-600',
    browserTool: 'floor-plan',
    badge: 'BIM מלא',
  },
  {
    id: 'excel',
    label: 'Microsoft Excel',
    icon: '📊',
    category: 'ניהול',
    description: 'גיליון אלקטרוני מלא — נוסחאות (SUM, IF, VLOOKUP, AVERAGE), עיצוב תאים, מיזוג, קיפאון שורות/עמודות. ייבוא וייצוא XLSX/CSV.',
    formats: ['xlsx', 'xls', 'csv', 'ods'],
    viewableInBrowser: ['xlsx', 'xls', 'csv'],
    desktopOnly: ['ods'],
    exportFormats: ['xlsx', 'csv', 'pdf'],
    websiteUrl: 'https://www.microsoft.com/excel',
    color: 'bg-green-600',
    badge: 'ייבוא XLSX',
  },
  {
    id: 'photoshop',
    label: 'Adobe Photoshop',
    icon: '🎨',
    category: 'עיצוב גרפי',
    description: 'עריכת תמונות מקצועית מלאה — שכבות, מסכות, פילטרים, selection tools, כלי clone, עקומות צבע. פוסט-פרודקשן לרנדורים אדריכליים.',
    formats: ['psd', 'psb', 'jpg', 'png', 'tiff', 'webp'],
    viewableInBrowser: ['psd', 'jpg', 'png', 'tiff', 'webp'],
    desktopOnly: [],
    exportFormats: ['jpg', 'png', 'pdf', 'psd', 'webp'],
    websiteUrl: 'https://www.adobe.com/products/photoshop',
    color: 'bg-blue-600',
    badge: '90% Photoshop',
  },
  {
    id: 'lumion',
    label: 'Lumion / Enscape — 3D Renderer',
    icon: '🌅',
    category: 'ויזואליזציה',
    description: 'ויזואליזציה אדריכלית בזמן אמת — ייבוא מודלים GLB/OBJ, עריכת חומרים PBR, תאורת סביבה HDR, מצלמות ועגולת הדגמה. ייצוא תמונות ברזולוציה גבוהה.',
    formats: ['glb', 'gltf', 'obj', 'stl', 'fbx'],
    viewableInBrowser: ['glb', 'gltf', 'obj', 'stl'],
    desktopOnly: ['fbx'],
    exportFormats: ['png', 'jpg'],
    websiteUrl: 'https://lumion.com',
    color: 'bg-yellow-500',
    badge: 'PBR בזמן אמת',
  },
  {
    id: 'sketchup',
    label: 'SketchUp Pro',
    icon: '✏️',
    category: 'מודלים 3D',
    description: 'מודלינג תלת-ממדי וציור תוכנית קומה — ציור מסה מהיר, הוספת גגות וחזיתות, צפייה ב-GLB/OBJ. אידיאלי לשלב קונספט ומצגות ללקוח.',
    formats: ['skp', 'glb', 'gltf', 'obj', 'stl'],
    viewableInBrowser: ['glb', 'gltf', 'obj', 'stl'],
    desktopOnly: ['skp'],
    exportFormats: ['glb', 'obj', 'stl', 'png'],
    websiteUrl: 'https://www.sketchup.com',
    color: 'bg-red-400',
    browserTool: 'floor-plan',
    badge: 'מסה מהירה',
  },
  {
    id: 'indesign',
    label: 'Adobe InDesign — Layout Studio',
    icon: '📖',
    category: 'עיצוב גרפי',
    description: 'עיצוב פרסומים ומצגות — דף רב-עמודי, גרירת תמונות וטקסט, גריד ועזרים, סגנונות פסקה. ייצוא PDF להגשות לוועדה ומצגות ללקוח.',
    formats: ['pdf', 'jpg', 'png'],
    viewableInBrowser: ['pdf', 'jpg', 'png'],
    desktopOnly: [],
    exportFormats: ['pdf', 'png'],
    websiteUrl: 'https://www.adobe.com/products/indesign',
    color: 'bg-pink-600',
    badge: 'layout מלא',
  },
  {
    id: 'vray',
    label: 'V-Ray / Corona — Photo Renderer',
    icon: '✨',
    category: 'רנדור',
    description: 'רנדור פוטו-ריאליסטי — עורך חומרים מלא (מתכות, זכוכית, בד, עץ), תאורה פיזיקלית, HDRI, מצלמה עם עומק שדה ואפרטורה. ייצוא PNG ברזולוציה גבוהה.',
    formats: ['glb', 'gltf', 'obj', 'stl'],
    viewableInBrowser: ['glb', 'gltf', 'obj', 'stl'],
    desktopOnly: [],
    exportFormats: ['png', 'jpg'],
    websiteUrl: 'https://www.chaos.com/vray',
    color: 'bg-indigo-600',
    badge: 'חומרים PBR',
  },
  {
    id: 'navisworks',
    label: 'Navisworks — BIM Coordination',
    icon: '🔍',
    category: 'תיאום BIM',
    description: 'תיאום BIM וזיהוי התנגשויות — טעינת קבצי IFC מכל הדיסציפלינות (אדריכלות, קונסטרוקציה, חשמל, אינסטלציה), Clash Detective, דוח PDF.',
    formats: ['ifc', 'glb', 'gltf', 'obj'],
    viewableInBrowser: ['ifc', 'glb', 'gltf', 'obj'],
    desktopOnly: [],
    exportFormats: ['pdf', 'png'],
    websiteUrl: 'https://www.autodesk.com/products/navisworks',
    color: 'bg-gray-700',
    badge: 'IFC + Clash',
  },
]

const CATEGORIES = ['הכל', 'BIM', 'ניהול', 'עיצוב גרפי', 'ויזואליזציה', 'מודלים 3D', 'רנדור', 'תיאום BIM']

interface LocalFile {
  name: string
  url: string
  type: string
  toolId: string
}

function ToolCard({ tool, onFileOpen, onBrowserTool }: {
  tool: ToolInfo
  onFileOpen: (f: LocalFile) => void
  onBrowserTool: (t: BrowserTool, label: string) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const allAccepted = [...tool.formats].map(f => `.${f}`).join(',')

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const file = files[0]
    const url = URL.createObjectURL(file)
    onFileOpen({ name: file.name, url, type: file.type, toolId: tool.id })
  }

  return (
    <div
      className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${
        dragging ? 'border-blue-400 shadow-md scale-[1.01]' : 'border-slate-100 hover:shadow-md'
      }`}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
    >
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-12 h-12 rounded-xl ${tool.color} flex items-center justify-center text-2xl shrink-0`}>
            {tool.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-800 leading-tight text-sm">{tool.label}</h3>
              {tool.websiteUrl && (
                <a href={tool.websiteUrl} target="_blank" rel="noopener noreferrer"
                  className="text-slate-400 hover:text-blue-500 transition shrink-0">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-400 bg-slate-50 rounded-full px-2 py-0.5 border border-slate-100">
                {tool.category}
              </span>
              {tool.badge && (
                <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 border border-blue-100 font-medium">
                  {tool.badge}
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-4 leading-relaxed">{tool.description}</p>

        <div className="space-y-1.5 mb-4">
          {tool.viewableInBrowser.length > 0 && (
            <div className="flex items-start gap-2">
              <Eye className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
              <span className="text-xs text-slate-500">
                <span className="text-green-700 font-medium">בדפדפן: </span>
                {tool.viewableInBrowser.map(f => `.${f}`).join(', ')}
              </span>
            </div>
          )}
          {tool.desktopOnly.length > 0 && (
            <div className="flex items-start gap-2">
              <Monitor className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" />
              <span className="text-xs text-slate-500">
                <span className="text-orange-700 font-medium">במחשב: </span>
                {tool.desktopOnly.map(f => `.${f}`).join(', ')}
              </span>
            </div>
          )}
          {tool.exportFormats.length > 0 && (
            <div className="flex items-start gap-2">
              <Layers className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
              <span className="text-xs text-slate-500">
                <span className="text-blue-700 font-medium">ייצוא: </span>
                {tool.exportFormats.map(f => `.${f}`).join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 p-3 flex flex-col gap-2">
        <Link
          to="/tools/$toolId"
          params={{ toolId: tool.id }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition"
        >
          פתח כלי
        </Link>
        {tool.browserTool && (
          <button
            onClick={() => onBrowserTool(tool.browserTool!, tool.label)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition text-sm font-medium text-slate-600"
          >
            {tool.browserTool === 'floor-plan'
              ? <><Pencil className="w-3.5 h-3.5" /> ציור מהיר</>
              : <><BarChart2 className="w-3.5 h-3.5" /> גאנט מהיר</>
            }
          </button>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition text-xs text-slate-400 hover:text-blue-600"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          פתח קובץ
        </button>
        <input ref={fileInputRef} type="file" hidden accept={allAccepted || '*'}
          onChange={e => handleFiles(e.target.files)} />
      </div>
    </div>
  )
}

function ToolsPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('הכל')
  const [activeFile, setActiveFile] = useState<LocalFile | null>(null)
  const [activeBrowserTool, setActiveBrowserTool] = useState<{ type: BrowserTool; label: string } | null>(null)

  const filtered = TOOLS.filter(t => {
    const matchCat = category === 'הכל' || t.category === category
    const matchSearch = !search ||
      t.label.toLowerCase().includes(search.toLowerCase()) ||
      t.description.includes(search) ||
      t.formats.some(f => f.includes(search.toLowerCase()))
    return matchCat && matchSearch
  })

  function closeFile() {
    if (activeFile) URL.revokeObjectURL(activeFile.url)
    setActiveFile(null)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">כלי עבודה מקצועיים</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          8 כלים חיוניים לאדריכל — ישירות בדפדפן
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="חפש כלי או פורמט..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                category === cat ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100">
        <span className="font-medium text-slate-600">הסבר:</span>
        <div className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-green-500" /> צפייה ישירה בדפדפן</div>
        <div className="flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5 text-orange-500" /> פותח בתוכנה במחשב</div>
        <div className="flex items-center gap-1.5"><Upload className="w-3.5 h-3.5 text-blue-500" /> גרור קובץ או לחץ "פתח"</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(tool => (
          <ToolCard key={tool.id} tool={tool} onFileOpen={setActiveFile}
            onBrowserTool={(type, label) => setActiveBrowserTool({ type, label })} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">לא נמצאו כלים</p>
        </div>
      )}

      {activeBrowserTool && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl my-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-800">
                  {activeBrowserTool.type === 'floor-plan' ? '✏️ עורך תוכנית קומה' : '📅 לוח גאנט'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeBrowserTool.type === 'floor-plan'
                    ? 'גרור ליצירת חדרים • ציור קירות • ייצוא PDF/DXF'
                    : 'ניהול לוח זמנים • Critical Path • ייצוא PDF'
                  }
                </p>
              </div>
              <button onClick={() => setActiveBrowserTool(null)}
                className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <Suspense fallback={<div className="flex items-center justify-center h-48 text-slate-400">טוען כלי...</div>}>
                {activeBrowserTool.type === 'floor-plan' ? <FloorPlanEditor /> : <GanttEditor />}
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {activeFile && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-800 truncate">{activeFile.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {TOOLS.find(t => t.id === activeFile.toolId)?.label}
                </p>
              </div>
              <button onClick={closeFile}
                className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-500 shrink-0 mr-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <FileViewer url={activeFile.url} fileName={activeFile.name} fileType={activeFile.type} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
