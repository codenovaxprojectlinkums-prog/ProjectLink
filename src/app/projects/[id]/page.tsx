'use client';
import {useEffect,useState} from 'react';import {useParams} from 'next/navigation';import Link from 'next/link';
import Nav from '@/components/Nav';import RequireAuth from '@/components/RequireAuth';
import {getProject,catalogs,applyToProject} from '@/lib/database';import {currentUserId} from '@/lib/supabase';
import type {ProjectFull,Catalogs} from '@/lib/types';
function Content(){const params=useParams<{id:string}>();const [p,setP]=useState<ProjectFull|null>(null);
const [cat,setCat]=useState<Catalogs>({skills:[],interests:[]}),[me,setMe]=useState(''),[note,setNote]=useState(''),
[error,setError]=useState(''),[ok,setOk]=useState(''),[busy,setBusy]=useState(false);
useEffect(()=>{Promise.all([getProject(params.id),catalogs(),currentUserId()]).then(([a,b,c])=>{setP(a);setCat(b);setMe(c);}).catch(e=>setError(e.message));},[params.id]);
async function apply(){if(!p)return;setBusy(true);setError('');setOk('');try{
 await applyToProject(p.id,note);setOk('Request saved! See your requests page for status.');
}catch(e){setError(e instanceof Error?e.message:'Unable to apply');}finally{setBusy(false);}}
return <main className="container">{!p?<p>{error||'Loading project...'}</p>:<>
<span className="badge">{p.project_type}</span><h1 style={{marginTop:12}}>{p.title}</h1><p className="intro">{p.description}</p>
<div className="grid"><div className="card"><h2>Team requirements</h2><p>{p.slots_needed} additional members</p><p>Minimum commitment: {p.min_weekly_hours} hours/week</p><p>Deadline: {p.deadline??'Not stated'}</p></div>
<div className="card"><h2>Skills & interests</h2><p><strong>Skills:</strong> {p.requiredSkills.map(x=>cat.skills.find(s=>s.id===x.skill_id)?.name+(x.mandatory?' (required)':' (optional)')).join(', ')||'Not specified'}</p>
<p><strong>Interests:</strong> {p.interestIds.map(x=>cat.interests.find(s=>s.id===x)?.name).join(', ')||'Not specified'}</p></div>
<div className="card"><h2>Meeting schedule</h2>{p.meetingSlots.map((s,i)=><p key={i}>Day {s.weekday}: {s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}</p>)}{!p.meetingSlots.length&&<p>Flexible / not specified</p>}</div></div>
<section className="panel"><h2>{me===p.owner_id?'Your project':'Request to join'}</h2>
{me===p.owner_id?<div className="btns"><Link className="btn" href="/matches">Find teammates</Link><Link className="btn" href="/requests">Review applications</Link></div>:<>
<p>Introduce yourself. The project owner will decide whether to accept your request.</p><div className="field"><label htmlFor="note">Short message</label><textarea id="note" maxLength={500} value={note} onChange={e=>setNote(e.target.value)}/></div>
<button className="primary" onClick={apply} disabled={busy}>{busy?'Sending...':'Express interest / Apply'}</button></>}
{error&&<p className="alert error" role="alert">{error}</p>}{ok&&<p className="alert ok" role="status">{ok}</p>}
</section></>}</main>}
export default function ProjectDetailsPage(){return <RequireAuth><Nav/><Content/></RequireAuth>}
