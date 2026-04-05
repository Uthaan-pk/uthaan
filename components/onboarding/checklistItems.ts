/**
 * Onboarding checklist definition.
 *
 * Each item has:
 *   - id:          unique key stored in localStorage
 *   - title:       short action label shown in the checklist
 *   - description: one sentence of context
 *   - href:        deep link to the relevant page
 *   - emoji:       simple visual marker (no icon library needed)
 */

export interface ChecklistItem {
  id: string
  title: string
  description: string
  href: string
  emoji: string
}

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'school_details',
    title: 'Add your school details',
    description: 'Set your school name, address, and logo.',
    href: '/admin',
    emoji: '🏫',
  },
  {
    id: 'first_teacher',
    title: 'Add your first teacher',
    description: 'Create a teacher account so staff can start using Uthaan.',
    href: '/admin/signups',
    emoji: '👩‍🏫',
  },
  {
    id: 'first_class',
    title: 'Create a class or section',
    description: 'Set up at least one class so you can assign students and teachers.',
    href: '/students',
    emoji: '📚',
  },
  {
    id: 'first_student',
    title: 'Add your first student',
    description: 'Enrol a student into a class to start tracking their progress.',
    href: '/admin',
    emoji: '👤',
  },
  {
    id: 'first_attendance',
    title: 'Take attendance',
    description: "Record today's attendance to see how the attendance system works.",
    href: '/attendance',
    emoji: '✅',
  },
  {
    id: 'first_fee',
    title: 'Record a fee payment',
    description: 'Add a fee record to start tracking what students owe and have paid.',
    href: '/fees',
    emoji: '💰',
  },
  {
    id: 'first_announcement',
    title: 'Send an announcement',
    description: 'Post a notice that teachers, students, and parents can see.',
    href: '/announcements',
    emoji: '📢',
  },
]

export const STORAGE_KEY = 'uthaan_onboarding_v1'
