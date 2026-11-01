'use client';
import {useEffect,useState} from 'react';
import Nav from '@/components/Nav';import RequireAuth from '@/components/RequireAuth';
import {myRequestLists,decideApplication,withdrawApplication,respondInvitation, type ApplicationView,type InvitationView} from '@/lib/database';
function Content(){const [sent,setSent]=useState<ApplicationView[]>([]),[received,setReceived]=useState<ApplicationView[]>([]),
 [invitations,setInvitations]=useState<InvitationView[]>([]),[error,setError]=useState(''),[ok,setOk]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
async function reload(){const r=await myRequestLists();setSent(r.sent);setReceived(r.received);setInvitations(r.invitations);}
useEffect(()=>{reload().catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
async function action(fn:()=>Promise<void>,success:string){setBusy(true);setError('');setOk('');try{await fn();await reload();setOk(success);}catch(e){setError(e instanceof Error?e.message:'Request failed');}finally{setBusy(false);}}
return <main className="container"><h1>Collaboration Requests</h1><p className="intro">Manage applications and invitations. Only the project owner can accept an application; only the invitee can respond to an invitation.</p>
{loading&&<p>Loading requests...</p>}{error&&<p className="alert error" role="alert">{error}</p>}{ok&&<p className="alert ok" role="status">{ok}</p>}
<section className="panel"><h2>Applications received by your projects</h2>
<div className="stack">{received.map(a=><div key={a.id} className="card"><div className="row"><strong>{a.studentName} → {a.projectTitle}</strong><span className="badge">{a.status}</span></div><p>{a.note||'No message'}</p>
{a.status==='pending'&&<div className="btns"><button disabled={busy} className="primary" onClick={()=>action(()=>decideApplication(a.id,'accepted'),'Application accepted and member created.')}>Accept</button>
<button disabled={busy} className="secondary" onClick={()=>action(()=>decideApplication(a.id,'declined'),'Application declined.')}>Decline</button></div>}</div>)}
{!received.length&&<p className="muted">No received applications.</p>}</div></section>
<section className="panel"><h2>Applications you sent</h2><div className="stack">{sent.map(a=><div key={a.id} className="card"><div className="row"><strong>{a.projectTitle}</strong><span className="badge">{a.status}</span></div>
<p>{a.note}</p>{a.status==='pending'&&<button disabled={busy} className="secondary" onClick={()=>action(()=>withdrawApplication(a.id),'Application withdrawn.')}>Withdraw</button>}</div>)}
{!sent.length&&<p className="muted">No applications sent yet.</p>}</div></section>
<section className="panel"><h2>Project invitations you received</h2><div className="stack">{invitations.map(i=><div key={i.id} className="card"><div className="row"><strong>{i.projectTitle}</strong><span className="badge">{i.status}</span></div><p>From: {i.inviterName}</p><p>{i.note}</p>
{i.status==='pending'&&<div className="btns"><button disabled={busy} className="primary" onClick={()=>action(()=>respondInvitation(i.id,'accepted'),'Invitation accepted: you joined the project.')}>Accept invitation</button>
<button disabled={busy} className="secondary" onClick={()=>action(()=>respondInvitation(i.id,'declined'),'Invitation declined.')}>Decline</button></div>}</div>)}
{!invitations.length&&<p className="muted">No invitations received.</p>}</div></section>
</main>}
export default function RequestsPage(){return <RequireAuth><Nav/><Content/></RequireAuth>}
