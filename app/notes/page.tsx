import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import ComposeNote from './ComposeNote'

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

  const { data: notes } = await supabase
    .from('notes')
    .select('id, title, body, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role ?? ''} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">My Notes</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            Private
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-2xl">
            <ComposeNote userId={user.id} />

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="text-sm font-semibold text-gray-900">Your notes</h2>
              </div>
              {notes && notes.length > 0 ? notes.map((note: any) => (
                <div key={note.id} className="px-5 py-4 border-b border-gray-50 last:border-0">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="text-sm font-medium text-gray-900">{note.title}</div>
                    <span className="text-[10px] text-gray-300 shrink-0">
                      {new Date(note.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 leading-relaxed">{note.body}</div>
                </div>
              )) : (
                <div className="px-5 py-10 text-center">
                  <div className="text-sm text-gray-400 font-medium">No notes yet</div>
                  <div className="text-xs text-gray-300 mt-1">Your private notes — only you can see these</div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
