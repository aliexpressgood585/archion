import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { formatDate } from '@/lib/utils'
import { Upload, FileText, File, Image, ChevronDown, Paperclip } from 'lucide-react'
import type { Document, Project } from '@/integrations/supabase/types'

export const Route = createFileRoute('/_authenticated/documents/')({
  component: DocumentsPage,
})

type DocumentWithProject = Document & { projects: Pick<Project, 'name'> | null }

function getFileIcon(fileType: string | null) {
  if (!fileType) return File
  if (fileType.startsWith('image/')) return Image
  if (fileType.includes('pdf') || fileType.includes('word') || fileType.includes('document')) return FileText
  return File
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DocumentsPage() {
  const { profile } = useAuth()
  const [documents, setDocuments] = useState<DocumentWithProject[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const orgId = profile?.organization_id

  async function fetchDocuments() {
    if (!orgId) return
    const query = supabase
      .from('documents')
      .select('*, projects(name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (projectFilter !== 'all') {
      query.eq('project_id', projectFilter)
    }

    const { data } = await query
    setDocuments(((data as unknown) as DocumentWithProject[]) ?? [])
  }

  useEffect(() => {
    if (!orgId) return
    async function init() {
      const [, projectsRes] = await Promise.all([
        fetchDocuments(),
        supabase.from('projects').select('id, name').eq('organization_id', orgId!).order('name'),
      ])
      setProjects((projectsRes.data as Project[]) ?? [])
      setLoading(false)
    }
    setLoading(true)
    init()
  }, [orgId])

  useEffect(() => {
    if (loading) return
    fetchDocuments()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFilter])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !orgId || !profile) return

    setUploading(true)
    for (const file of Array.from(files)) {
      const filePath = `${orgId}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (!uploadError) {
        await supabase.from('documents').insert({
          organization_id: orgId,
          name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: profile.id,
          tags: [],
        })
      }
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    fetchDocuments()
  }

  const filtered = documents

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">מסמכים</h1>
          <p className="text-slate-500 text-sm mt-0.5">{documents.length} קבצים</p>
        </div>
        <label className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition text-sm cursor-pointer ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
          <Upload className="w-4 h-4" />
          {uploading ? 'מעלה...' : 'העלאת מסמך'}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="appearance-none pr-3 pl-8 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
          >
            <option value="all">כל הפרויקטים</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 h-24 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Paperclip className="w-16 h-16 mb-3 opacity-30" />
          <p className="text-base font-medium">אין מסמכים</p>
          <p className="text-sm mt-1">
            {projectFilter !== 'all' ? 'אין מסמכים לפרויקט זה' : 'העלה מסמך ראשון'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(doc => {
            const Icon = getFileIcon(doc.file_type)
            return (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition">
                    <Icon className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 truncate group-hover:text-blue-600 transition">
                      {doc.name}
                    </p>
                    {doc.projects?.name && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{doc.projects.name}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {doc.file_size && (
                        <span className="text-xs text-slate-400">{formatFileSize(doc.file_size)}</span>
                      )}
                      <span className="text-xs text-slate-400">{formatDate(doc.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
