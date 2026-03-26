import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import SubmissionsClient, { type Assignment, type Submission, type StudentRecord } from './SubmissionsClient'

export default async function SubmissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch role + student_id together — avoids a second round-trip for the student path
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, student_id')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role

  if (role === 'parent') redirect('/dashboard')
  if (!role) redirect('/login')

  // ── Student view ──────────────────────────────────────────────────────────
  if (role === 'student') {
    const studentId = roleData?.student_id

    if (!studentId) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role={role} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 mb-1">No student record found</div>
              <div className="text-xs text-gray-400">Your account is not linked to a student. Contact your administrator.</div>
            </div>
          </div>
        </div>
      )
    }

    // Fetch student record (for class_num) and submissions in parallel
    const [studentRes, submissionsRes] = await Promise.all([
      supabase.from('students').select('id, class_num').eq('id', studentId).single(),
      supabase
        .from('assignment_submissions')
        .select('id, assignment_id, student_id, file_url, text_response, submitted_at, reviewed, reviewed_at, teacher_note, grade')
        .eq('student_id', studentId)
        .limit(200),
    ])

    const student = studentRes.data

    if (!student) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role={role} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 mb-1">No student record found</div>
              <div className="text-xs text-gray-400">Your account is not linked to a student. Contact your administrator.</div>
            </div>
          </div>
        </div>
      )
    }

    const { data: assignments } = await supabase
      .from('assignments')
      .select('id, title, subject, description, due_date')
      .eq('class_num', student.class_num)
      .order('due_date', { ascending: true })
      .limit(200)

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Submissions</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              Class {student.class_num}
            </span>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <SubmissionsClient
              view="student"
              studentId={student.id}
              assignments={(assignments as unknown as Assignment[]) ?? []}
              submissions={(submissionsRes.data as unknown as Submission[]) ?? []}
              allStudents={[]}
            />
          </main>
        </div>
      </div>
    )
  }

  // ── Teacher / Admin view ──────────────────────────────────────────────────
  const [assignmentsRes, submissionsRes, studentsRes] = await Promise.all([
    supabase
      .from('assignments')
      .select('id, title, subject, class_num, due_date')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('assignment_submissions')
      .select('id, assignment_id, student_id, file_url, text_response, submitted_at, reviewed, reviewed_at, teacher_note, grade, student:students(name, class_num)')
      .order('submitted_at', { ascending: false })
      .limit(500),
    supabase
      .from('students')
      .select('id, name, class_num')
      .order('name')
      .limit(500),
  ])

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">Submissions</h1>
          <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium capitalize">
            {role}
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <SubmissionsClient
            view={role as 'teacher' | 'admin'}
            studentId=""
            assignments={(assignmentsRes.data as unknown as Assignment[]) ?? []}
            submissions={(submissionsRes.data as unknown as Submission[]) ?? []}
            allStudents={(studentsRes.data as unknown as StudentRecord[]) ?? []}
          />
        </main>
      </div>
    </div>
  )
}
