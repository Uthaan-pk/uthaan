export type HelpVideo = {
  title: string
  youtubeId: string
  description: string
}

export const HELP_VIDEOS: Record<string, HelpVideo> = {
  attendance: {
    title: 'How to Mark Attendance',
    youtubeId: 'PLACEHOLDER',
    description:
      'Learn how to take daily attendance, mark students present, absent, late, or excused, and view the attendance history for your class.',
  },
  marks: {
    title: 'How to Enter Marks',
    youtubeId: 'PLACEHOLDER',
    description:
      'A walkthrough of the gradebook — entering exam marks, assignment scores, and reviewing weighted averages per subject and class.',
  },
  'report-comments': {
    title: 'How to Generate Report Card Comments',
    youtubeId: 'PLACEHOLDER',
    description:
      'Use the AI comment generator to create personalised report card remarks for each student. Select a class, review the drafts, and download the final report cards.',
  },
  'students-import': {
    title: 'How to Import & Manage Students',
    youtubeId: 'PLACEHOLDER',
    description:
      'Bulk-import students from a CSV file, manage existing records, archive leavers, and link parents to their children.',
  },
  announcements: {
    title: 'How to Post Announcements',
    youtubeId: 'PLACEHOLDER',
    description:
      'Create and publish school-wide or class-specific announcements with priority levels. Learn how parents and students receive and acknowledge notices.',
  },
  timetable: {
    title: 'How to Read the Timetable',
    youtubeId: 'PLACEHOLDER',
    description:
      'Navigate the weekly timetable, understand period assignments, and see which teacher covers each class and subject.',
  },
  fees: {
    title: 'How to Manage Fees',
    youtubeId: 'PLACEHOLDER',
    description:
      'Assign fee records to students, mark payments as received, download receipts, and track outstanding balances by class or term.',
  },
  materials: {
    title: 'How to Upload & Find Materials',
    youtubeId: 'PLACEHOLDER',
    description:
      'Upload course notes, past papers, and resources. Learn how materials are organised by class and subject so students find the right files.',
  },
  'dashboard-teacher': {
    title: 'Teacher Dashboard Overview',
    youtubeId: 'PLACEHOLDER',
    description:
      "Your morning briefing — today's classes, pending assignments to review, recent attendance flags, and quick links to the most common tasks.",
  },
  'dashboard-admin': {
    title: 'Admin Dashboard Overview',
    youtubeId: 'PLACEHOLDER',
    description:
      'The control centre for school administrators — active student counts, fee collection status, attendance alerts, and pending leave requests at a glance.',
  },
  'dashboard-parent': {
    title: 'Parent Dashboard Overview',
    youtubeId: 'PLACEHOLDER',
    description:
      "A snapshot of your child's school day — attendance record, latest marks, upcoming assignments, and recent school announcements.",
  },
}
