export type Language = 'en' | 'ur'

export type TranslationKeys =
  | 'dashboard'
  | 'students'
  | 'myChild'
  | 'announcements'
  | 'main'
  | 'academic'
  | 'assignments'
  | 'gradebook'
  | 'attendance'
  | 'quizzes'
  | 'timetable'
  | 'materials'
  | 'fees'
  | 'gradeSettings'
  | 'admin'
  | 'adminPanel'
  | 'schoolSignups'
  | 'signOut'
  | 'schoolManagement'
  | 'toGrade'
  | 'allCaughtUp'
  | 'dueToday'
  | 'assignment'
  | 'view'
  | 'liveQuizzes'
  | 'studentsActiveNow'
  | 'marked'
  | 'viewRecords'
  | 'totalStudents'
  | 'postAnnouncement'
  | 'viewAllStudents'
  | 'recentAnnouncements'
  | 'welcomeToUthaan'
  | 'springTerm2026'
  | 'noChildLinkedYet'
  | 'contactSchoolAdministrator'
  | 'studentRecordNotFound'
  | 'overallRate'
  | 'averageMark'
  | 'acrossAllSubjects'
  | 'assignmentsFor'
  | 'myAverage'
  | 'viewGradebook'
  | 'submitNow'
  | 'allClear'
  | 'timetableView'
  | 'viewSchedule'
  | 'checkActive'
  | 'gradeNow'
  | 'notMarkedToday'
  | 'markNow'
  | 'noneActive'
  | 'todaySchedule'
  | 'period'
  | 'noPeriods'
  | 'upcomingQuizzes'
  | 'activeNow'
  | 'dueTomorrow'
  | 'attendanceStatus'
  | 'present'
  | 'absent'
  | 'late'
  | 'notRecorded'
  | 'todayOverview'
  | 'homeworkDue'
  | 'analytics'

export const translations: Record<Language, Record<TranslationKeys, string>> = {
  en: {
    dashboard: 'Dashboard',
    students: 'Students',
    myChild: 'My Child',
    announcements: 'Announcements',
    main: 'Main',
    academic: 'Academic',
    assignments: 'Assignments',
    gradebook: 'Gradebook',
    attendance: 'Attendance',
    quizzes: 'Quizzes',
    timetable: 'Timetable',
    materials: 'Materials',
    fees: 'Fees',
    gradeSettings: 'Grade Settings',
    admin: 'Admin',
    adminPanel: 'Admin Panel',
    schoolSignups: 'School Signups',
    signOut: 'Sign out',
    schoolManagement: 'School Management',
    toGrade: 'To Grade',
    allCaughtUp: 'All caught up',
    dueToday: 'Due Today',
    assignment: 'assignment',
    view: 'View',
    liveQuizzes: 'Live Quizzes',
    studentsActiveNow: 'Students active now',
    marked: 'Marked',
    viewRecords: 'View records',
    totalStudents: 'Total Students',
    postAnnouncement: 'Post announcement',
    viewAllStudents: 'View all students',
    recentAnnouncements: 'Recent Announcements',
    welcomeToUthaan: 'Welcome to Uthaan!',
    springTerm2026: 'Spring Term 2026',
    noChildLinkedYet: 'No child linked yet',
    contactSchoolAdministrator: 'Contact the school administrator.',
    studentRecordNotFound: 'Student record not found',
    overallRate: 'Overall rate',
    averageMark: 'Average Mark',
    acrossAllSubjects: 'Across all subjects',
    assignmentsFor: 'Assignments for',
    myAverage: 'My Average',
    viewGradebook: 'View gradebook',
    submitNow: 'Submit now',
    allClear: 'All clear',
    timetableView: 'Timetable',
    viewSchedule: 'View schedule',
    checkActive: 'Check active',
    gradeNow: 'Grade now',
    notMarkedToday: 'Not marked today',
    markNow: 'Mark now',
    noneActive: 'None active',
    todaySchedule: "Today's Schedule",
    period: 'Period',
    noPeriods: 'No classes today',
    upcomingQuizzes: 'Upcoming Quizzes',
    activeNow: 'Active now',
    dueTomorrow: 'Due tomorrow',
    attendanceStatus: 'Attendance',
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
    notRecorded: 'Not recorded yet',
    todayOverview: 'Today',
    homeworkDue: 'Homework Due',
    analytics: 'Analytics',
  },
  ur: {
    dashboard: 'ڈیش بورڈ',
    students: 'طلبہ',
    myChild: 'میرا بچہ',
    announcements: 'اعلانات',
    main: 'اہم',
    academic: 'تعلیمی',
    assignments: 'اسائنمنٹس',
    gradebook: 'گریڈ بک',
    attendance: 'حاضری',
    quizzes: 'کوئزز',
    timetable: 'ٹائم ٹیبل',
    materials: 'مواد',
    fees: 'فیس',
    gradeSettings: 'گریڈ سیٹنگز',
    admin: 'ایڈمن',
    adminPanel: 'ایڈمن پینل',
    schoolSignups: 'اسکول سائن اپس',
    signOut: 'سائن آؤٹ',
    schoolManagement: 'اسکول مینجمنٹ',
    toGrade: 'گریڈ کرنے کے لیے',
    allCaughtUp: 'سب مکمل ہے',
    dueToday: 'آج واجب الادا',
    assignment: 'اسائنمنٹ',
    view: 'دیکھیں',
    liveQuizzes: 'لائیو کوئزز',
    studentsActiveNow: 'طلبہ اس وقت فعال ہیں',
    marked: 'حاضر',
    viewRecords: 'ریکارڈ دیکھیں',
    totalStudents: 'کل طلبہ',
    postAnnouncement: 'اعلان پوسٹ کریں',
    viewAllStudents: 'تمام طلبہ دیکھیں',
    recentAnnouncements: 'حالیہ اعلانات',
    welcomeToUthaan: 'اُٹھان میں خوش آمدید!',
    springTerm2026: 'بہار سمسٹر 2026',
    noChildLinkedYet: 'ابھی کوئی بچہ منسلک نہیں ہے',
    contactSchoolAdministrator: 'اسکول ایڈمنسٹریٹر سے رابطہ کریں۔',
    studentRecordNotFound: 'طالب علم کا ریکارڈ نہیں ملا',
    overallRate: 'مجموعی شرح',
    averageMark: 'اوسط نمبر',
    acrossAllSubjects: 'تمام مضامین میں',
    assignmentsFor: 'کے لیے اسائنمنٹس',
    myAverage: 'میرا اوسط',
    viewGradebook: 'گریڈ بک دیکھیں',
    submitNow: 'ابھی جمع کریں',
    allClear: 'سب ٹھیک ہے',
    timetableView: 'ٹائم ٹیبل',
    viewSchedule: 'شیڈول دیکھیں',
    checkActive: 'فعال کوئزز دیکھیں',
    gradeNow: 'ابھی گریڈ کریں',
    notMarkedToday: 'آج حاضری نہیں لگی',
    markNow: 'ابھی نشان لگائیں',
    noneActive: 'کوئی فعال نہیں',
    todaySchedule: 'آج کا شیڈول',
    period: 'پیریڈ',
    noPeriods: 'آج کوئی کلاس نہیں',
    upcomingQuizzes: 'آنے والے کوئزز',
    activeNow: 'ابھی فعال',
    dueTomorrow: 'کل واجب الادا',
    attendanceStatus: 'حاضری',
    present: 'حاضر',
    absent: 'غیر حاضر',
    late: 'دیر سے آئے',
    notRecorded: 'ابھی درج نہیں',
    todayOverview: 'آج',
    homeworkDue: 'ہوم ورک',
    analytics: 'تجزیہ',
  },
}
