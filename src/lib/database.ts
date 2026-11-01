'use client';
/** CRUD adapter for the NORMALIZED 16-table schema; no skills[] in profiles/projects. */
import { supabase, currentUserId } from './supabase';
import type {
 Catalogs, ProfileRow, StudentProfile, ProjectRow, ProjectFull,
 ApplicationRow, InvitationRow, ProfileInput, NewProjectInput, RequiredSkill, Slot
} from './types';
import { rankCandidates, type MatchResult } from './matching';

function checked<T>(data: T, error: {message:string}|null): T {
 if(error) throw new Error(error.message); return data;
}
const required = <T>(item:T|null|undefined,label:string):T => {
 if(item===null || item===undefined) throw new Error(label+' not found or inaccessible');
 return item;
};

export async function catalogs(): Promise<Catalogs> {
 const db=supabase();
 const [sk,it]=await Promise.all([
  db.from('skills').select('id,name,category').order('name').limit(500),
  db.from('interests').select('id,name').order('name').limit(500)
 ]);
 return {skills:checked(sk.data,sk.error)??[],interests:checked(it.data,it.error)??[]};
}

export async function myProfile():Promise<StudentProfile|null> {
 const id=await currentUserId(), db=supabase();
 const [p,sk,it,slots]=await Promise.all([
  db.from('profiles').select('*').eq('id',id).maybeSingle(),
  db.from('student_skills').select('skill_id,proficiency').eq('student_id',id),
  db.from('student_interests').select('interest_id').eq('student_id',id),
  db.from('availability_slots').select('weekday,start_time,end_time').eq('student_id',id)
 ]);
 const profile=checked(p.data,p.error) as ProfileRow|null;
 if(!profile)return null;
 return { ...profile,
  skillRows:(checked(sk.data,sk.error)??[]) as StudentProfile['skillRows'],
  interestIds:(checked(it.data,it.error)??[]).map(x=>x.interest_id as string),
  availabilitySlots:(checked(slots.data,slots.error)??[]) as Slot[]};
}

export async function saveProfile(input:ProfileInput):Promise<void> {
 await currentUserId();
 const {error}=await supabase().rpc('save_my_profile',{
  p_display_name:input.display_name, p_faculty:input.faculty,
  p_programme:input.programme, p_year_of_study:input.year_of_study,
  p_bio:input.bio,p_weekly_hours:input.weekly_hours,
  p_preferred_project_types:input.preferred_project_types,
  p_discoverable:input.discoverable,
  p_skills:input.skills,p_interests:input.interests,p_slots:input.slots,
 });
 checked(null,error);
}

export async function listProjects():Promise<ProjectRow[]> {
 const {data,error}=await supabase().from('projects').select('*').eq('status','open')
 .order('created_at',{ascending:false}).limit(100);
 return (checked(data,error)??[]) as ProjectRow[];
}
export async function myProjects():Promise<ProjectRow[]> {
 const id=await currentUserId();
 const {data,error}=await supabase().from('projects').select('*').eq('owner_id',id)
 .order('created_at',{ascending:false}).limit(100);
 return (checked(data,error)??[]) as ProjectRow[];
}
export async function getProject(id:string):Promise<ProjectFull> {
 const db=supabase();
 const [p,sk,it,slots]=await Promise.all([
  db.from('projects').select('*').eq('id',id).single(),
  db.from('project_required_skills').select('skill_id,mandatory,importance').eq('project_id',id),
  db.from('project_interests').select('interest_id').eq('project_id',id),
  db.from('project_meeting_slots').select('weekday,start_time,end_time').eq('project_id',id)
 ]);
 const project=required(checked(p.data,p.error),'Project') as ProjectRow;
 return { ...project,
  requiredSkills:(checked(sk.data,sk.error)??[]) as RequiredSkill[],
  interestIds:(checked(it.data,it.error)??[]).map(x=>x.interest_id as string),
  meetingSlots:(checked(slots.data,slots.error)??[]) as Slot[]};
}
export async function createProject(input:NewProjectInput):Promise<string> {
 await currentUserId();
 const {data,error}=await supabase().rpc('create_project',{
  p_title:input.title,p_description:input.description,p_project_type:input.project_type,
  p_slots_needed:input.slots_needed,p_min_weekly_hours:input.min_weekly_hours,
  p_deadline:input.deadline,p_required_skills:input.required_skills,
  p_interests:input.interests,p_meeting_slots:input.meeting_slots
 });
 return required(checked(data,error) as string|null,'New project');
}
export async function applyToProject(projectId:string,note:string):Promise<string> {
 await currentUserId();
 const {data,error}=await supabase().rpc('apply_to_project',{p_project_id:projectId,p_note:note});
 return required(checked(data,error) as string|null,'New application');
}
export async function decideApplication(id:string,decision:'accepted'|'declined'):Promise<void> {
 await currentUserId();
 const {error}=await supabase().rpc('decide_application',{p_application_id:id,p_decision:decision});
 checked(null,error);
}
export async function withdrawApplication(id:string):Promise<void> {
 await currentUserId();
 const {error}=await supabase().rpc('withdraw_application',{p_application_id:id});
 checked(null,error);
}
export async function inviteCandidate(projectId:string,studentId:string,note:string):Promise<string> {
 await currentUserId();
 const {data,error}=await supabase().rpc('invite_candidate',{
  p_project_id:projectId,p_invitee_id:studentId,p_note:note
 });
 return required(checked(data,error) as string|null,'New invitation');
}
export async function respondInvitation(id:string,decision:'accepted'|'declined'):Promise<void> {
 await currentUserId();
 const {error}=await supabase().rpc('respond_invitation',{
  p_invitation_id:id,p_decision:decision
 }); checked(null,error);
}
export type ApplicationView=ApplicationRow & {projectTitle:string; studentName:string};
export type InvitationView=InvitationRow & {projectTitle:string; inviterName:string};
export async function myRequestLists():Promise<{
 sent:ApplicationView[];received:ApplicationView[];invitations:InvitationView[];
}> {
 const id=await currentUserId(), db=supabase();
 const own=await myProjects();
 const [sentRes,receivedRes,inviteRes]=await Promise.all([
  db.from('applications').select('*').eq('applicant_id',id).order('created_at',{ascending:false}).limit(100),
  own.length ? db.from('applications').select('*').in('project_id',own.map(p=>p.id)).order('created_at',{ascending:false}).limit(200)
             : Promise.resolve({data:[],error:null}),
  db.from('project_invitations').select('*').eq('invitee_id',id).order('created_at',{ascending:false}).limit(100)
 ]);
 const sent=(checked(sentRes.data,sentRes.error)??[]) as ApplicationRow[];
 const received=(checked(receivedRes.data,receivedRes.error)??[]) as ApplicationRow[];
 const invitations=(checked(inviteRes.data,inviteRes.error)??[]) as InvitationRow[];
 const projIds=[...new Set([...sent,...received].map(x=>x.project_id).concat(invitations.map(x=>x.project_id)))];
 const userIds=[...new Set(received.map(x=>x.applicant_id).concat(invitations.map(x=>x.inviter_id)))];
 const [projectRes,profileRes]=await Promise.all([
  projIds.length?db.from('projects').select('id,title').in('id',projIds):Promise.resolve({data:[],error:null}),
  userIds.length?db.from('profiles').select('id,display_name').in('id',userIds):Promise.resolve({data:[],error:null})
 ]);
 const projectName=new Map((checked(projectRes.data,projectRes.error)??[]).map(x=>[x.id,x.title]));
 const profileName=new Map((checked(profileRes.data,profileRes.error)??[]).map(x=>[x.id,x.display_name]));
 const withApp=(r:ApplicationRow):ApplicationView=>({...r,projectTitle:projectName.get(r.project_id)??'Project',studentName:profileName.get(r.applicant_id)??'Applicant'});
 return {sent:sent.map(withApp),received:received.map(withApp),
  invitations:invitations.map(r=>({...r,projectTitle:projectName.get(r.project_id)??'Project',inviterName:profileName.get(r.inviter_id)??'Project owner'}))};
}
export async function matchMyProject(projectId:string):Promise<MatchResult[]> {
 const id=await currentUserId(),db=supabase();
 const project=await getProject(projectId);
 if(project.owner_id!==id) throw new Error('Only project owner may evaluate candidates.');
 const profRes=await db.from('profiles').select('*').eq('discoverable',true).not('consent_at','is',null).neq('id',id).limit(200);
 const profiles=(checked(profRes.data,profRes.error)??[]) as ProfileRow[];
 if(!profiles.length)return [];
 const ids=profiles.map(p=>p.id);
 const [skillsRes,interestsRes,slotsRes,membersRes]=await Promise.all([
  db.from('student_skills').select('student_id,skill_id,proficiency').in('student_id',ids),
  db.from('student_interests').select('student_id,interest_id').in('student_id',ids),
  db.from('availability_slots').select('student_id,weekday,start_time,end_time').in('student_id',ids),
  db.from('project_members').select('student_id').eq('project_id',projectId).eq('membership_status','active')
 ]);
 const skills=checked(skillsRes.data,skillsRes.error)??[];
 const interests=checked(interestsRes.data,interestsRes.error)??[];
 const slots=checked(slotsRes.data,slotsRes.error)??[];
 const existing=new Set((checked(membersRes.data,membersRes.error)??[]).map(m=>m.student_id));
 const candidates:StudentProfile[]=profiles.filter(p=>!existing.has(p.id)).map(p=>({
  ...p,
  skillRows:skills.filter(s=>s.student_id===p.id).map(s=>({skill_id:s.skill_id,proficiency:s.proficiency as 'beginner'|'intermediate'|'advanced'})),
  interestIds:interests.filter(t=>t.student_id===p.id).map(t=>t.interest_id),
  availabilitySlots:slots.filter(t=>t.student_id===p.id).map(t=>({weekday:t.weekday,start_time:t.start_time,end_time:t.end_time}))
 }));
 return rankCandidates(project,candidates);
}
export async function submitBetaResult(task:string,success:boolean,difficulty:number,comment:string):Promise<void> {
 const id=await currentUserId();
 const {error}=await supabase().from('beta_test_results').insert({
  tester_id:id, task_code:task, success,
  difficulty_1_to_5:difficulty,comment:comment.slice(0,1000)
 }); checked(null,error);
}

export async function setProjectStatus(projectId:string,status:'open'|'closed'|'completed'):Promise<void>{
 await currentUserId();const {error}=await supabase().rpc('set_project_status',{
  p_project_id:projectId,p_status:status});checked(null,error);
}
export async function cancelInvitation(invitationId:string):Promise<void>{
 await currentUserId();const {error}=await supabase().rpc('cancel_invitation',{
  p_invitation_id:invitationId});checked(null,error);
}
export async function leaveProject(projectId:string):Promise<void>{
 await currentUserId();const {error}=await supabase().rpc('leave_project',{
  p_project_id:projectId});checked(null,error);
}
export async function getProjectMembers(projectId:string):Promise<{student_id:string;member_role:string;membership_status:string;name:string}[]>{
 await currentUserId();const db=supabase();
 const {data,error}=await db.from('project_members').select('student_id,member_role,membership_status')
 .eq('project_id',projectId);
 const members=checked(data,error)??[];if(!members.length)return [];
 const names=await db.from('profiles').select('id,display_name').in('id',members.map(m=>m.student_id));
 const nameMap=new Map((checked(names.data,names.error)??[]).map(p=>[p.id,p.display_name]));
 return members.map(m=>({...m,name:nameMap.get(m.student_id)??'Student'}));
}
export async function notifications(){
 await currentUserId();const {data,error}=await supabase().from('notifications').select('*')
 .order('created_at',{ascending:false}).limit(50);return checked(data,error)??[];
}
export async function markNotificationRead(id:string){
 await currentUserId();const {error}=await supabase().rpc('mark_notification_read',{p_notification_id:id});
 checked(null,error);
}
