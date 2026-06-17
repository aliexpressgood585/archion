import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ExternalLink, Download, Eye, Monitor, Layers, Search } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/tools/')({
  component: ToolsPage,
})

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
}

const TOOLS: ToolInfo[] = [
  {
    id: 'revit',
    label: 'Autodesk Revit',
    icon: '🏛️',
    category: 'BIM',
    description: 'תוכנת BIM מובילה לתכנון אדריכלי, הנדסי ובינוי. מאפשרת יצירת מודלים תלת-ממדיים עם מידע מלא.',
    formats: ['rvt', 'rfa', 'rte', 'ifc'],
    viewableInBrowser: ['ifc'],
    desktopOnly: ['rvt', 'rfa', 'rte'],
    exportFormats: ['ifc', 'dwg', 'pdf', 'nwc'],
    websiteUrl: 'https://www.autodesk.com/products/revit',
    color: 'bg-blue-500',
  },
  {
    id: 'autocad',
    label: 'AutoCAD',
    icon: '📐',
    category: 'CAD',
    description: 'תוכנת CAD הוותיקה ביותר לשרטוט דו-ממדי ותלת-ממדי. סטנדרט תעשייתי לתכניות בנייה.',
    formats: ['dwg', 'dxf', 'dwt'],
    viewableInBrowser: [],
    desktopOnly: ['dwg', 'dxf', 'dwt'],
    exportFormats: ['dwg', 'dxf', 'pdf', 'png'],
    websiteUrl: 'https://www.autodesk.com/products/autocad',
    color: 'bg-red-500',
  },
  {
    id: 'archicad',
    label: 'ArchiCAD',
    icon: '🏗️',
    category: 'BIM',
    description: 'תוכנת BIM מבית Graphisoft. פופולרית במיוחד באירופה ובישראל לתכנון אדריכלי.',
    formats: ['pln', 'pla', 'mod', 'ifc'],
    viewableInBrowser: ['ifc'],
    desktopOnly: ['pln', 'pla', 'mod'],
    exportFormats: ['ifc', 'dwg', 'pdf'],
    websiteUrl: 'https://graphisoft.com/solutions/archicad',
    color: 'bg-purple-500',
  },
  {
    id: 'sketchup',
    label: 'SketchUp',
    icon: '✏️',
    category: 'מודלים 3D',
    description: 'כלי מודלינג תלת-ממדי ידידותי למשתמש. אידיאלי לשלבי קונספט ומצגות ללקוח.',
    formats: ['skp'],
    viewableInBrowser: [],
    desktopOnly: ['skp'],
    exportFormats: ['skp', 'dxf', 'obj', 'stl', 'png', 'jpg'],
    websiteUrl: 'https://www.sketchup.com',
    color: 'bg-red-400',
  },
  {
    id: 'rhino',
    label: 'Rhino 3D',
    icon: '🦏',
    category: 'מודלים 3D',
    description: 'תוכנת מודלינג NURBS מתקדמת. שימושית לצורות מורכבות ועיצוב פרמטרי עם Grasshopper.',
    formats: ['3dm', 'ifc'],
    viewableInBrowser: ['ifc'],
    desktopOnly: ['3dm'],
    exportFormats: ['3dm', 'obj', 'stl', 'dwg', 'ifc', 'fbx'],
    websiteUrl: 'https://www.rhino3d.com',
    color: 'bg-gray-500',
  },
  {
    id: 'vectorworks',
    label: 'Vectorworks',
    icon: '📏',
    category: 'CAD/BIM',
    description: 'תוכנת CAD/BIM רב-תכליתית. שימושית לאדריכלים נוף, עיצוב פנים ותאורה.',
    formats: ['vwx', 'mcd', 'ifc'],
    viewableInBrowser: ['ifc'],
    desktopOnly: ['vwx', 'mcd'],
    exportFormats: ['ifc', 'dwg', 'pdf', 'obj'],
    websiteUrl: 'https://www.vectorworks.net',
    color: 'bg-green-500',
  },
  {
    id: 'chief_architect',
    label: 'Chief Architect',
    icon: '🏠',
    category: 'BIM',
    description: 'תוכנת BIM לאדריכלות מגורים. מיועדת לבתי מגורים ועיצוב פנים עם אוטומציה מובנית.',
    formats: ['plan', 'layout'],
    viewableInBrowser: [],
    desktopOnly: ['plan', 'layout'],
    exportFormats: ['pdf', 'dwg', 'obj', 'jpg'],
    websiteUrl: 'https://www.chiefarchitect.com',
    color: 'bg-orange-500',
  },
  {
    id: 'lumion',
    label: 'Lumion',
    icon: '🎨',
    category: 'ויזואליזציה',
    description: 'תוכנת ויזואליזציה אדריכלית מהירה. מאפשרת רנדרים ואנימציות איכותיות בזמן אמת.',
    formats: ['ls', 'lsm'],
    viewableInBrowser: [],
    desktopOnly: ['ls', 'lsm'],
    exportFormats: ['mp4', 'png', 'jpg', 'exe'],
    websiteUrl: 'https://lumion.com',
    color: 'bg-yellow-500',
  },
  {
    id: 'enscape',
    label: 'Enscape',
    icon: '🌅',
    category: 'ויזואליזציה',
    description: 'פלאגין רנדור בזמן אמת לתוכנות BIM/CAD. משתלב ישירות ב-Revit, SketchUp, Rhino ועוד.',
    formats: [],
    viewableInBrowser: [],
    desktopOnly: [],
    exportFormats: ['mp4', 'png', 'exe', 'web'],
    websiteUrl: 'https://enscape3d.com',
    color: 'bg-cyan-500',
  },
  {
    id: 'vray',
    label: 'V-Ray',
    icon: '✨',
    category: 'רנדור',
    description: 'מנוע רנדור פיזיקלי מוביל. תוצאות פוטו-ריאליסטיות. עובד כפלאגין ב-3ds Max, SketchUp, Rhino.',
    formats: ['vrscene'],
    viewableInBrowser: [],
    desktopOnly: ['vrscene'],
    exportFormats: ['png', 'jpg', 'exr', 'tiff'],
    websiteUrl: 'https://www.chaos.com/vray',
    color: 'bg-indigo-500',
  },
  {
    id: 'corona',
    label: 'Corona Renderer',
    icon: '☀️',
    category: 'רנדור',
    description: 'מנוע רנדור ידידותי עם תוצאות פוטו-ריאליסטיות. פופולרי לרנדורי אדריכלות ב-3ds Max.',
    formats: [],
    viewableInBrowser: [],
    desktopOnly: [],
    exportFormats: ['png', 'jpg', 'exr'],
    websiteUrl: 'https://corona-renderer.com',
    color: 'bg-yellow-600',
  },
  {
    id: 'twinmotion',
    label: 'Twinmotion',
    icon: '🎬',
    category: 'ויזואליזציה',
    description: 'תוכנת ויזואליזציה מבית Epic Games. מבוססת Unreal Engine, עם VR ואנימציות בזמן אמת.',
    formats: ['tm'],
    viewableInBrowser: [],
    desktopOnly: ['tm'],
    exportFormats: ['mp4', 'png', 'exe', 'gltf'],
    websiteUrl: 'https://www.twinmotion.com',
    color: 'bg-blue-400',
  },
  {
    id: 'unreal_engine',
    label: 'Unreal Engine',
    icon: '🎮',
    category: 'ויזואליזציה',
    description: 'מנוע משחקים מוביל לויזואליזציה אדריכלית ברמה הגבוהה ביותר. VR, AR, אנימציה מלאה.',
    formats: ['uproject'],
    viewableInBrowser: [],
    desktopOnly: ['uproject'],
    exportFormats: ['mp4', 'png', 'exe', 'glb'],
    websiteUrl: 'https://www.unrealengine.com',
    color: 'bg-gray-800',
  },
  {
    id: 'd5_render',
    label: 'D5 Render',
    icon: '🎨',
    category: 'ויזואליזציה',
    description: 'תוכנת ויזואליזציה מבוססת AI. קל לשימוש, תוצאות מרשימות, סינכרון עם Revit/SketchUp.',
    formats: ['d5a'],
    viewableInBrowser: [],
    desktopOnly: ['d5a'],
    exportFormats: ['mp4', 'png', 'jpg'],
    websiteUrl: 'https://www.d5render.com',
    color: 'bg-pink-500',
  },
  {
    id: '3ds_max',
    label: '3ds Max',
    icon: '🔷',
    category: 'מודלים 3D',
    description: 'תוכנת מודלינג ואנימציה תלת-ממדית מבית Autodesk. סטנדרט לרנדורים ואנימציות אדריכליות.',
    formats: ['max', '3ds'],
    viewableInBrowser: [],
    desktopOnly: ['max', '3ds'],
    exportFormats: ['obj', 'fbx', 'stl', '3ds', 'dxf'],
    websiteUrl: 'https://www.autodesk.com/products/3ds-max',
    color: 'bg-yellow-400',
  },
  {
    id: 'blender',
    label: 'Blender',
    icon: '🍊',
    category: 'מודלים 3D',
    description: 'תוכנת מודלינג ורנדור חינמית ומקוד פתוח. יכולות מלאות: מודלינג, אנימציה, רנדור Cycles.',
    formats: ['blend'],
    viewableInBrowser: ['glb', 'gltf', 'obj', 'stl'],
    desktopOnly: ['blend'],
    exportFormats: ['glb', 'gltf', 'obj', 'stl', 'fbx', 'svg'],
    websiteUrl: 'https://www.blender.org',
    color: 'bg-orange-500',
  },
  {
    id: 'photoshop',
    label: 'Adobe Photoshop',
    icon: '🎨',
    category: 'עיצוב גרפי',
    description: 'עריכת תמונות ורנדורים. פוסט-פרודקשן לרנדורים, עיצוב תכניות צבע, קולאז׳ קונספטואלי.',
    formats: ['psd', 'psb'],
    viewableInBrowser: ['jpg', 'png', 'svg'],
    desktopOnly: ['psd', 'psb'],
    exportFormats: ['jpg', 'png', 'pdf', 'svg', 'tiff'],
    websiteUrl: 'https://www.adobe.com/products/photoshop',
    color: 'bg-blue-600',
  },
  {
    id: 'illustrator',
    label: 'Adobe Illustrator',
    icon: '✏️',
    category: 'עיצוב גרפי',
    description: 'עיצוב גרפי וקטורי. גרפיקה לתכניות, לוגואים, תכניות צבע ואינפוגרפיקה אדריכלית.',
    formats: ['ai', 'eps'],
    viewableInBrowser: ['svg', 'pdf'],
    desktopOnly: ['ai', 'eps'],
    exportFormats: ['pdf', 'svg', 'png', 'jpg', 'eps'],
    websiteUrl: 'https://www.adobe.com/products/illustrator',
    color: 'bg-red-500',
  },
  {
    id: 'indesign',
    label: 'Adobe InDesign',
    icon: '📖',
    category: 'עיצוב גרפי',
    description: 'עיצוב פרסומים ומצגות. פנקסי תכנון, קטלוגים, ספרי פרויקט וחוברות מכירה.',
    formats: ['indd', 'idml'],
    viewableInBrowser: ['pdf'],
    desktopOnly: ['indd', 'idml'],
    exportFormats: ['pdf', 'jpg', 'png', 'epub'],
    websiteUrl: 'https://www.adobe.com/products/indesign',
    color: 'bg-pink-600',
  },
  {
    id: 'autodesk_forma',
    label: 'Autodesk Forma',
    icon: '🌍',
    category: 'BIM',
    description: 'פלטפורמת תכנון מבוססת ענן לשלבי תכנון מוקדמים. ניתוחי אור, צל ורוח.',
    formats: [],
    viewableInBrowser: [],
    desktopOnly: [],
    exportFormats: ['ifc', 'dwg', 'pdf'],
    websiteUrl: 'https://www.autodesk.com/products/forma',
    color: 'bg-blue-700',
  },
  {
    id: 'navisworks',
    label: 'Navisworks',
    icon: '🔍',
    category: 'תיאום BIM',
    description: 'תוכנה לתיאום BIM וזיהוי התנגשויות. מאחדת מודלים ממספר תוכנות לביקורת מקיפה.',
    formats: ['nwd', 'nwc', 'nwf'],
    viewableInBrowser: [],
    desktopOnly: ['nwd', 'nwc', 'nwf'],
    exportFormats: ['pdf', 'nwd'],
    websiteUrl: 'https://www.autodesk.com/products/navisworks',
    color: 'bg-gray-600',
  },
  {
    id: 'excel',
    label: 'Microsoft Excel',
    icon: '📊',
    category: 'ניהול',
    description: 'גיליון אלקטרוני לניהול תקציב, כמויות חומרים, לוחות זמנים ועוד.',
    formats: ['xlsx', 'xls', 'csv', 'ods'],
    viewableInBrowser: ['xlsx', 'xls', 'csv'],
    desktopOnly: [],
    exportFormats: ['xlsx', 'csv', 'pdf'],
    websiteUrl: 'https://www.microsoft.com/excel',
    color: 'bg-green-600',
  },
  {
    id: 'project',
    label: 'MS Project',
    icon: '📅',
    category: 'ניהול',
    description: 'ניהול לוחות זמנים ומשאבים לפרויקטי בנייה. Gantt charts, קריטי path ועוד.',
    formats: ['mpp', 'mpt'],
    viewableInBrowser: [],
    desktopOnly: ['mpp', 'mpt'],
    exportFormats: ['pdf', 'xlsx', 'xml'],
    websiteUrl: 'https://www.microsoft.com/project',
    color: 'bg-purple-600',
  },
]

const CATEGORIES = ['הכל', 'BIM', 'CAD', 'מודלים 3D', 'ויזואליזציה', 'רנדור', 'עיצוב גרפי', 'תיאום BIM', 'ניהול', 'CAD/BIM']

function ToolsPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('הכל')

  const filtered = TOOLS.filter(t => {
    const matchCat = category === 'הכל' || t.category === category
    const matchSearch = !search ||
      t.label.toLowerCase().includes(search.toLowerCase()) ||
      t.description.includes(search) ||
      t.formats.some(f => f.includes(search.toLowerCase()))
    return matchCat && matchSearch
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">כלי עבודה</h1>
        <p className="text-slate-500 text-sm mt-0.5">24 תוכנות אדריכלות — צפייה, הורדה ושיתוף</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="חפש תוכנה או פורמט..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                category === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-green-500" /> צפייה ישירה בדפדפן</div>
        <div className="flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5 text-orange-500" /> דורש תוכנת מחשב</div>
        <div className="flex items-center gap-1.5"><Download className="w-3.5 h-3.5 text-blue-500" /> הורדה</div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(tool => (
          <div key={tool.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition">
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl ${tool.color} flex items-center justify-center text-2xl shrink-0`}>
                {tool.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-800 leading-tight">{tool.label}</h3>
                  {tool.websiteUrl && (
                    <a
                      href={tool.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-blue-500 transition shrink-0"
                      title="אתר רשמי"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <span className="text-xs text-slate-400 bg-slate-50 rounded-full px-2 py-0.5 border border-slate-100">
                  {tool.category}
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4 leading-relaxed">{tool.description}</p>

            {/* Formats */}
            <div className="space-y-2">
              {tool.viewableInBrowser.length > 0 && (
                <div className="flex items-start gap-2">
                  <Eye className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs text-green-700 font-medium">צפייה בדפדפן: </span>
                    <span className="text-xs text-slate-500">{tool.viewableInBrowser.map(f => `.${f}`).join(', ')}</span>
                  </div>
                </div>
              )}
              {tool.desktopOnly.length > 0 && (
                <div className="flex items-start gap-2">
                  <Monitor className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs text-orange-700 font-medium">פתיחה במחשב: </span>
                    <span className="text-xs text-slate-500">{tool.desktopOnly.map(f => `.${f}`).join(', ')}</span>
                  </div>
                </div>
              )}
              {tool.exportFormats.length > 0 && (
                <div className="flex items-start gap-2">
                  <Layers className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs text-blue-700 font-medium">יצוא: </span>
                    <span className="text-xs text-slate-500">{tool.exportFormats.map(f => `.${f}`).join(', ')}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Capabilities */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
              {tool.viewableInBrowser.length > 0 && (
                <span className="text-xs bg-green-50 text-green-700 rounded-full px-2 py-0.5 border border-green-100">
                  צפייה ישירה
                </span>
              )}
              {tool.desktopOnly.length > 0 && (
                <span className="text-xs bg-orange-50 text-orange-700 rounded-full px-2 py-0.5 border border-orange-100">
                  דורש מחשב
                </span>
              )}
              {tool.formats.length === 0 && (
                <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 border border-blue-100">
                  פלאגין/ענן
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">לא נמצאו תוכנות</p>
          <p className="text-sm mt-1">נסה חיפוש אחר</p>
        </div>
      )}
    </div>
  )
}
