-- FULL ERD ProjectLinkUMS transactional backend.
-- Run AFTER 00 audit and reviewed 10 RLS script. Functions created as PRIVATE SECURITY DEFINER
-- with non-privileged PUBLIC SECURITY INVOKER wrappers for Supabase RPC access.
-- This is a schema-specific implementation; compare exact column types against your DB before running.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

-- 1. Atomic save profile + normalized skills, interests, availability.
CREATE OR REPLACE FUNCTION private.save_my_profile_impl(
  p_display_name text, p_faculty text, p_programme text, p_year_of_study smallint,
  p_bio text, p_weekly_hours smallint, p_preferred_project_types text[],
  p_discoverable boolean, p_skills jsonb, p_interests uuid[], p_slots jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_user uuid := auth.uid(); v_item jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF char_length(btrim(coalesce(p_display_name,''))) NOT BETWEEN 2 AND 120
    OR char_length(btrim(coalesce(p_faculty,''))) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'Display name and faculty are required (2-120 characters)';
  END IF;
  IF p_year_of_study IS NOT NULL AND (p_year_of_study < 1 OR p_year_of_study > 8) THEN
    RAISE EXCEPTION 'Invalid study year';
  END IF;
  IF p_weekly_hours IS NOT NULL AND (p_weekly_hours < 0 OR p_weekly_hours > 168) THEN
    RAISE EXCEPTION 'Invalid weekly hours';
  END IF;
  IF jsonb_typeof(p_skills) IS DISTINCT FROM 'array' OR
     jsonb_typeof(p_slots) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'skills and slots must be JSON arrays';
  END IF;
  IF jsonb_array_length(p_skills)>30 OR jsonb_array_length(p_slots)>25 OR
     coalesce(array_length(p_interests,1),0)>30 THEN
    RAISE EXCEPTION 'Too many profile tags/slots';
  END IF;
  INSERT INTO public.profiles (
    id,display_name,faculty,programme,year_of_study,bio,weekly_hours,
    preferred_project_types,discoverable,consent_at,updated_at
  ) VALUES (
    v_user,btrim(p_display_name),btrim(p_faculty),nullif(btrim(coalesce(p_programme,'')),''),
    p_year_of_study,nullif(btrim(coalesce(p_bio,'')),''),p_weekly_hours,
    coalesce(p_preferred_project_types,ARRAY[]::text[]),coalesce(p_discoverable,false),
    CASE WHEN p_discoverable THEN now() ELSE NULL END,now()
  ) ON CONFLICT (id) DO UPDATE SET
    display_name=excluded.display_name,faculty=excluded.faculty,
    programme=excluded.programme,year_of_study=excluded.year_of_study,
    bio=excluded.bio,weekly_hours=excluded.weekly_hours,
    preferred_project_types=excluded.preferred_project_types,
    discoverable=excluded.discoverable,consent_at=excluded.consent_at,updated_at=now();

  DELETE FROM public.student_skills WHERE student_id=v_user;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_skills) LOOP
    IF (v_item->>'proficiency') NOT IN ('beginner','intermediate','advanced') THEN
      RAISE EXCEPTION 'Invalid proficiency';
    END IF;
    INSERT INTO public.student_skills(student_id,skill_id,proficiency)
      VALUES (v_user,(v_item->>'skill_id')::uuid,v_item->>'proficiency');
  END LOOP;

  DELETE FROM public.student_interests WHERE student_id=v_user;
  INSERT INTO public.student_interests(student_id,interest_id)
    SELECT v_user, i FROM unnest(coalesce(p_interests,ARRAY[]::uuid[])) i;

  DELETE FROM public.availability_slots WHERE student_id=v_user;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_slots) LOOP
    IF (v_item->>'weekday')::smallint NOT BETWEEN 1 AND 7 OR
       (v_item->>'start_time')::time >= (v_item->>'end_time')::time THEN
      RAISE EXCEPTION 'Invalid availability slot';
    END IF;
    INSERT INTO public.availability_slots(student_id,weekday,start_time,end_time)
    VALUES(v_user,(v_item->>'weekday')::smallint,
           (v_item->>'start_time')::time,(v_item->>'end_time')::time);
  END LOOP;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.save_my_profile(
  p_display_name text, p_faculty text, p_programme text, p_year_of_study smallint,
  p_bio text, p_weekly_hours smallint, p_preferred_project_types text[],
  p_discoverable boolean, p_skills jsonb, p_interests uuid[], p_slots jsonb
) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$
 SELECT private.save_my_profile_impl(p_display_name,p_faculty,p_programme,p_year_of_study,
 p_bio,p_weekly_hours,p_preferred_project_types,p_discoverable,p_skills,p_interests,p_slots);
$fn$;

-- 2. Atomic project creation + normalized requirements + owner membership.
CREATE OR REPLACE FUNCTION private.create_project_impl(
 p_title text,p_description text,p_project_type text,p_slots_needed smallint,
 p_min_weekly_hours smallint,p_deadline date,
 p_required_skills jsonb,p_interests uuid[],p_meeting_slots jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_user uuid:=auth.uid(); v_project_id uuid; v_item jsonb;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=v_user) THEN
   RAISE EXCEPTION 'Complete student profile before creating project';
 END IF;
 IF char_length(btrim(coalesce(p_title,''))) NOT BETWEEN 4 AND 150 OR
    char_length(btrim(coalesce(p_description,''))) < 10 THEN
   RAISE EXCEPTION 'Project title and description are too short';
 END IF;
 IF p_slots_needed IS NULL OR p_slots_needed < 1 OR p_slots_needed > 50
    OR p_min_weekly_hours IS NULL OR p_min_weekly_hours NOT BETWEEN 0 AND 168 THEN
   RAISE EXCEPTION 'Invalid required team slots or weekly hours';
 END IF;
 IF jsonb_typeof(p_required_skills) IS DISTINCT FROM 'array' OR
    jsonb_typeof(p_meeting_slots) IS DISTINCT FROM 'array' THEN
   RAISE EXCEPTION 'Project skill and meeting inputs must be JSON arrays';
 END IF;
 IF jsonb_array_length(p_required_skills)>30 OR
    jsonb_array_length(p_meeting_slots)>25 OR coalesce(array_length(p_interests,1),0)>30 THEN
   RAISE EXCEPTION 'Too many project tags/slots';
 END IF;
 INSERT INTO public.projects(owner_id,title,description,project_type,slots_needed,
 min_weekly_hours,deadline,status)
 VALUES(v_user,btrim(p_title),btrim(p_description),p_project_type,p_slots_needed,
        p_min_weekly_hours,p_deadline,'open') RETURNING id INTO v_project_id;
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_required_skills) LOOP
  INSERT INTO public.project_required_skills(project_id,skill_id,mandatory,importance)
  VALUES(v_project_id,(v_item->>'skill_id')::uuid,coalesce((v_item->>'mandatory')::boolean,true),
         coalesce((v_item->>'importance')::smallint,3));
 END LOOP;
 INSERT INTO public.project_interests(project_id,interest_id)
 SELECT v_project_id,i FROM unnest(coalesce(p_interests,ARRAY[]::uuid[])) i;
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_meeting_slots) LOOP
  IF (v_item->>'weekday')::smallint NOT BETWEEN 1 AND 7 OR
     (v_item->>'start_time')::time >= (v_item->>'end_time')::time THEN
     RAISE EXCEPTION 'Invalid project meeting slot';
  END IF;
  INSERT INTO public.project_meeting_slots(project_id,weekday,start_time,end_time)
   VALUES(v_project_id,(v_item->>'weekday')::smallint,
          (v_item->>'start_time')::time,(v_item->>'end_time')::time);
 END LOOP;
 INSERT INTO public.project_members(project_id,student_id,member_role,membership_status)
 VALUES(v_project_id,v_user,'owner','active') ON CONFLICT (project_id,student_id) DO NOTHING;
 RETURN v_project_id;
END;
$fn$;
CREATE OR REPLACE FUNCTION public.create_project(
 p_title text,p_description text,p_project_type text,p_slots_needed smallint,
 p_min_weekly_hours smallint,p_deadline date,
 p_required_skills jsonb,p_interests uuid[],p_meeting_slots jsonb
) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$
 SELECT private.create_project_impl(p_title,p_description,p_project_type,p_slots_needed,
   p_min_weekly_hours,p_deadline,p_required_skills,p_interests,p_meeting_slots);
$fn$;

-- 3. Applicant applies to an open project (no self-application or duplicates).
CREATE OR REPLACE FUNCTION private.apply_to_project_impl(p_project_id uuid,p_note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_user uuid:=auth.uid(); v_owner uuid; v_status text; v_app uuid;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=v_user) THEN
   RAISE EXCEPTION 'Complete student profile before applying';
 END IF;
 SELECT owner_id,status INTO v_owner,v_status
   FROM public.projects WHERE id=p_project_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
 IF v_status<>'open' THEN RAISE EXCEPTION 'Project is closed'; END IF;
 IF v_owner=v_user THEN RAISE EXCEPTION 'Cannot apply to your own project'; END IF;
 IF EXISTS(SELECT 1 FROM public.project_members
  WHERE project_id=p_project_id AND student_id=v_user AND membership_status='active') THEN
  RAISE EXCEPTION 'Already a project member';
 END IF;
 IF length(coalesce(p_note,''))>500 THEN RAISE EXCEPTION 'Note too long'; END IF;
 INSERT INTO public.applications(project_id,applicant_id,note,status)
 VALUES(p_project_id,v_user,p_note,'pending') RETURNING id INTO v_app;
 INSERT INTO public.notifications(recipient_id,event_type,target_type,target_id)
 VALUES(v_owner,'application_received','application',v_app);
 RETURN v_app;
END;
$fn$;
CREATE OR REPLACE FUNCTION public.apply_to_project(p_project_id uuid,p_note text)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$
SELECT private.apply_to_project_impl(p_project_id,p_note);
$fn$;

-- 4. Project owner accepts/declines. Project lock prevents capacity overfill.
CREATE OR REPLACE FUNCTION private.decide_application_impl(p_application_id uuid,p_decision text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_user uuid:=auth.uid(); v_project_id uuid; v_owner uuid; v_applicant uuid;
 v_status text; v_project_status text; v_cap integer; v_current integer;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 IF p_decision NOT IN ('accepted','declined') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
 SELECT project_id INTO v_project_id FROM public.applications WHERE id=p_application_id;
 IF v_project_id IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;
 SELECT owner_id,status,slots_needed INTO v_owner,v_project_status,v_cap
 FROM public.projects WHERE id=v_project_id FOR UPDATE;
 IF v_owner IS DISTINCT FROM v_user THEN RAISE EXCEPTION 'Only project owner can decide'; END IF;
 SELECT applicant_id,status INTO v_applicant,v_status FROM public.applications
 WHERE id=p_application_id FOR UPDATE;
 IF v_status <> 'pending' THEN RAISE EXCEPTION 'Request already decided'; END IF;
 IF p_decision='accepted' THEN
  IF v_project_status<>'open' THEN RAISE EXCEPTION 'Project closed'; END IF;
  SELECT count(*) INTO v_current FROM public.project_members
   WHERE project_id=v_project_id AND member_role='member' AND membership_status='active';
  IF v_current>=v_cap THEN RAISE EXCEPTION 'Project team is already full'; END IF;
  IF EXISTS(SELECT 1 FROM public.project_members WHERE project_id=v_project_id
    AND student_id=v_applicant AND membership_status='active') THEN
    RAISE EXCEPTION 'Applicant is already a member';
  END IF;
  INSERT INTO public.project_members(project_id,student_id,member_role,membership_status)
    VALUES(v_project_id,v_applicant,'member','active')
    ON CONFLICT(project_id,student_id) DO UPDATE SET
      membership_status='active',member_role='member';
 END IF;
 UPDATE public.applications SET status=p_decision,responded_at=now()
  WHERE id=p_application_id;
 INSERT INTO public.notifications(recipient_id,event_type,target_type,target_id)
 VALUES(v_applicant,'application_'||p_decision,'application',p_application_id);
END;
$fn$;
CREATE OR REPLACE FUNCTION public.decide_application(p_application_id uuid,p_decision text)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$
 SELECT private.decide_application_impl(p_application_id,p_decision);
$fn$;

CREATE OR REPLACE FUNCTION private.withdraw_application_impl(p_application_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_user uuid:=auth.uid(); v_applicant uuid; v_status text;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 SELECT applicant_id,status INTO v_applicant,v_status FROM public.applications
  WHERE id=p_application_id FOR UPDATE;
 IF NOT FOUND OR v_applicant<>v_user THEN RAISE EXCEPTION 'Request not found or unauthorized'; END IF;
 IF v_status<>'pending' THEN RAISE EXCEPTION 'Only pending requests may be withdrawn'; END IF;
 UPDATE public.applications SET status='withdrawn',responded_at=now() WHERE id=p_application_id;
END;
$fn$;
CREATE OR REPLACE FUNCTION public.withdraw_application(p_application_id uuid)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$
 SELECT private.withdraw_application_impl(p_application_id);
$fn$;

-- 5. Project-owner invitation -> invitee accepts -> membership, using same project lock.
CREATE OR REPLACE FUNCTION private.invite_candidate_impl(p_project_id uuid,p_invitee_id uuid,p_note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_user uuid:=auth.uid(); v_owner uuid; v_status text; v_invitation uuid;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 SELECT owner_id,status INTO v_owner,v_status FROM public.projects
   WHERE id=p_project_id FOR UPDATE;
 IF v_owner IS DISTINCT FROM v_user OR v_status<>'open' THEN
    RAISE EXCEPTION 'Only an owner of an open project may invite';
 END IF;
 IF p_invitee_id=v_user OR NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE id=p_invitee_id
    AND discoverable=true AND consent_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Candidate unavailable or did not consent to discovery';
 END IF;
 IF EXISTS(SELECT 1 FROM public.project_members WHERE project_id=p_project_id
 AND student_id=p_invitee_id AND membership_status='active') THEN
   RAISE EXCEPTION 'Candidate already a member';
 END IF;
 IF length(coalesce(p_note,''))>500 THEN RAISE EXCEPTION 'Note too long'; END IF;
 INSERT INTO public.project_invitations(project_id,inviter_id,invitee_id,note,status)
 VALUES(p_project_id,v_user,p_invitee_id,p_note,'pending')
 RETURNING id INTO v_invitation;
 INSERT INTO public.notifications(recipient_id,event_type,target_type,target_id)
 VALUES(p_invitee_id,'project_invitation','invitation',v_invitation);
 RETURN v_invitation;
END;
$fn$;
CREATE OR REPLACE FUNCTION public.invite_candidate(p_project_id uuid,p_invitee_id uuid,p_note text)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$
 SELECT private.invite_candidate_impl(p_project_id,p_invitee_id,p_note);
$fn$;

CREATE OR REPLACE FUNCTION private.respond_invitation_impl(p_invitation_id uuid,p_decision text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_user uuid:=auth.uid(); v_project_id uuid; v_owner uuid; v_cap integer;
 v_project_status text; v_invitee uuid; v_inviter uuid; v_status text; v_count integer;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 IF p_decision NOT IN ('accepted','declined') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
 SELECT project_id INTO v_project_id FROM public.project_invitations WHERE id=p_invitation_id;
 IF v_project_id IS NULL THEN RAISE EXCEPTION 'Invitation not found'; END IF;
 SELECT owner_id,status,slots_needed INTO v_owner,v_project_status,v_cap
  FROM public.projects WHERE id=v_project_id FOR UPDATE;
 SELECT invitee_id,inviter_id,status INTO v_invitee,v_inviter,v_status
 FROM public.project_invitations WHERE id=p_invitation_id FOR UPDATE;
 IF v_invitee IS DISTINCT FROM v_user THEN RAISE EXCEPTION 'Not your invitation'; END IF;
 IF v_status <> 'pending' THEN RAISE EXCEPTION 'Already decided'; END IF;
 IF p_decision='accepted' THEN
  IF v_project_status<>'open' THEN RAISE EXCEPTION 'Project is closed'; END IF;
  SELECT count(*) INTO v_count FROM public.project_members
   WHERE project_id=v_project_id AND member_role='member' AND membership_status='active';
  IF v_count>=v_cap THEN RAISE EXCEPTION 'Project team is full'; END IF;
  IF EXISTS(SELECT 1 FROM public.project_members WHERE project_id=v_project_id
     AND student_id=v_user AND membership_status='active') THEN
    RAISE EXCEPTION 'Already a member';
  END IF;
  INSERT INTO public.project_members(project_id,student_id,member_role,membership_status)
  VALUES(v_project_id,v_user,'member','active')
  ON CONFLICT(project_id,student_id) DO UPDATE SET
    membership_status='active',member_role='member';
 END IF;
 UPDATE public.project_invitations SET status=p_decision,responded_at=now()
 WHERE id=p_invitation_id;
 INSERT INTO public.notifications(recipient_id,event_type,target_type,target_id)
 VALUES(v_inviter,'invitation_'||p_decision,'invitation',p_invitation_id);
END;
$fn$;
CREATE OR REPLACE FUNCTION public.respond_invitation(p_invitation_id uuid,p_decision text)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$
 SELECT private.respond_invitation_impl(p_invitation_id,p_decision);
$fn$;

CREATE OR REPLACE FUNCTION private.mark_notification_read_impl(p_notification_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 UPDATE public.notifications SET read_at=now()
 WHERE id=p_notification_id AND recipient_id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Notification not found'; END IF;
END;
$fn$;
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$
 SELECT private.mark_notification_read_impl(p_notification_id);
$fn$;


-- 6. Optional lifecycle operations for projects, invitations and member departure.
CREATE OR REPLACE FUNCTION private.set_project_status_impl(p_project_id uuid,p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_owner uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 IF p_status NOT IN ('open','closed','completed') THEN RAISE EXCEPTION 'Invalid project status'; END IF;
 SELECT owner_id INTO v_owner FROM public.projects WHERE id=p_project_id FOR UPDATE;
 IF NOT FOUND OR v_owner IS DISTINCT FROM auth.uid() THEN
   RAISE EXCEPTION 'Only the project owner can change status';
 END IF;
 UPDATE public.projects SET status=p_status, updated_at=now() WHERE id=p_project_id;
END;
$fn$;
CREATE OR REPLACE FUNCTION public.set_project_status(p_project_id uuid,p_status text)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$
 SELECT private.set_project_status_impl(p_project_id,p_status);
$fn$;

CREATE OR REPLACE FUNCTION private.cancel_invitation_impl(p_invitation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_owner uuid;v_project_id uuid;v_status text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 SELECT project_id INTO v_project_id FROM public.project_invitations WHERE id=p_invitation_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invitation not found'; END IF;
 SELECT owner_id INTO v_owner FROM public.projects WHERE id=v_project_id FOR UPDATE;
 IF v_owner IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Only project owner can cancel invitation'; END IF;
 SELECT status INTO v_status FROM public.project_invitations WHERE id=p_invitation_id FOR UPDATE;
 IF v_status<>'pending' THEN RAISE EXCEPTION 'Only pending invitations can be cancelled'; END IF;
 UPDATE public.project_invitations SET status='cancelled',responded_at=now() WHERE id=p_invitation_id;
END;
$fn$;
CREATE OR REPLACE FUNCTION public.cancel_invitation(p_invitation_id uuid)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$
 SELECT private.cancel_invitation_impl(p_invitation_id);
$fn$;

CREATE OR REPLACE FUNCTION private.leave_project_impl(p_project_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_member_role text;v_status text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 SELECT member_role,membership_status INTO v_member_role,v_status
 FROM public.project_members WHERE project_id=p_project_id AND student_id=auth.uid() FOR UPDATE;
 IF NOT FOUND OR v_member_role='owner' OR v_status<>'active' THEN
  RAISE EXCEPTION 'Only active non-owner members may leave';
 END IF;
 UPDATE public.project_members SET membership_status='left'
 WHERE project_id=p_project_id AND student_id=auth.uid();
END;
$fn$;
CREATE OR REPLACE FUNCTION public.leave_project(p_project_id uuid)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$
 SELECT private.leave_project_impl(p_project_id);
$fn$;

-- Important: default execute permissions are PUBLIC; explicitly restrict BOTH layers.
REVOKE ALL ON FUNCTION private.save_my_profile_impl(text,text,text,smallint,text,smallint,text[],boolean,jsonb,uuid[],jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.create_project_impl(text,text,text,smallint,smallint,date,jsonb,uuid[],jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.apply_to_project_impl(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.decide_application_impl(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.withdraw_application_impl(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.invite_candidate_impl(uuid,uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.respond_invitation_impl(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.mark_notification_read_impl(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.set_project_status_impl(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.cancel_invitation_impl(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION private.leave_project_impl(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.save_my_profile_impl(text,text,text,smallint,text,smallint,text[],boolean,jsonb,uuid[],jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION private.create_project_impl(text,text,text,smallint,smallint,date,jsonb,uuid[],jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION private.apply_to_project_impl(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.decide_application_impl(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.withdraw_application_impl(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.invite_candidate_impl(uuid,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.respond_invitation_impl(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.mark_notification_read_impl(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.set_project_status_impl(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.cancel_invitation_impl(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.leave_project_impl(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.save_my_profile(text,text,text,smallint,text,smallint,text[],boolean,jsonb,uuid[],jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.create_project(text,text,text,smallint,smallint,date,jsonb,uuid[],jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.apply_to_project(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.decide_application(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.withdraw_application(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.invite_candidate(uuid,uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.respond_invitation(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.mark_notification_read(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.set_project_status(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.cancel_invitation(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.leave_project(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_my_profile(text,text,text,smallint,text,smallint,text[],boolean,jsonb,uuid[],jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_project(text,text,text,smallint,smallint,date,jsonb,uuid[],jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_to_project(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_application(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_application(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_candidate(uuid,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_invitation(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_project_status(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_project(uuid) TO authenticated;
COMMIT;

-- Notify Supabase/PostgREST that the callable RPC list has changed.
NOTIFY pgrst, 'reload schema';
