-- Migration: Simple RLS Policy Optimization for chest.profiles
-- Description: Quick fix for the "Users can view their own profile" policy
--              This is the minimal script to fix the specific policy mentioned
-- Date: 2024-12-19
--
-- This script only fixes the SELECT policy mentioned in the performance warning.
-- For comprehensive optimization, use optimize_rls_policies_profiles.sql instead.

-- Drop and recreate with optimized scalar subquery
DROP POLICY IF EXISTS "Users can view their own profile" ON chest.profiles;

CREATE POLICY "Users can view their own profile"
  ON chest.profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
