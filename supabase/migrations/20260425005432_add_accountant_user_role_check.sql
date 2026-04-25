alter table user_roles
drop constraint if exists user_roles_role_check;

alter table user_roles
add constraint user_roles_role_check
check (role in ('superadmin', 'admin', 'teacher', 'student', 'parent', 'accountant'));
