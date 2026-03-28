import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import ResultsPage from './ResultsPage'

const CURRENT_TERM = 'Spring Term 2026'
const CURRENT_YEAR = '2025-2026'

async function isReleasedForClass(supabase: any, classNum: number | null | undefined) {
  if (!classNum) return false

  const { data } = await supabase
    .from('result_releases')
    .select('id, released')
    .eq('academic_year', CURRENT_YEAR)
    .eq('term', CURRENT_TERM)
    .eq('class_num', classNum)
    .maybeSingle()

  return data?.released === true
}

export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, student_id')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role

  if (role === 'parent') {
    const { data: link } = await supabase
      .from('parent_student')
      .select('student_id')
      .eq('parent_id', user.id)
      .single()

    if (!link) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role="parent" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 mb-1">
                No child linked to your account
              </div>
              <div className="text-xs text-gray-400">
                Contact the school administrator to link your child.
              </div>
            </div>
          </div>
        </div>
      )
    }

    const { data: child } = await supabase
      .from('students')
      .select('id, name, roll_no, class_num, stage')
      .eq('id', link.student_id)
      .single()

    if (!child) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role="parent" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 mb-1">
                Student record not found
              </div>
              <div className="text-xs text-gray-400">
                Contact the school administrator.
              </div>
            </div>
          </div>
        </div>
      )
    }

    const released = await isReleasedForClass(supabase, child.class_num)

    if (!released) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role="parent" />
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
              <h1 className="text-sm font-semibold text-gray-900">Results</h1>
              <span className="text-xs bg-gray-50 text-gray-600 border border-gray-100 px-3 py-1 rounded-full font-medium">
                Not released
              </span>
            </header>
            <main className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-sm">
                <div className="text-sm font-medium text-gray-900 mb-1">
                  Report card not released yet
                </div>
                <div className="text-xs text-gray-400">
                  The school has not released results for Class {child.class_num} yet.
                </div>
              </div>
            </main>
          </div>
        </div>
      )
    }

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role="parent" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Report Card</h1>
            <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/25 px-3 py-1 rounded-full font-medium">
              {child.name}
            </span>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <ResultsPage students={[child]} releases={[]} />
          </main>
        </div>
      </div>
    )
  }

  if (role === 'student') {
    const studentId = roleData?.student_id

    if (!studentId) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role="student" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 mb-1">
                No student record linked
              </div>
              <div className="text-xs text-gray-400">
                Contact your school administrator.
              </div>
            </div>
          </div>
        </div>
      )
    }

    const { data: student } = await supabase
      .from('students')
      .select('id, name, roll_no, class_num, stage')
      .eq('id', studentId)
      .single()

    if (!student) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role="student" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-gray-400">Student record not found.</div>
          </div>
        </div>
      )
    }

    const released = await isReleasedForClass(supabase, student.class_num)

    if (!released) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role="student" />
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
              <h1 className="text-sm font-semibold text-gray-900">Results</h1>
              <span className="text-xs bg-gray-50 text-gray-600 border border-gray-100 px-3 py-1 rounded-full font-medium">
                Not released
              </span>
            </header>
            <main className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-sm">
                <div className="text-sm font-medium text-gray-900 mb-1">
                  Report card not released yet
                </div>
                <div className="text-xs text-gray-400">
                  Your school has not released results for Class {student.class_num} yet.
                </div>
              </div>
            </main>
          </div>
        </div>
      )
    }

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role="student" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">My Report Card</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              Released
            </span>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <ResultsPage students={[student]} releases={[]} />
          </main>
        </div>
      </div>
    )
  }

  const [studentsRes, releasesRes] = await Promise.all([
    supabase
      .from('students')
      .select('id, name, roll_no, class_num, stage')
      .order('name', { ascending: true }),
    supabase
      .from('result_releases')
      .select('id, academic_year, term, class_num, released, released_at, released_by')
      .eq('academic_year', CURRENT_YEAR)
      .eq('term', CURRENT_TERM)
      .order('class_num', { ascending: true }),
  ])

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role ?? ''} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">
            Results &amp; Report Cards
          </h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
            Academic Year 2025–26
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <ResultsPage
            students={studentsRes.data ?? []}
            releases={releasesRes.data ?? []}
          />
        </main>
      </div>
    </div>
  )
}