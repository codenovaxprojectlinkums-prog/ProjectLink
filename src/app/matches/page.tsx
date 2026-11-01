'use client';
import {useEffect,useState} from 'react';
import Nav from '@/components/Nav';import RequireAuth from '@/components/RequireAuth';
import {myProjects,matchMyProject,inviteCandidate} from '@/lib/database';
import type {ProjectRow} from '@/lib/types';import type {MatchResult} from '@/lib/matching';
function Content(){const [projects,setProjects]=useState<ProjectRow[]>([]),[selected,setSelected]=useState(''),
 [results,setResults]=useState<MatchResult[]>([]),[error,setError]=useState(''),[ok,setOk]=useState(''),
 [busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
useEffect(()=>{myProjects().then(ps=>{setProjects(ps);if(ps[0])setSelected(ps[0].id);}).catch(e=>setError(e.message));},[]);
async function run(){if(!selected)return;setLoading(true);setError('');setOk('');try{setResults(await matchMyProject(selected));}catch(e){setError(e instanceof Error?e.message:'Cannot match candidates');}finally{setLoading(false);}}
async function invite(id:string,name:string){if(!selected)return;setBusy(true);setError('');setOk('');try{
 await inviteCandidate(selected,id,`Hi ${name}! We'd like you to collaborate on this project.`);
 setOk(`Invitation sent to ${name}. It is pending their decision.`);
}catch(e){setError(e instanceof Error?e.message:'Cannot invite student');}finally{setBusy(false);}}
return <main className="container"><h1>Find Matching Teammates</h1>
<p className="intro">Compare project requirements with discoverable profiles using the normalized full database. Matching is rule-based, not AI.</p>
<div className="panel"><div className="field"><label htmlFor="project">Your project</label>
<select id="project" value={selected} onChange={e=>{setSelected(e.target.value);setResults([]);}}>
{projects.map(p=><option key={p.id} value={p.id}>{p.title} ({p.status})</option>)}
</select></div><button className="primary" onClick={run} disabled={!selected||loading}>{loading?'Matching...':'Find Candidates'}</button>
{!projects.length&&<p className="muted">Create a project first to use teammate matching.</p>}
{error&&<p className="alert error" role="alert">{error}</p>}{ok&&<p className="alert ok">{ok}</p>}
<p className="muted">Scoring: Skills 40% · Interests 25% · Time 20% · Project goals 15%. Mandatory requirements are checked first.</p>
<p className="muted">Results are limited to 200 consenting discoverable profiles during this pilot.</p></div>
<div className="grid" style={{marginTop:20}}>{results.map(r=><article className="card" key={r.candidate.id}>
<div className="row"><strong>{r.candidate.display_name}</strong><span className={'badge '+(r.level==='strong'?'green':r.eligible?'yellow':'')}>{r.eligible?`${r.score}% match`:'Not eligible'}</span></div>
<p className="muted">{r.candidate.faculty} • {r.candidate.programme??'Programme not stated'}</p>
{r.breakdown&&<div className="metrics"><div className="metric"><strong>{r.breakdown.skills}</strong>Skills</div><div className="metric"><strong>{r.breakdown.interests}</strong>Interests</div>
<div className="metric"><strong>{r.breakdown.availability}</strong>Time</div><div className="metric"><strong>{r.breakdown.goals}</strong>Goals</div></div>}
<ul>{r.reasons.map((reason,i)=><li key={i} className="muted">{reason}</li>)}</ul>
{r.eligible&&<button className="primary" onClick={()=>invite(r.candidate.id,r.candidate.display_name)} disabled={busy}>{busy?'Working...':'Invite to project'}</button>}
</article>)}</div>
{!loading&&!results.length&&<p className="muted">Choose one of your projects and select Find Candidates.</p>}
</main>}
export default function MatchPage(){return <RequireAuth><Nav/><Content/></RequireAuth>}
