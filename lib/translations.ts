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
  },
}
