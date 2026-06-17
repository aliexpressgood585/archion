import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { formatDate } from '@/lib/utils'
import {
  Upload, Trash2, Eye, Image as ImageIcon, X, Calendar
} from 'lucide-react'
import type { Document } from '@/integrations/supabase/types'

const GALLERY_CATEGORIES = {
  site_before: 'לפני',
  site_during: 'במהלך',
  site_after: 'אחרי',
  concept: 'קונספט',
  renders: 'רנדרים',
  other: 'אחר',
}

interface GalleryImage extends Document {
  category: keyof typeof GALLERY_CATEGORIES
  location?: string
  photo_date?: string
}

export function ProjectGallery({ projectId }: { projectId: string }) {
  const { profile } = useAuth()
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [category, setCategory] = useState<keyof typeof GALLERY_CATEGORIES>('site_after')

  const orgId = profile?.organization_id

  async function fetchImages() {
    if (!orgId || !projectId) return
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('organization_id', orgId)
      .eq('project_id', projectId)
      .like('file_type', '%image%')
      .order('created_at', { ascending: false })

    setImages((data as GalleryImage[]) ?? [])
  }

  useEffect(() => {
    setLoading(true)
    fetchImages().finally(() => setLoading(false))
  }, [orgId, projectId])

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || !orgId || !profile) return

    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    setUploadingFiles(newFiles)

    for (const file of newFiles) {
      const fileName = `gallery/${projectId}/${Date.now()}_${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('deliverables')
        .upload(fileName, file)

      if (!uploadError) {
        const { error: dbError } = await (supabase
          .from('documents' as any)
          .insert({
            organization_id: orgId,
            project_id: projectId,
            name: file.name,
            file_path: fileName,
            file_size: file.size,
            file_type: file.type,
            category: category,
            tags: [category],
            uploaded_by: profile.id,
          }) as any)

        if (!dbError) {
          fetchImages()
        }
      }
    }

    setUploadingFiles([])
  }

  const handleDeleteImage = async (imageId: string, filePath: string) => {
    const { error: storageError } = await supabase.storage
      .from('deliverables')
      .remove([filePath])

    if (!storageError) {
      const { error: dbError } = await (supabase
        .from('documents' as any)
        .delete()
        .eq('id', imageId) as any)

      if (!dbError) {
        setSelectedImage(null)
        fetchImages()
      }
    }
  }

  const grouped = Object.keys(GALLERY_CATEGORIES).reduce((acc, cat) => {
    acc[cat as keyof typeof GALLERY_CATEGORIES] = images.filter(
      img => img.category === cat
    )
    return acc
  }, {} as Record<keyof typeof GALLERY_CATEGORIES, GalleryImage[]>)

  const hasImages = images.length > 0

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">גלריה</h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
        >
          <Upload className="w-4 h-4" />
          הוסף תמונות
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          hidden
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>

      {/* Category Selector */}
      {uploadingFiles.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(GALLERY_CATEGORIES).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setCategory(key as keyof typeof GALLERY_CATEGORIES)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                category === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Uploading State */}
      {uploadingFiles.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900">
            בהעלאה... {uploadingFiles.length} קבצים
          </p>
          <div className="mt-2 flex gap-2 flex-wrap">
            {uploadingFiles.map((file, i) => (
              <span key={i} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                {file.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !hasImages ? (
        <div className="text-center py-16 text-slate-400">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>אין תמונות בגלריה</p>
          <p className="text-sm mt-1">הוסף תמונות לתיעוד הפרויקט</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(GALLERY_CATEGORIES).map(([key, label]) => {
            const catImages = grouped[key as keyof typeof GALLERY_CATEGORIES]
            if (catImages.length === 0) return null

            return (
              <div key={key}>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">{label}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {catImages.map(img => (
                    <div
                      key={img.id}
                      className="aspect-square rounded-lg overflow-hidden bg-slate-100 hover:shadow-md transition cursor-pointer group"
                      onClick={() => setSelectedImage(img)}
                    >
                      <img
                        src={`https://maggovnwssfqdbaqandv.supabase.co/storage/v1/object/public/deliverables/${img.file_path}`}
                        alt={img.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl max-h-[80vh] flex flex-col">
            {/* Close button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 left-0 p-2 rounded-lg hover:bg-white/10 transition"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* Image */}
            <div className="flex-1 flex items-center justify-center bg-black rounded-lg overflow-hidden">
              <img
                src={`https://maggovnwssfqdbaqandv.supabase.co/storage/v1/object/public/deliverables/${selectedImage.file_path}`}
                alt={selectedImage.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Info and Actions */}
            <div className="mt-4 bg-white rounded-lg p-4">
              <h3 className="font-semibold text-slate-800 mb-2">{selectedImage.name}</h3>
              <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-4">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(selectedImage.created_at)}
                </div>
                {selectedImage.category && (
                  <div className="flex items-center gap-1">
                    <ImageIcon className="w-4 h-4" />
                    {GALLERY_CATEGORIES[selectedImage.category]}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDeleteImage(selectedImage.id, selectedImage.file_path)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition"
              >
                <Trash2 className="w-4 h-4" />
                מחק תמונה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
