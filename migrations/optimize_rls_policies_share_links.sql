-- Migration: Optimize RLS Policies on chest.share_links
-- Description: Recreates RLS policies using scalar subqueries to improve performance
--              Replaces direct calls to auth.uid(), current_setting(), and auth.*() functions
--              with (SELECT auth.uid()) pattern to evaluate once per statement instead of per row
-- Date: 2024-12-19
-- 
-- Performance Issue: Policies calling auth.uid() or current_setting() directly are evaluated
--                    per row, causing performance degradation at scale.
-- Solution: Wrap function calls in scalar subqueries: (SELECT auth.uid()) instead of auth.uid()

-- ============================================================================
-- Drop and recreate policies with optimized scalar subquery pattern
-- ============================================================================

-- SELECT Policy: Users can view their own share links
DROP POLICY IF EXISTS "Users can view their own share links" ON chest.share_links;

CREATE POLICY "Users can view their own share links"
  ON chest.share_links
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- INSERT Policy: Users can insert their own share links
DROP POLICY IF EXISTS "Users can insert their own share links" ON chest.share_links;

CREATE POLICY "Users can insert their own share links"
  ON chest.share_links
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- UPDATE Policy: Users can update their own share links
DROP POLICY IF EXISTS "Users can update their own share links" ON chest.share_links;

CREATE POLICY "Users can update their own share links"
  ON chest.share_links
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- DELETE Policy: Users can delete their own share links
DROP POLICY IF EXISTS "Users can delete their own share links" ON chest.share_links;

CREATE POLICY "Users can delete their own share links"
  ON chest.share_links
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- Verification: List all policies on chest.share_links
-- ============================================================================
-- Uncomment the following to verify policies were created correctly:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE schemaname = 'chest' AND tablename = 'share_links'
-- ORDER BY policyname;
