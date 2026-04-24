alter table schools
add column if not exists plan text not null default 'starter';

alter table schools
drop constraint if exists schools_plan_check;

alter table schools
add constraint schools_plan_check
check (plan in ('pilot', 'starter', 'growth', 'pro', 'enterprise'));
