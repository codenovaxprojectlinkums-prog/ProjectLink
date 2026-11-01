'use client';
import {useEffect,useState} from 'react';
import type {FormEvent} from 'react';
import Nav from '@/components/Nav';import RequireAuth from '@/components/RequireAuth';
import TagPicker from '@/components/TagPicker';import SlotEditor from '@/components/SlotEditor';
import {catalogs,myProfile,saveProfile} from '@/lib/database';
import type {Catalogs,ProfileInput} from '@/lib/types';
const empty:ProfileInput={display_name:'',faculty:'',programme:'',year_of_study:null,bio:'',weekly_hours:null,
 preferred_project_types:[],discoverable:false,skills:[],interests:[],slots:[]};
const projectTypes=['Assignment','Competition','Innovation','Community','Other'];
function ProfileContent(){const [form,setForm]=useState<ProfileInput>(empty);const [catalog,setCatalog]=useState<Catalogs>({skills:[],interests:[]});
const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[ok,setOk]=useState('');
useEffect(()=>{Promise.all([catalogs(),myProfile()]).then(([c,p])=>{setCatalog(c);if(p)setForm({display_name:p.display_name,faculty:p.faculty,programme:p.programme??'',year_of_study:p.year_of_study,
 bio:p.bio??'',weekly_hours:p.weekly_hours,preferred_project_types:p.preferred_project_types??[],discoverable:p.discoverable,
 skills:p.skillRows,interests:p.interestIds,slots:p.availabilitySlots});}).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
function patch(p:Partial<ProfileInput>){setForm(x=>({...x,...p}));}
async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');setOk('');try{
 await saveProfile(form);setOk('Profile and related skills, interests and availability were saved together.');
}catch(e){setError(e instanceof Error?e.message:'Save failed');}finally{setBusy(false);}}
if(loading)return <main className="container">Loading profile...</main>;
return <main className="container"><h1>My Student Profile</h1><p className="intro">Complete this before creating or applying to projects. Discovery is OFF until you actively opt in.</p>
<form className="panel" onSubmit={submit}>
<div className="grid">
<div className="field"><label htmlFor="name">Display name *</label><input id="name" required minLength={2} maxLength={120} value={form.display_name} onChange={e=>patch({display_name:e.target.value})}/></div>
<div className="field"><label htmlFor="faculty">Faculty *</label><input id="faculty" required value={form.faculty} onChange={e=>patch({faculty:e.target.value})}/></div>
<div className="field"><label htmlFor="programme">Programme</label><input id="programme" value={form.programme} onChange={e=>patch({programme:e.target.value})}/></div>
<div className="field"><label htmlFor="year">Year of study</label><select id="year" value={form.year_of_study??''} onChange={e=>patch({year_of_study:e.target.value?Number(e.target.value):null})}><option value="">Not stated</option>{[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
<div className="field"><label htmlFor="hours">Hours available per week</label><input id="hours" type="number" min={0} max={168} value={form.weekly_hours??''} onChange={e=>patch({weekly_hours:e.target.value===''?null:Number(e.target.value)})}/></div>
</div>
<div className="field"><label htmlFor="bio">Short introduction</label><textarea id="bio" value={form.bio} onChange={e=>patch({bio:e.target.value})}/></div>
<h2>Your Skills</h2><p className="muted">Select skills you can contribute. Proficiency defaults to beginner; edit individually below.</p>
<TagPicker items={catalog.skills} selected={form.skills.map(s=>s.skill_id)} onChange={ids=>patch({skills:ids.map(id=>form.skills.find(s=>s.skill_id===id)??{skill_id:id,proficiency:'beginner'})})}/>
{form.skills.map(s=><div key={s.skill_id} className="row" style={{marginTop:6}}><span>{catalog.skills.find(t=>t.id===s.skill_id)?.name??'Skill'}</span>
<select aria-label="Proficiency" value={s.proficiency} onChange={e=>patch({skills:form.skills.map(x=>x.skill_id===s.skill_id?{...x,proficiency:e.target.value as typeof s.proficiency}:x)})}>
<option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>)}
<hr className="divider"/><h2>Interests</h2><TagPicker items={catalog.interests} selected={form.interests} onChange={interests=>patch({interests})}/>
<hr className="divider"/><h2>Preferred Project Types</h2><div className="chips">{projectTypes.map(t=><button className={'chip '+(form.preferred_project_types.includes(t)?'on':'')} type="button" key={t} aria-pressed={form.preferred_project_types.includes(t)} onClick={()=>patch({preferred_project_types:form.preferred_project_types.includes(t)?form.preferred_project_types.filter(x=>x!==t):[...form.preferred_project_types,t]})}>{t}</button>)}</div>
<hr className="divider"/><h2>Availability (Asia/Kuching)</h2><p className="muted">Specify days and time periods you could meet.</p><SlotEditor value={form.slots} onChange={slots=>patch({slots})}/>
<hr className="divider"/><label className="checkline"><input type="checkbox" checked={form.discoverable} onChange={e=>patch({discoverable:e.target.checked})}/><strong>Show my profile and matching data to authenticated students for finding teammates (optional)</strong></label>
<p className="muted">You can switch discovery off at any time. Your name and skills may still be shared with owners of projects you deliberately apply to.</p>
{error&&<p className="alert error" role="alert">{error}</p>}{ok&&<p className="alert ok" role="status">{ok}</p>}
<button className="primary" disabled={busy}>{busy?'Saving...':'Save Profile'}</button></form></main>;
}
export default function ProfilePage(){return <RequireAuth><Nav/><ProfileContent/></RequireAuth>}
