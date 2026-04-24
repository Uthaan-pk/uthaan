'use client'

import Link from 'next/link'
import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import { JetBrains_Mono, Sora } from 'next/font/google'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
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
    key: 'students',
    title: 'Student management',
    body: 'Add, archive, and bulk import students via CSV. Full profiles with class, roll number, and parent links.',
    previewEyebrow: 'Student records',
    previewTitle: 'Keep profiles, class placement, and parent links organized',
    previewSummary: 'Bring imported student records into one clean directory so admins can find class, roll number, and family context without digging.',
    previewStats: [
      ['412', 'students'],
      ['8', 'classes'],
      ['92%', 'parent linked'],
    ],
    previewLines: ['Class 5 · Roll 12 · Parent linked', 'Class 7 · Archive controls', 'Bulk CSV import with cleanup'],
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
    key: 'fees',
    title: 'Fee management',
    body: 'Assign fees, mark paid/unpaid, view defaulter list. Full fee ledger per student — no separate software needed.',
    previewEyebrow: 'Fee ledger',
    previewTitle: 'Track paid, unpaid, and overdue fees in one view',
    previewSummary: 'Give school admins a structured ledger instead of fee notebooks, with cleaner student-level history and defaulter visibility.',
    previewStats: [
      ['Rs.', 'ledger-ready'],
      ['34', 'overdue'],
      ['1', 'source of truth'],
    ],
    previewLines: ['April fee · Paid', 'May fee · Unpaid', 'Defaulter list filtered by class'],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
  {
    key: 'attendance',
    title: 'Attendance marking',
    body: "Mark present, absent, or late per class. Auto-filtered to each teacher's own classes. No cross-class confusion.",
    previewEyebrow: 'Attendance workflow',
    previewTitle: 'Mark attendance class by class without confusion',
    previewSummary: 'Teachers see the right class list, mark attendance quickly, and give admins cleaner daily oversight across the school.',
    previewStats: [
      ['38', 'present'],
      ['4', 'absent'],
      ['2', 'late'],
    ],
    previewLines: ['Class 6-B · Morning register', 'Teacher sees own assigned classes', 'Admin summary updates same day'],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    key: 'marks',
    title: 'Marks and gradebook',
    body: 'Enter marks manually or import via CSV. Auto-calculated results, class averages, and downloadable report cards.',
    previewEyebrow: 'Gradebook',
    previewTitle: 'Move from scattered marks sheets to a cleaner gradebook',
    previewSummary: 'Record marks, calculate averages, and prepare report cards from the same workflow instead of stitching together spreadsheets.',
    previewStats: [
      ['81%', 'class avg'],
      ['3', 'subjects'],
      ['PDF', 'reports'],
    ],
    previewLines: ['Maths · 83', 'Science · 79', 'Result summary ready for report card'],
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 0 3-3h7z" />
      </svg>
    ),
  },
  {
    key: 'timetable',
    title: 'Timetable builder',
    body: 'Set periods per class per day. Teachers see only their own classes. No scheduling conflicts, no confusion.',
    previewEyebrow: 'School timetable',
    previewTitle: 'Build a timetable that stays readable for staff',
    previewSummary: 'Keep periods, classes, and teacher allocation in one structured schedule so daily operations are easier to trust.',
    previewStats: [
      ['6', 'periods'],
      ['Mon', 'to Sat'],
      ['0', 'conflicts shown'],
    ],
    previewLines: ['Period 1 · Class 4 Maths', 'Period 3 · Teacher view filtered', 'Daily schedule by class'],
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
    key: 'audit',
    title: 'Audit trail',
    body: 'Every sensitive action logged — marks, fees, attendance, role changes. Full accountability for your school.',
    previewEyebrow: 'Accountability',
    previewTitle: 'Keep a clean record of sensitive school actions',
    previewSummary: 'When someone edits marks, changes fee status, or updates a role, the school keeps an audit trail for accountability.',
    previewStats: [
      ['24', 'recent logs'],
      ['Fees', 'tracked'],
      ['Roles', 'tracked'],
    ],
    previewLines: ['Marks updated by admin', 'Fee status changed to paid', 'Role permissions edited'],
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
    amount: 'Rs. 12,000',
    period: '/ month',
    students: 'Up to 200 students',
    features: ['Core school management', 'Attendance, marks, fees, announcements', 'Up to 4 user roles', 'No AI included'],
  },
  {
    plan: 'Growth',
    amount: 'Rs. 30,000',
    period: '/ month',
    students: 'Up to 600 students',
    features: ['Everything in Starter', 'AI report card comments', 'Attendance alert summaries', 'Priority support'],
    featured: true,
  },
  {
    plan: 'Pro',
    amount: 'Rs. 65,000',
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

const planFeatures: Record<string, string[]> = {
  starter: [
    'Up to 200 students',
    'Attendance tracking',
    'Fee management',
    'Report cards',
    'Announcements',
    'Parent & student portal',
    'Email support',
  ],
  growth: [
    'Up to 600 students',
    'Everything in Starter',
    'AI report card comments (50/month)',
    'AI attendance alerts (10/month)',
    'Priority support',
  ],
  pro: [
    'Up to 1,500 students',
    'Everything in Growth',
    'AI assignment feedback (100/month)',
    'AI quiz generator (50/month)',
    'Advanced analytics',
    'Dedicated onboarding',
  ],
  enterprise: [
    '1,500+ students',
    'Everything in Pro',
    'AI report card comments (1,000/month)',
    'AI attendance alerts (200/month)',
    'Custom setup',
    'SLA support',
  ],
}

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

const heroPreviewCards = [
  {
    key: 'comments',
    label: 'AI comments ready',
    eyebrow: 'Teacher workflow',
    title: 'AI drafts prepared for report comments',
    summary: 'Generate editable class-level comment drafts, then let teachers review before anything reaches families.',
    bullets: ['Bulk class generation', 'Teacher approval stays required', 'School plan limits still apply'],
    stats: [
      ['28', 'students drafted'],
      ['1', 'class selected'],
      ['Staff', 'review required'],
    ],
  },
  {
    key: 'attendance',
    label: 'Attendance summary',
    eyebrow: 'Admin visibility',
    title: 'Spot attendance risk before it becomes a bigger problem',
    summary: 'School staff can review repeated absences inside the app and follow up with context instead of digging through registers.',
    bullets: ['Class-level summaries', 'Staff-only AI surface', 'Supports manual follow-up'],
    stats: [
      ['7', 'students flagged'],
      ['3', 'classes reviewed'],
      ['Live', 'inside app'],
    ],
  },
  {
    key: 'fees',
    label: 'Fee records organized',
    eyebrow: 'School operations',
    title: 'Keep fees, ledgers, and defaulter tracking in one place',
    summary: 'Replace scattered notebooks and separate software with a structured fee ledger linked to each student.',
    bullets: ['Student-level ledgers', 'Cleaner defaulter lists', 'Admin-ready fee view'],
    stats: [
      ['Rs.', 'fees tracked'],
      ['1', 'ledger per student'],
      ['Clean', 'status view'],
    ],
  },
  {
    key: 'announcements',
    label: 'Announcements sent',
    eyebrow: 'Daily communication',
    title: 'Share school updates from the same system your team already uses',
    summary: 'Announcements live beside attendance, marks, and results so the school communicates from one operating layer.',
    bullets: ['Central update feed', 'Role-based visibility', 'Less switching between tools'],
    stats: [
      ['All', 'school updates'],
      ['4', 'role views'],
      ['One', 'shared system'],
    ],
  },
  {
    key: 'demo',
    label: 'Demo request received',
    eyebrow: 'Guided onboarding',
    title: 'New schools start with a guided rollout, not a blank dashboard',
    summary: 'Your school requests a demo, Uthaan prepares the setup, and staff receive controlled access when onboarding is ready.',
    bullets: ['Manual school setup', 'Admin + teacher logins', 'Pilot-friendly rollout'],
    stats: [
      ['4', 'setup steps'],
      ['Pilot', 'plan available'],
      ['Guided', 'onboarding'],
    ],
  },
] as const

const roleStories = {
  admin: {
    label: 'Admin',
    eyebrow: 'School operations',
    title: 'Run the school from one cleaner control layer',
    body: 'School admins get visibility across attendance, fees, announcements, results, and staff-facing AI without jumping between scattered tools.',
    highlights: ['Fee tracking and defaulter visibility', 'Attendance oversight across classes', 'Announcements and results in the same system'],
    metrics: [
      ['Fees', 'Ledger-ready'],
      ['Results', 'School-wide'],
      ['Audit', 'Tracked'],
    ],
  },
  teacher: {
    label: 'Teacher',
    eyebrow: 'Classroom workflow',
    title: 'Give teachers a faster, calmer daily workflow',
    body: 'Teachers mark attendance, enter marks, manage assignments, and use staff-only AI comment tools without seeing parts of the app they do not need.',
    highlights: ['Attendance linked to their own classes', 'Marks and report workflows in one place', 'AI report comments for staff only'],
    metrics: [
      ['Classes', 'Own only'],
      ['Comments', 'AI-assisted'],
      ['Work', 'Reduced'],
    ],
  },
  parent: {
    label: 'Parent',
    eyebrow: 'Family visibility',
    title: 'Parents get the updates they actually care about',
    body: 'Parents can stay informed with attendance, results, and announcements through a cleaner role-based experience without extra confusion.',
    highlights: ['Attendance visibility', 'Results access', 'School announcements in one view'],
    metrics: [
      ['Updates', 'Relevant'],
      ['Results', 'Visible'],
      ['Noise', 'Reduced'],
    ],
  },
  student: {
    label: 'Student',
    eyebrow: 'Learner view',
    title: 'Students get a simpler view of academic work',
    body: 'Students see assignments, materials, and results in a role-specific experience rather than being exposed to staff controls.',
    highlights: ['Assignments and materials', 'Results visibility', 'No exposure to staff-only tools'],
    metrics: [
      ['Tasks', 'Focused'],
      ['Results', 'Accessible'],
      ['AI', 'Not exposed'],
    ],
  },
} as const

const systemStories = {
  before: {
    label: 'Before Uthaan',
    title: 'Scattered systems create operational drag',
    body: 'Most schools are still stitching together WhatsApp groups, registers, spreadsheets, and notebooks. The work happens, but the system around it stays messy.',
    chips: ['WhatsApp groups', 'Paper attendance', 'Fee notebooks', 'Spreadsheets', 'Scattered systems'],
    bullets: ['Important records live in different places', 'Staff spend time rechecking basic information', 'School owners get less reliable visibility'],
  },
  after: {
    label: 'After Uthaan',
    title: 'One platform gives the school a cleaner operating system',
    body: 'Uthaan brings attendance, fees, announcements, results, and staff AI tools into one role-based platform built for how Pakistani schools actually run.',
    chips: ['One Uthaan platform', 'Role-based access', 'Cleaner records', 'Staff AI assistance', 'Guided onboarding'],
    bullets: ['Admins, teachers, parents, and students see the right layer', 'Records become easier to trust and track', 'Staff save time without exposing AI to families'],
  },
} as const

type HeroPreviewKey = (typeof heroPreviewCards)[number]['key']
type FeatureCardKey = (typeof featureCards)[number]['key']
type RoleKey = keyof typeof roleStories
type SystemStoryKey = keyof typeof systemStories

export default function LandingPage() {
  const featurePreviewRef = useRef<HTMLDivElement>(null)

  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState('features')
  const [activeFeatureCard, setActiveFeatureCard] = useState<FeatureCardKey>('students')
  const [activeHeroCard, setActiveHeroCard] = useState<HeroPreviewKey>('comments')
  const [activeRole, setActiveRole] = useState<RoleKey>('admin')
  const [activeStory, setActiveStory] = useState<SystemStoryKey>('after')
  const [activeStoryChip, setActiveStoryChip] = useState<string>(systemStories.after.chips[0])

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

  useEffect(() => {
    const ids = ['features', 'ai', 'pricing', 'compare']
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null)

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (visible?.target?.id) {
          setActiveSection(visible.target.id)
        }
      },
      {
        rootMargin: '-35% 0px -45% 0px',
        threshold: [0.15, 0.4, 0.7],
      }
    )

    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setActiveStoryChip(systemStories[activeStory].chips[0])
  }, [activeStory])

  const staggerStyle = (index: number) =>
    ({
      '--stagger-delay': `${index * 90}ms`,
    }) as CSSProperties

  const activeFeaturePreview = featureCards.find((card) => card.key === activeFeatureCard) ?? featureCards[0]
  const activeHeroPreview = heroPreviewCards.find((card) => card.key === activeHeroCard) ?? heroPreviewCards[0]
  const activeRoleStory = roleStories[activeRole]
  const activeSystemStory = systemStories[activeStory]

  return (
    <div className={`${styles.page} ${styles.sora} ${sora.variable} ${jetbrainsMono.variable}`}>
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          Uth<span>aan</span>
        </div>
        <ul className={styles.navLinks}>
          <li>
            <a href="#features" className={activeSection === 'features' ? styles.navLinkActive : ''}>
              Features
            </a>
          </li>
          <li>
            <a href="#ai" className={activeSection === 'ai' ? styles.navLinkActive : ''}>
              AI
            </a>
          </li>
          <li>
            <a href="#pricing" className={activeSection === 'pricing' ? styles.navLinkActive : ''}>
              Pricing
            </a>
          </li>
          <li>
            <a href="#compare" className={activeSection === 'compare' ? styles.navLinkActive : ''}>
              Compare
            </a>
          </li>
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
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroGrid} aria-hidden="true" />
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
        <div className={styles.heroPreview}>
          <div className={styles.previewFloatingCards}>
            {heroPreviewCards.map((card, index) => (
              <button
                key={card.key}
                type="button"
                className={`${styles.previewChip} ${activeHeroCard === card.key ? styles.previewChipActive : ''}`}
                style={staggerStyle(index)}
                onClick={() => setActiveHeroCard(card.key)}
                aria-pressed={activeHeroCard === card.key}
              >
                <span className={styles.previewChipLabel}>{card.label}</span>
                <span className={styles.previewChipHint}>Preview</span>
              </button>
            ))}
          </div>
          <div className={styles.previewShell}>
            <div className={styles.previewShellTop}>
              <div className={styles.previewBrowserDots} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className={`${styles.previewUrl} ${styles.mono}`}>uthaan.app / school workspace</div>
            </div>
            <div className={styles.previewCard}>
              <div className={styles.previewTopline}>
                <span className={styles.previewDot} />
                {activeHeroPreview.eyebrow}
              </div>
              <div className={styles.previewStory}>
                <div className={styles.previewStoryHeader}>
                  <div>
                    <div className={styles.previewStoryTitle}>{activeHeroPreview.title}</div>
                    <p className={styles.previewStorySummary}>{activeHeroPreview.summary}</p>
                  </div>
                  <div className={styles.previewStatusCard}>
                    <div className={`${styles.previewStatusValue} ${styles.mono}`}>Live</div>
                    <div className={styles.previewStatusLabel}>Product-led preview</div>
                  </div>
                </div>
                <div className={styles.previewMetrics}>
                  {activeHeroPreview.stats.map(([value, label]) => (
                    <div key={label} className={styles.previewMetric}>
                      <div className={`${styles.previewMetricValue} ${styles.mono}`}>{value}</div>
                      <div className={styles.previewMetricLabel}>{label}</div>
                    </div>
                  ))}
                </div>
                <div className={styles.previewInsights}>
                  {activeHeroPreview.bullets.map((bullet) => (
                    <div key={bullet} className={styles.previewInsight}>
                      {bullet}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.previewTabs}>
              {heroPreviewCards.map((card) => (
                <button
                  key={card.key}
                  type="button"
                  className={`${styles.previewTab} ${activeHeroCard === card.key ? styles.previewTabActive : ''}`}
                  onClick={() => setActiveHeroCard(card.key)}
                >
                  {card.label}
                </button>
              ))}
            </div>
          </div>
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

        <div className={styles.featureExperience}>
          <div className={styles.featureGrid}>
            {featureCards.map((card, index) => (
              <button
                key={card.key}
                type="button"
                className={`${styles.featureCard} ${styles.staggerItem} ${activeFeatureCard === card.key ? styles.featureCardActive : ''}`}
                style={staggerStyle(index)}
                onClick={() => {
                  setActiveFeatureCard(card.key)
                  if (window.innerWidth <= 700) {
                    featurePreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                  }
                }}
                aria-pressed={activeFeatureCard === card.key}
              >
                <div className={styles.featureIcon}>{card.icon}</div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </button>
            ))}
          </div>

          <div ref={featurePreviewRef} className={`${styles.featurePreviewPanel} ${styles.featurePreviewSticky}`}>
            <div className={styles.featurePreviewTop}>
              <div className={`${styles.sectionTag} ${styles.mono}`}>{activeFeaturePreview.previewEyebrow}</div>
              <div className={styles.featurePreviewStatus}>Selected feature</div>
            </div>
            <h3 className={styles.featurePreviewTitle}>{activeFeaturePreview.previewTitle}</h3>
            <p className={styles.featurePreviewSummary}>{activeFeaturePreview.previewSummary}</p>

            <div className={styles.featurePreviewStats}>
              {activeFeaturePreview.previewStats.map(([value, label]) => (
                <div key={label} className={styles.featurePreviewStat}>
                  <div className={`${styles.featurePreviewStatValue} ${styles.mono}`}>{value}</div>
                  <div className={styles.featurePreviewStatLabel}>{label}</div>
                </div>
              ))}
            </div>

            <div className={styles.featurePreviewScreen}>
              <div className={styles.featurePreviewScreenBar}>
                <span />
                <span />
                <span />
              </div>
              <div className={styles.featurePreviewRows}>
                {activeFeaturePreview.previewLines.map((line, index) => (
                  <div key={line} className={styles.featurePreviewRow} style={staggerStyle(index)}>
                    <span className={styles.featurePreviewRowDot} aria-hidden="true" />
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.fadeIn}`}>
        <div className={`${styles.sectionTag} ${styles.mono}`}>Role-based product preview</div>
        <h2 className={styles.sectionTitle}>Explore how each role experiences the platform</h2>
        <p className={styles.sectionSub}>
          Uthaan is not one crowded screen for everyone. Each role sees a cleaner layer built for the
          work they actually need to do.
        </p>

        <div className={styles.roleStoryWrap}>
          <div className={styles.roleTabs} role="tablist" aria-label="Role-based product preview">
            {(Object.entries(roleStories) as [RoleKey, (typeof roleStories)[RoleKey]][]).map(([key, role]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeRole === key}
                className={`${styles.roleTab} ${activeRole === key ? styles.roleTabActive : ''}`}
                onClick={() => setActiveRole(key)}
              >
                {role.label}
              </button>
            ))}
          </div>

          <div className={styles.roleStoryPanel}>
            <div className={styles.roleStoryContent}>
              <div className={`${styles.sectionTag} ${styles.mono}`}>{activeRoleStory.eyebrow}</div>
              <h3>{activeRoleStory.title}</h3>
              <p>{activeRoleStory.body}</p>
              <ul className={styles.roleHighlights}>
                {activeRoleStory.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </div>

            <div className={styles.rolePreview}>
              <div className={styles.rolePreviewHeader}>
                <span>{activeRoleStory.label} workspace</span>
                <span className={styles.rolePreviewPill}>Role-based access</span>
              </div>
              <div className={styles.rolePreviewGrid}>
                {activeRoleStory.metrics.map(([label, value], index) => (
                  <div key={label} className={styles.roleMetricCard} style={staggerStyle(index)}>
                    <div className={styles.roleMetricLabel}>{label}</div>
                    <div className={`${styles.roleMetricValue} ${styles.mono}`}>{value}</div>
                  </div>
                ))}
              </div>
              <div className={styles.rolePreviewFeed}>
                {activeRoleStory.highlights.map((highlight, index) => (
                  <div key={highlight} className={styles.rolePreviewItem} style={staggerStyle(index)}>
                    <span className={styles.rolePreviewItemDot} aria-hidden="true" />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
            {aiCards.map((card, index) => (
              <div
                key={card.title}
                className={`${styles.aiCard} ${styles.staggerItem}`}
                style={staggerStyle(index)}
              >
                <span className={`${styles.aiBadge} ${styles.mono} ${card.badgeClass}`}>{card.status}</span>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className={`${styles.section} ${styles.fadeIn}`}>
        <div className={`${styles.sectionTag} ${styles.mono}`}>From scattered systems to one platform</div>
        <h2 className={styles.sectionTitle}>Show school owners the operational difference</h2>
        <p className={styles.sectionSub}>
          The story is not just software features. It is the shift from disconnected routines to one
          system your team can actually trust.
        </p>

        <div className={styles.storyToggleWrap}>
          <div className={styles.storyToggle}>
            {(Object.entries(systemStories) as [SystemStoryKey, (typeof systemStories)[SystemStoryKey]][]).map(
              ([key, story]) => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.storyToggleButton} ${activeStory === key ? styles.storyToggleButtonActive : ''}`}
                  onClick={() => setActiveStory(key)}
                >
                  {story.label}
                </button>
              )
            )}
          </div>

          <div className={styles.storyPanel}>
            <div className={styles.storyPanelCopy}>
              <div className={`${styles.sectionTag} ${styles.mono}`}>{activeSystemStory.label}</div>
              <h3>{activeSystemStory.title}</h3>
              <p>{activeSystemStory.body}</p>
              <ul className={styles.storyBullets}>
                {activeSystemStory.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
            <div className={styles.storyPanelVisual}>
              {activeSystemStory.chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className={`${styles.storyChip} ${activeStoryChip === chip ? styles.storyChipActive : ''}`}
                  onClick={() => setActiveStoryChip(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="onboarding" className={`${styles.section} ${styles.fadeIn}`}>
        <div className={`${styles.sectionTag} ${styles.mono}`}>How onboarding works</div>
        <h2 className={styles.sectionTitle}>A simple rollout for school owners</h2>
        <p className={styles.sectionSub}>
          Uthaan is not self-serve for new schools yet. We help you get set up properly before your
          team starts using the system.
        </p>

        <div className={styles.onboardingGrid}>
          {onboardingSteps.map((step, index) => (
            <div
              key={step.title}
              className={`${styles.onboardingCard} ${styles.staggerItem}`}
              style={staggerStyle(index)}
            >
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

        <div className={styles.compareLead}>
          <div className={styles.compareLeadCard}>
            <div className={`${styles.sectionTag} ${styles.mono}`}>Built for local realities</div>
            <h3>Uthaan is trying to solve the full school workflow, not just classroom posting</h3>
            <p>
              Fees, attendance, results, announcements, school roles, and staff-facing AI belong in
              the same product story for Pakistani private schools.
            </p>
          </div>
        </div>

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
              <tr>
                <td>Fee management</td>
                <td className={`${styles.uthaanCol} ${styles.check}`}>Yes</td>
                <td className={styles.cross}>No</td>
                <td className={styles.cross}>No</td>
                <td className={styles.cross}>No</td>
              </tr>
              <tr>
                <td>Pakistan / local context</td>
                <td className={`${styles.uthaanCol} ${styles.check}`}>Yes</td>
                <td className={styles.cross}>No</td>
                <td className={styles.cross}>No</td>
                <td className={styles.cross}>No</td>
              </tr>
              <tr>
                <td>AI report card comments</td>
                <td className={`${styles.uthaanCol} ${styles.check}`}>Yes</td>
                <td className={styles.cross}>No</td>
                <td className={styles.cross}>No</td>
                <td className={styles.cross}>No</td>
              </tr>
              <tr>
                <td>Attendance alert summaries</td>
                <td className={`${styles.uthaanCol} ${styles.check}`}>Yes</td>
                <td className={styles.cross}>No</td>
                <td className={styles.cross}>No</td>
                <td className={styles.cross}>No</td>
              </tr>
              <tr>
                <td>WhatsApp parent alerts</td>
                <td className={`${styles.uthaanCol} ${styles.soonTag}`}>Planned</td>
                <td className={styles.cross}>No</td>
                <td className={styles.cross}>No</td>
                <td className={styles.cross}>No</td>
              </tr>
              <tr>
                <td>Role-based access (4 roles)</td>
                <td className={`${styles.uthaanCol} ${styles.check}`}>Yes</td>
                <td>Partial</td>
                <td className={styles.check}>Yes</td>
                <td>Partial</td>
              </tr>
              <tr>
                <td>Full audit log</td>
                <td className={`${styles.uthaanCol} ${styles.check}`}>Yes</td>
                <td className={styles.cross}>No</td>
                <td className={styles.check}>Yes</td>
                <td className={styles.cross}>No</td>
              </tr>
              <tr>
                <td>Affordable for small schools</td>
                <td className={`${styles.uthaanCol} ${styles.check}`}>Yes</td>
                <td>Free (limited)</td>
                <td className={styles.cross}>Expensive</td>
                <td>Free (limited)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="pricing" className={`${styles.section} ${styles.fadeIn}`}>
        <div className={`${styles.sectionTag} ${styles.mono}`}>Pricing</div>
        <h2 className={styles.sectionTitle}>Simple, transparent pricing</h2>
        <p className={styles.sectionSub}>
          Pilot schools get 3 months free, then choose a plan. Payments are still handled manually,
          and AI access plus monthly limits are applied per school by superadmin.
        </p>

        <div className={styles.pricingGrid}>
          {pricingCards.map((card, index) => {
            const isExpanded = expandedPlan === card.plan
            const planKey = card.plan.toLowerCase()
            return (
              <div
                key={card.plan}
                className={`${styles.priceCard} ${styles.staggerItem} ${card.featured ? styles.featured : styles.priceCardHover}`}
                style={{ ...staggerStyle(index), cursor: 'pointer' }}
                onClick={() => setExpandedPlan(isExpanded ? null : card.plan)}
                aria-expanded={isExpanded}
              >
                {card.featured ? <div className={styles.featuredBadge}>Most popular</div> : null}
                <ChevronDown
                  size={15}
                  className={`${styles.priceCardChevron} ${isExpanded ? styles.priceCardChevronExpanded : ''}`}
                />
                <div className={styles.pricePlan}>{card.plan}</div>
                <div className={`${styles.priceAmount} ${styles.mono}`}>{card.amount}</div>
                <div className={styles.pricePeriod}>{card.period}</div>
                <div className={styles.priceStudents}>{card.students}</div>
                <ul className={styles.priceFeatures}>
                  {card.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <div className={`${styles.planFeatures} ${isExpanded ? styles.planFeaturesExpanded : ''}`}>
                  <div className={styles.planFeaturesSep} />
                  {planFeatures[planKey].map((feature, fi) => (
                    <div
                      key={feature}
                      className={styles.featureItem}
                      style={{ transitionDelay: `${fi * 40}ms` }}
                    >
                      <Check size={14} className={card.featured ? styles.checkGreen : styles.checkTeal} />
                      {feature}
                    </div>
                  ))}
                  <div onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/demo?plan=${planKey}`}
                      className={`${styles.priceCta} ${card.featured ? styles.priceCtaPrimary : styles.priceCtaOutline}`}
                    >
                      {card.featured ? 'Start Free Pilot' : 'Request Demo'}
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <div className={`${styles.ctaSection} ${styles.fadeIn}`}>
        <div className={styles.ctaBox}>
          <div className={`${styles.sectionTag} ${styles.mono}`}>Ready to explore Uthaan?</div>
          <h2>Move your school from scattered tools to one cleaner platform</h2>
          <p>
            Request a demo to start a guided rollout for your school, or log in if your team is
            already using Uthaan.
          </p>
          <div className={styles.heroButtons}>
            <Link href="/demo" className={styles.btnPrimary}>
              Request a demo
            </Link>
            <Link href="/login" className={styles.btnSecondary}>
              Existing user login
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
