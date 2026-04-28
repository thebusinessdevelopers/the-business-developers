-- v2.7 Phase 0: Elly account transition
-- Elly (housekeeping.elly) has left. Anita promoted to Acting Head of Housekeeping.
-- All historical data preserved — no rows deleted.
-- Run against: inidzwfjnkyinxhvbrdt (shared Supabase project)

-- =============================================================================
-- Add is_active column to hod_users
-- =============================================================================

alter table hod_users
  add column if not exists is_active boolean not null default true;

-- =============================================================================
-- Disable housekeeping.elly — randomised password + is_active flag
-- =============================================================================

update hod_users
set
  password_hash = crypt(encode(gen_random_bytes(16), 'hex'), gen_salt('bf')),
  is_active = false
where username = 'housekeeping.elly';

-- =============================================================================
-- Housekeeping department: Anita is now the primary HOD
-- =============================================================================

update hod_departments
set hods = array['Anita']
where slug = 'housekeeping';
