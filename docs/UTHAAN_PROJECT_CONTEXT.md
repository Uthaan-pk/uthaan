## Anthropic API
- ANTHROPIC_API_KEY is set in Vercel environment variables (not in repo)
- Model in use: claude-haiku-4-5-20251001 for report comments and attendance alerts
- claude-sonnet-4-6 planned for student performance insights
- API credits are separate from Claude Pro subscription
- Cost per report comment: ~$0.001
- Batch API used for attendance alerts

## Audit Log
- Table: audit_logs
- lib/audit.ts exports writeAuditLog(supabase, params)
- Errors are swallowed — audit writes never block main flows
- Page exists at /admin/audit, linked in admin sidebar

## Seed Data (Demo School)
- school_id: a1b2c3d4-0000-0000-0000-000000000001
- islamiat.teacher user_id: d29e612a-b1da-4ee6-89ee-f8ac218115e8
- admin user_id: def8df30-a0b8-4c8c-8796-f1ad0e2feab7
- Demo students in Classes 4 and 5 with marks, attendance, fees
- Timetable periods for islamiat.teacher across Classes 4–8, Tue–Fri
- announcements.priority valid values: normal, important, urgent
- students.class_num constrained to 1–8