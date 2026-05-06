import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Uthaan',
  description: 'How Uthaan handles your school data.',
}

export default function PrivacyPage() {
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
        Privacy Policy
      </h1>

      <p style={{ color: '#8b949e', marginTop: '0.5rem', fontSize: '14px' }}>
        Last updated: May 2026 &nbsp;·&nbsp; Contact: <a href="mailto:hello@uthaan.app" style={{ color: '#22a862' }}>hello@uthaan.app</a>
      </p>

      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '2rem 0' }} />

      <p>
        Uthaan is a school management platform built for Pakistani private schools. This page describes how we collect, store, and use data provided by schools, staff, parents, and students.
      </p>

      <p style={{ background: 'rgba(34,168,98,0.08)', border: '1px solid rgba(34,168,98,0.2)', borderRadius: '12px', padding: '1rem 1.25rem', fontSize: '14px', color: '#8b949e' }}>
        <strong style={{ color: '#ffffff' }}>Note:</strong> Uthaan is currently in a guided pilot programme. Our full privacy policy is being finalized. If you have questions about how your school&apos;s data is handled, please contact us directly at{' '}
        <a href="mailto:hello@uthaan.app" style={{ color: '#22a862' }}>hello@uthaan.app</a> and we will respond within 24 hours.
      </p>

      <h2 style={{ marginTop: '2.5rem', fontSize: '20px', fontWeight: 600, color: '#ffffff' }}>What data we collect</h2>
      <ul style={{ paddingLeft: '1.5rem', color: '#8b949e' }}>
        <li>School information (name, location, contact details)</li>
        <li>Staff accounts (name, email, role)</li>
        <li>Student records (name, class, roll number, parent contact)</li>
        <li>Attendance records</li>
        <li>Fee and payment records (manually recorded — no payment automation is live)</li>
        <li>Marks and academic results</li>
        <li>School announcements</li>
        <li>Audit logs of sensitive school actions</li>
      </ul>

      <h2 style={{ marginTop: '2.5rem', fontSize: '20px', fontWeight: 600, color: '#ffffff' }}>How we use data</h2>
      <ul style={{ paddingLeft: '1.5rem', color: '#8b949e' }}>
        <li>To operate the Uthaan platform for your school</li>
        <li>To provide guided onboarding support</li>
        <li>To generate AI-assisted staff tools (report comments, attendance summaries) — staff-only</li>
        <li>We do not sell your data to third parties</li>
        <li>We do not use your school data to train AI models</li>
      </ul>

      <h2 style={{ marginTop: '2.5rem', fontSize: '20px', fontWeight: 600, color: '#ffffff' }}>Data ownership and export</h2>
      <p style={{ color: '#8b949e' }}>
        Your school owns its data. Student records, fee history, attendance logs, and results can be exported in a standard format at any time. Contact us to request an export.
      </p>

      <h2 style={{ marginTop: '2.5rem', fontSize: '20px', fontWeight: 600, color: '#ffffff' }}>Data security</h2>
      <p style={{ color: '#8b949e' }}>
        Uthaan is hosted on enterprise-grade infrastructure. Access is controlled by role-based permissions so staff only see data relevant to their role. All data is encrypted in transit.
      </p>

      <h2 style={{ marginTop: '2.5rem', fontSize: '20px', fontWeight: 600, color: '#ffffff' }}>Contact</h2>
      <p style={{ color: '#8b949e' }}>
        For any questions about privacy or data handling, email us at{' '}
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
