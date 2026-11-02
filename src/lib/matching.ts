/** Rule-based matching for the FULL normalized ERD. Zero external dependencies.
 *  Strict eligibility FIRST, scoring only among eligible candidates.
 *  Skill/interest comparisons use UUID references, not fragile text labels.
 */
import type { Slot, StudentProfile, ProjectFull, UUID } from './types';

export type MatchBreakdown = { skills: number; interests: number; availability: number; goals: number };
export type MatchResult = {
 candidate: StudentProfile; eligible: boolean; score: number | null;
 level: 'strong' | 'review' | 'low' | 'ineligible';
 reasons: string[]; breakdown: MatchBreakdown | null;
};
export const WEIGHTS = { skills: 0.40, interests: 0.25, availability: 0.20, goals: 0.15 } as const;
const normalize = (v: string) => v.trim().toLowerCase();
const pct = (hit: number, total: number) => total ? Math.min(100, Math.round(100 * hit / total)) : 50;
function minutes(s: string) {
 const parts = s.split(':');
 if (parts.length < 2 || parts.length > 3) return NaN;
 const h = Number(parts[0]), m = Number(parts[1]);
 if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return NaN;
 return h * 60 + m;
}
export function overlapMinutes(a: Slot,b: Slot): number {
 if (a.weekday !== b.weekday) return 0;
 const start = Math.max(minutes(a.start_time),minutes(b.start_time));
 const end = Math.min(minutes(a.end_time),minutes(b.end_time));
 return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0,end-start) : 0;
}
function allowed(candidate: StudentProfile, project: ProjectFull): string | null {
 if (project.status !== 'open') return 'Project is not open';
 if (!candidate.discoverable || !candidate.consent_at) return 'Student did not opt into discovery';
 if (candidate.id === project.owner_id) return 'Project owner is not a teammate candidate';
 const actual = new Set(candidate.skillRows.map(s=>s.skill_id));
 const missing = project.requiredSkills.filter(s=>s.mandatory && !actual.has(s.skill_id));
 if (missing.length) return `Missing ${missing.length} mandatory skill(s)`;
 if (project.min_weekly_hours > 0 && (candidate.weekly_hours === null || candidate.weekly_hours < project.min_weekly_hours))
   return `Weekly commitment of ${project.min_weekly_hours} hours not confirmed`;
 if (project.meetingSlots.length && !project.meetingSlots.some(p => candidate.availabilitySlots.some(c=>overlapMinutes(p,c)>0)))
   return 'No overlapping meeting time';
 return null;
}
export function scoreCandidate(project: ProjectFull, candidate: StudentProfile): MatchResult {
 const rejected = allowed(candidate,project);
 if (rejected) return { candidate, eligible:false, score:null, level:'ineligible', reasons:[rejected], breakdown:null };
 const actual = new Set<UUID>(candidate.skillRows.map(s=>s.skill_id));
 const swTotal = project.requiredSkills.reduce((sum,s)=>sum+Math.max(1,s.importance),0);
 const swHit = project.requiredSkills.filter(s=>actual.has(s.skill_id))
   .reduce((sum,s)=>sum+Math.max(1,s.importance),0);
 const skills = pct(swHit, swTotal);
 const ints = new Set(candidate.interestIds);
 const interests = pct(project.interestIds.filter(i=>ints.has(i)).length,project.interestIds.length);
 // Take maximum overlap for each required slot to avoid double-counting duplicate candidate windows.
 const requiredMinutes = project.meetingSlots.reduce((total,p)=>total+Math.max(0,minutes(p.end_time)-minutes(p.start_time)),0);
 const coveredMinutes = project.meetingSlots.reduce((sum,p)=>sum+Math.max(0,...candidate.availabilitySlots.map(s=>overlapMinutes(p,s))),0);
 const availability = pct(coveredMinutes, requiredMinutes);
 const preference = candidate.preferred_project_types ?? [];
 const goals = !preference.length ? 50 : preference.map(normalize).includes(normalize(project.project_type)) ? 100 : 0;
 const score = Math.round(skills*WEIGHTS.skills+interests*WEIGHTS.interests+availability*WEIGHTS.availability+goals*WEIGHTS.goals);
 const reasons=[
   project.requiredSkills.length ? `${project.requiredSkills.filter(s=>actual.has(s.skill_id)).length}/${project.requiredSkills.length} required/optional skills matched` : 'No project skill requirements; neutral score',
   project.interestIds.length ? `${project.interestIds.filter(i=>ints.has(i)).length}/${project.interestIds.length} project interests matched` : 'No target interests; neutral score',
   project.meetingSlots.length ? `${coveredMinutes} matching minutes of ${requiredMinutes} required` : 'No fixed meeting slots; neutral score',
   preference.length ? `Project type ${goals===100?'matches':'does not match'} preferences` : 'No project-type preference; neutral score',
 ];
 return { candidate, eligible:true, score, level:score>=80?'strong':score>=60?'review':'low',
   reasons, breakdown:{skills,interests,availability,goals} };
}
export function rankCandidates(project: ProjectFull,candidates: StudentProfile[]): MatchResult[] {
 return candidates.filter(c=>c.discoverable && c.consent_at && c.id!==project.owner_id)
   .map(c=>scoreCandidate(project,c))
   .filter(r=>r.eligible)
   .sort((a,b)=>(b.score ?? -1)-(a.score ?? -1));
}
