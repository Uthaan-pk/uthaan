'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupsActions({
  id,
  phone,
}: {
  id: string
  phone: string | null
}) {
  const router = useRouter()
  const supabase = createClient()

  async function updateStatus(status: 'approved' | 'rejected') {
    const { error } = await supabase
      .from('school_signups')
      .update({ status })
      .eq('id', id)

    if (error) {
      console.error(`Failed to set status to ${status}:`, error)
      alert(`Failed to ${status === 'approved' ? 'approve' : 'reject'} request.`)
      return
    }

    router.refresh()
  }

  return (
    <div className="mt-2 flex flex-col items-end gap-2">
      <button
        onClick={() => updateStatus('approved')}
        className="inline-block text-xs font-medium text-green-700 bg-green-50 border border-green-100 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
      >
        Approve
      </button>

      <button
        onClick={() => updateStatus('rejected')}
        className="inline-block text-xs font-medium text-red-700 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
      >
        Reject
      </button>

      {phone ? (
        <a
          href={`https://wa.me/${phone.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs font-medium text-green-700 bg-green-50 border border-green-100 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
        >
          WhatsApp →
        </a>
      ) : null}
    </div>
  )
}