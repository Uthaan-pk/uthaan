'use client'

import { useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export type Material = {
  id: string
  title: string
  subject: string
  class_num: number | null
  file_name: string
  file_url: string
  created_at: string
}

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f]'

const selectCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a2e1a] focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] bg-white'

const ACCEPTED = '.pdf,.doc,.docx,.ppt,.pptx,.png,.jpg'

export default function MaterialsClient({
  initialMaterials,
  isStaff,
  userId,
}: {
  initialMaterials: Material[]
  isStaff: boolean
  userId: string
}) {
  const supabase = useMemo(() => createClient(), [])
  const [materials, setMaterials] = useState(initialMaterials)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Upload form state
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [classNum, setClassNum] = useState('all')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  function resetForm() {
    setTitle('')
    setSubject('')
    setClassNum('all')
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleUpload() {
    if (!title.trim()) { toast.error('Title is required.'); return }
    if (!subject.trim()) { toast.error('Subject is required.'); return }
    if (!file) { toast.error('Please select a file.'); return }

    setUploading(true)

    const storagePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const { error: uploadError } = await supabase.storage
      .from('materials')
      .upload(storagePath, file)

    if (uploadError) {
      setUploading(false)
      toast.error(uploadError.message)
      return
    }

    const { data: urlData } = supabase.storage
      .from('materials')
      .getPublicUrl(storagePath)

    const classNumValue = classNum === 'all' ? null : parseInt(classNum, 10)

    const { data: row, error: insertError } = await supabase
      .from('materials')
      .insert({
        title: title.trim(),
        subject: subject.trim(),
        class_num: classNumValue,
        file_name: file.name,
        file_url: urlData.publicUrl,
        uploaded_by: userId,
      })
      .select()
      .single()

    setUploading(false)

    if (insertError) {
      toast.error(insertError.message)
      // Clean up the uploaded file since DB insert failed
      await supabase.storage.from('materials').remove([storagePath])
      return
    }

    setMaterials(prev => [row, ...prev])
    toast.success('Material uploaded!')
    resetForm()
  }

  async function handleDelete(material: Material) {
    setDeleting(material.id)

    // Extract storage path from public URL
    const storagePath = material.file_url.split('/storage/v1/object/public/materials/')[1]
    if (storagePath) {
      await supabase.storage.from('materials').remove([storagePath])
    }

    const { error } = await supabase.from('materials').delete().eq('id', material.id)
    setDeleting(null)

    if (error) { toast.error(error.message); return }

    setMaterials(prev => prev.filter(m => m.id !== material.id))
    toast.success('Material deleted.')
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Upload form — teacher/admin only */}
      {isStaff && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Upload material</h2>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Chapter 4 Notes"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Subject</label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Math"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Assign to class</label>
                <select
                  value={classNum}
                  onChange={e => setClassNum(e.target.value)}
                  className={selectCls}
                >
                  <option value="all">All classes</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={String(n)}>Class {n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED}
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#1a2e1a] file:text-[#6fcf6f] hover:file:bg-[#243d24] file:cursor-pointer cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-5 py-2.5 rounded-lg disabled:opacity-50 transition-colors"
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Materials list */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">
            {isStaff ? 'All materials' : 'Available materials'}
          </h2>
        </div>

        {materials.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No materials yet</div>
        ) : (
          materials.map(material => (
            <div key={material.id} className="px-5 py-4 border-b border-gray-50 last:border-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-100">
                      {material.subject}
                    </span>
                    <span className="text-[11px] bg-gray-50 text-gray-500 border border-gray-100 px-2 py-0.5 rounded-full">
                      {material.class_num != null ? `Class ${material.class_num}` : 'All classes'}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-900">{material.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{material.file_name}</div>
                  <div className="text-[10px] text-gray-300 mt-0.5">
                    {new Date(material.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>

                <div className="flex-shrink-0 flex items-center gap-2">
                  <a
                    href={material.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Download
                  </a>
                  {isStaff && (
                    <button
                      onClick={() => handleDelete(material)}
                      disabled={deleting === material.id}
                      className="text-[10px] text-gray-400 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded px-1.5 py-1 transition-colors disabled:opacity-50"
                    >
                      {deleting === material.id ? '…' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
