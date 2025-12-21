# Database Migrations

This directory contains SQL migration scripts for the Horizontal Journal database.

## Running Migrations

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of the migration file
4. Run the SQL script

### Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push
```

### Manual Execution

1. Connect to your PostgreSQL database
2. Execute the SQL script directly

## Migration Files

### `add_notes_to_events.sql`
- **Date**: 2024-12-18
- **Description**: Adds an optional `notes` column (VARCHAR(300)) to the `events` table in the `chest` schema
- **Status**: Ready to apply

### `optimize_rls_policies_events.sql`
- **Date**: 2024-12-19
- **Description**: Optimizes RLS policies on `chest.events` table by replacing direct `auth.uid()` calls with scalar subqueries `(SELECT auth.uid())` for improved performance. Recreates SELECT, INSERT, UPDATE, and DELETE policies.
- **Status**: Ready to apply
- **Performance Impact**: Fixes per-row function evaluation issue that causes performance degradation at scale

### `optimize_rls_policies_events_simple.sql`
- **Date**: 2024-12-19
- **Description**: Minimal script that only fixes the "Users can view their own events" SELECT policy. Use this if you only need to fix the specific policy mentioned in the performance warning.
- **Status**: Ready to apply

### `optimize_rls_policies_events_advanced.sql`
- **Date**: 2024-12-19
- **Description**: Comprehensive script that identifies all policies on `chest.events`, drops them, and recreates optimized versions. Includes diagnostic output and examples for custom policies using `current_setting()` or `auth.jwt()`.
- **Status**: Ready to apply
- **Use Case**: Use this if you have custom policies beyond standard CRUD operations

### `optimize_rls_policies_profiles.sql`
- **Date**: 2024-12-19
- **Description**: Optimizes RLS policies on `chest.profiles` table by replacing direct `auth.uid()` calls with scalar subqueries `(SELECT auth.uid())` for improved performance. Recreates SELECT, INSERT, UPDATE, and DELETE policies.
- **Status**: Ready to apply
- **Performance Impact**: Fixes per-row function evaluation issue that causes performance degradation at scale

### `optimize_rls_policies_profiles_simple.sql`
- **Date**: 2024-12-19
- **Description**: Minimal script that only fixes the "Users can view their own profile" SELECT policy. Use this if you only need to fix the specific policy mentioned in the performance warning.
- **Status**: Ready to apply

### `optimize_rls_policies_share_links.sql`
- **Date**: 2024-12-19
- **Description**: Optimizes RLS policies on `chest.share_links` table by replacing direct `auth.uid()` calls with scalar subqueries `(SELECT auth.uid())` for improved performance. Recreates SELECT, INSERT, UPDATE, and DELETE policies.
- **Status**: Ready to apply
- **Performance Impact**: Fixes per-row function evaluation issue that causes performance degradation at scale

## Notes

- All migrations are idempotent (safe to run multiple times)
- Migrations use `IF NOT EXISTS` clauses where applicable
- Always backup your database before running migrations in production
