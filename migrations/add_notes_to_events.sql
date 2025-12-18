-- Migration: Add notes column to events table
-- Description: Adds an optional notes field (max 300 characters) to the events table
-- Date: 2024-12-18

-- Add notes column to events table in chest schema
ALTER TABLE chest.events 
ADD COLUMN IF NOT EXISTS notes VARCHAR(300) NULL;

-- Add comment to document the column
COMMENT ON COLUMN chest.events.notes IS 'Optional text notes for events, maximum 300 characters';
