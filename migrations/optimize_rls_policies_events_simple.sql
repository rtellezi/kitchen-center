-- Migration: Simple RLS Policy Optimization for chest.events
-- Description: Quick fix for the "Users can view their own events" policy
--              This is the minimal script to fix the specific policy mentioned
-- Date: 2024-12-19
--
-- This script only fixes the SELECT policy mentioned in the performance warning.
-- For comprehensive optimization, use optimize_rls_policies_events.sql instead.

-- Drop and recreate with optimized scalar subquery
DROP POLICY IF EXISTS "Users can view their own events" ON chest.events;

CREATE POLICY "Users can view their own events"
  ON chest.events
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
