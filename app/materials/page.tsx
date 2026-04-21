import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import MaterialsClient, { type Material } from './MaterialsClient'
import { CURRENT_TERM } from '@/lib/constants'
import { resolveEffectiveRole } from '@/lib/school'

export default async function MaterialsPage() {
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
  const effectiveRole = await resolveEffectiveRole(role)
  const isStaff = effectiveRole === 'teacher'

  if (isStaff) {
    // Derive the teacher's assigned classes and subjects from their timetable
    const { data: ttRows } = await supabase
      .from('timetable')
      .select('class_num, subject')
      .eq('teacher_id', user.id)
      .limit(200)

    const teacherClassNums = new Set<number>(
      (ttRows ?? []).map(r => r.class_num).filter((n): n is number => n != null)
    )
    const teacherSubjects = new Set<string>(
      (ttRows ?? []).map(r => (r.subject ?? '').toLowerCase()).filter(Boolean)
    )

    const { data: allMaterials } = await supabase
      .from('materials')
      .select('*')
      .order('created_at', { ascending: false })

    // If the teacher has timetable entries, filter to their classes AND subjects.
    // class_num=null materials are school-wide and always included when subject matches.
    // Falls back to all materials if no timetable is set up yet.
    const materials =
      teacherClassNums.size > 0
        ? (allMaterials ?? []).filter(m => {
            const classMatch =
              m.class_num == null || teacherClassNums.has(m.class_num)
            const subjectMatch =
              teacherSubjects.size === 0 ||
              teacherSubjects.has((m.subject ?? '').toLowerCase())
            return classMatch && subjectMatch
          })
        : (allMaterials ?? [])

    return (
      <div className="uthaan-page-shell">
        <Sidebar email={user.email!} role={effectiveRole} isImpersonating={role === 'superadmin'} />
        <div className="uthaan-page-main">
          <header className="uthaan-page-header">
            <h1 className="text-sm font-semibold text-gray-900">Materials</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {CURRENT_TERM}
            </span>
          </header>

          <main className="uthaan-page-content">
            <MaterialsClient
              initialMaterials={(materials as unknown as Material[]) ?? []}
              isStaff={true}
              userId={user.id}
            />
          </main>
        </div>
      </div>
    )
  }

  if (effectiveRole === 'admin') {
    redirect('/dashboard')
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
      .select('id, name, class_num')
      .eq('id', link.student_id)
      .eq('is_active', true)
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

    const { data: materials } = await supabase
      .from('materials')
      .select('*')
      .or(`class_num.eq.${child.class_num},class_num.is.null`)
      .order('created_at', { ascending: false })

    return (
      <div className="uthaan-page-shell">
        <Sidebar email={user.email!} role="parent" />
        <div className="uthaan-page-main">
          <header className="uthaan-page-header">
            <h1 className="text-sm font-semibold text-gray-900">Materials</h1>
            <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/25 px-3 py-1 rounded-full font-medium">
              Viewing as: {child.name}
            </span>
          </header>

          <main className="uthaan-page-content">
            <MaterialsClient
              initialMaterials={(materials as unknown as Material[]) ?? []}
              isStaff={false}
              userId={user.id}
            />
          </main>
        </div>
      </div>
    )
  }

  if (role === 'student') {
    if (!roleData?.student_id) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role={role} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 mb-1">
                No student record found
              </div>
              <div className="text-xs text-gray-400">
                Your account is not linked to a student. Contact your
                administrator.
              </div>
            </div>
          </div>
        </div>
      )
    }

    const { data: student } = await supabase
      .from('students')
      .select('id, class_num')
      .eq('id', roleData.student_id)
      .eq('is_active', true)
      .single()

    if (!student) {
      return (
        <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
          <Sidebar email={user.email!} role={role} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 mb-1">
                No student record found
              </div>
              <div className="text-xs text-gray-400">
                Your account is not linked to an active student. Contact your
                administrator.
              </div>
            </div>
          </div>
        </div>
      )
    }

    const { data: materials } = await supabase
      .from('materials')
      .select('*')
      .or(`class_num.eq.${student.class_num},class_num.is.null`)
      .order('created_at', { ascending: false })

    return (
      <div className="uthaan-page-shell">
        <Sidebar email={user.email!} role={role} />
        <div className="uthaan-page-main">
          <header className="uthaan-page-header">
            <h1 className="text-sm font-semibold text-gray-900">Materials</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              Class {student.class_num}
            </span>
          </header>

          <main className="uthaan-page-content">
            <MaterialsClient
              initialMaterials={(materials as unknown as Material[]) ?? []}
              isStaff={false}
              userId={user.id}
            />
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
          <div className="text-sm font-medium text-gray-900 mb-1">
            Unsupported account role
          </div>
          <div className="text-xs text-gray-400">
            Contact the school administrator.
          </div>
        </div>
      </div>
    </div>
  )
}
