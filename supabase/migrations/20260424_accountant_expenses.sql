-- =========================================================
-- Accountant role, petty expenses workflow, student risk alerts
-- =========================================================

-- =========================================================
-- 1. petty_expenses table
-- =========================================================

create table if not exists petty_expenses (
  id               uuid        primary key default gen_random_uuid(),
  school_id        uuid        not null references schools(id) on delete cascade,
  created_by       uuid        not null references auth.users(id),
  title            text        not null,
  category         text        not null,
  amount           numeric     not null,
  expense_date     date        not null default current_date,
  vendor           text,
  description      text,
  status           text        not null default 'pending_approval',
  approved_by      uuid        references auth.users(id),
  approved_at      timestamptz,
  rejection_reason text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint petty_expenses_amount_check  check (amount >= 0),
  constraint petty_expenses_status_check  check (
    status in ('pending_approval', 'approved', 'rejected', 'paid')
  )
);

create index if not exists petty_expenses_school_idx
  on petty_expenses(school_id);

create index if not exists petty_expenses_school_status_idx
  on petty_expenses(school_id, status);

create index if not exists petty_expenses_school_date_idx
  on petty_expenses(school_id, expense_date desc);

alter table petty_expenses enable row level security;

-- Superadmin: full access to all schools
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'petty_expenses' and policyname = 'superadmin_all_petty_expenses'
  ) then
    execute $policy$
      create policy "superadmin_all_petty_expenses"
        on petty_expenses
        for all
        to authenticated
        using (
          exists (
            select 1 from user_roles
            where user_id = auth.uid() and role = 'superadmin'
          )
        )
        with check (
          exists (
            select 1 from user_roles
            where user_id = auth.uid() and role = 'superadmin'
          )
        )
    $policy$;
  end if;
end $$;

-- Admin: read all expenses in own school
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'petty_expenses' and policyname = 'admin_read_school_petty_expenses'
  ) then
    execute $policy$
      create policy "admin_read_school_petty_expenses"
        on petty_expenses
        for select
        to authenticated
        using (
          school_id in (
            select school_id from user_roles
            where user_id = auth.uid() and role = 'admin'
          )
        )
    $policy$;
  end if;
end $$;

-- Admin: update (approve/reject) expenses in own school
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'petty_expenses' and policyname = 'admin_update_school_petty_expenses'
  ) then
    execute $policy$
      create policy "admin_update_school_petty_expenses"
        on petty_expenses
        for update
        to authenticated
        using (
          school_id in (
            select school_id from user_roles
            where user_id = auth.uid() and role = 'admin'
          )
        )
        with check (
          school_id in (
            select school_id from user_roles
            where user_id = auth.uid() and role = 'admin'
          )
        )
    $policy$;
  end if;
end $$;

-- Accountant: insert expenses for own school
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'petty_expenses' and policyname = 'accountant_insert_petty_expenses'
  ) then
    execute $policy$
      create policy "accountant_insert_petty_expenses"
        on petty_expenses
        for insert
        to authenticated
        with check (
          school_id in (
            select school_id from user_roles
            where user_id = auth.uid() and role = 'accountant'
          )
          and created_by = auth.uid()
        )
    $policy$;
  end if;
end $$;

-- Accountant: read all expenses in own school
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'petty_expenses' and policyname = 'accountant_read_school_petty_expenses'
  ) then
    execute $policy$
      create policy "accountant_read_school_petty_expenses"
        on petty_expenses
        for select
        to authenticated
        using (
          school_id in (
            select school_id from user_roles
            where user_id = auth.uid() and role = 'accountant'
          )
        )
    $policy$;
  end if;
end $$;

-- =========================================================
-- 2. student_risk_alerts table
-- =========================================================

create table if not exists student_risk_alerts (
  id                 uuid        primary key default gen_random_uuid(),
  school_id          uuid        not null references schools(id) on delete cascade,
  student_id         uuid        not null references students(id) on delete cascade,
  alert_type         text        not null default 'withdrawal_risk',
  severity           text        not null default 'medium',
  status             text        not null default 'open',
  attendance_rate    numeric,
  absent_days        integer,
  overdue_amount     numeric,
  unpaid_months      integer,
  reason             text        not null,
  recommended_action text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  resolved_at        timestamptz,
  resolved_by        uuid        references auth.users(id),
  constraint student_risk_alerts_severity_check check (
    severity in ('low', 'medium', 'high')
  ),
  constraint student_risk_alerts_status_check check (
    status in ('open', 'contacted', 'resolved', 'dismissed', 'withdrawn')
  )
);

create index if not exists student_risk_alerts_school_idx
  on student_risk_alerts(school_id);

create index if not exists student_risk_alerts_school_student_idx
  on student_risk_alerts(school_id, student_id);

create index if not exists student_risk_alerts_school_status_idx
  on student_risk_alerts(school_id, status);

alter table student_risk_alerts enable row level security;

-- Superadmin: full access
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'student_risk_alerts' and policyname = 'superadmin_all_student_risk_alerts'
  ) then
    execute $policy$
      create policy "superadmin_all_student_risk_alerts"
        on student_risk_alerts
        for all
        to authenticated
        using (
          exists (
            select 1 from user_roles
            where user_id = auth.uid() and role = 'superadmin'
          )
        )
        with check (
          exists (
            select 1 from user_roles
            where user_id = auth.uid() and role = 'superadmin'
          )
        )
    $policy$;
  end if;
end $$;

-- Admin: read all alerts in own school
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'student_risk_alerts' and policyname = 'admin_read_school_risk_alerts'
  ) then
    execute $policy$
      create policy "admin_read_school_risk_alerts"
        on student_risk_alerts
        for select
        to authenticated
        using (
          school_id in (
            select school_id from user_roles
            where user_id = auth.uid() and role = 'admin'
          )
        )
    $policy$;
  end if;
end $$;

-- Admin: update alert status in own school
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'student_risk_alerts' and policyname = 'admin_update_school_risk_alerts'
  ) then
    execute $policy$
      create policy "admin_update_school_risk_alerts"
        on student_risk_alerts
        for update
        to authenticated
        using (
          school_id in (
            select school_id from user_roles
            where user_id = auth.uid() and role = 'admin'
          )
        )
        with check (
          school_id in (
            select school_id from user_roles
            where user_id = auth.uid() and role = 'admin'
          )
        )
    $policy$;
  end if;
end $$;

-- =========================================================
-- 3. Accountant read access to fees (school-scoped via students)
-- Safe: only adds access, does not modify or remove existing policies
-- =========================================================

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'fees' and policyname = 'accountant_read_school_fees'
  ) then
    execute $policy$
      create policy "accountant_read_school_fees"
        on fees
        for select
        to authenticated
        using (
          student_id in (
            select s.id from students s
            where s.school_id in (
              select school_id from user_roles
              where user_id = auth.uid() and role = 'accountant'
            )
          )
        )
    $policy$;
  end if;
end $$;

-- =========================================================
-- 4. Accountant read access to attendance_logs (school_id column exists)
-- =========================================================

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'attendance_logs'
      and policyname = 'accountant_read_school_attendance_logs'
  ) then
    execute $policy$
      create policy "accountant_read_school_attendance_logs"
        on attendance_logs
        for select
        to authenticated
        using (
          school_id in (
            select school_id from user_roles
            where user_id = auth.uid() and role = 'accountant'
          )
        )
    $policy$;
  end if;
end $$;

-- =========================================================
-- 5. Accountant read access to students (basic info for fee operations)
-- =========================================================

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'students' and policyname = 'accountant_read_school_students'
  ) then
    execute $policy$
      create policy "accountant_read_school_students"
        on students
        for select
        to authenticated
        using (
          school_id in (
            select school_id from user_roles
            where user_id = auth.uid() and role = 'accountant'
          )
        )
    $policy$;
  end if;
end $$;
