-- PROJECTLINKUMS: SAFE READ-ONLY RPC DIAGNOSTIC
-- Run in Supabase Dashboard > SQL Editor on the SAME project used by .env.local.
SELECT current_database() AS database_name;
SELECT
  to_regclass('public.profiles') AS profiles_table,
  to_regclass('public.student_skills') AS student_skills_table,
  to_regclass('public.student_interests') AS student_interests_table,
  to_regclass('public.availability_slots') AS availability_slots_table;

-- Expected: one public.save_my_profile with eleven named parameters.
-- If there are ZERO rows, the RPC migration has not been installed successfully.
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS input_signature,
  pg_get_function_result(p.oid) AS return_type,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE p.proname IN ('save_my_profile', 'save_my_profile_impl')
ORDER BY schema_name,function_name;

-- List all eleven ProjectLinkUMS public RPC functions and identify missing ones.
WITH expected(name) AS (VALUES
 ('save_my_profile'), ('create_project'), ('apply_to_project'),
 ('decide_application'), ('withdraw_application'), ('invite_candidate'),
 ('respond_invitation'), ('mark_notification_read'),
 ('set_project_status'), ('cancel_invitation'), ('leave_project')
)
SELECT e.name AS rpc_name,
  CASE WHEN EXISTS(
            SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
            WHERE n.nspname='public' AND p.proname=e.name
       ) THEN 'EXISTS'
       ELSE 'MISSING'
  END AS status
FROM expected e ORDER BY e.name;

-- Verify names and types of ALL public RPC input parameters, if any.
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN (
 'save_my_profile','create_project','apply_to_project','decide_application',
 'withdraw_application','invite_candidate','respond_invitation',
 'mark_notification_read','set_project_status','cancel_invitation','leave_project')
ORDER BY p.proname;
