import { Suspense } from 'react'
import Link from 'next/link'
import DemoRequestForm from './DemoRequestForm'

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-12 flex items-center justify-between gap-4">
          <Link href="/" className="text-xl font-bold tracking-tight text-[#22a862]">
            Uthaan
          </Link>
          <Link href="/login" className="text-sm text-gray-400 transition hover:text-white">
            Login
          </Link>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="pt-4">
            <div className="mb-4 inline-flex items-center rounded-full border border-[#1a7a4a]/40 bg-[#12311f] px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-[#7dd8a1]">
              Demo / Pilot Request
            </div>
            <h1 className="max-w-xl text-5xl font-bold tracking-tight text-white">
              Request a guided demo for your school
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-gray-400">
              This is a manual review flow for schools interested in a pilot. No account or school
              is created yet. We&apos;ll review your request first, then follow up personally.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#161b22] p-5">
                <div className="text-sm font-semibold text-white">What happens next</div>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  We review your request, decide whether the school is a fit for the pilot, and
                  then reach out manually.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#161b22] p-5">
                <div className="text-sm font-semibold text-white">No automatic setup yet</div>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  This form does not create schools, auth users, billing records, or production
                  access automatically.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[#161b22] p-6 shadow-2xl shadow-black/20 sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-white">Tell us about your school</h2>
              <p className="mt-2 text-sm text-gray-400">
                Required: school name, contact name, and email.
              </p>
            </div>
            <Suspense fallback={null}>
              <DemoRequestForm />
            </Suspense>
          </section>
        </div>
      </div>
    </div>
  )
}
