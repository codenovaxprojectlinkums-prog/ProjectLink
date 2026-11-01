'use client';
import {useEffect,useState} from 'react';import Link from 'next/link';
import Nav from '@/components/Nav';import RequireAuth from '@/components/RequireAuth';
import {listProjects} from '@/lib/database';import type {ProjectRow} from '@/lib/types';
function Content(){const [projects,setProjects]=useState<ProjectRow[]>([]),[q,setQ]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true);
useEffect(()=>{listProjects().then(setProjects).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
const show=projects.filter(x=>[x.title,x.description,x.project_type].join(' ').toLowerCase().includes(q.toLowerCase()));
return <main className="container"><div className="row"><div><h1>Discover Projects</h1><p className="intro">Explore open UMS student opportunities.</p></div><Link href="/projects/new" className="btn">+ Create Project</Link></div>
<div className="field"><label htmlFor="search">Search projects</label><input id="search" placeholder="e.g. Innovation, web app, competition" value={q} onChange={e=>setQ(e.target.value)}/></div>
{loading&&<p>Loading projects...</p>}{error&&<p className="alert error">{error}</p>}
<div className="grid">{show.map(p=><article key={p.id} className="card"><span className="badge">{p.project_type}</span><h2 style={{marginTop:12}}>{p.title}</h2><p>{p.description?.slice(0,160)}</p>
<p className="muted">{p.slots_needed} teammate slot(s) • Minimum {p.min_weekly_hours} hr/week</p><Link className="btn" href={`/projects/${p.id}`}>View project</Link></article>)}</div>
{!loading&&!show.length&&<p className="panel">No projects match this search. Create one to start collaboration.</p>}
</main>}
export default function ProjectsPage(){return <RequireAuth><Nav/><Content/></RequireAuth>}
