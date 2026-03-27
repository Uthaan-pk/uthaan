import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import CopyLinkButton from '@/components/CopyLinkButton'
import SignupsActions from './SignupsActions'

type Lang = 'en' | 'ur'
type SignupFilter = 'pending' | 'approved' | 'rejected' | 'all'

const pageText = {
  en: {
    admin: 'Admin',
    schoolSignups: 'School Signups',
    pending: 'pending',
    approved: 'approved',
    rejected: 'rejected',
    all: 'all',
    noSchoolSignupsYet: 'No school signups found',
    shareToOnboard: 'Share this link to get schools onboarded:',
    email: 'Email',
    phone: 'Phone',
    students: 'Students',
    classes: 'Classes',
    stages: 'Stages',
    subjects: 'Subjects',
    studentEmails: 'Student emails',
    yes: 'Yes',
    no: 'No',
    whatsapp: 'WhatsApp',
    shareLinkWithSchools: 'Share this link with schools',
    copy: 'Copy',
    copied: 'Copied!',
  },
  ur: {
    admin: 'ایڈمن',
    schoolSignups: 'اسکول سائن اپس',
    pending: 'زیر التوا',
    approved: 'منظور شدہ',
    rejected: 'مسترد',
    all: 'تمام',
    noSchoolSignupsYet: 'کوئی اسکول سائن اپ نہیں ملا',
    shareToOnboard: 'اسکولز کو شامل کرنے کے لیے یہ لنک شیئر کریں:',
    email: 'ای میل',
    phone: 'فون',
    students: 'طلبہ',
    classes: 'کلاسز',
    stages: 'مراحل',
    subjects: 'مضامین',
    studentEmails: 'طلبہ کی ای میلز',
    yes: 'ہاں',
    no: 'نہیں',
    whatsapp: 'واٹس ایپ',
    shareLinkWithSchools: 'یہ لنک اسکولز کے ساتھ شیئر کریں',
    copy: 'کاپی',
    copied: 'کاپی ہو گیا!',
  },
} as const

export default async function SignupsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>
}) {
  const params = (await searchParams) ?? {}
  const rawStatus = params.status
  const filter: SignupFilter =
    rawStatus === 'approved' ||
    rawStatus === 'rejected' ||
    rawStatus === 'all'
      ? rawStatus
      : 'pending'

  const cookieStore = await cookies()
  const cookieLang = cookieStore.get('uthaan_lang')?.value
  const lang: Lang = cookieLang === 'ur' ? 'ur' : 'en'
  const t = pageText[lang]

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (roleData?.role !== 'admin') redirect('/dashboard')

  let query = supabase
    .from('school_signups')
    .select('*')
    .order('created_at', { ascending: false })

  if (filter !== 'all') {
    query = query.eq('status', filter)
  }

  const { data: signups } = await query

  const { count: pendingCount } = await supabase
    .from('school_signups')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const onboardingLink = 'https://uthaan-one.vercel.app/onboarding'

  const filterLinkClass = (value: SignupFilter) =>
    `px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
      filter === value
        ? value === 'pending'
          ? 'bg-amber-50 text-amber-700 border-amber-100'
          : value === 'approved'
          ? 'bg-green-50 text-green-700 border-green-100'
          : value === 'rejected'
          ? 'bg-red-50 text-red-700 border-red-100'
          : 'bg-gray-100 text-gray-800 border-gray-200'
        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
    }`

  return (
    <div className="flex h-screen bg-[#f8f7f4] overflow-hidden">
      <Sidebar email={user.email!} role="admin" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 pl-16 md:pl-6 h-14 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              ← {t.admin}
            </Link>

            <span className="text-gray-200">/</span>

            <h1 className="text-sm font-semibold text-gray-900">
              {t.schoolSignups}
            </h1>
          </div>

          {(pendingCount ?? 0) > 0 && (
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1 rounded-full font-medium">
              {pendingCount} {t.pending}
            </span>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl">
            <div className="mb-4 flex flex-wrap gap-2">
              <Link
                href="/admin/signups?status=pending"
                className={filterLinkClass('pending')}
              >
                {t.pending}
              </Link>
              <Link
                href="/admin/signups?status=approved"
                className={filterLinkClass('approved')}
              >
                {t.approved}
              </Link>
              <Link
                href="/admin/signups?status=rejected"
                className={filterLinkClass('rejected')}
              >
                {t.rejected}
              </Link>
              <Link
                href="/admin/signups?status=all"
                className={filterLinkClass('all')}
              >
                {t.all}
              </Link>
            </div>

            {!signups || signups.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 px-5 py-16 text-center">
                <div className="text-sm text-gray-400 mb-2">
                  {t.noSchoolSignupsYet}
                </div>

                <div className="text-xs text-gray-300">
                  {t.shareToOnboard}
                </div>

                <div className="text-xs font-mono text-[#1a2e1a] mt-1">
                  {onboardingLink}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {signups.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white rounded-xl border border-gray-100 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-sm font-semibold text-gray-900">
                            {s.school_name}
                          </div>

                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              s.status === 'pending'
                                ? 'bg-amber-50 text-amber-700'
                                : s.status === 'approved'
                                ? 'bg-green-50 text-green-700'
                                : s.status === 'rejected'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-gray-50 text-gray-500'
                            }`}
                          >
                            {s.status}
                          </span>
                        </div>

                        <div className="text-xs text-gray-500 mb-3">
                          {s.city} · {s.principal_name}
                        </div>

                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                          <div>
                            <span className="text-gray-400">{t.email}: </span>
                            <span className="text-gray-700 font-medium">
                              {s.admin_email}
                            </span>
                          </div>

                          <div>
                            <span className="text-gray-400">{t.phone}: </span>
                            <span className="text-gray-700 font-medium">
                              {s.phone}
                            </span>
                          </div>

                          {s.total_students && (
                            <div>
                              <span className="text-gray-400">
                                {t.students}:{' '}
                              </span>
                              <span className="text-gray-700">
                                {s.total_students}
                              </span>
                            </div>
                          )}

                          {s.classes && (
                            <div>
                              <span className="text-gray-400">
                                {t.classes}:{' '}
                              </span>
                              <span className="text-gray-700">{s.classes}</span>
                            </div>
                          )}

                          {s.stages && (
                            <div>
                              <span className="text-gray-400">{t.stages}: </span>
                              <span className="text-gray-700">{s.stages}</span>
                            </div>
                          )}

                          {s.subjects && (
                            <div>
                              <span className="text-gray-400">
                                {t.subjects}:{' '}
                              </span>
                              <span className="text-gray-700">{s.subjects}</span>
                            </div>
                          )}

                          <div>
                            <span className="text-gray-400">
                              {t.studentEmails}:{' '}
                            </span>
                            <span className="text-gray-700">
                              {s.has_student_emails ? t.yes : t.no}
                            </span>
                          </div>
                        </div>

                        {s.notes && (
                          <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                            {s.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <div className="text-[11px] text-gray-400">
                          {new Date(s.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>

                        {s.status === 'pending' ? (
                          <SignupsActions id={s.id} phone={s.phone} />
                        ) : s.phone ? (
                          <div className="mt-2">
                            <a
                              href={`https://wa.me/${s.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block text-xs font-medium text-green-700 bg-green-50 border border-green-100 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                            >
                              {t.whatsapp} →
                            </a>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 bg-white rounded-xl border border-gray-100 p-5">
              <div className="text-xs font-semibold text-gray-700 mb-2">
                {t.shareLinkWithSchools}
              </div>

              <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                <div className="flex-1 text-sm font-mono text-gray-600">
                  {onboardingLink}
                </div>

                <CopyLinkButton
                  value={onboardingLink}
                  copyLabel={t.copy}
                  copiedLabel={t.copied}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}