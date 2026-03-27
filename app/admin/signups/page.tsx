import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import Link from 'next/link'
import CopyLinkButton from '@/components/CopyLinkButton'
import SignupsActions from './SignupsActions'

type Lang = 'en' | 'ur'

const pageText = {
  en: {
    admin: 'Admin',
    schoolSignups: 'School Signups',
    pending: 'pending',
    noSchoolSignupsYet: 'No school signups yet',
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
    noSchoolSignupsYet: 'ابھی تک کوئی اسکول سائن اپ نہیں ہوا',
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

export default async function SignupsPage() {
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

  const { data: signups } = await supabase
    .from('school_signups')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const pending = signups?.length ?? 0
  const onboardingLink = 'https://uthaan-one.vercel.app/onboarding'

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

          {pending > 0 && (
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1 rounded-full font-medium">
              {pending} {t.pending}
            </span>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl">
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

                        <SignupsActions id={s.id} phone={s.phone} />
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