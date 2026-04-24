-- Public demo / pilot request intake with superadmin-only review access

create table if not exists demo_requests (
  id uuid primary key default gen_random_uuid(),
  school_name text not null,
  contact_name text not null,
  role_title text,
  email text not null,
  phone text,
  city text,
  student_count integer,
  message text,
  status text not null default 'new',
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint demo_requests_status_check check (
    status in ('new', 'contacted', 'approved', 'rejected', 'converted')
  ),
  constraint demo_requests_student_count_check check (
    student_count is null or student_count >= 0
  )
);

create index if not exists demo_requests_created_at_idx
  on demo_requests(created_at desc);

create index if not exists demo_requests_status_idx
  on demo_requests(status);

create index if not exists demo_requests_email_idx
  on demo_requests(email);

alter table demo_requests enable row level security;

drop policy if exists "public_insert_demo_requests" on demo_requests;
drop policy if exists "superadmin_read_all_demo_requests" on demo_requests;
drop policy if exists "superadmin_update_all_demo_requests" on demo_requests;
drop policy if exists "superadmin_delete_all_demo_requests" on demo_requests;

create policy "public_insert_demo_requests"
  on demo_requests
  for insert
  to anon, authenticated
  with check (true);

create policy "superadmin_read_all_demo_requests"
  on demo_requests
  for select
  to authenticated
  using (
    exists (
      select 1
      from user_roles
      where user_id = auth.uid()
        and role = 'superadmin'
    )
  );

create policy "superadmin_update_all_demo_requests"
  on demo_requests
  for update
  to authenticated
  using (
    exists (
      select 1
      from user_roles
      where user_id = auth.uid()
        and role = 'superadmin'
    )
  )
  with check (
    exists (
      select 1
      from user_roles
      where user_id = auth.uid()
        and role = 'superadmin'
    )
  );

create policy "superadmin_delete_all_demo_requests"
  on demo_requests
  for delete
  to authenticated
  using (
    exists (
      select 1
      from user_roles
      where user_id = auth.uid()
        and role = 'superadmin'
    )
  );
