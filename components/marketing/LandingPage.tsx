'use client'

import Link from 'next/link'
import { JetBrains_Mono, Sora } from 'next/font/google'
import { useEffect } from 'react'
import styles from './LandingPage.module.css'

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-landing-sora',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-landing-mono',
})

const featureCards = [
  {
    title: 'Student management',
    body: 'Add, archive, and bulk import students via CSV. Full profiles with class, roll number, and parent links.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: 'Fee management',
    body: 'Assign fees, mark paid/unpaid, view defaulter list. Full fee ledger per student — no separate software needed.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
  {
    title: 'Attendance marking',
    body: "Mark present, absent, or late per class. Auto-filtered to each teacher's own classes. No cross-class confusion.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    title: 'Marks and gradebook',
    body: 'Enter marks manually or import via CSV. Auto-calculated results, class averages, and downloadable report cards.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 0 3-3h7z" />
      </svg>
    ),
  },
  {
    title: 'Timetable builder',
    body: 'Set periods per class per day. Teachers see only their own classes. No scheduling conflicts, no confusion.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    title: 'Audit trail',
    body: 'Every sensitive action logged — marks, fees, attendance, role changes. Full accountability for your school.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
]

const aiCards = [
  {
    status: 'Live',
    badgeClass: styles.live,
    title: 'Report card comment generator',
    body: 'Select a class and generate editable report card comments for students in seconds. Built for teacher and admin workflows inside the app.',
  },
  {
    status: 'Live',
    badgeClass: styles.live,
    title: 'Attendance alert summaries',
    body: 'Attendance risk summaries run inside the app for school staff, helping admins spot repeated absence patterns early.',
  },
  {
    status: 'Live',
    badgeClass: styles.live,
    title: 'Smart navigation search',
    body: 'Staff can type tasks like attendance, fees, or results and jump directly to the right page without hunting through menus.',
  },
  {
    status: 'Coming soon',
    badgeClass: styles.soon,
    title: 'Assignment feedback generator',
    body: 'Teacher-reviewed AI drafts for assignment feedback, designed to save marking time without removing staff control.',
  },
  {
    status: 'Coming soon',
    badgeClass: styles.soon,
    title: 'Quiz generator',
    body: 'Quiz generation from teacher prompts is planned for future Pro and Enterprise workflows when released.',
  },
]

const pricingCards = [
  {
    plan: 'Starter',
    amount: 'Rs. 8,000',
    period: '/ month',
    students: 'Up to 200 students',
    features: ['Core school management', 'Attendance, marks, fees, announcements', 'Up to 4 user roles', 'No AI included'],
  },
  {
    plan: 'Growth',
    amount: 'Rs. 20,000',
    period: '/ month',
    students: 'Up to 600 students',
    features: ['Everything in Starter', 'AI report card comments', 'Attendance alert summaries', 'Priority support'],
    featured: true,
  },
  {
    plan: 'Pro',
    amount: 'Rs. 40,000',
    period: '/ month',
    students: 'Up to 1,500 students',
    features: ['Everything in Growth', 'Assignment feedback generator', 'Quiz generator when available', 'Higher AI limits'],
  },
  {
    plan: 'Enterprise',
    amount: 'Custom',
    period: '\u00A0',
    students: '1,500+ students',
    features: ['Multi-campus/custom setup', 'High AI limits', 'Dedicated onboarding', 'Custom rollout support'],
  },
]

const onboardingSteps = [
  {
    title: 'Request a demo',
    body: 'Tell us about your school and what you want to evaluate in Uthaan.',
  },
  {
    title: 'We set up your school',
    body: 'Our team prepares your school workspace and applies the right plan manually.',
  },
  {
    title: 'You receive admin and teacher logins',
    body: 'Your staff gets access details after setup so onboarding stays controlled and clean.',
  },
  {
    title: 'Your school starts using Uthaan',
    body: 'You begin with guided onboarding support instead of being left to figure it out alone.',
  },
]

export default function LandingPage() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll(`.${styles.fadeIn}`))
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible)
          }
        })
      },
      { threshold: 0.1 }
    )

    elements.forEach((element) => observer.observe(element))

    return () => observer.disconnect()
  }, [])

  return (
    <div className={`${styles.page} ${styles.sora} ${sora.variable} ${jetbrainsMono.variable}`}>
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          Uth<span>aan</span>
        </div>
        <ul className={styles.navLinks}>
          <li><a href="#features">Features</a></li>
          <li><a href="#ai">AI</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#compare">Compare</a></li>
        </ul>
        <div className={styles.navActions}>
          <Link href="/login" className={styles.navLogin}>
            Login
          </Link>
          <Link href="/demo" className={styles.navCta}>
            Request demo
          </Link>
        </div>
      </nav>

      <div className={styles.hero}>
        <div className={`${styles.heroBadge} ${styles.mono}`}>Pilot programme open — April 2026</div>
        <h1>
          School management
          <br />
          for <span className={styles.accent}>Pakistani</span>
          <br />
          schools
        </h1>
        <p>
          Uthaan is built for Pakistani private schools, with onboarding support from setup to
          launch. One platform for administrators, teachers, parents, and students, shaped around
          how your school actually works.
        </p>
        <div className={styles.heroButtons}>
          <Link href="/demo" className={styles.btnPrimary}>
            Request a demo
          </Link>
          <a href="#features" className={styles.btnSecondary}>
            See features
          </a>
        </div>
      </div>

      <div className={styles.statsBar}>
        {[
          ['4', 'User roles'],
          ['3', 'AI features live'],
          ['PKT', 'Pakistan timezone'],
          ['100%', 'Cloud-based'],
          ['Rs. 0', 'Pilot cost (3 months)'],
        ].map(([num, label]) => (
          <div key={label} className={styles.stat}>
            <div className={`${styles.statNum} ${styles.mono}`}>{num}</div>
            <div className={styles.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      <section id="features" className={`${styles.section} ${styles.fadeIn}`}>
        <div className={`${styles.sectionTag} ${styles.mono}`}>Core platform</div>
        <h2 className={styles.sectionTitle}>Everything your school needs in one place</h2>
        <p className={styles.sectionSub}>No more juggling Excel sheets, WhatsApp groups, and paper registers.</p>

        <div className={styles.featureGrid}>
          {featureCards.map((card) => (
            <div key={card.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>{card.icon}</div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div id="ai" className={styles.aiSection}>
        <div className={`${styles.aiInner} ${styles.fadeIn}`}>
          <div className={`${styles.sectionTag} ${styles.mono}`}>Artificial intelligence</div>
          <h2 className={styles.sectionTitle}>AI that actually saves teachers time</h2>
          <p className={styles.sectionSub}>
            Powered by Anthropic&apos;s Claude. These tools are designed for staff and admin use inside
            the app, while students and parents stay out of AI control surfaces.
          </p>

          <div className={styles.aiGrid}>
            {aiCards.map((card) => (
              <div key={card.title} className={styles.aiCard}>
                <span className={`${styles.aiBadge} ${styles.mono} ${card.badgeClass}`}>{card.status}</span>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section id="onboarding" className={`${styles.section} ${styles.fadeIn}`}>
        <div className={`${styles.sectionTag} ${styles.mono}`}>How onboarding works</div>
        <h2 className={styles.sectionTitle}>A simple rollout for school owners</h2>
        <p className={styles.sectionSub}>
          Uthaan is not self-serve for new schools yet. We help you get set up properly before your
          team starts using the system.
        </p>

        <div className={styles.onboardingGrid}>
          {onboardingSteps.map((step, index) => (
            <div key={step.title} className={styles.onboardingCard}>
              <div className={`${styles.onboardingStep} ${styles.mono}`}>Step {index + 1}</div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="compare" className={`${styles.section} ${styles.fadeIn}`}>
        <div className={`${styles.sectionTag} ${styles.mono}`}>Comparison</div>
        <h2 className={styles.sectionTitle}>Why not Google Classroom or Canvas?</h2>
        <p className={styles.sectionSub}>
          International platforms were built for Western schools. Your school has different needs.
        </p>

        <div className={styles.tableWrap}>
          <table className={styles.vsTable}>
            <thead>
              <tr>
                <th>Feature</th>
                <th className={styles.uthaanCol}>Uthaan</th>
                <th>Google Classroom</th>
                <th>Canvas</th>
                <th>ClassDojo</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Fee management</td><td className={`${styles.uthaanCol} ${styles.check}`}>Yes</td><td className={styles.cross}>No</td><td className={styles.cross}>No</td><td className={styles.cross}>No</td></tr>
              <tr><td>Pakistan / local context</td><td className={`${styles.uthaanCol} ${styles.check}`}>Yes</td><td className={styles.cross}>No</td><td className={styles.cross}>No</td><td className={styles.cross}>No</td></tr>
              <tr><td>AI report card comments</td><td className={`${styles.uthaanCol} ${styles.check}`}>Yes</td><td className={styles.cross}>No</td><td className={styles.cross}>No</td><td className={styles.cross}>No</td></tr>
              <tr><td>Attendance alert summaries</td><td className={`${styles.uthaanCol} ${styles.check}`}>Yes</td><td className={styles.cross}>No</td><td className={styles.cross}>No</td><td className={styles.cross}>No</td></tr>
              <tr><td>WhatsApp parent alerts</td><td className={`${styles.uthaanCol} ${styles.soonTag}`}>Planned</td><td className={styles.cross}>No</td><td className={styles.cross}>No</td><td className={styles.cross}>No</td></tr>
              <tr><td>Role-based access (4 roles)</td><td className={`${styles.uthaanCol} ${styles.check}`}>Yes</td><td>Partial</td><td className={styles.check}>Yes</td><td>Partial</td></tr>
              <tr><td>Full audit log</td><td className={`${styles.uthaanCol} ${styles.check}`}>Yes</td><td className={styles.cross}>No</td><td className={styles.check}>Yes</td><td className={styles.cross}>No</td></tr>
              <tr><td>Affordable for small schools</td><td className={`${styles.uthaanCol} ${styles.check}`}>Yes</td><td>Free (limited)</td><td className={styles.cross}>Expensive</td><td>Free (limited)</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="pricing" className={`${styles.section} ${styles.fadeIn}`}>
        <div className={`${styles.sectionTag} ${styles.mono}`}>Pricing</div>
        <h2 className={styles.sectionTitle}>Simple, transparent pricing</h2>
        <p className={styles.sectionSub}>
          Plans are assigned manually by superadmin today. AI access and monthly usage limits are
          applied per school based on the selected plan.
        </p>

        <div className={styles.pricingGrid}>
          {pricingCards.map((card) => (
            <div
              key={card.plan}
              className={`${styles.priceCard} ${card.featured ? styles.featured : ''}`}
            >
              {card.featured ? <div className={styles.featuredBadge}>Most popular</div> : null}
              <div className={styles.pricePlan}>{card.plan}</div>
              <div className={`${styles.priceAmount} ${styles.mono}`}>{card.amount}</div>
              <div className={styles.pricePeriod}>{card.period}</div>
              <div className={styles.priceStudents}>{card.students}</div>
              <ul className={styles.priceFeatures}>
                {card.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className={`${styles.ctaSection} ${styles.fadeIn}`}>
        <div className={styles.ctaBox}>
          <h2>See how Uthaan would work for your school</h2>
          <p>
            Request a demo, tell us about your school, and we&apos;ll walk you through setup,
            onboarding, and the right plan for your team.
          </p>
          <div className={styles.heroButtons}>
            <Link href="/demo" className={styles.btnPrimary}>
              Request a demo
            </Link>
          </div>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>Uthaan — School management, simplified &nbsp;·&nbsp; uthaan-one.vercel.app</p>
      </footer>
    </div>
  )
}
