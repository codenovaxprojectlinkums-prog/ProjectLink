-- SAFE: READ ONLY. Run first in Supabase SQL Editor. Compare output to docs/SCHEMA_CONTRACT.md.
WITH expected(tab) AS (VALUES
 ('profiles'),('skills'),('student_skills'),('interests'),('student_interests'),
 ('availability_slots'),('projects'),('project_required_skills'),('project_interests'),
 ('project_meeting_slots'),('applications'),('project_members'),('project_invitations'),
 ('notifications'),('beta_test_results'))
SELECT e.tab, EXISTS(SELECT 1 FROM information_schema.tables t WHERE t.table_schema='public' AND t.table_name=e.tab) AS exists
FROM expected e ORDER BY e.tab;
 
SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public'
AND table_name IN ('profiles','skills','student_skills','interests','student_interests','availability_slots',
'projects','project_required_skills','project_interests','project_meeting_slots','applications',
'project_members','project_invitations','notifications','beta_test_results')
ORDER BY table_name, ordinal_position;

SELECT t.tablename, t.rowsecurity,
       (SELECT count(*) FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=t.tablename) AS policies
FROM pg_tables t
WHERE t.schemaname='public'
ORDER BY t.tablename;

SELECT tc.table_name, tc.constraint_name, tc.constraint_type,
       string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
WHERE tc.table_schema='public'
GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
ORDER BY tc.table_name, tc.constraint_type;

SELECT routine_name, routine_type FROM information_schema.routines
WHERE routine_schema='public' ORDER BY routine_name;
