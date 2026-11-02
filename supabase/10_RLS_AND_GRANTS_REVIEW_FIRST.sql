-- ProjectLinkUMS FULL NORMALIZED ERD: protective policies, indexes, and grants.
-- IMPORTANT: Run 00_SCHEMA_AUDIT_READ_ONLY.sql FIRST, take a backup, and compare actual columns.
-- Do NOT run if the audit reports missing/renamed columns. This script intentionally stops
-- when pre-existing policies use names outside pkl_*; review those policies with your DBA.
-- All user writes except beta feedback go through controlled RPC functions in 20_FUNCTIONS.sql.
BEGIN;

DO $check$
DECLARE missing_tables text; existing_policies text;
BEGIN
  SELECT string_agg(e.tab, ', ' ORDER BY e.tab) INTO missing_tables
  FROM (VALUES ('profiles'),('skills'),('student_skills'),('interests'),('student_interests'),
    ('availability_slots'),('projects'),('project_required_skills'),('project_interests'),
    ('project_meeting_slots'),('applications'),('project_members'),('project_invitations'),
    ('notifications'),('beta_test_results')) e(tab)
  WHERE to_regclass('public.'||e.tab) IS NULL;
  IF missing_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Missing tables: %. Full schema required; do not use MVP array schema', missing_tables;
  END IF;
  SELECT string_agg(p.tablename || '.' || p.policyname, ', ') INTO existing_policies
  FROM pg_policies p WHERE p.schemaname='public' AND p.tablename IN
    ('profiles','skills','student_skills','interests','student_interests','availability_slots',
     'projects','project_required_skills','project_interests','project_meeting_slots',
     'applications','project_members','project_invitations','notifications','beta_test_results')
    AND p.policyname NOT LIKE 'pkl_%';
  IF existing_policies IS NOT NULL THEN
    RAISE EXCEPTION 'Review existing RLS policies before installing: %', existing_policies;
  END IF;
END;
$check$;

-- RLS enabled on ALL public app tables. Do not expose unpublished/private data to anon.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_required_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_meeting_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_test_results ENABLE ROW LEVEL SECURITY;

-- Limit grants; requests and memberships cannot be created by direct client inserts.
REVOKE ALL ON public.profiles,public.skills,public.student_skills,public.interests,
  public.student_interests,public.availability_slots,public.projects,
  public.project_required_skills,public.project_interests,public.project_meeting_slots,
  public.applications,public.project_members,public.project_invitations,
  public.notifications,public.beta_test_results FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profiles,public.skills,public.student_skills,public.interests,
  public.student_interests,public.availability_slots,public.projects,
  public.project_required_skills,public.project_interests,public.project_meeting_slots,
  public.applications,public.project_members,public.project_invitations,
  public.notifications,public.beta_test_results TO authenticated;
GRANT INSERT ON public.beta_test_results TO authenticated;

-- Previously installed pkl_* policies can be replaced idempotently.
DROP POLICY IF EXISTS pkl_profiles_select ON public.profiles;
CREATE POLICY pkl_profiles_select ON public.profiles FOR SELECT TO authenticated USING (
  id = (SELECT auth.uid())
  OR (discoverable = TRUE AND consent_at IS NOT NULL)
  OR EXISTS (
     SELECT 1 FROM public.applications a JOIN public.projects p ON p.id=a.project_id
     WHERE a.applicant_id=profiles.id AND p.owner_id=(SELECT auth.uid())
  )
  OR EXISTS (
     SELECT 1 FROM public.project_members m JOIN public.projects p ON p.id=m.project_id
     WHERE m.student_id=profiles.id AND p.owner_id=(SELECT auth.uid())
  )
);
DROP POLICY IF EXISTS pkl_skills_select ON public.skills;
CREATE POLICY pkl_skills_select ON public.skills FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS pkl_interests_select ON public.interests;
CREATE POLICY pkl_interests_select ON public.interests FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS pkl_student_skills_select ON public.student_skills;
CREATE POLICY pkl_student_skills_select ON public.student_skills FOR SELECT TO authenticated USING (
  student_id=(SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=student_id)
);
DROP POLICY IF EXISTS pkl_student_interests_select ON public.student_interests;
CREATE POLICY pkl_student_interests_select ON public.student_interests FOR SELECT TO authenticated USING (
  student_id=(SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=student_id)
);
DROP POLICY IF EXISTS pkl_availability_select ON public.availability_slots;
CREATE POLICY pkl_availability_select ON public.availability_slots FOR SELECT TO authenticated USING (
  student_id=(SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=student_id)
);

DROP POLICY IF EXISTS pkl_projects_select ON public.projects;
CREATE POLICY pkl_projects_select ON public.projects FOR SELECT TO authenticated USING (
   status='open' OR owner_id=(SELECT auth.uid())
);
DROP POLICY IF EXISTS pkl_project_skills_select ON public.project_required_skills;
CREATE POLICY pkl_project_skills_select ON public.project_required_skills FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id=project_id)
);
DROP POLICY IF EXISTS pkl_project_interests_select ON public.project_interests;
CREATE POLICY pkl_project_interests_select ON public.project_interests FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id=project_id)
);
DROP POLICY IF EXISTS pkl_project_slots_select ON public.project_meeting_slots;
CREATE POLICY pkl_project_slots_select ON public.project_meeting_slots FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id=project_id)
);

DROP POLICY IF EXISTS pkl_applications_select ON public.applications;
CREATE POLICY pkl_applications_select ON public.applications FOR SELECT TO authenticated USING (
  applicant_id=(SELECT auth.uid()) OR EXISTS (
     SELECT 1 FROM public.projects p WHERE p.id=project_id AND p.owner_id=(SELECT auth.uid())
  )
);
DROP POLICY IF EXISTS pkl_members_select ON public.project_members;
CREATE POLICY pkl_members_select ON public.project_members FOR SELECT TO authenticated USING (
  student_id=(SELECT auth.uid()) OR EXISTS (
     SELECT 1 FROM public.projects p WHERE p.id=project_id AND p.owner_id=(SELECT auth.uid())
  )
);
DROP POLICY IF EXISTS pkl_invitations_select ON public.project_invitations;
CREATE POLICY pkl_invitations_select ON public.project_invitations FOR SELECT TO authenticated USING (
  invitee_id=(SELECT auth.uid()) OR inviter_id=(SELECT auth.uid())
);
DROP POLICY IF EXISTS pkl_notifications_select ON public.notifications;
CREATE POLICY pkl_notifications_select ON public.notifications FOR SELECT TO authenticated USING (
  recipient_id=(SELECT auth.uid())
);
DROP POLICY IF EXISTS pkl_beta_select ON public.beta_test_results;
CREATE POLICY pkl_beta_select ON public.beta_test_results FOR SELECT TO authenticated USING (
  tester_id=(SELECT auth.uid())
);
DROP POLICY IF EXISTS pkl_beta_insert ON public.beta_test_results;
CREATE POLICY pkl_beta_insert ON public.beta_test_results FOR INSERT TO authenticated WITH CHECK (
  tester_id=(SELECT auth.uid())
);

-- Indexes for matching & policy checks. May need adjustment if friend uses different columns.
CREATE UNIQUE INDEX IF NOT EXISTS pkl_application_one_per_user_project ON public.applications(project_id,applicant_id);
CREATE UNIQUE INDEX IF NOT EXISTS pkl_invitation_one_per_user_project ON public.project_invitations(project_id,invitee_id);
CREATE INDEX IF NOT EXISTS pkl_projects_owner_idx ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS pkl_projects_status_idx ON public.projects(status);
CREATE INDEX IF NOT EXISTS pkl_applications_applicant_idx ON public.applications(applicant_id);
CREATE INDEX IF NOT EXISTS pkl_members_student_idx ON public.project_members(student_id);
CREATE INDEX IF NOT EXISTS pkl_student_skills_skill_idx ON public.student_skills(skill_id);
CREATE INDEX IF NOT EXISTS pkl_student_interests_interest_idx ON public.student_interests(interest_id);
CREATE INDEX IF NOT EXISTS pkl_availability_student_idx ON public.availability_slots(student_id);
CREATE INDEX IF NOT EXISTS pkl_invitation_invitee_idx ON public.project_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS pkl_notification_recipient_idx ON public.notifications(recipient_id);
COMMIT;
