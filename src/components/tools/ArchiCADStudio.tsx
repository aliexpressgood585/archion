import { useState, lazy, Suspense } from 'react'

const FloorPlanEditor = lazy(() => import('./FloorPlanEditor').then(m => ({ default: m.FloorPlanEditor })))
const BIMStudio       = lazy(() => import('./BIMStudio').then(m => ({ default: m.BIMStudio })))

const TABS = [
  { id: '2d', label: '📐 תוכנית קומה 2D', sub: 'ציור, קירות, דלתות, מידות, DXF' },
  { id: '3d', label: '🧊 BIM Studio 3D',  sub: 'IFC, חומרים, חתך, כמויות' },
] as const

type TabId = typeof TABS[number]['id']

function Loader() {
  return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm" dir="rtl">
      טוען...
    </div>
  )
}

export function ArchiCADStudio() {
  const [tab, setTab] = useState<TabId>('2d')

  return (
    <div className="flex flex-col" dir="rtl">
      {/* Tab bar */}
      <div className="flex bg-slate-900 rounded-t-xl overflow-hidden border-b border-slate-700">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition border-b-2 ${
              tab === t.id
                ? 'border-blue-500 text-white bg-slate-800'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span>{t.label}</span>
            <span className={`text-xs font-normal hidden sm:inline ${tab === t.id ? 'text-slate-400' : 'text-slate-600'}`}>
              — {t.sub}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <Suspense fallback={<Loader />}>
        {tab === '2d' ? <FloorPlanEditor /> : <BIMStudio />}
      </Suspense>
    </div>
  )
}
