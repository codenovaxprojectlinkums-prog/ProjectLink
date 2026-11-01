'use client';
import {useEffect,useState} from 'react';import RequireAuth from '@/components/RequireAuth';import Nav from '@/components/Nav';
import {myProjects,getProjectMembers,setProjectStatus} from '@/lib/database';import type {ProjectRow} from '@/lib/types';
function Content(){const [projects,setProjects]=useState<ProjectRow[]>([]),[chosen,setChosen]=useState(''),[members,setMembers]=useState<{student_id:string;member_role:string;membership_status:string;name:string}[]>([]),
[error,setError]=useState(''),[ok,setOk]=useState(''),[busy,setBusy]=useState(false);
useEffect(()=>{myProjects().then(p=>{setProjects(p);if(p.length)setChosen(p[0].id);}).catch(e=>setError(e.message));},[]);
useEffect(()=>{if(chosen)getProjectMembers(chosen).then(setMembers).catch(e=>setError(e.message));},[chosen]);
async function status(st:'open'|'closed'|'completed'){if(!chosen)return;setBusy(true);setError('');setOk('');try{
 await setProjectStatus(chosen,st);setProjects(p=>p.map(x=>x.id===chosen?{...x,status:st}:x));setOk('Project status updated.');
}catch(e){setError(e instanceof Error?e.message:'Could not update');}finally{setBusy(false);}}
return <main className="container"><h1>My Project Teams</h1><p className="intro">Project owners can see members and manage whether new applications are allowed.</p>
<div className="panel"><div className="field"><label htmlFor="pick">Project</label><select id="pick" value={chosen} onChange={e=>setChosen(e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
{!projects.length&&<p>No projects owned yet.</p>}
<div className="btns"><button className="secondary" disabled={busy||!chosen} onClick={()=>status('open')}>Open</button><button className="secondary" disabled={busy||!chosen} onClick={()=>status('closed')}>Close</button>
<button className="secondary" disabled={busy||!chosen} onClick={()=>status('completed')}>Mark completed</button></div>
{error&&<p className="alert error">{error}</p>}{ok&&<p className="alert ok">{ok}</p>}</div>
<div className="panel"><h2>Current and past members</h2>{members.map(m=><div key={m.student_id} className="row" style={{margin:'10px 0'}}><strong>{m.name}</strong><span className="badge">{m.member_role} · {m.membership_status}</span></div>)}{!members.length&&<p>No member records yet.</p>}</div>
</main>}
export default function TeamPage(){return <RequireAuth><Nav/><Content/></RequireAuth>}
