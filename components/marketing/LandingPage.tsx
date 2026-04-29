'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ChevronDown, ChevronRight, CheckCircle2, Minus, Clock } from 'lucide-react'
import { Instrument_Serif, JetBrains_Mono, Sora } from 'next/font/google'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useInView, useReducedMotion } from '@/lib/motion'
import styles from './LandingPage.module.css'

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-landing-sora',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-landing-mono',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: '400',
  variable: '--font-instrument-serif',
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
    setupFee: 'One-time setup: Rs. 20,000',
    students: 'Up to 250 students',
    features: ['Student records', 'Teacher accounts', 'Attendance', 'Fees', 'Announcements', 'Marks/results', 'Report cards', 'Basic support'],
    bestFor: 'Small schools starting digital operations',
    supportNote: 'Guided onboarding available for setup and first use.',
  },
  {
    plan: 'Growth',
    amount: 'Rs. 25,000',
    period: '/ month',
    setupFee: 'One-time setup: Rs. 35,000',
    students: 'Up to 700 students',
    features: ['Everything in Starter', 'Timetable', 'Assignments/homework', 'Parent/student access', 'Attendance summaries', 'Staff-only AI report comments', 'Attendance alert summaries', 'Guided onboarding support'],
    featured: true,
    bestFor: 'Growing private schools that want daily operations in one place',
    supportNote: 'Recommended for the founder pilot after the free period.',
  },
  {
    plan: 'Pro',
    amount: 'Rs. 50,000',
    period: '/ month',
    setupFee: 'One-time setup: Rs. 60,000',
    students: 'Up to 1,500 students',
    features: ['Everything in Growth', 'Priority support', 'Higher AI limits', 'Advanced admin reporting', 'Custom report card support', 'Additional training sessions'],
    bestFor: 'Larger schools needing more control and support',
    supportNote: 'Handled as a guided school rollout with additional training.',
  },
  {
    plan: 'Enterprise',
    amount: 'Custom pricing',
    period: '',
    setupFee: 'Setup scoped with your school',
    students: '1,500+ students',
    features: ['Multi-campus support', 'Custom workflows', 'Dedicated onboarding', 'Custom reporting', 'Future integration options'],
    bestFor: 'School groups and multi-campus institutions',
    supportNote: 'Rollout, reporting, and integration options are scoped directly.',
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

const roleStories = {
  admin: {
    label: 'Admin',
    eyebrow: 'School operations',
    title: 'Run the school from one cleaner control layer',
    body: 'School admins get visibility across attendance, fees, recorded payments, announcements, results, and staff-facing AI without jumping between scattered tools.',
    highlights: ['Fee tracking, receipt history, and defaulter visibility', 'Attendance oversight across classes', 'Announcements and results in the same system'],
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
  accountant: {
    label: 'Accountant',
    eyebrow: 'Fee workflow',
    title: 'Record fees, payments, and receipts without chasing admin',
    body: 'Accountants can create fees, record manual payments, upload proof, and keep admins informed with clean receipt history.',
    highlights: ['Create individual, class-wide, or school-wide fees', 'Record payment with proof or digital receipt', 'Admins see amount, receipt, and recorded-by details'],
    metrics: [
      ['Fees', 'Flexible'],
      ['Receipts', 'Clean'],
      ['Proof', 'Tracked'],
    ],
  },
  parent: {
    label: 'Parent',
    eyebrow: 'Family visibility',
    title: 'Parents get the updates they actually care about',
    body: 'Parents can stay informed with attendance, results, announcements, balances, and clean digital receipts through a simpler role-based experience.',
    highlights: ['Attendance visibility', 'Results access', 'Digital receipts and school announcements in one view'],
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

type FeatureCardKey = (typeof featureCards)[number]['key']
type RoleKey = keyof typeof roleStories
type SystemStoryKey = keyof typeof systemStories

// ── Dashboard card roster data ──────────────────────────────────────────────
const rosterStudents = [
  { initials: 'AK', name: 'Aisha Khan',   cls: 'Class 5-A', dot: 'Green'  },
  { initials: 'HM', name: 'Hamza Malik',  cls: 'Class 5-A', dot: 'Green'  },
  { initials: 'SR', name: 'Sara Raza',    cls: 'Class 5-B', dot: 'Amber'  },
  { initials: 'ZA', name: 'Zaid Ahmad',   cls: 'Class 5-A', dot: 'Red'    },
  { initials: 'NF', name: 'Noor Fatima',  cls: 'Class 5-B', dot: 'Green'  },
]

const AI_MESSAGE = 'Hamza shows steady improvement in mathematics this term.'

// ── Activity ticker data ─────────────────────────────────────────────────────
const tickerItems = [
  { action: 'AI comment drafted',        detail: 'Class 5',        time: 'just now' },
  { action: 'Fee marked paid',           detail: 'Lahore Grammar', time: '2m ago'   },
  { action: 'Attendance summary sent',   detail: '3 classes',      time: '5m ago'   },
]

// ── Compare table data ───────────────────────────────────────────────────────
type CellValue = 'yes' | 'no' | 'partial' | 'planned'

type CompareRow = {
  label: string
  uthaan: CellValue
  google: CellValue
  canvas: CellValue
  classDojo: CellValue
}

type CompetitorKey = 'google' | 'canvas' | 'classDojo'

const compareFeatures: CompareRow[] = [
  { label: 'Fee management',            uthaan: 'yes', google: 'no',      canvas: 'no',      classDojo: 'no'      },
  { label: 'Pakistan / local context',  uthaan: 'yes', google: 'no',      canvas: 'no',      classDojo: 'no'      },
  { label: 'AI report card comments',   uthaan: 'yes', google: 'no',      canvas: 'no',      classDojo: 'no'      },
  { label: 'Attendance alert summaries',uthaan: 'yes', google: 'no',      canvas: 'no',      classDojo: 'no'      },
  { label: 'WhatsApp parent alerts',    uthaan: 'planned', google: 'no',  canvas: 'no',      classDojo: 'no'      },
  { label: 'Role-based access (5 roles)',uthaan: 'yes', google: 'partial', canvas: 'yes',    classDojo: 'partial' },
  { label: 'Full audit log',            uthaan: 'yes', google: 'no',      canvas: 'yes',     classDojo: 'no'      },
  { label: 'Affordable for small schools',uthaan: 'yes', google: 'partial',canvas: 'no',     classDojo: 'partial' },
]

const competitors: { name: string; key: CompetitorKey }[] = [
  { name: 'Google Classroom', key: 'google'    },
  { name: 'Canvas',           key: 'canvas'    },
  { name: 'ClassDojo',        key: 'classDojo' },
]

function CompareCell({ value, isUthaan = false }: { value: CellValue; isUthaan?: boolean }) {
  if (value === 'yes')
    return (
      <span className={`${styles.compareCell} ${styles.compareCellYes} ${isUthaan ? styles.compareCellUthaan : ''}`}>
        <CheckCircle2 size={14} aria-hidden="true" /><span>Yes</span>
      </span>
    )
  if (value === 'no')
    return (
      <span className={`${styles.compareCell} ${styles.compareCellNo}`}>
        <Minus size={14} aria-hidden="true" /><span>No</span>
      </span>
    )
  if (value === 'planned')
    return (
      <span className={`${styles.compareCell} ${styles.compareCellPlanned}`}>
        <Clock size={14} aria-hidden="true" /><span>Planned</span>
      </span>
    )
  // partial
  return (
    <span className={`${styles.compareCell} ${styles.compareCellPartial}`}>
      <Clock size={14} aria-hidden="true" /><span>Partial</span>
    </span>
  )
}

// ── Role mock UI components ───────────────────────────────────────────────────

const adminOperations = [
  { name: 'Fee collection', cls: 'April ledger', amount: 'Rs. 642k', tag: 'Live' },
  { name: 'Attendance today', cls: '24 classes', amount: '91%', tag: 'Ready' },
  { name: 'Receipt review', cls: 'Recorded by staff', amount: '18', tag: 'Proof' },
  { name: 'Defaulters', cls: '3 classes flagged', amount: '12', tag: 'Due' },
]

function AdminMock({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(0)
  useEffect(() => {
    if (!active) {
      const timer = setTimeout(() => setVisible(0), 0)
      return () => clearTimeout(timer)
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      const timer = setTimeout(() => setVisible(adminOperations.length), 0)
      return () => clearTimeout(timer)
    }
    const timers = adminOperations.map((_, i) => setTimeout(() => setVisible(i + 1), 60 * i))
    return () => timers.forEach(clearTimeout)
  }, [active])
  return (
    <div className={styles.roleMock}>
      <div className={styles.roleMockHeader}>
        <span>School command center</span>
        <span className={`${styles.roleMockBadge} ${styles.roleMockBadgeGreen}`}>Today</span>
      </div>
      {adminOperations.map((d, i) => (
        <div
          key={d.name}
          className={`${styles.roleMockRow} ${i < visible ? styles.roleMockRowVisible : ''}`}
          style={{ '--mock-delay': `${i * 60}ms` } as CSSProperties}
        >
          <span className={styles.roleMockName}>{d.name}</span>
          <span className={styles.roleMockMeta}>{d.cls}</span>
          <span className={styles.roleMockAmount}>{d.amount}</span>
          <span className={d.tag === 'Due' ? styles.roleMockTag : styles.roleMockTagNeutral}>{d.tag}</span>
        </div>
      ))}
    </div>
  )
}

const teacherWorkRows = [
  { label: '08:00 Urdu', meta: 'Class 5-A', tag: 'Next' },
  { label: '08:45 English', meta: 'Class 6-B', tag: 'Period 2' },
  { label: '09:30 Science', meta: 'Class 7', tag: 'Period 3' },
  { label: 'Attendance', meta: 'Class 5-A · 38 present · 4 absent', tag: 'Marked' },
  { label: 'Marks entry', meta: 'English · 28 students', tag: 'Open' },
  { label: 'Assignment review', meta: '12 pending', tag: 'Review' },
  { label: 'AI report comments', meta: 'Staff only', tag: 'Draft' },
]

function TeacherMock({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(0)
  useEffect(() => {
    if (!active) {
      const timer = setTimeout(() => setVisible(0), 0)
      return () => clearTimeout(timer)
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      const timer = setTimeout(() => setVisible(teacherWorkRows.length), 0)
      return () => clearTimeout(timer)
    }
    const timers = teacherWorkRows.map((_, i) => setTimeout(() => setVisible(i + 1), 45 * i))
    return () => timers.forEach(clearTimeout)
  }, [active])
  return (
    <div className={styles.roleMock}>
      <div className={styles.roleMockHeader}>
        <span>Teacher workspace</span>
        <span className={`${styles.roleMockBadge} ${styles.roleMockBadgeGreen}`}>Today</span>
      </div>
      {teacherWorkRows.map((row, i) => (
        <div
          key={`${row.label}-${row.meta}`}
          className={`${styles.roleMockRow} ${styles.teacherScheduleRow} ${row.label.includes('AI') ? styles.teacherTaskRowAi : ''} ${i < visible ? styles.roleMockRowVisible : ''}`}
          style={{ '--mock-delay': `${i * 45}ms` } as CSSProperties}
        >
          <span className={styles.teacherTaskLabel}>{row.label}</span>
          <span className={styles.teacherTaskMeta}>{row.meta}</span>
          <span className={row.tag === 'Next' || row.tag === 'Draft' ? styles.roleMockTagGreen : styles.roleMockTagNeutral}>{row.tag}</span>
        </div>
      ))}
    </div>
  )
}

const accountantRows = [
  { name: 'Outstanding fees', cls: 'Across active classes', amount: 'Rs. 184,000', tag: 'Due' },
  { name: 'Payment recorded', cls: 'Class 5 · Digital receipt', amount: 'Rs. 12,000', tag: 'Receipt ready' },
  { name: 'Proof uploaded', cls: 'Bank slip · Admin can view', amount: 'Manual', tag: 'Proof' },
  { name: 'Bulk fee creation', cls: '128 students · 12 skipped duplicates', amount: 'School-wide', tag: 'Manual record' },
]

function AccountantMock({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(0)
  useEffect(() => {
    if (!active) {
      const timer = setTimeout(() => setVisible(0), 0)
      return () => clearTimeout(timer)
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      const timer = setTimeout(() => setVisible(accountantRows.length), 0)
      return () => clearTimeout(timer)
    }
    const timers = accountantRows.map((_, i) => setTimeout(() => setVisible(i + 1), 60 * i))
    return () => timers.forEach(clearTimeout)
  }, [active])
  return (
    <div className={styles.roleMock}>
      <div className={styles.roleMockHeader}>
        <span>Fee desk</span>
        <span className={`${styles.roleMockBadge} ${styles.roleMockBadgeGreen}`}>Manual record</span>
      </div>
      {accountantRows.map((row, i) => (
        <div
          key={row.name}
          className={`${styles.roleMockRow} ${styles.accountantRow} ${i < visible ? styles.roleMockRowVisible : ''}`}
          style={{ '--mock-delay': `${i * 60}ms` } as CSSProperties}
        >
          <span className={styles.roleMockName}>{row.name}</span>
          <span className={styles.roleMockMeta}>{row.cls}</span>
          <span className={styles.roleMockAmount}>{row.amount}</span>
          <span className={row.tag === 'Due' ? styles.roleMockTag : row.tag === 'Receipt ready' ? styles.roleMockTagGreen : styles.roleMockTagNeutral}>
            {row.tag}
          </span>
        </div>
      ))}
    </div>
  )
}

const parentNotifs = [
  { color: 'Green' as const, text: 'Hamza marked present',       time: '8:15 am'    },
  { color: 'Amber' as const, text: 'April balance: Rs. 2,400',   time: 'Yesterday'  },
  { color: 'Blue'  as const, text: 'Digital receipt available',  time: '2 days ago' },
  { color: 'Green' as const, text: 'Term 2 results published',   time: '2 days ago' },
]

function ParentMock({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(0)
  useEffect(() => {
    if (!active) {
      const timer = setTimeout(() => setVisible(0), 0)
      return () => clearTimeout(timer)
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      const timer = setTimeout(() => setVisible(parentNotifs.length), 0)
      return () => clearTimeout(timer)
    }
    const timers = parentNotifs.map((_, i) => setTimeout(() => setVisible(i + 1), 60 * i))
    return () => timers.forEach(clearTimeout)
  }, [active])
  return (
    <div className={styles.roleMock}>
      <div className={styles.roleMockHeader}>
        <span>Parent updates</span>
        <span className={`${styles.roleMockBadge} ${styles.roleMockBadgeBlue}`}>Clean view</span>
      </div>
      {parentNotifs.map((n, i) => (
        <div
          key={n.text}
          className={`${styles.roleMockRow} ${styles.parentNotifRow} ${i < visible ? styles.roleMockRowVisible : ''}`}
          style={{ '--mock-delay': `${i * 60}ms` } as CSSProperties}
        >
          <span className={`${styles.notifDot} ${styles[`notifDot${n.color}`]}`} aria-hidden="true" />
          <span className={styles.roleMockName}>{n.text}</span>
          <span className={styles.roleMockMeta}>{n.time}</span>
        </div>
      ))}
    </div>
  )
}

const studentSubjects = [
  { name: 'Maths',   score: 83 },
  { name: 'Science', score: 71 },
  { name: 'English', score: 90 },
  { name: 'Urdu',    score: 68 },
]
const studentTasks = [
  { name: 'English assignment', meta: 'Due Friday' },
  { name: 'Science material', meta: 'Chapter 4' },
]

function StudentMock({ active }: { active: boolean }) {
  const [widths, setWidths] = useState([0, 0, 0, 0])
  useEffect(() => {
    if (!active) {
      const timer = setTimeout(() => setWidths([0, 0, 0, 0]), 0)
      return () => clearTimeout(timer)
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      const timer = setTimeout(() => setWidths(studentSubjects.map((s) => s.score)), 0)
      return () => clearTimeout(timer)
    }
    const timers = studentSubjects.map((s, i) =>
      setTimeout(() => setWidths((prev) => { const next = [...prev]; next[i] = s.score; return next }), 60 * i)
    )
    return () => timers.forEach(clearTimeout)
  }, [active])
  return (
    <div className={styles.roleMock}>
      <div className={styles.roleMockHeader}>
        <span>Term 2 Results</span>
        <span className={`${styles.roleMockBadge} ${styles.roleMockBadgeGreen}`}>Published</span>
      </div>
      {studentSubjects.map((s, i) => (
        <div key={s.name} className={styles.studentSubjectRow}>
          <div className={styles.studentSubjectTop}>
            <span className={styles.teacherName}>{s.name}</span>
            <span className={`${styles.roleMockAmount} ${styles.mono}`}>
              {s.score}<span className={styles.roleMockMeta}>/100</span>
            </span>
          </div>
          <div className={styles.studentBarTrack}>
            <div
              className={styles.studentBarFill}
              style={{ width: `${widths[i]}%`, transitionDelay: `${i * 60}ms` }}
            />
          </div>
        </div>
      ))}
      <div className={styles.studentTaskGrid}>
        {studentTasks.map((task) => (
          <div key={task.name} className={styles.studentTaskCard}>
            <span className={styles.roleMockName}>{task.name}</span>
            <span className={styles.roleMockMeta}>{task.meta}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Animated dashboard card ──────────────────────────────────────────────────
function HeroDashboardCard() {
  const [visibleRows, setVisibleRows] = useState(0)
  const [feeCount, setFeeCount] = useState(0)
  const [typedText, setTypedText] = useState('')

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced) {
      setVisibleRows(rosterStudents.length)
      setFeeCount(12400)
      setTypedText(AI_MESSAGE)
      return
    }

    // Row 1: stagger each roster row in
    const rowTimers = rosterStudents.map((_, i) =>
      setTimeout(() => setVisibleRows(i + 1), 200 + i * 80)
    )

    // Row 2: count up fee via requestAnimationFrame
    const feeTarget = 12400
    const feeDuration = 1200
    const feeDelay = 600
    let rafId: number
    const origin = performance.now()

    const tick = (now: number) => {
      const elapsed = now - origin - feeDelay
      if (elapsed < 0) { rafId = requestAnimationFrame(tick); return }
      const progress = Math.min(elapsed / feeDuration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setFeeCount(Math.round(eased * feeTarget))
      if (progress < 1) rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    // Row 3: character-by-character typing
    let charIndex = 0
    let typeTimer: ReturnType<typeof setTimeout>

    const typeNext = () => {
      charIndex++
      setTypedText(AI_MESSAGE.slice(0, charIndex))
      if (charIndex < AI_MESSAGE.length) typeTimer = setTimeout(typeNext, 30)
    }
    const startTypeTimer = setTimeout(typeNext, 1100)

    return () => {
      rowTimers.forEach(clearTimeout)
      cancelAnimationFrame(rafId)
      clearTimeout(startTypeTimer)
      clearTimeout(typeTimer)
    }
  }, [])

  return (
    <div className={styles.heroDashCard}>
      {/* Browser chrome bar */}
      <div className={styles.dashChrome}>
        <div className={styles.dashDots} aria-hidden="true">
          <span /><span /><span />
        </div>
        <span className={`${styles.dashUrl} ${styles.mono}`}>uthaan.app / school workspace</span>
      </div>

      {/* Row 1: Attendance register */}
      <div className={styles.dashSection}>
        <div className={styles.dashLabel}>Class 5 · Attendance register</div>
        <div className={styles.rosterList}>
          {rosterStudents.map((s, i) => (
            <div
              key={s.initials}
              className={`${styles.rosterRow} ${i < visibleRows ? styles.rosterRowVisible : ''}`}
              style={{ '--row-delay': `${i * 80}ms` } as CSSProperties}
            >
              <span className={styles.rosterAvatar}>{s.initials}</span>
              <span className={styles.rosterName}>{s.name}</span>
              <span className={styles.rosterCls}>{s.cls}</span>
              <span className={`${styles.attendDot} ${styles[`dot${s.dot}`]}`} aria-label={s.dot} />
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: Fee collection */}
      <div className={styles.dashSection}>
        <div className={styles.dashLabel}>Fee collection · today</div>
        <div className={styles.feeRow}>
          <span className={`${styles.feeAmount} ${styles.mono}`}>
            Rs.&nbsp;{feeCount.toLocaleString('en-PK')}
          </span>
          <span className={styles.feeTag}>collected today</span>
        </div>
      </div>

      {/* Row 3: AI comment typing */}
      <div className={styles.dashSection}>
        <div className={styles.dashLabel}>AI comment draft · Hamza Malik</div>
        <div className={styles.aiTypingRow}>
          <span className={styles.aiIcon} aria-hidden="true">✦</span>
          <span className={styles.aiTypedText}>
            {typedText}
            <span className={styles.cursor} aria-hidden="true" />
          </span>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const featurePreviewRef = useRef<HTMLDivElement>(null)
  const roleSectionRef = useRef<HTMLElement>(null)
  const compareGridRef = useRef<HTMLDivElement>(null)
  const compareMobileRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const { ref: heroRef, isInView: heroInView } = useInView<HTMLDivElement>({
    threshold: 0.05,
    initialInView: true,
  })
  const { ref: pricingRef, isInView: pricingHasBeenSeen } = useInView<HTMLElement>({
    threshold: 0.25,
    once: true,
  })
  const { ref: footerRef, isInView: footerInView } = useInView<HTMLElement>({
    rootMargin: '0px 0px -10% 0px',
  })

  const [expandedPlan, setExpandedPlan] = useState<string | null>('Growth')
  const [activeSection, setActiveSection] = useState<string | null>('features')
  const [activeFeatureCard, setActiveFeatureCard] = useState<FeatureCardKey>('students')
  const [activeRole, setActiveRole] = useState<RoleKey>('admin')
  const [roleAutoPlay, setRoleAutoPlay] = useState(true)
  const [roleInView, setRoleInView] = useState(false)
  const [activeStory, setActiveStory] = useState<SystemStoryKey>('after')
  const [activeStoryChip, setActiveStoryChip] = useState<string>(systemStories.after.chips[0])
  const [tickerIndex, setTickerIndex] = useState(0)
  const [compareInView, setCompareInView] = useState(false)
  const [pulsedCol, setPulsedCol] = useState<string | null>(null)
  const [swipeHintDismissed, setSwipeHintDismissed] = useState(false)

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
    const sectionTargets = [
      { id: 'features', nav: 'features' },
      { id: 'ai', nav: 'ai' },
      { id: 'compare', nav: 'compare' },
      { id: 'pricing', nav: 'pricing' },
      { id: 'founder-preview', nav: 'founders' },
      { id: 'final-cta', nav: null },
    ]
    const sections = sectionTargets
      .map(({ id, nav }) => {
        const element = document.getElementById(id)
        return element ? { element, nav } : null
      })
      .filter((section): section is { element: HTMLElement; nav: string | null } => section !== null)

    const updateActiveSection = () => {
      const bandTop = window.innerHeight * 0.35
      const bandBottom = window.innerHeight * 0.55
      const visibleSections = sections
        .map((section) => {
          const rect = section.element.getBoundingClientRect()
          const overlap = Math.max(0, Math.min(rect.bottom, bandBottom) - Math.max(rect.top, bandTop))
          return { nav: section.nav, overlap }
        })
        .filter((section) => section.overlap > 0)

      if (visibleSections.some((section) => section.nav === null)) {
        setActiveSection(null)
        return
      }

      const visible = visibleSections.sort((a, b) => b.overlap - a.overlap)[0]

      setActiveSection(visible?.nav ?? null)
    }

    const observer = new IntersectionObserver(updateActiveSection,
      {
        rootMargin: '-35% 0px -45% 0px',
        threshold: [0.15, 0.4, 0.7],
      }
    )

    sections.forEach((section) => observer.observe(section.element))
    updateActiveSection()
    window.addEventListener('scroll', updateActiveSection, { passive: true })
    window.addEventListener('resize', updateActiveSection)

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', updateActiveSection)
      window.removeEventListener('resize', updateActiveSection)
    }
  }, [])

  useEffect(() => {
    setActiveStoryChip(systemStories[activeStory].chips[0])
  }, [activeStory])

  // Activity ticker rotation
  useEffect(() => {
    const id = setInterval(
      () => setTickerIndex((i) => (i + 1) % tickerItems.length),
      4000
    )
    return () => clearInterval(id)
  }, [])

  // Role section viewport detection
  useEffect(() => {
    const el = roleSectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setRoleInView(entry.isIntersecting),
      { threshold: 0.3 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Role auto-cycle (5s, pauses when not in view or user interacted)
  useEffect(() => {
    if (!roleInView || !roleAutoPlay) return
    const roleKeys = Object.keys(roleStories) as RoleKey[]
    const id = setInterval(() => {
      setActiveRole((cur) => {
        const idx = roleKeys.indexOf(cur)
        return roleKeys[(idx + 1) % roleKeys.length]
      })
    }, 5000)
    return () => clearInterval(id)
  }, [roleInView, roleAutoPlay])

  // Compare grid stagger reveal
  useEffect(() => {
    const el = compareGridRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setCompareInView(true) },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const staggerStyle = (index: number) =>
    ({
      '--stagger-delay': `${index * 90}ms`,
    }) as CSSProperties

  const activeFeaturePreview = featureCards.find((card) => card.key === activeFeatureCard) ?? featureCards[0]
  const activeRoleStory = roleStories[activeRole]
  const activeSystemStory = systemStories[activeStory]
  const showMobileCta = !heroInView && !roleInView && !footerInView

  return (
    <div
      className={`${styles.page} ${styles.sora} ${sora.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable}`}
    >
      <nav className={styles.nav}>
        <Link href="/" className={styles.navLogo} aria-label="Uthaan home">
          <Image
            src="/brand/uthaan-icon.svg"
            alt=""
            width={30}
            height={30}
            className={styles.navLogoIcon}
            priority
          />
          <span className={styles.navLogoWord}>Uthaan</span>
        </Link>
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
          <li>
            <Link href="/founders" className={activeSection === 'founders' ? styles.navLinkActive : ''}>Founders</Link>
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

      <div ref={heroRef} className={styles.hero}>
        {/* SVG grain overlay — fixed, pointer-events none */}
        <svg aria-hidden="true" className={styles.heroGrain}>
          <filter id="hero-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#hero-grain)" />
        </svg>

        <div className={`${styles.heroBadge} ${styles.mono}`}>Pilot programme open — April 2026</div>

        <h1>
          School software, built for
          <br />
          the schools{' '}
          <em className={styles.serifItalic}>we know.</em>
        </h1>

        <p>
          Uthaan is a calmer operating system for Pakistani private schools — attendance, fees,
          results, announcements, and staff AI in one role-aware platform.
        </p>

        <div className={styles.heroButtons}>
          <Link href="/demo" className={styles.btnPrimary}>
            Request a demo
          </Link>
          <a href="#features" className={styles.btnSecondary}>
            See features
          </a>
        </div>

        <div className={styles.heroDashWrap}>
          <HeroDashboardCard />
        </div>
      </div>

      {/* Activity ticker */}
      <div className={styles.activityTicker} aria-live="polite" aria-atomic="true">
        <div className={styles.tickerTrack}>
          {tickerItems.map((item, i) => (
            <div
              key={item.action}
              className={`${styles.tickerItem} ${i === tickerIndex ? styles.tickerItemActive : ''}`}
              aria-hidden={i !== tickerIndex}
            >
              <span className={styles.tickerAction}>{item.action}</span>
              <span className={styles.tickerSep} aria-hidden="true">·</span>
              <span className={styles.tickerDetail}>{item.detail}</span>
              <span className={styles.tickerSep} aria-hidden="true">·</span>
              <span className={styles.tickerTime}>{item.time}</span>
            </div>
          ))}
        </div>
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

      <section
        ref={roleSectionRef}
        className={`${styles.section} ${styles.fadeIn}`}
        onPointerDown={() => setRoleAutoPlay(false)}
      >
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
                onClick={() => { setActiveRole(key); setRoleAutoPlay(false) }}
              >
                {role.label}
                {activeRole === key && roleAutoPlay && (
                  <span key={`${key}-bar`} className={styles.roleTabProgress} aria-hidden="true" />
                )}
              </button>
            ))}
          </div>

          <div key={activeRole} className={`${styles.roleStoryPanel} ${styles.roleContentEnter}`}>
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
              {activeRole === 'admin'   && <AdminMock   active />}
              {activeRole === 'teacher' && <TeacherMock active />}
              {activeRole === 'accountant' && <AccountantMock active />}
              {activeRole === 'parent'  && <ParentMock  active />}
              {activeRole === 'student' && <StudentMock active />}
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

      <div className={styles.midpageCta}>
        <span className={styles.midpageCtaText}>
          Ready to move your school onto one platform?
        </span>
        <Link href="/demo" className={styles.btnPrimary}>
          Request a demo
        </Link>
      </div>

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

        {/* Desktop grid */}
        <div
          ref={compareGridRef}
          className={`${styles.compareGrid} ${compareInView ? styles.compareGridVisible : ''}`}
        >
          <div className={styles.compareHeaderRow}>
            <div className={styles.compareFeatureCol} />
            {['Uthaan', 'Google Classroom', 'Canvas', 'ClassDojo'].map((col, i) => (
              <div key={col} className={`${styles.compareColHeader} ${i === 0 ? styles.compareColHeaderUthaan : ''}`}>
                {col}
              </div>
            ))}
          </div>
          {compareFeatures.map((row, i) => (
            <div
              key={row.label}
              className={styles.compareRow}
              style={{ '--row-i': i } as CSSProperties}
            >
              <div className={styles.compareFeatureLabel}>{row.label}</div>
              <CompareCell value={row.uthaan} isUthaan />
              <CompareCell value={row.google} />
              <CompareCell value={row.canvas} />
              <CompareCell value={row.classDojo} />
            </div>
          ))}
        </div>

        {/* Mobile comparison cards */}
        <div className={styles.compareMobileCards}>
          <div className={styles.compareMobileSummaryCard}>
            <div className={styles.compareMobileCardKicker}>Uthaan advantage</div>
            <h3>Start with the workflows Pakistani private schools ask for first</h3>
            <div className={styles.compareMobileSummaryList}>
              {compareFeatures.slice(0, 4).map((feature) => (
                <div key={feature.label} className={styles.compareMobileSummaryRow}>
                  <span>{feature.label}</span>
                  <CompareCell value={feature.uthaan} isUthaan />
                </div>
              ))}
            </div>
          </div>

          {competitors.map((comp) => (
            <div key={comp.name} className={styles.compareMobileCard}>
              <div className={styles.compareMobileCardHeader}>
                <span>Compared with</span>
                <strong>{comp.name}</strong>
              </div>
              <div className={styles.compareMobileLegend}>
                <span>Uthaan</span>
                <span>{comp.name}</span>
              </div>
              <div className={styles.compareMobileCardRows}>
                {compareFeatures.map((feature) => (
                  <div key={feature.label} className={styles.compareMobileCardRow}>
                    <span className={styles.compareMobileCardFeature}>{feature.label}</span>
                    <div className={styles.compareMobileCardCells}>
                      <CompareCell value={feature.uthaan} isUthaan />
                      <CompareCell value={feature[comp.key]} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile swipe layout */}
        <div
          ref={compareMobileRef}
          className={styles.compareMobileScroll}
          onScroll={() => setSwipeHintDismissed(true)}
        >
          {!swipeHintDismissed && (
            <div className={styles.swipeHint} aria-hidden="true">swipe →</div>
          )}
          <div className={styles.compareMobileUthaanCol}>
            <div className={`${styles.compareMobileColHeader} ${styles.compareMobileColHeaderUthaan}`}>
              Uthaan
            </div>
            {compareFeatures.map((f) => (
              <div key={f.label} className={styles.compareMobileRow}>
                <span className={styles.compareMobileFeatureLabel}>{f.label}</span>
                <CompareCell value={f.uthaan} isUthaan />
              </div>
            ))}
          </div>
          {competitors.map((comp) => (
            <div
              key={comp.name}
              className={`${styles.compareMobileCompetitorCol} ${pulsedCol === comp.name ? styles.compareMobileColPulse : ''}`}
              onClick={() => {
                setPulsedCol(comp.name)
                setTimeout(() => setPulsedCol(null), 400)
              }}
            >
              <div className={styles.compareMobileColHeader}>{comp.name}</div>
              {compareFeatures.map((f) => (
                <div key={f.label} className={styles.compareMobileRow}>
                  <CompareCell value={f[comp.key]} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section ref={pricingRef} id="pricing" className={`${styles.section} ${styles.fadeIn}`}>
        <div className={`${styles.sectionTag} ${styles.mono}`}>Pricing</div>
        <h2 className={styles.sectionTitle}>Simple, transparent pricing</h2>
        <p className={styles.sectionSub}>
          Start with 2 months free. For selected early schools, Uthaan begins with a guided pilot:
          Rs. 20,000 setup, 2 months free, then Rs. 25,000/month if your school continues.
        </p>
        <div className={styles.pricingPilotNote}>There is no self-serve signup yet — your school is set up with guided onboarding.</div>
        <div className={styles.founderPilotBox}>
          <div>
            <div className={styles.founderPilotEyebrow}>Founder Pilot Offer</div>
            <div className={styles.founderPilotOffer}>Rs. 20,000 setup + 2 months free</div>
            <p>
              After the free pilot, continue on the Growth plan at Rs. 25,000/month only if Uthaan
              is working for your school.
            </p>
          </div>
          <div className={styles.founderPilotSupport}>
            Includes guided setup, admin handoff, teacher onboarding, student import support, and
            first-week activation help.
          </div>
        </div>

        <div className={styles.pricingGrid}>
          {pricingCards.map((card, index) => {
            const isExpanded = expandedPlan === card.plan
            return (
              <div
                key={card.plan}
                className={`${styles.priceCard} ${styles.staggerItem} ${card.featured ? styles.featured : styles.priceCardHover}`}
                style={staggerStyle(index)}
                role="button"
                tabIndex={0}
                onClick={() => setExpandedPlan(isExpanded ? null : card.plan)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setExpandedPlan(isExpanded ? null : card.plan)
                  }
                }}
                aria-expanded={isExpanded}
              >
                {card.featured ? (
                  <div
                    className={`${styles.featuredBadge} ${pricingHasBeenSeen && !reducedMotion ? styles.featuredBadgePulse : ''}`}
                  >
                    Recommended
                  </div>
                ) : null}
                <ChevronDown
                  size={15}
                  className={`${styles.priceCardChevron} ${isExpanded ? styles.priceCardChevronExpanded : ''}`}
                />
                <div className={styles.pricePlan}>{card.plan}</div>
                <div className={`${styles.priceAmount} ${styles.mono}`}>{card.amount}</div>
                <div className={styles.pricePeriod}>{card.period}</div>
                <div className={styles.priceSetupLine}>{card.setupFee}</div>
                <div className={styles.priceStudents}>{card.students}</div>
                <div className={styles.priceBestFor}>{card.bestFor}</div>
                <ul className={styles.priceFeatures}>
                  {card.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <div className={`${styles.planContext} ${isExpanded ? styles.planContextExpanded : ''}`}>
                  <div className={styles.planContextSep} />
                  <div className={styles.planContextBlock}>
                    <div className={styles.planContextLabel}>Guided onboarding</div>
                    <div className={styles.planContextText}>{card.supportNote}</div>
                  </div>
                </div>
                <Link
                  href={`/demo?plan=${card.plan.toLowerCase()}`}
                  onClick={(event) => event.stopPropagation()}
                  className={`${styles.priceCta} ${card.featured ? styles.featuredPriceCta : styles.priceCtaOutline}`}
                >
                  {card.plan === 'Enterprise' ? 'Talk to us' : 'Request demo'}
                  <ChevronRight size={14} />
                </Link>
              </div>
            )
          })}
        </div>
      </section>

      <section id="founder-preview" className={`${styles.founderPreviewSection} ${styles.fadeIn}`} aria-labelledby="founder-preview-title">
        <div className={styles.founderPreviewCard}>
          <div className={styles.founderPreviewCopy}>
            <div className={`${styles.sectionTag} ${styles.mono}`}>Founder story</div>
            <h2 id="founder-preview-title">Built from inside Pakistani schools</h2>
            <p>
              Uthaan started from a simple problem: schools had attendance, fees, results, and
              parent communication scattered across registers, WhatsApp, and Excel. We are building
              a cleaner way for school owners, admins, teachers, accountants, parents, and students
              to stay aligned.
            </p>
          </div>
          <Link href="/founders" className={styles.founderPreviewLink}>
            Read the founder story
            <ChevronRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <div id="final-cta" className={`${styles.ctaSection} ${styles.fadeIn}`}>
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

      <div className={`${styles.mobileStickyCta} ${showMobileCta ? styles.mobileStickyCtaVisible : ''}`}>
        <Link href="/demo" className={styles.mobileStickyPrimary}>
          Request demo
        </Link>
        <Link href="/login" className={styles.mobileStickySecondary}>
          Existing users
        </Link>
      </div>

      <footer ref={footerRef} className={styles.footer}>
        <p>Uthaan — School management, simplified &nbsp;·&nbsp; uthaan-one.vercel.app</p>
      </footer>
    </div>
  )
}
