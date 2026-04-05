import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import QuizList, { type Quiz } from './QuizList'
import { CURRENT_TERM } from '@/lib/constants'
import { resolveEffectiveRole } from '@/lib/school'

export default async function QuizzesPage() {
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
  const isTeacher = effectiveRole === 'teacher'
  const isAdmin = effectiveRole === 'admin'
  const isStaff = isTeacher || isAdmin

  if (isStaff) {
    const timetableQuery = isTeacher
      ? supabase
          .from('timetable')
          .select('class_num, subject')
          .eq('teacher_id', user.id)
          .limit(500)
      : supabase
          .from('timetable')
          .select('class_num, subject')
          .limit(2000)

    const [quizzesRes, timetableRes] = await Promise.all([
      isTeacher
        ? supabase
            .from('quizzes')
            .select(
              'id, title, subject, time_limit, questions, status, created_at, created_by, class_num'
            )
            .eq('created_by', user.id)
            .order('created_at', { ascending: false })
        : supabase
            .from('quizzes')
            .select(
              'id, title, subject, time_limit, questions, status, created_at, created_by, class_num'
            )
            .order('created_at', { ascending: false }),
      timetableQuery,
    ])

    const timetableRows = timetableRes.data ?? []

    const visibleClassNums = isTeacher
      ? Array.from(
          new Set(
            timetableRows
              .map((row: any) => Number(row.class_num))
              .filter((n: number) => !isNaN(n) && n > 0)
          )
        ).sort((a, b) => a - b)
      : []

    const visibleSubjects = isTeacher
      ? Array.from(
          new Set(
            timetableRows
              .map((row: any) => (row.subject as string)?.toLowerCase?.())
              .filter(Boolean)
          )
        )
      : []

    const quizzes = (quizzesRes.data ?? []).filter((quiz: any) => {
      if (!isTeacher) return true

      const subjectOk = visibleSubjects.includes((quiz.subject ?? '').toLowerCase())
      const classValue =
        quiz.class_num == null ? null : Number(quiz.class_num)
      const classOk =
        classValue == null || visibleClassNums.includes(classValue)

      return subjectOk && classOk
    })

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar
          email={user.email!}
          role={effectiveRole}
          isImpersonating={role === 'superadmin'}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Quizzes</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              {CURRENT_TERM}
            </span>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl">
              <QuizList
                quizzes={(quizzes as unknown as Quiz[]) ?? []}
                canManage={isTeacher}
              />
            </div>
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

    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id, title, subject, time_limit, questions, status, created_at')
      .eq('status', 'active')
      .or(`class_num.eq.${child.class_num},class_num.is.null`)
      .order('created_at', { ascending: false })

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role="parent" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 pr-6 pl-16 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Quizzes</h1>
            <span className="text-xs bg-[#6fcf6f]/10 text-[#1a2e1a] border border-[#6fcf6f]/25 px-3 py-1 rounded-full font-medium">
              Viewing as: {child.name}
            </span>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl">
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Active quizzes
                  </h2>
                </div>

                {quizzes && quizzes.length > 0 ? (
                  quizzes.map(quiz => {
                    const questionCount = Array.isArray(quiz.questions)
                      ? quiz.questions.length
                      : 0

                    return (
                      <div
                        key={quiz.id}
                        className="px-5 py-4 border-b border-gray-50 last:border-0 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {quiz.title}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {quiz.subject} · {quiz.time_limit} min ·{' '}
                            {questionCount} question
                            {questionCount !== 1 ? 's' : ''}
                          </div>
                        </div>

                        <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 flex-shrink-0">
                          Active
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <div className="px-5 py-10 text-center text-sm text-gray-400">
                    No active quizzes at the moment.
                  </div>
                )}
              </div>
            </div>
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

    const { data: quizzes } = await supabase
      .from('quizzes')
      .select(
        'id, title, subject, time_limit, questions, status, created_at, max_attempts'
      )
      .eq('status', 'active')
      .or(`class_num.eq.${student.class_num},class_num.is.null`)
      .order('created_at', { ascending: false })

    const quizIds = (quizzes ?? []).map((q: any) => q.id)

    const { data: submissions } =
      quizIds.length > 0
        ? await supabase
            .from('quiz_submissions')
            .select('id, quiz_id, score, submitted_at')
            .in('quiz_id', quizIds)
            .eq('user_id', user.id)
            .order('submitted_at', { ascending: false })
        : { data: [] as any[] }

    const latestByQuizId: Record<string, any> = {}
    ;(submissions ?? []).forEach((sub: any) => {
      if (!latestByQuizId[sub.quiz_id]) {
        latestByQuizId[sub.quiz_id] = sub
      }
    })

    return (
      <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
        <Sidebar email={user.email!} role={role} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">Quizzes</h1>
            <span className="text-xs bg-green-50 text-green-800 border border-green-100 px-3 py-1 rounded-full font-medium">
              Class {student.class_num}
            </span>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl">
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Available quizzes
                  </h2>
                </div>

                {quizzes && quizzes.length > 0 ? (
                  quizzes.map((quiz: any) => {
                    const questionCount = Array.isArray(quiz.questions)
                      ? quiz.questions.length
                      : 0
                    const latestSubmission = latestByQuizId[quiz.id]
                    const scorePct =
                      latestSubmission && questionCount > 0
                        ? Math.round(
                            ((latestSubmission.score ?? 0) / questionCount) * 100
                          )
                        : null

                    return (
                      <div
                        key={quiz.id}
                        className="px-5 py-4 border-b border-gray-50 last:border-0 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {quiz.title}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {quiz.subject} · {quiz.time_limit} min · {questionCount}{' '}
                            question{questionCount !== 1 ? 's' : ''}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {scorePct !== null && (
                            <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                              Last: {scorePct}%
                            </span>
                          )}
                          <Link
                            href={`/quizzes/${quiz.id}`}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#1a2e1a] text-[#6fcf6f]"
                          >
                            Open
                          </Link>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="px-5 py-10 text-center text-sm text-gray-400">
                    No active quizzes at the moment.
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role={role} />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm text-gray-400">Unsupported account role.</div>
      </div>
    </div>
  )
}