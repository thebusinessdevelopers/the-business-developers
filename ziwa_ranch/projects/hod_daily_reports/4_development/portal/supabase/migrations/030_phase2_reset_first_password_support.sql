-- v2.8 Phase 2: Reset-first password support model
-- Run against: inidzwfjnkyinxhvbrdt (shared Supabase project)

-- =============================================================================
-- Retire recoverable password support
-- =============================================================================

update hod_users
set password_display = null
where password_display is not null;

comment on column hod_users.password_display is
  'Retired in v2.8 Phase 2. Current passwords must not be stored or recovered from this column. Use reset-first support instead.';

-- =============================================================================
-- Restore documented Martine logout exception
-- =============================================================================

update hod_users
set auto_logout_enabled = false
where username = 'wildlife.martine';
