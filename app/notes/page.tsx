import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import ComposeNote from './ComposeNote'

const audienceStyles: Record<string, string> = {
  all: 'bg-green-50 text-green-800',
  stage: 'bg-blue-50 text-blue-800',
  class: 'bg-amber-50 text-amber-800',
  student: 'bg-purple-50 text-purple-800',
}

const audienceLabels: Record<string, string> = {
  all: 'All students',
  stage: 'Stage',
  class: 'Class',
  student: 'Individual',
}

export default async function NotesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role
  const isStaff = role === 'teacher' || role === 'admin'

  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role ?? ''} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">Notes</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            Spring Term 2026
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl">
            {isStaff && <ComposeNote />}

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="text-sm font-semibold text-gray-900">
                  {isStaff ? 'Notes sent' : 'Your notes'}
                </h2>
              </div>
              {notes && notes.length > 0 ? notes.map((note: any) => (
                <div key={note.id} className="px-5 py-4 border-b border-gray-50 last:border-0">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${audienceStyles[note.audience] ?? 'bg-gray-50 text-gray-600'}`}>
                      {audienceLabels[note.audience] ?? note.audience}
                    </span>
                    <span className="text-[10px] text-gray-300 shrink-0">
                      {new Date(note.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-900">{note.title}</div>
                  <div className="text-xs text-gray-400 mt-1 leading-relaxed">{note.body}</div>
                </div>
              )) : (
                <div className="px-5 py-10 text-center text-sm text-gray-400">No notes yet</div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
