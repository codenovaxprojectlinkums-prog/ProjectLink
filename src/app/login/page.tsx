'use client';
import { useState } from 'react';
import type {FormEvent} from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
export default function Login(){const router=useRouter();
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setError('');setBusy(true);
  try{const {error}=await supabase().auth.signInWithPassword({email,password});if(error)throw error;router.replace('/dashboard');}
  catch(e){setError(e instanceof Error?e.message:'Login failed');}finally{setBusy(false);}
 }
 return <main className="container" style={{maxWidth:510}}><h1>Beta Sign In</h1><p className="intro">Use the test account provided by the ProjectLinkUMS team. No open registration for this beta.</p>
 <form className="panel" onSubmit={submit}>
  <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></div>
  <div className="field"><label htmlFor="password">Password</label><input id="password" type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></div>
  {error&&<p className="alert error" role="alert">{error}</p>}
  <button className="primary" disabled={busy}>{busy?'Signing in...':'Sign in'}</button>
 </form></main>}
