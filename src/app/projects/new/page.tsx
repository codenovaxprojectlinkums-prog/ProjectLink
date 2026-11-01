'use client';
import {useEffect,useState} from 'react';
import type {FormEvent} from 'react';import {useRouter} from 'next/navigation';
import Nav from '@/components/Nav';import RequireAuth from '@/components/RequireAuth';
import TagPicker from '@/components/TagPicker';import SlotEditor from '@/components/SlotEditor';
import {catalogs,createProject} from '@/lib/database';
import type {Catalogs,NewProjectInput} from '@/lib/types';
const types=['Assignment','Competition','Innovation','Community','Other'];
const initial:NewProjectInput={title:'',description:'',project_type:'Competition',slots_needed:1,min_weekly_hours:0,
 deadline:null,required_skills:[],interests:[],meeting_slots:[]};
function Content(){const router=useRouter();const [p,setP]=useState<NewProjectInput>(initial),[catalog,setCatalog]=useState<Catalogs>({skills:[],interests:[]});
const [error,setError]=useState(''),[busy,setBusy]=useState(false);
useEffect(()=>{catalogs().then(setCatalog).catch(e=>setError(e.message));},[]);
function patch(v:Partial<NewProjectInput>){setP(x=>({...x,...v}));}
async function submit(e:FormEvent){e.preventDefault();setError('');setBusy(true);
try{const id=await createProject(p);router.push(`/projects/${id}`);}catch(e){setError(e instanceof Error?e.message:'Failed to create project');}finally{setBusy(false);}}
return <main className="container"><h1>Create Project</h1><p className="intro">Share your collaboration opportunity. Skills, interests and meeting times are stored as normalized relationships.</p>
<form className="panel" onSubmit={submit}>
<div className="field"><label htmlFor="title">Project name *</label><input id="title" required minLength={4} maxLength={150} value={p.title} onChange={e=>patch({title:e.target.value})}/></div>
<div className="field"><label htmlFor="desc">Project description *</label><textarea id="desc" required minLength={10} value={p.description} onChange={e=>patch({description:e.target.value})}/></div>
<div className="grid">
<div className="field"><label htmlFor="type">Project type</label><select id="type" value={p.project_type} onChange={e=>patch({project_type:e.target.value})}>{types.map(t=><option key={t}>{t}</option>)}</select></div>
<div className="field"><label htmlFor="slots">Additional teammate slots</label><input id="slots" type="number" required min={1} max={50} value={p.slots_needed} onChange={e=>patch({slots_needed:Number(e.target.value)})}/></div>
<div className="field"><label htmlFor="minimum">Minimum available hours/week</label><input id="minimum" type="number" min={0} max={168} value={p.min_weekly_hours} onChange={e=>patch({min_weekly_hours:Number(e.target.value)})}/></div>
<div className="field"><label htmlFor="deadline">Deadline (optional)</label><input id="deadline" type="date" value={p.deadline??''} onChange={e=>patch({deadline:e.target.value||null})}/></div></div>
<h2>Required skills</h2><TagPicker items={catalog.skills} selected={p.required_skills.map(s=>s.skill_id)} onChange={ids=>patch({required_skills:ids.map(id=>p.required_skills.find(x=>x.skill_id===id)??{skill_id:id,mandatory:true,importance:3})})}/>
{p.required_skills.map(s=><div key={s.skill_id} className="row" style={{marginTop:9}}><span>{catalog.skills.find(x=>x.id===s.skill_id)?.name??'Skill'}</span>
<label className="checkline"><input type="checkbox" checked={s.mandatory} onChange={e=>patch({required_skills:p.required_skills.map(x=>x.skill_id===s.skill_id?{...x,mandatory:e.target.checked}:x)})}/> Mandatory</label>
<label>Importance <select value={s.importance} onChange={e=>patch({required_skills:p.required_skills.map(x=>x.skill_id===s.skill_id?{...x,importance:Number(e.target.value)}:x)})}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></label></div>)}
<hr className="divider"/><h2>Project interests</h2><TagPicker items={catalog.interests} selected={p.interests} onChange={interests=>patch({interests})}/>
<hr className="divider"/><h2>Meeting times (Asia/Kuching)</h2><SlotEditor value={p.meeting_slots} onChange={meeting_slots=>patch({meeting_slots})}/>
{error&&<p className="alert error" role="alert">{error}</p>}
<button className="primary" disabled={busy}>{busy?'Creating...':'Publish Project'}</button></form></main>}
export default function NewProjectPage(){return <RequireAuth><Nav/><Content/></RequireAuth>}
