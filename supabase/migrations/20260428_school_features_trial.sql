alter table school_features
  add column if not exists trial_until timestamptz default null,
  add column if not exists trial_granted_by uuid default null;
