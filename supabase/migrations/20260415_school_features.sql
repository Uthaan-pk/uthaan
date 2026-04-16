-- School-level premium feature flags and monthly usage tracking

create table if not exists school_features (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null references schools(id) on delete cascade,
  feature_key     text not null,
  enabled         boolean not null default false,
  monthly_limit   integer null,
  used_this_month integer not null default 0,
  last_reset_at   timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (school_id, feature_key),
  constraint school_features_feature_key_check check (
    feature_key in (
      'ai_report_comments',
      'ai_assignment_feedback',
      'ai_quiz_generator',
      'ai_attendance_alerts'
    )
  ),
  constraint school_features_usage_check check (used_this_month >= 0),
  constraint school_features_monthly_limit_check check (
    monthly_limit is null or monthly_limit >= 0
  )
);

create index if not exists school_features_school_idx
  on school_features(school_id);

create index if not exists school_features_feature_idx
  on school_features(feature_key);

alter table school_features enable row level security;

create policy "staff_read_own_school_features"
  on school_features
  for select
  to authenticated
  using (
    school_id in (
      select school_id
      from user_roles
      where user_id = auth.uid()
        and role in ('teacher', 'admin')
    )
  );

create policy "superadmin_read_all_school_features"
  on school_features
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

create policy "superadmin_insert_all_school_features"
  on school_features
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from user_roles
      where user_id = auth.uid()
        and role = 'superadmin'
    )
  );

create policy "superadmin_update_all_school_features"
  on school_features
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

create policy "superadmin_delete_all_school_features"
  on school_features
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

insert into school_features (
  school_id,
  feature_key,
  enabled,
  monthly_limit,
  used_this_month,
  last_reset_at
)
select
  schools.id,
  feature_defs.feature_key,
  case when feature_defs.feature_key = 'ai_report_comments' then true else false end,
  null,
  0,
  now()
from schools
cross join (
  values
    ('ai_report_comments'),
    ('ai_assignment_feedback'),
    ('ai_quiz_generator'),
    ('ai_attendance_alerts')
) as feature_defs(feature_key)
on conflict (school_id, feature_key) do nothing;
