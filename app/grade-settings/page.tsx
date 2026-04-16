import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import GradeSettingsClient from './GradeSettingsClient'
import CategoryWeightsClient from './CategoryWeightsClient'

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

  if (role !== 'teacher' && role !== 'admin') redirect('/dashboard')
  if (!schoolId) redirect('/dashboard')

  const isAdmin = role === 'admin'

  // For teachers: fetch their subject weights
  let weights: WeightRow[] = []
  if (!isAdmin) {
    let query = supabase
      .from('grade_weights')
      .select(
        'id, academic_year, class_num, subject, teacher_id, assignment_weight, exam_weight, final_weight, quiz_weight, created_by, created_at'
      )
      .eq('school_id', schoolId)
      .order('academic_year', { ascending: false })
      .order('class_num', { ascending: true })
      .order('subject', { ascending: true })
      .eq('teacher_id', user.id)

    const { data } = await query
    weights = (data ?? []) as WeightRow[]
  }

  // For admins: fetch category weights
  const { data: categoryWeights } = isAdmin
    ? await supabase
        .from('grade_category_weights')
        .select('id, class_num, category, weight')
        .eq('school_id', schoolId)
        .order('class_num', { ascending: true })
    : { data: [] }

  return (
    <div className="uthaan-page-shell">
      <Sidebar email={user.email!} role={role} />
      <div className="uthaan-page-main">
        <header className="uthaan-page-header justify-start">
          <h1 className="text-sm font-semibold text-gray-900">Grade Settings</h1>
        </header>
        <main className="uthaan-page-content">
          <div className="max-w-3xl space-y-8">
            {isAdmin ? (
              <CategoryWeightsClient
                schoolId={schoolId}
                initialRows={categoryWeights ?? []}
              />
            ) : (
              <GradeSettingsClient
                existingWeights={weights}
                userId={user.id}
                role={role}
                schoolId={schoolId}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
