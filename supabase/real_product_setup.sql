-- School Memory Archive: safe, minimal migration for the existing database.
-- Run this in Supabase SQL Editor. It preserves the existing notes table and policies.

-- Batch values can be years (2025) or ranges (2023–2025), so store them as text.
alter table public.notes
  alter column graduation_year type text using graduation_year::text;

-- The website supports an optional admission number.
alter table public.notes
  add column if not exists admission_number text;

-- class_name was added separately and should already exist.
-- This script intentionally does not drop or replace any RLS policies.
-- Confirm RLS remains enabled and policies continue to enforce:
--   public SELECT: status = 'approved'
--   public INSERT: status = 'pending'
--   admin SELECT/UPDATE/DELETE: public.is_admin()
