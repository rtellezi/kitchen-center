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

## Notes

- All migrations are idempotent (safe to run multiple times)
- Migrations use `IF NOT EXISTS` clauses where applicable
- Always backup your database before running migrations in production
