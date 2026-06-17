import { Download, Layers, Box, Info } from 'lucide-react'

interface IfcViewerProps {
  url: string
  fileName?: string
}

const BIM_APPS = [
  { name: 'Autodesk Revit', icon: '🏛️', ext: 'rvt' },
  { name: 'ArchiCAD', icon: '🏗️', ext: 'pln' },
  { name: 'Navisworks', icon: '🔍', ext: 'nwd' },
  { name: 'Rhino 3D', icon: '🦏', ext: '3dm' },
]

export function IfcViewer({ url, fileName }: IfcViewerProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-2">
        <div className="flex items-center gap-2 text-slate-300 text-xs">
          <Layers className="w-4 h-4 text-blue-400" />
          <span>BIM / IFC קובץ</span>
        </div>
        <a
          href={url}
          download={fileName}
          className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
        >
          <Download className="w-3.5 h-3.5" />
          הורד
        </a>
      </div>

      {/* Main card */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="flex flex-col items-center text-center gap-5">
          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
            <Box className="w-10 h-10 text-white" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-800">{fileName ?? 'קובץ IFC'}</h3>
            <p className="text-sm text-slate-500 mt-1">
              Industry Foundation Classes — פורמט BIM אוניברסלי
            </p>
          </div>

          {/* Download CTA */}
          <a
            href={url}
            download={fileName}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition shadow-sm text-sm"
          >
            <Download className="w-4 h-4" />
            הורד קובץ IFC לצפייה בתוכנה
          </a>
        </div>

        {/* Info box */}
        <div className="mt-6 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            קבצי IFC דורשים תוכנת BIM לצפייה מלאה. הורד את הקובץ ופתח באחת מהתוכנות למטה.
          </p>
        </div>

        {/* Compatible apps */}
        <div className="mt-5">
          <p className="text-xs font-semibold text-slate-500 mb-3 text-center">תואם לתוכנות:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {BIM_APPS.map(app => (
              <div
                key={app.name}
                className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-xl border border-slate-200 shadow-sm"
              >
                <span className="text-2xl">{app.icon}</span>
                <span className="text-xs font-medium text-slate-700 text-center leading-tight">{app.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tip */}
        <p className="text-center text-xs text-slate-400 mt-4">
          💡 ייצא מ-Revit/ArchiCAD לפורמט <strong>.glb</strong> לצפייה תלת-ממדית ישירה בדפדפן
        </p>
      </div>
    </div>
  )
}
