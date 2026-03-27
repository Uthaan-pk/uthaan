'use client'

import { useState, useEffect } from 'react'
import { t } from '@/lib/i18n'

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6fcf6f]/40 focus:border-[#6fcf6f] bg-white'
const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2'
const STAGES = ['Pre-1 (Primary)', 'Matric (Secondary)', 'O-Levels']
const CLASSES = ['1','2','3','4','5','6','7','8','9','10','11','12']

export default function OnboardingForm() {
  const [lang, setLang] = useState<'en'|'ur'>('en')
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    school_name: '', city: '', principal_name: '', admin_email: '', phone: '',
    total_students: '', classes: [] as string[], stages: [] as string[],
    subjects: '', has_student_emails: false, notes: '',
  })

  const tr = t[lang]
  const isUrdu = lang === 'ur'

  useEffect(() => {
    document.documentElement.dir = isUrdu ? 'rtl' : 'ltr'
  }, [isUrdu])

  function set(key: string, val: any) { setForm(p => ({ ...p, [key]: val })) }
  function toggleArr(key: 'classes'|'stages', val: string) {
    setForm(p => ({ ...p, [key]: p[key].includes(val) ? p[key].filter(v => v !== val) : [...p[key], val] }))
  }

  async function submit() {
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, total_students: form.total_students ? parseInt(form.total_students, 10) : null, classes: form.classes.join(', '), stages: form.stages.join(', ') }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Something went wrong'); setSubmitting(false); return }
      setSubmitted(true)
    } catch { setError('Network error. Please try again.'); setSubmitting(false) }
  }

  if (submitted) return (
    <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-[#6fcf6f]/20 flex items-center justify-center mx-auto mb-5">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1a2e1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div className="text-xl font-semibold text-gray-900 mb-2">{isUrdu ? 'درخواست موصول ہو گئی!' : 'Request received!'}</div>
        <div className="text-sm text-gray-500 leading-relaxed">
          {isUrdu ? `جزاک اللہ خیر! ہم ${form.admin_email} پر ۲۴ گھنٹوں میں رابطہ کریں گے۔` : `JazakAllah Khair! We'll contact you at ${form.admin_email} within 24 hours.`}
        </div>
      </div>
    </div>
  )

  const canProceed1 = form.school_name && form.city && form.principal_name
  const canProceed2 = form.admin_email && form.phone

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      <div className="bg-[#1a2e1a] px-6 py-5">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-[#6fcf6f] tracking-tight">Uthaan</div>
            <div className="text-white/40 text-xs uppercase tracking-widest mt-0.5">School Management</div>
          </div>
          <div className="flex gap-1 bg-white/10 rounded-lg p-1">
            <button onClick={() => setLang('en')} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${lang === 'en' ? 'bg-[#6fcf6f] text-[#1a2e1a]' : 'text-white/50 hover:text-white/80'}`}>EN</button>
            <button onClick={() => setLang('ur')} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${lang === 'ur' ? 'bg-[#6fcf6f] text-[#1a2e1a]' : 'text-white/50 hover:text-white/80'}`} style={{fontFamily:'serif'}}>اردو</button>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">{tr.getStarted}</h1>
          <p className="text-sm text-gray-500 leading-relaxed">{tr.getStartedSub}</p>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {[1,2,3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${step > s ? 'bg-[#6fcf6f] text-[#1a2e1a]' : step === s ? 'bg-[#1a2e1a] text-[#6fcf6f]' : 'bg-gray-200 text-gray-400'}`}>{step > s ? '✓' : s}</div>
              {s < 3 && <div className={`flex-1 h-0.5 w-12 ${step > s ? 'bg-[#6fcf6f]' : 'bg-gray-200'}`}/>}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          {step === 1 && (
            <>
              <div><label className={labelCls}>{tr.schoolName} *</label>
                <input value={form.school_name} onChange={e => set('school_name', e.target.value)} placeholder={isUrdu ? 'مثلاً النور گرامر اسکول' : 'e.g. Al-Noor Grammar School'} className={inputCls}/></div>
              <div><label className={labelCls}>{tr.city} *</label>
                <input value={form.city} onChange={e => set('city', e.target.value)} placeholder={isUrdu ? 'مثلاً لاہور، کراچی' : 'e.g. Lahore, Karachi'} className={inputCls}/></div>
              <div><label className={labelCls}>{tr.principalName} *</label>
                <input value={form.principal_name} onChange={e => set('principal_name', e.target.value)} placeholder={isUrdu ? 'پورا نام' : 'Full name'} className={inputCls}/></div>
              <div><label className={labelCls}>{tr.totalStudents}</label>
                <input type="number" value={form.total_students} onChange={e => set('total_students', e.target.value)} placeholder="e.g. 150" className={inputCls}/></div>
            </>
          )}
          {step === 2 && (
            <>
              <div><label className={labelCls}>{tr.adminEmail} *</label>
                <input type="email" value={form.admin_email} onChange={e => set('admin_email', e.target.value)} placeholder="admin@school.com" className={inputCls}/>
                <p className="text-xs text-gray-400 mt-1.5">{isUrdu ? 'یہ شخص اسکول اکاؤنٹ سنبھالے گا' : 'This person will manage the school account'}</p></div>
              <div><label className={labelCls}>{tr.phone} *</label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+92 300 1234567" className={inputCls}/></div>
              <div><label className={labelCls}>{isUrdu ? 'کیا طلباء کے پاس ای میل ہے؟' : 'Do your students have email addresses?'}</label>
                <div className="flex gap-3 mt-1">
                  {[[isUrdu?'جی ہاں':'Yes, most do', true],[isUrdu?'نہیں':'No / Not sure', false]].map(([label, val]) => (
                    <button key={String(val)} onClick={() => set('has_student_emails', val)}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-colors ${form.has_student_emails === val ? 'bg-[#1a2e1a] text-[#6fcf6f] border-[#1a2e1a]' : 'bg-white text-gray-500 border-gray-200'}`}>
                      {label as string}
                    </button>
                  ))}
                </div></div>
            </>
          )}
          {step === 3 && (
            <>
              <div><label className={labelCls}>{isUrdu ? 'کون سی کلاسیں؟' : 'Which classes?'}</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {CLASSES.map(c => (
                    <button key={c} onClick={() => toggleArr('classes', c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.classes.includes(c) ? 'bg-[#1a2e1a] text-[#6fcf6f] border-[#1a2e1a]' : 'bg-white text-gray-500 border-gray-200'}`}>
                      {isUrdu ? `کلاس ${c}` : `Class ${c}`}
                    </button>
                  ))}
                </div></div>
              <div><label className={labelCls}>{isUrdu ? 'کون سے مراحل؟' : 'Which stages?'}</label>
                <div className="flex flex-col gap-2 mt-1">
                  {STAGES.map(s => (
                    <button key={s} onClick={() => toggleArr('stages', s)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium border text-left transition-colors ${form.stages.includes(s) ? 'bg-[#1a2e1a] text-[#6fcf6f] border-[#1a2e1a]' : 'bg-white text-gray-500 border-gray-200'}`}>
                      {s}
                    </button>
                  ))}
                </div></div>
              <div><label className={labelCls}>{isUrdu ? 'مضامین' : 'Main subjects'}</label>
                <input value={form.subjects} onChange={e => set('subjects', e.target.value)} placeholder={isUrdu ? 'اردو، انگریزی، ریاضی، سائنس' : 'Urdu, English, Math, Science'} className={inputCls}/></div>
              <div><label className={labelCls}>{isUrdu ? 'کچھ اور؟' : 'Anything else?'}</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className={inputCls}/></div>
            </>
          )}

          {error && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-600">{error}</div>}

          <div className="flex gap-3 pt-2">
            {step > 1 && <button onClick={() => setStep(s => s - 1)} className="px-4 py-3 rounded-xl text-sm text-gray-500 border border-gray-200">{tr.back}</button>}
            {step < 3 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={step === 1 ? !canProceed1 : !canProceed2}
                className="flex-1 bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-semibold py-3 rounded-xl disabled:opacity-40 transition-colors">
                {tr.continue}
              </button>
            ) : (
              <button onClick={submit} disabled={submitting || !canProceed1 || !canProceed2}
                className="flex-1 bg-[#1a2e1a] hover:bg-[#243d24] text-[#6fcf6f] text-sm font-semibold py-3 rounded-xl disabled:opacity-40 transition-colors">
                {submitting ? tr.submitting : tr.submitRequest}
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[[isUrdu?'مفت شروع':'Free to start',isUrdu?'کریڈٹ کارڈ نہیں':'No credit card'],[isUrdu?'۲۴ گھنٹے':'24hr setup',isUrdu?'ہم سب کریں گے':'We handle everything'],[isUrdu?'پاکستان کے لیے':'🇵🇰 Built for Pakistan',isUrdu?'اردو سپورٹ':'Urdu support']].map(([title,sub]) => (
            <div key={title} className="bg-white rounded-xl border border-gray-100 px-3 py-3">
              <div className="text-xs font-semibold text-gray-900">{title}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center text-xs text-gray-400">© 2026 Uthaan · Built for Pakistan 🇵🇰</div>
      </div>
    </div>
  )
}
