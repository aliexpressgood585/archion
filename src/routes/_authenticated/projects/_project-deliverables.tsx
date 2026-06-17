import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { formatDate } from '@/lib/utils'
import {
  Plus, Upload, CheckCircle, Clock, AlertCircle,
  FileCode2, Palette, Zap, Eye, Download
} from 'lucide-react'
import type { Deliverable, DeliverableFile, ArchitectureTool } from '@/integrations/supabase/types'

interface DeliverableWithFiles extends Deliverable {
  files: DeliverableFile[]
}

const TOOL_INFO: Record<ArchitectureTool, { label: string; icon: string; color: string }> = {
  revit: { label: 'Revit', icon: '🏛️', color: 'bg-blue-100 text-blue-700' },
  autocad: { label: 'AutoCAD', icon: '📐', color: 'bg-red-100 text-red-700' },
  archicad: { label: 'ArchiCAD', icon: '🏗️', color: 'bg-purple-100 text-purple-700' },
  sketchup: { label: 'SketchUp', icon: '✏️', color: 'bg-red-100 text-red-700' },
  rhino: { label: 'Rhino 3D', icon: '🦏', color: 'bg-gray-100 text-gray-700' },
  vectorworks: { label: 'Vectorworks', icon: '📏', color: 'bg-green-100 text-green-700' },
  chief_architect: { label: 'Chief Architect', icon: '🏠', color: 'bg-orange-100 text-orange-700' },
  lumion: { label: 'Lumion', icon: '🎨', color: 'bg-yellow-100 text-yellow-700' },
  enscape: { label: 'Enscape', icon: '🌅', color: 'bg-cyan-100 text-cyan-700' },
  vray: { label: 'V-Ray', icon: '✨', color: 'bg-indigo-100 text-indigo-700' },
  corona: { label: 'Corona', icon: '☀️', color: 'bg-yellow-100 text-yellow-700' },
  twinmotion: { label: 'Twinmotion', icon: '🎬', color: 'bg-blue-100 text-blue-700' },
  unreal_engine: { label: 'Unreal Engine', icon: '🎮', color: 'bg-black text-white' },
  d5_render: { label: 'D5 Render', icon: '🎨', color: 'bg-pink-100 text-pink-700' },
  '3ds_max': { label: '3ds Max', icon: '🔷', color: 'bg-yellow-100 text-yellow-700' },
  photoshop: { label: 'Photoshop', icon: '🎨', color: 'bg-blue-100 text-blue-700' },
  illustrator: { label: 'Illustrator', icon: '✏️', color: 'bg-red-100 text-red-700' },
  indesign: { label: 'InDesign', icon: '📖', color: 'bg-pink-100 text-pink-700' },
  blender: { label: 'Blender', icon: '🍊', color: 'bg-orange-100 text-orange-700' },
  autodesk_forma: { label: 'Autodesk Forma', icon: '🌍', color: 'bg-blue-100 text-blue-700' },
  navisworks: { label: 'Navisworks', icon: '🏗️', color: 'bg-gray-100 text-gray-700' },
  excel: { label: 'Excel', icon: '📊', color: 'bg-green-100 text-green-700' },
  project: { label: 'MS Project', icon: '📅', color: 'bg-purple-100 text-purple-700' },
  other: { label: 'Other', icon: '📦', color: 'bg-gray-100 text-gray-700' },
}

const CATEGORY_LABELS: Record<string, string> = {
  concept: 'קונספט',
  schematic: 'סכיצה',
  design_dev: 'פיתוח עיצוב',
  construction_docs: 'תכניות בנייה',
  rendering: 'רנדרים',
  animation: 'אנימציה',
  specifications: 'מפרטים',
  bom: 'רשימת ציוד',
  schedules: 'לוח זמנים',
  reports: 'דוחות',
  site_photos: 'תמונות אתר',
  other: 'אחר',
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  pending: Clock,
  in_progress: Zap,
  review: Eye,
  approved: CheckCircle,
  archived: AlertCircle,
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'ממתין',
  in_progress: 'בתהליך',
  review: 'בבדיקה',
  approved: 'אושר',
  archived: 'בארכיון',
}

export function ProjectDeliverables({ projectId }: { projectId: string }) {
  const { profile } = useAuth()
  const [deliverables, setDeliverables] = useState<DeliverableWithFiles[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedDel, setSelectedDel] = useState<string | null>(null)
  const [newDelForm, setNewDelForm] = useState({
    name: '',
    description: '',
    category: 'other' as const,
    tools: [] as ArchitectureTool[],
    due_date: '',
  })
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const orgId = profile?.organization_id

  async function fetchDeliverables() {
    if (!orgId || !projectId) return
    const { data } = await (supabase
      .from('deliverables' as any)
      .select('*, deliverable_files(*)')
      .eq('organization_id', orgId)
      .eq('project_id', projectId)
      .order('sort_order') as any)

    setDeliverables((data as DeliverableWithFiles[]) ?? [])
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      await fetchDeliverables()
      setLoading(false)
    }
    load()
  }, [orgId, projectId])

  const handleCreateDeliverable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId || !newDelForm.name.trim()) return

    setSaving(true)
    const { error } = await (supabase.from('deliverables' as any).insert({
      organization_id: orgId,
      project_id: projectId,
      name: newDelForm.name,
      description: newDelForm.description || null,
      category: newDelForm.category as any,
      required_tools: newDelForm.tools,
      due_date: newDelForm.due_date || null,
      created_by: profile?.id,
    }) as any)

    setSaving(false)
    if (!error) {
      setShowNewModal(false)
      setNewDelForm({ name: '', description: '', category: 'other', tools: [], due_date: '' })
      fetchDeliverables()
    }
  }

  const handleFileUpload = async (delId: string, file: File) => {
    if (!orgId || !profile) return

    const fileName = `${projectId}/${delId}/${Date.now()}_${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('deliverables')
      .upload(fileName, file, { upsert: false })

    if (uploadError) return

    const latestFile = deliverables
      .find(d => d.id === delId)
      ?.files?.sort((a, b) => b.version_number - a.version_number)[0]

    const { error } = await (supabase.from('deliverable_files' as any).insert({
      deliverable_id: delId,
      organization_id: orgId,
      project_id: projectId,
      file_name: file.name,
      file_path: fileName,
      file_size: file.size,
      file_type: file.type,
      tool_used: 'other',
      version_number: (latestFile?.version_number ?? 0) + 1,
      uploaded_by: profile.id,
    }) as any)

    if (!error) {
      fetchDeliverables()
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">נושאי עבודה</h2>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          נושא חדש
        </button>
      </div>

      {/* Deliverables Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : deliverables.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileCode2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>אין נושאי עבודה עדיין</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deliverables.map(del => {
            const StatusIcon = STATUS_ICONS[del.status] || Clock
            return (
              <div
                key={del.id}
                className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition cursor-pointer"
                onClick={() => setSelectedDel(selectedDel === del.id ? null : del.id)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800">{del.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {CATEGORY_LABELS[del.category]}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    <StatusIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-600">
                      {STATUS_LABELS[del.status]}
                    </span>
                  </div>
                </div>

                {/* Tools */}
                {del.required_tools.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {del.required_tools.map(tool => {
                      const info = TOOL_INFO[tool]
                      return (
                        <span
                          key={tool}
                          className={`text-xs px-2 py-1 rounded ${info.color}`}
                          title={info.label}
                        >
                          {info.icon} {info.label}
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Files Section */}
                {selectedDel === del.id && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                    {del.files?.length > 0 ? (
                      <div className="space-y-2">
                        {del.files.map(file => (
                          <div key={file.id} className="flex items-center gap-2 p-2 rounded bg-slate-50">
                            <Palette className="w-4 h-4 text-slate-400" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-700 truncate">
                                {file.file_name}
                              </p>
                              <p className="text-xs text-slate-400">
                                v{file.version_number} • {formatDate(file.created_at)}
                              </p>
                            </div>
                            <a
                              href={`https://maggovnwssfqdbaqandv.supabase.co/storage/v1/object/public/deliverables/${file.file_path}`}
                              download
                              className="p-1 rounded hover:bg-slate-200 transition"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-500" />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">אין קבצים</p>
                    )}

                    {/* Upload Button */}
                    <button
                      onClick={() => {
                        setSelectedDel(del.id)
                        fileInputRef.current?.click?.()
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-slate-300 rounded hover:bg-slate-50 transition text-xs font-medium text-slate-600"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      הוסף קובץ
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file && selectedDel) {
                          handleFileUpload(selectedDel, file)
                        }
                      }}
                    />
                  </div>
                )}

                {/* Footer */}
                {del.due_date && (
                  <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500">
                    התאריך היעד: {formatDate(del.due_date)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* New Deliverable Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">נושא עבודה חדש</h3>
            </div>
            <form onSubmit={handleCreateDeliverable} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">שם</label>
                <input
                  value={newDelForm.name}
                  onChange={e => setNewDelForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="שם הנושא"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">תיאור</label>
                <textarea
                  rows={3}
                  value={newDelForm.description}
                  onChange={e => setNewDelForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="תיאור..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">קטגוריה</label>
                  <select
                    value={newDelForm.category}
                    onChange={e => setNewDelForm(f => ({ ...f, category: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">תאריך יעד</label>
                  <input
                    type="date"
                    value={newDelForm.due_date}
                    onChange={e => setNewDelForm(f => ({ ...f, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">כלים נדרשים</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {Object.entries(TOOL_INFO).map(([tool, info]) => (
                    <label key={tool} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newDelForm.tools.includes(tool as ArchitectureTool)}
                        onChange={e => {
                          if (e.target.checked) {
                            setNewDelForm(f => ({ ...f, tools: [...f.tools, tool as ArchitectureTool] }))
                          } else {
                            setNewDelForm(f => ({ ...f, tools: f.tools.filter(t => t !== tool) }))
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-slate-700">{info.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition"
                >
                  {saving ? 'שומר...' : 'צור'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
