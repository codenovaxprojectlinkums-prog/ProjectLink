-- SAFE: read-only audit after installing reviewed migrations.
SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public'
  AND tablename IN ('profiles','skills','student_skills','interests','student_interests',
  'availability_slots','projects','project_required_skills','project_interests',
  'project_meeting_slots','applications','project_members','project_invitations',
  'notifications','beta_test_results') ORDER BY tablename;
SELECT tablename,policyname,cmd,roles,qual,with_check FROM pg_policies
 WHERE schemaname='public' AND policyname LIKE 'pkl_%' ORDER BY tablename,policyname;
SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS arguments
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE (n.nspname='public' AND p.proname IN (
 'save_my_profile','create_project','apply_to_project','decide_application',
 'withdraw_application','invite_candidate','respond_invitation','mark_notification_read',
 'set_project_status','cancel_invitation','leave_project'))
 ORDER BY p.proname;
SELECT 'skills' AS catalog,count(*) FROM public.skills
UNION ALL SELECT 'interests',count(*) FROM public.interests;
