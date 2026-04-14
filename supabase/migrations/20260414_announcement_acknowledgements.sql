-- Announcement acknowledgement receipts
-- Run this in the Supabase SQL editor for project okjyrkrdwbyflpvastdo

create table announcement_acknowledgements (
  id               uuid        primary key default gen_random_uuid(),
  announcement_id  uuid        not null references announcements(id) on delete cascade,
  user_id          uuid        not null references auth.users(id),
  school_id        uuid        not null references schools(id),
  acknowledged_at  timestamptz not null default now(),
  unique(announcement_id, user_id)
);

-- Indices for common query paths
create index on announcement_acknowledgements(announcement_id, school_id);
create index on announcement_acknowledgements(user_id);

alter table announcement_acknowledgements enable row level security;

-- Students and parents: insert their own row (school_id must match their school)
create policy "students_parents_insert_own_ack"
  on announcement_acknowledgements
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and school_id in (
      select school_id from user_roles
      where user_id = auth.uid()
        and role in ('student', 'parent')
    )
  );

-- Students and parents: read only their own rows
create policy "students_parents_read_own_ack"
  on announcement_acknowledgements
  for select
  to authenticated
  using (user_id = auth.uid());

-- Admin and teacher: read all rows for their school
create policy "staff_read_school_acks"
  on announcement_acknowledgements
  for select
  to authenticated
  using (
    school_id in (
      select school_id from user_roles
      where user_id = auth.uid()
        and role in ('admin', 'teacher')
    )
  );
