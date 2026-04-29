import { redirect, notFound } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import PrintButton from './PrintButton'

export default async function FeeReceiptPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [studentRes, feesRes, roleRes] = await Promise.all([
    supabase
      .from('students')
      .select('id, name, class_num, roll_no, stage')
      .eq('id', studentId)
      .single(),
    supabase
      .from('fees')
      .select('id, amount, due_date, paid, paid_at, term, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false }),
    supabase
      .from('user_roles')
      .select('school_id')
      .eq('user_id', user.id)
      .single(),
  ])

  const student = studentRes.data
  if (!student) notFound()

  const fees = feesRes.data ?? []
  const schoolId = roleRes.data?.school_id

  let schoolName = 'School'
  if (schoolId) {
    const { data: school } = await supabase
      .from('schools')
      .select('name')
      .eq('id', schoolId)
      .single()
    if (school?.name) schoolName = school.name
  }

  const printedAt = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const totalPaid = fees
    .filter((f) => f.paid)
    .reduce((s, f) => s + Number(f.amount), 0)
  const totalDue = fees
    .filter((f) => !f.paid)
    .reduce((s, f) => s + Number(f.amount), 0)

  function pkr(n: number) {
    return n.toLocaleString('en-PK', { maximumFractionDigits: 0 })
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
        body { font-family: Georgia, serif; background: #f8f7f4; }
      `}</style>

      {/* Print button — hidden when printing */}
      <div className="no-print flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <span className="text-sm text-gray-500">Fee Receipt — {student.name}</span>
        <PrintButton />
      </div>

      {/* Receipt */}
      <div className="max-w-2xl mx-auto my-8 bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden print:shadow-none print:border-0 print:rounded-none print:my-0 print:max-w-full">

        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-start justify-between">
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <Image
                src="/brand/uthaan-icon.svg"
                alt=""
                width={30}
                height={30}
                className="h-7 w-7 rounded-lg"
                priority
              />
              <span
                className="text-2xl leading-none text-[#0F5B3A]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Uthaan
              </span>
            </div>
            <div className="text-xl font-bold text-[#1a2e1a]">{schoolName}</div>
            <div className="text-sm text-gray-500 mt-0.5">Fee Receipt</div>
          </div>
          <div className="text-right text-sm text-gray-400">
            <div>Printed: {printedAt}</div>
          </div>
        </div>

        {/* Student info */}
        <div className="px-8 py-5 border-b border-gray-100 grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Student</div>
            <div className="text-sm font-semibold text-gray-900">{student.name}</div>
          </div>
          <div>
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Roll No</div>
            <div className="text-sm text-gray-700 font-mono">{student.roll_no}</div>
          </div>
          <div>
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Class</div>
            <div className="text-sm text-gray-700">
              {student.class_num != null ? `Class ${student.class_num}` : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Stage</div>
            <div className="text-sm text-gray-700">{student.stage ?? '—'}</div>
          </div>
        </div>

        {/* Fee breakdown */}
        <div className="px-8 py-5">
          <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-3">Fee Breakdown</div>
          {fees.length === 0 ? (
            <div className="text-sm text-gray-400">No fee records found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Term', 'Amount (PKR)', 'Due Date', 'Status', 'Paid On'].map((h) => (
                    <th
                      key={h}
                      className="text-left pb-2 text-[10px] font-medium text-gray-400 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fees.map((fee) => (
                  <tr key={fee.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 text-gray-700">{fee.term}</td>
                    <td className="py-2.5 font-medium text-gray-900">{pkr(Number(fee.amount))}</td>
                    <td className="py-2.5 text-gray-600">
                      {new Date(fee.due_date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          fee.paid
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {fee.paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-500 text-xs">
                      {fee.paid && fee.paid_at
                        ? new Date(fee.paid_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Totals */}
        {fees.length > 0 && (
          <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-8">
            <div className="text-right">
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">Total Paid</div>
              <div className="text-base font-bold text-green-700 mt-0.5">PKR {pkr(totalPaid)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">Total Due</div>
              <div className={`text-base font-bold mt-0.5 ${totalDue > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                PKR {pkr(totalDue)}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-8 py-4 border-t border-gray-100 text-center">
          <div className="text-[11px] text-gray-400">
            This receipt was generated by {schoolName} via Uthaan School Management System.
          </div>
        </div>
      </div>

    </>
  )
}
