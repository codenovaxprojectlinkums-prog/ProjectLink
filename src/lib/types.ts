/** Logical full-ERD types. Database column names and RPC parameters are intentionally explicit. */
export type UUID = string;
export type Slot = { weekday: number; start_time: string; end_time: string };
export type SkillRow = { id: UUID; name: string; category: string | null };
export type InterestRow = { id: UUID; name: string };
export type StudentSkill = { skill_id: UUID; proficiency: 'beginner' | 'intermediate' | 'advanced' };
export type ProfileRow = {
 id: UUID; display_name: string; faculty: string; programme: string | null;
 year_of_study: number | null; bio: string | null; avatar_url: string | null;
 weekly_hours: number | null; preferred_project_types: string[] | null;
 discoverable: boolean; consent_at: string | null; created_at: string; updated_at: string;
};
export type StudentProfile = ProfileRow & {
 skillRows: StudentSkill[]; interestIds: UUID[]; availabilitySlots: Slot[];
};
export type ProjectRow = {
 id: UUID; owner_id: UUID; title: string; description: string;
 project_type: string; slots_needed: number; min_weekly_hours: number;
 status: 'open'|'closed'|'completed'; deadline: string | null;
 created_at: string; updated_at: string;
};
export type RequiredSkill = { skill_id: UUID; mandatory: boolean; importance: number };
export type ProjectFull = ProjectRow & {
 requiredSkills: RequiredSkill[]; interestIds: UUID[]; meetingSlots: Slot[];
};
export type ApplicationRow = {
 id: UUID; project_id: UUID; applicant_id: UUID; note: string | null;
 status: 'pending'|'accepted'|'declined'|'withdrawn';
 created_at: string; responded_at: string | null;
};
export type InvitationRow = {
 id: UUID; project_id: UUID; inviter_id: UUID; invitee_id: UUID;
 note: string | null; status: 'pending'|'accepted'|'declined'|'cancelled';
 created_at: string; responded_at: string | null;
};
export type Catalogs = { skills: SkillRow[]; interests: InterestRow[] };
export type ProfileInput = {
 display_name: string; faculty: string; programme: string; year_of_study: number | null;
 bio: string; weekly_hours: number | null; preferred_project_types: string[];
 discoverable: boolean; skills: StudentSkill[]; interests: UUID[]; slots: Slot[];
};
export type NewProjectInput = {
 title: string; description: string; project_type: string; slots_needed: number;
 min_weekly_hours: number; deadline: string | null; required_skills: RequiredSkill[];
 interests: UUID[]; meeting_slots: Slot[];
};
