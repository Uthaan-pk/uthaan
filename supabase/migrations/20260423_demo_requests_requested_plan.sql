alter table demo_requests
add column if not exists requested_plan text not null default 'not_sure';

alter table demo_requests
drop constraint if exists demo_requests_requested_plan_check;

alter table demo_requests
add constraint demo_requests_requested_plan_check
check (requested_plan in ('not_sure', 'starter', 'growth', 'pro', 'enterprise'));
