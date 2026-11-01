'use client';
import {useEffect,useState} from 'react';import RequireAuth from '@/components/RequireAuth';import Nav from '@/components/Nav';
import {notifications,markNotificationRead} from '@/lib/database';
type Item={id:string;event_type:string;target_type:string;target_id:string;read_at:string|null;created_at:string};
function Content(){const [items,setItems]=useState<Item[]>([]),[error,setError]=useState('');
useEffect(()=>{notifications().then(v=>setItems(v as Item[])).catch(e=>setError(e.message));},[]);
async function read(id:string){try{await markNotificationRead(id);setItems(x=>x.map(n=>n.id===id?{...n,read_at:new Date().toISOString()}:n));}catch(e){setError(e instanceof Error?e.message:'Failed');}}
return <main className="container"><h1>Notifications</h1><p className="intro">Application and invitation alerts from the database.</p>{error&&<p className="alert error">{error}</p>}
<div className="stack">{items.map(n=><article className="card" key={n.id}><div className="row"><strong>{n.event_type.replaceAll('_',' ')}</strong><span className="badge">{n.read_at?'Read':'New'}</span></div>
<p className="muted">{new Date(n.created_at).toLocaleString()}</p>{!n.read_at&&<button className="secondary" onClick={()=>read(n.id)}>Mark as read</button>}</article>)}
{!items.length&&<p className="panel">No notifications.</p>}</div></main>}
export default function NotificationsPage(){return <RequireAuth><Nav/><Content/></RequireAuth>}
