import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Search, Wrench } from 'lucide-react'
import { TOOLS, CATEGORY_META, type ToolCategory } from '@/data/tools'

export const Route = createFileRoute('/_authenticated/tools/')({
  component: ToolsPage,
})

function ToolsPage() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<ToolCategory | 'all'>('all')

  const filtered = TOOLS.filter(t => {
    const matchSearch = !search || t.titleHe.includes(search) || t.descHe.includes(search)
    const matchCat = activeCategory === 'all' || t.category === activeCategory
    return matchSearch && matchCat
  })

  const categories: (ToolCategory | 'all')[] = ['all', 'calculation', 'planning', 'finance', 'process', 'compliance']

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">כלים מקצועיים</h1>
            <p className="text-sm text-slate-500">{TOOLS.length} כלים לאדריכל</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש כלים..."
            className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? `הכל (${TOOLS.length})` : `${CATEGORY_META[cat].labelHe} (${TOOLS.filter(t => t.category === cat).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>לא נמצאו כלים תואמים</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(tool => (
            <Link
              key={tool.id}
              to="/tools/$toolId"
              params={{ toolId: tool.id }}
              className={`group block rounded-2xl border p-5 hover:shadow-md transition-all hover:-translate-y-0.5 ${tool.colorClass}`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_META[tool.category].colorClass}`}>
                  {CATEGORY_META[tool.category].labelHe}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1 group-hover:text-blue-700 transition-colors">
                {tool.titleHe}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">{tool.descHe}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
