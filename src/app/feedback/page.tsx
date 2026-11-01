'use client';
import {useState} from 'react';
import type {FormEvent} from 'react';import RequireAuth from '@/components/RequireAuth';import Nav from '@/components/Nav';
import {submitBetaResult} from '@/lib/database';
const tasks=[['T01','Complete student profile'],['T02','Find an open project'],['T03','View matching recommendations'],['T04','Send an application'],['T05','Accept or decline a request']];
function Content(){const [task,setTask]=useState('T01'),[success,setSuccess]=useState(true),[difficulty,setDifficulty]=useState(3),[comment,setComment]=useState(''),[busy,setBusy]=useState(false),[ok,setOk]=useState(''),[error,setError]=useState('');
async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');setOk('');try{
 await submitBetaResult(task,success,difficulty,comment);setOk('Feedback recorded. Thank you!');setComment('');
}catch(e){setError(e instanceof Error?e.message:'Feedback failed');}finally{setBusy(false);}}
return <main className="container" style={{maxWidth:680}}><h1>Beta Test Feedback</h1><p className="intro">Only submit your own results after trying a task. Do not include other participants' contact details in comments.</p>
<form className="panel" onSubmit={submit}><div className="field"><label htmlFor="task">Test scenario</label><select id="task" value={task} onChange={e=>setTask(e.target.value)}>{tasks.map(([id,name])=><option value={id} key={id}>{id} — {name}</option>)}</select></div>
<div className="field"><label htmlFor="success">Did you complete it?</label><select id="success" value={success?'yes':'no'} onChange={e=>setSuccess(e.target.value==='yes')}><option value="yes">Yes</option><option value="no">No</option></select></div>
<div className="field"><label htmlFor="difficulty">Difficulty (1 easy–5 hard)</label><select id="difficulty" value={difficulty} onChange={e=>setDifficulty(Number(e.target.value))}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
<div className="field"><label htmlFor="comments">What worked or failed?</label><textarea id="comments" value={comment} maxLength={1000} onChange={e=>setComment(e.target.value)}/></div>
{error&&<p className="alert error" role="alert">{error}</p>}{ok&&<p className="alert ok" role="status">{ok}</p>}
<button className="primary" disabled={busy}>{busy?'Saving...':'Submit feedback'}</button></form></main>}
export default function FeedbackPage(){return <RequireAuth><Nav/><Content/></RequireAuth>}
