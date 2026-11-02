import test from 'node:test';import assert from 'node:assert/strict';
import {scoreCandidate,rankCandidates,overlapMinutes} from '../src/lib/matching.ts';
const candidate={id:'student-001',display_name:'Example',faculty:'FKI',programme:'SE',year_of_study:1,
 bio:null,avatar_url:null,weekly_hours:8,preferred_project_types:['Competition'],discoverable:true,
 consent_at:'2026-11-01T00:00:00Z',created_at:'',updated_at:'',
 skillRows:[{skill_id:'figma',proficiency:'intermediate'},{skill_id:'frontend',proficiency:'beginner'}],
 interestIds:['innovation'],availabilitySlots:[{weekday:6,start_time:'09:00:00',end_time:'12:00:00'}]};
const project={id:'project-001',owner_id:'owner-001',title:'UMS Challenge',description:'Demo',
 project_type:'Competition',status:'open',slots_needed:2,min_weekly_hours:4,deadline:null,
 created_at:'',updated_at:'',requiredSkills:[{skill_id:'figma',mandatory:true,importance:5},
 {skill_id:'backend',mandatory:false,importance:2}],interestIds:['innovation'],
 meetingSlots:[{weekday:6,start_time:'10:00:00',end_time:'11:00:00'}]};
test('full-normalized eligible match scores expected components',()=>{
 const r=scoreCandidate(project,candidate);
 assert.equal(r.eligible,true);
 assert.equal(r.breakdown.skills,71);
 assert.equal(r.breakdown.interests,100);
 assert.equal(r.breakdown.availability,100);
 assert.equal(r.breakdown.goals,100);
 assert.equal(r.score,88);
});
test('reject missing mandatory skill even if other categories are perfect',()=>{
 const r=scoreCandidate(project,{...candidate,skillRows:[]});
 assert.equal(r.eligible,false);assert.equal(r.score,null);
});
test('refuse unconsented discovery and owner as candidate',()=>{
 assert.equal(scoreCandidate(project,{...candidate,discoverable:false}).eligible,false);
 assert.equal(scoreCandidate(project,{...candidate,consent_at:null}).eligible,false);
 assert.equal(scoreCandidate(project,{...candidate,id:project.owner_id}).eligible,false);
});
test('reject no overlapping time and inadequate commitment',()=>{
 assert.equal(scoreCandidate(project,{...candidate,availabilitySlots:[{weekday:7,start_time:'10:00',end_time:'11:00'}]}).eligible,false);
 assert.equal(scoreCandidate(project,{...candidate,weekly_hours:2}).eligible,false);
 assert.equal(scoreCandidate(project,{...candidate,weekly_hours:null}).eligible,false);
});
test('neutral criteria do not inflate score to 100',()=>{
 const r=scoreCandidate({...project,requiredSkills:[],interestIds:[],meetingSlots:[],min_weekly_hours:0},
 {...candidate,preferred_project_types:[]});
 assert.equal(r.eligible,true);assert.equal(r.score,50);
});
test('overlap follows weekday and interval boundary rules',()=>{
 assert.equal(overlapMinutes({weekday:1,start_time:'09:00',end_time:'10:00'},
 {weekday:1,start_time:'10:00',end_time:'11:00'}),0);
 assert.equal(overlapMinutes({weekday:1,start_time:'09:00',end_time:'11:00'},
 {weekday:1,start_time:'10:00',end_time:'12:00'}),60);
 assert.equal(overlapMinutes({weekday:1,start_time:'09:00',end_time:'11:00'},
 {weekday:2,start_time:'09:00',end_time:'11:00'}),0);
});
test('ranking filters opt-outs and orders by score',()=>{
 const r=rankCandidates(project,[{...candidate,id:'c2',skillRows:[{skill_id:'figma',proficiency:'beginner'}],interestIds:[]},
 candidate,{...candidate,id:'c3',discoverable:false}]);
 assert.equal(r.length,2);assert.equal(r[0].candidate.id,'student-001');
});
