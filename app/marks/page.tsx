import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import GradebookGrid from './GradebookGrid'
import { CURRENT_TERM } from '@/lib/constants'

export default async function MarksPage() {
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

  const role = roleData?.role ?? ''
  const isStaff = role === 'teacher' || role === 'admin'

  if (isStaff) {
    const [studentsRes, marksRes] = await Promise.all([
      supabase
        .from('students')
        .select('id, name, roll_no, is_active')
        .eq('is_active', true)
        .order('name')
        .limit(500),
      supabase
        .from('marks')
        .select('id, student_id, subject, exam, percent, source')
        .limit(2000),
    ])

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Gradebook</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {CURRENT_TERM}
            </span>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <GradebookGrid
              students={studentsRes.data ?? []}
              marks={marksRes.data ?? []}
            />
          </main>
        </div>
      </div>
    )
  }

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
              <div className="text-sm text-gray-400">
                No student record linked.
              </div>
            </div>
          </div>
        </div>
      )
    }

    const [marksRes, childRes] = await Promise.all([
      supabase
        .from('marks')
        .select('id, student_id, subject, exam, percent, source')
        .eq('student_id', link.student_id)
        .limit(500),
      supabase
        .from('students')
        .select('id, name, roll_no, is_active')
        .eq('id', link.student_id)
        .eq('is_active', true)
        .single(),
    ])

    const marks = marksRes.data ?? []
    const child = childRes.data

    if (!child) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role="parent" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm text-gray-400">
                Student record not found or inactive.
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role="parent" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Gradebook</h1>
            <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/25 px-3 py-1 rounded-full font-medium">
              Viewing as: {child.name}
            </span>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <GradebookGrid students={[child]} marks={marks} />
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
          <Sidebar email={user.email!} role={role} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm text-gray-400">
                No student record linked.
              </div>
            </div>
          </div>
        </div>
      )
    }

    const [marksRes, studentRes] = await Promise.all([
      supabase
        .from('marks')
        .select('id, student_id, subject, exam, percent, source')
        .eq('student_id', studentId)
        .limit(500),
      supabase
        .from('students')
        .select('id, name, roll_no, is_active')
        .eq('id', studentId)
        .eq('is_active', true)
        .single(),
    ])

    const marks = marksRes.data ?? []
    const student = studentRes.data

    if (!student) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role={role} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm text-gray-400">
                Student record not found or inactive.
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">My Grades</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {CURRENT_TERM}
            </span>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <GradebookGrid students={[student]} marks={marks} />
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role} />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm text-gray-400">
            Unsupported account role.
          </div>
        </div>
      </div>
    </div>
  )
}