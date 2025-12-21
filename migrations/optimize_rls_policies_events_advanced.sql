-- Migration: Advanced RLS Policy Optimization for chest.events
-- Description: Comprehensive script to find and optimize ALL policies on chest.events
--              that use auth.*() or current_setting() functions directly
-- Date: 2024-12-19
--
-- This script:
-- 1. Identifies all policies on chest.events
-- 2. Drops policies that may have performance issues
-- 3. Recreates them with optimized scalar subquery patterns
--
-- Use this script if you have custom policies beyond the standard CRUD operations

-- ============================================================================
-- STEP 1: Identify all existing policies on chest.events
-- ============================================================================

-- View current policies (for reference)
DO $$
DECLARE
    policy_rec RECORD;
BEGIN
    RAISE NOTICE '=== Current policies on chest.events ===';
    FOR policy_rec IN
        SELECT policyname, cmd, qual::text as qual_expr, with_check::text as with_check_expr
        FROM pg_policies 
        WHERE schemaname = 'chest' AND tablename = 'events'
        ORDER BY policyname
    LOOP
        RAISE NOTICE 'Policy: % | Command: %', policy_rec.policyname, policy_rec.cmd;
        RAISE NOTICE '  USING: %', policy_rec.qual_expr;
        RAISE NOTICE '  WITH CHECK: %', policy_rec.with_check_expr;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: Drop and recreate optimized policies
-- ============================================================================

-- SELECT Policy: Users can view their own events
DROP POLICY IF EXISTS "Users can view their own events" ON chest.events;

CREATE POLICY "Users can view their own events"
  ON chest.events
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- INSERT Policy: Users can insert their own events
DROP POLICY IF EXISTS "Users can insert their own events" ON chest.events;

CREATE POLICY "Users can insert their own events"
  ON chest.events
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- UPDATE Policy: Users can update their own events
DROP POLICY IF EXISTS "Users can update their own events" ON chest.events;

CREATE POLICY "Users can update their own events"
  ON chest.events
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- DELETE Policy: Users can delete their own events
DROP POLICY IF EXISTS "Users can delete their own events" ON chest.events;

CREATE POLICY "Users can delete their own events"
  ON chest.events
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- Additional optimized policies (add as needed)
-- ============================================================================

-- Example: Policy using current_setting() - convert to scalar subquery
-- If you have a policy like: USING (current_setting('app.user_id')::uuid = user_id)
-- Replace with: USING ((SELECT current_setting('app.user_id', true))::uuid = user_id)

-- Example: Policy using auth.jwt() - convert to scalar subquery
-- If you have a policy like: USING (auth.jwt()->>'sub' = user_id::text)
-- Replace with: USING ((SELECT auth.jwt()->>'sub') = user_id::text)

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'chest' AND tablename = 'events';
    
    RAISE NOTICE '=== Migration complete ===';
    RAISE NOTICE 'Total policies on chest.events: %', policy_count;
    
    -- List all policies
    RAISE NOTICE '=== Optimized policies ===';
    FOR policy_rec IN
        SELECT policyname, cmd
        FROM pg_policies 
        WHERE schemaname = 'chest' AND tablename = 'events'
        ORDER BY policyname
    LOOP
        RAISE NOTICE '  - % (%%)', policy_rec.policyname, policy_rec.cmd;
    END LOOP;
END $$;
