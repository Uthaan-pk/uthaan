import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Uthaan',
  description: 'Terms of service for Uthaan school management platform.',
}

export default function TermsPage() {
  return (
    <main style={{
      maxWidth: '720px',
      margin: '0 auto',
      padding: '6rem 2rem 4rem',
      color: '#e6edf3',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      lineHeight: '1.7',
    }}>
      <Link href="/" style={{ color: '#22a862', fontSize: '14px', textDecoration: 'none' }}>
        ← Back to Uthaan
      </Link>

      <h1 style={{ marginTop: '2rem', fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#ffffff' }}>
        Terms of Service
      </h1>

      <p style={{ color: '#8b949e', marginTop: '0.5rem', fontSize: '14px' }}>
        Last updated: May 2026 &nbsp;·&nbsp; Contact: <a href="mailto:hello@uthaan.app" style={{ color: '#22a862' }}>hello@uthaan.app</a>
      </p>

      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '2rem 0' }} />

      <p style={{ background: 'rgba(34,168,98,0.08)', border: '1px solid rgba(34,168,98,0.2)', borderRadius: '12px', padding: '1rem 1.25rem', fontSize: '14px', color: '#8b949e' }}>
        <strong style={{ color: '#ffffff' }}>Note:</strong> Uthaan is currently in a guided pilot programme. Our full terms of service are being finalized. Pilot schools are onboarded through a direct agreement with our team. If you have any questions, contact us at{' '}
        <a href="mailto:hello@uthaan.app" style={{ color: '#22a862' }}>hello@uthaan.app</a>.
      </p>

      <h2 style={{ marginTop: '2.5rem', fontSize: '20px', fontWeight: 600, color: '#ffffff' }}>Acceptance</h2>
      <p style={{ color: '#8b949e' }}>
        By using Uthaan, your school agrees to these terms. Pilot schools are onboarded with guided support and a direct agreement with the Uthaan team.
      </p>

      <h2 style={{ marginTop: '2.5rem', fontSize: '20px', fontWeight: 600, color: '#ffffff' }}>Service description</h2>
      <p style={{ color: '#8b949e' }}>
        Uthaan provides a school management platform for Pakistani private schools, including student records, fee management, attendance, marks, announcements, timetable, and AI-assisted staff tools.
      </p>

      <h2 style={{ marginTop: '2.5rem', fontSize: '20px', fontWeight: 600, color: '#ffffff' }}>School responsibilities</h2>
      <ul style={{ paddingLeft: '1.5rem', color: '#8b949e' }}>
        <li>Schools are responsible for the accuracy of data entered into the system</li>
        <li>School admins are responsible for managing staff access appropriately</li>
        <li>Schools must not share login credentials across accounts</li>
        <li>Schools must notify Uthaan if they suspect unauthorized access</li>
      </ul>

      <h2 style={{ marginTop: '2.5rem', fontSize: '20px', fontWeight: 600, color: '#ffffff' }}>Payments</h2>
      <p style={{ color: '#8b949e' }}>
        Payments are currently handled manually between schools and the Uthaan team. Pilot schools receive a guided period before any subscription begins. Pricing is agreed directly with the school before any charges apply.
      </p>

      <h2 style={{ marginTop: '2.5rem', fontSize: '20px', fontWeight: 600, color: '#ffffff' }}>Data and termination</h2>
      <p style={{ color: '#8b949e' }}>
        Schools may request a data export at any time. Upon termination of service, school data can be exported in a standard format before account closure. We do not retain school data after confirmed account closure.
      </p>

      <h2 style={{ marginTop: '2.5rem', fontSize: '20px', fontWeight: 600, color: '#ffffff' }}>Contact</h2>
      <p style={{ color: '#8b949e' }}>
        For any questions about these terms, email us at{' '}
        <a href="mailto:hello@uthaan.app" style={{ color: '#22a862' }}>hello@uthaan.app</a>.
      </p>

      <div style={{ marginTop: '3rem' }}>
        <Link href="/" style={{ color: '#22a862', fontSize: '14px', textDecoration: 'none' }}>
          ← Back to Uthaan
        </Link>
      </div>
    </main>
  )
}
