import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'

export default async function SignupsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
  if (roleData?.role !== 'admin') redirect('/dashboard')

  const { data: signups } = await supabase
    .from('school_signups')
    .select('*')
    .order('created_at', { ascending: false })

  const pending = (signups ?? []).filter(s => s.status === 'pending').length

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-600">← Admin</Link>
            <span className="text-gray-200">/</span>
            <h1 className="text-sm font-semibold text-gray-900">School Signups</h1>
          </div>
          {pending > 0 && (
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1 rounded-full font-medium">
              {pending} pending
            </span>
          )}
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl">
            {(!signups || signups.length === 0) ? (
              <div className="bg-white rounded-xl border border-gray-100 px-5 py-16 text-center">
                <div className="text-sm text-gray-400 mb-2">No school signups yet</div>
                <div className="text-xs text-gray-300">Share this link to get schools onboarded:</div>
                <div className="text-xs font-mono text-[#1a2e1a] mt-1">uthaan-one.vercel.app/onboarding</div>
              </div>
            ) : (
              <div className="space-y-3">
                {signups.map(s => (
                  <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-sm font-semibold text-gray-900">{s.school_name}</div>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            s.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                            s.status === 'done' ? 'bg-green-50 text-green-700' :
                            'bg-gray-50 text-gray-500'
                          }`}>{s.status}</span>
                        </div>
                        <div className="text-xs text-gray-500 mb-3">{s.city} · {s.principal_name}</div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                          <div><span className="text-gray-400">Email: </span><span className="text-gray-700 font-medium">{s.admin_email}</span></div>
                          <div><span className="text-gray-400">Phone: </span><span className="text-gray-700 font-medium">{s.phone}</span></div>
                          {s.total_students && <div><span className="text-gray-400">Students: </span><span className="text-gray-700">{s.total_students}</span></div>}
                          {s.classes && <div><span className="text-gray-400">Classes: </span><span className="text-gray-700">{s.classes}</span></div>}
                          {s.stages && <div><span className="text-gray-400">Stages: </span><span className="text-gray-700">{s.stages}</span></div>}
                          {s.subjects && <div><span className="text-gray-400">Subjects: </span><span className="text-gray-700">{s.subjects}</span></div>}
                          <div><span className="text-gray-400">Student emails: </span><span className="text-gray-700">{s.has_student_emails ? 'Yes' : 'No'}</span></div>
                        </div>
                        {s.notes && (
                          <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{s.notes}</div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-[11px] text-gray-400">
                          {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <a href={`https://wa.me/${s.phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                          className="mt-2 inline-block text-xs font-medium text-green-700 bg-green-50 border border-green-100 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors">
                          WhatsApp →
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 bg-white rounded-xl border border-gray-100 p-5">
              <div className="text-xs font-semibold text-gray-700 mb-2">Share this link with schools</div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                <div className="flex-1 text-sm font-mono text-gray-600">uthaan-one.vercel.app/onboarding</div>
                <button onClick={() => {}} className="text-xs font-medium text-[#1a2e1a] hover:underline">Copy</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
