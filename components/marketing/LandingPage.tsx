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
    body: 'Select a class and get personalised comments for every student in under 30 seconds. Fully editable before finalising. Costs less than Rs. 3 per student.',
  },
  {
    status: 'Live',
    badgeClass: styles.live,
    title: 'Automated attendance alerts',
    body: 'Every Monday at 7am PKT, the system identifies students with 3+ absences and sends personalised parent alerts automatically. Zero teacher effort.',
  },
  {
    status: 'Live',
    badgeClass: styles.live,
    title: 'Smart navigation search',
    body: `Type "I want to record attendance" or "show me who hasn't paid fees" and get taken directly to the right page. No more hunting through menus.`,
  },
  {
    status: 'Coming soon',
    badgeClass: styles.soon,
    title: 'Assignment feedback generator',
    body: 'AI-generated personalised feedback on student assignments. Teacher reviews and approves before sharing. Cuts marking time in half.',
  },
]

const pricingCards = [
  {
    plan: 'Starter',
    amount: 'Rs. 8,000',
    period: '/ month',
    students: 'Up to 200 students',
    features: ['All core features', '4 user roles', 'WhatsApp support', 'AI not included'],
  },
  {
    plan: 'Growth',
    amount: 'Rs. 20,000',
    period: '/ month',
    students: 'Up to 600 students',
    features: ['Everything in Starter', 'AI report comments', 'Attendance alerts', 'Priority support'],
    featured: true,
  },
  {
    plan: 'Pro',
    amount: 'Rs. 40,000',
    period: '/ month',
    students: 'Up to 1,500 students',
    features: ['Everything in Growth', 'Dedicated support', 'Custom onboarding', 'Priority features'],
  },
  {
    plan: 'Enterprise',
    amount: 'Custom',
    period: '\u00A0',
    students: '1,500+ students',
    features: ['Everything in Pro', 'On-site training', 'Multi-campus support', 'SLA guarantee'],
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
        <Link href="/login" className={styles.navCta}>
          Get a demo
        </Link>
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
          One platform for administrators, teachers, parents, and students. Built around how your
          school actually works — not how a Silicon Valley startup thinks it should.
        </p>
        <div className={styles.heroButtons}>
          <Link href="/login" className={styles.btnPrimary}>
            Start free pilot
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
            Powered by Anthropic&apos;s Claude — the same AI trusted by Fortune 500 companies. Every feature keeps the teacher in control.
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
              <tr><td>Automated attendance alerts</td><td className={`${styles.uthaanCol} ${styles.check}`}>Yes</td><td className={styles.cross}>No</td><td className={styles.cross}>No</td><td className={styles.cross}>No</td></tr>
              <tr><td>WhatsApp parent alerts</td><td className={`${styles.uthaanCol} ${styles.soonTag}`}>Coming soon</td><td className={styles.cross}>No</td><td className={styles.cross}>No</td><td className={styles.cross}>No</td></tr>
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
          No per-user fees. No hidden costs. Pay per school. Annual billing saves you 2 months.
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
          <h2>Join the pilot programme</h2>
          <p>3 months free. Personal onboarding. Direct access to the development team. Locked-in pricing for life.</p>
          <div className={styles.heroButtons}>
            <Link href="/login" className={styles.btnPrimary}>
              Start free pilot
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
