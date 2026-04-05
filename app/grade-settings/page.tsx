import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import GradeSettingsClient from './GradeSettingsClient'

type WeightRow = {
  id: string
  academic_year: string
  class_num: number
  subject: string
  teacher_id: string
  assignment_weight: number
  exam_weight: number
  final_weight: number
  quiz_weight: number
  created_by: string | null
  created_at: string
}

export default async function GradeSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, school_id')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role
  const schoolId = roleData?.school_id ?? null

  if (role !== 'admin' && role !== 'teacher') redirect('/dashboard')
  if (!schoolId) redirect('/dashboard')

  let query = supabase
    .from('grade_weights')
    .select(
      'id, academic_year, class_num, subject, teacher_id, assignment_weight, exam_weight, final_weight, quiz_weight, created_by, created_at'
    )
    .eq('school_id', schoolId)
    .order('academic_year', { ascending: false })
    .order('class_num', { ascending: true })
    .order('subject', { ascending: true })

  if (role === 'teacher') {
    query = query.eq('teacher_id', user.id)
  }

  const { data: weights } = await query

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-900">Grade Settings</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <GradeSettingsClient
            existingWeights={(weights ?? []) as WeightRow[]}
            userId={user.id}
            role={role}
            schoolId={schoolId}
          />
        </main>
      </div>
    </div>
  )
}