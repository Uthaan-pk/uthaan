import {
  LayoutDashboard,
  Users,
  Megaphone,
  ClipboardList,
  BookOpen,
  FileText,
  CalendarCheck,
  HelpCircle,
  Clock,
  FolderOpen,
  CreditCard,
  BarChart2,
  Shield,
  UserPlus,
  CalendarOff,
  ScrollText,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export type Role = 'teacher' | 'admin' | 'student' | 'parent'

export type PageEntry = {
  id: string
  label: string
  description?: string
  href: string
  icon: LucideIcon
  roles: Role[]
  keywords?: string[]
  category: 'page' | 'action'
}

const all: Role[] = ['teacher', 'admin', 'student', 'parent']
const staff: Role[] = ['teacher', 'admin']
const teacherOnly: Role[] = ['teacher']
const adminOnly: Role[] = ['admin']
const parentOnly: Role[] = ['parent']
const notAdmin: Role[] = ['teacher', 'student', 'parent']
const feeRoles: Role[] = ['admin', 'student', 'parent']

export const PAGE_INDEX: PageEntry[] = [
  // ── Core pages ─────────────────────────────────────────────────────────────
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Overview and key metrics',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: all,
    keywords: ['home', 'overview', 'summary'],
    category: 'page',
  },
  {
    id: 'students',
    label: 'Students',
    description: 'View and manage student records',
    href: '/students',
    icon: Users,
    roles: staff,
    keywords: ['pupils', 'roster', 'list'],
    category: 'page',
  },
  {
    id: 'my-child',
    label: 'My Child',
    description: "View your child's progress and records",
    href: '/my-child',
    icon: Users,
    roles: parentOnly,
    keywords: ['child', 'ward', 'student', 'son', 'daughter'],
    category: 'page',
  },
  {
    id: 'announcements',
    label: 'Announcements',
    description: 'School news and notices',
    href: '/announcements',
    icon: Megaphone,
    roles: all,
    keywords: ['news', 'notice', 'updates', 'bulletin'],
    category: 'page',
  },
  {
    id: 'assignments',
    label: 'Assignments',
    description: 'Homework and assignment board',
    href: '/assignments',
    icon: ClipboardList,
    roles: notAdmin,
    keywords: ['homework', 'tasks', 'work', 'due'],
    category: 'page',
  },
  {
    id: 'marks',
    label: 'Gradebook',
    description: 'Enter and view marks',
    href: '/marks',
    icon: BookOpen,
    roles: all,
    keywords: ['grades', 'scores', 'marks', 'enter marks', 'gradebook'],
    category: 'page',
  },
  {
    id: 'results',
    label: 'Results',
    description: 'Report cards and result sheets',
    href: '/results',
    icon: FileText,
    roles: all,
    keywords: ['report card', 'transcript', 'performance', 'report'],
    category: 'page',
  },
  {
    id: 'attendance',
    label: 'Attendance',
    description: 'Track and view daily attendance',
    href: '/attendance',
    icon: CalendarCheck,
    roles: all,
    keywords: ['present', 'absent', 'daily', 'roll call'],
    category: 'page',
  },
  {
    id: 'quizzes',
    label: 'Quizzes',
    description: 'Quizzes and assessments',
    href: '/quizzes',
    icon: HelpCircle,
    roles: notAdmin,
    keywords: ['test', 'assessment', 'exam', 'mcq'],
    category: 'page',
  },
  {
    id: 'timetable',
    label: 'Timetable',
    description: 'Class schedule and periods',
    href: '/timetable',
    icon: Clock,
    roles: all,
    keywords: ['schedule', 'periods', 'classes', 'timing'],
    category: 'page',
  },
  {
    id: 'materials',
    label: 'Materials',
    description: 'Course resources and files',
    href: '/materials',
    icon: FolderOpen,
    roles: notAdmin,
    keywords: ['resources', 'files', 'documents', 'notes', 'syllabus'],
    category: 'page',
  },
  {
    id: 'fees',
    label: 'Fees',
    description: 'Fee management and receipts',
    href: '/fees',
    icon: CreditCard,
    roles: feeRoles,
    keywords: ['payment', 'invoice', 'dues', 'challan', 'receipt'],
    category: 'page',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'School performance insights',
    href: '/analytics',
    icon: BarChart2,
    roles: staff,
    keywords: ['reports', 'data', 'statistics', 'insights', 'charts'],
    category: 'page',
  },

  // ── Admin section ───────────────────────────────────────────────────────────
  {
    id: 'admin',
    label: 'Student Management',
    description: 'Manage enrolled students',
    href: '/admin',
    icon: Shield,
    roles: adminOnly,
    keywords: ['manage students', 'admin panel', 'bulk import'],
    category: 'page',
  },
  {
    id: 'admin-signups',
    label: 'Onboarding',
    description: 'Manage new user signups',
    href: '/admin/signups',
    icon: UserPlus,
    roles: adminOnly,
    keywords: ['signup', 'new users', 'registration', 'invite'],
    category: 'page',
  },
  {
    id: 'admin-leaves',
    label: 'Leave Management',
    description: 'Approve or reject leave requests',
    href: '/admin/leaves',
    icon: CalendarOff,
    roles: adminOnly,
    keywords: ['leave', 'absence', 'requests', 'approve'],
    category: 'page',
  },
  {
    id: 'admin-audit',
    label: 'Audit Log',
    description: 'View system activity trail',
    href: '/admin/audit',
    icon: ScrollText,
    roles: adminOnly,
    keywords: ['history', 'log', 'activity', 'trail'],
    category: 'page',
  },
  {
    id: 'grade-settings',
    label: 'Grade Settings',
    description: 'Configure grading scales and boundaries',
    href: '/grade-settings',
    icon: Settings,
    roles: adminOnly,
    keywords: ['grading', 'scale', 'configuration', 'grade boundary'],
    category: 'page',
  },

  // ── Quick actions ───────────────────────────────────────────────────────────
  {
    id: 'action-take-attendance',
    label: 'Take Attendance',
    description: "Record today's student attendance",
    href: '/attendance',
    icon: CalendarCheck,
    roles: teacherOnly,
    keywords: ['mark present', 'record attendance', 'daily attendance'],
    category: 'action',
  },
  {
    id: 'action-post-announcement',
    label: 'Post Announcement',
    description: 'Publish a new school notice',
    href: '/announcements',
    icon: Megaphone,
    roles: staff,
    keywords: ['new notice', 'publish', 'broadcast'],
    category: 'action',
  },
  {
    id: 'action-enter-marks',
    label: 'Enter Marks',
    description: 'Record exam or assignment marks',
    href: '/marks',
    icon: BookOpen,
    roles: teacherOnly,
    keywords: ['record marks', 'grade students', 'marks entry'],
    category: 'action',
  },
  {
    id: 'action-generate-results',
    label: 'Generate Results',
    description: 'Generate and download report cards',
    href: '/results',
    icon: FileText,
    roles: staff,
    keywords: ['print results', 'report cards', 'download pdf'],
    category: 'action',
  },
  {
    id: 'action-import-students',
    label: 'Import Students',
    description: 'Bulk import student records via CSV',
    href: '/admin',
    icon: Shield,
    roles: adminOnly,
    keywords: ['bulk import', 'csv upload', 'add students'],
    category: 'action',
  },
  {
    id: 'action-view-fees',
    label: 'View Fee Dues',
    description: 'Check outstanding fee balances',
    href: '/fees',
    icon: CreditCard,
    roles: feeRoles,
    keywords: ['outstanding dues', 'fee balance', 'pending'],
    category: 'action',
  },
  {
    id: 'action-approve-leaves',
    label: 'Approve Leaves',
    description: 'Review pending leave requests',
    href: '/admin/leaves',
    icon: CalendarOff,
    roles: adminOnly,
    keywords: ['leave approval', 'pending leaves', 'absent requests'],
    category: 'action',
  },
]

export function getEntriesForRole(role: string, category: 'page' | 'action') {
  return PAGE_INDEX.filter(
    (e) => e.category === category && e.roles.includes(role as Role)
  )
}
