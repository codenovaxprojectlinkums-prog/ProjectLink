'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
export default function Nav(){const router=useRouter();return <header className="topbar">
 <Link href="/dashboard" className="brand">◈ ProjectLink<span>UMS</span></Link>
 <nav aria-label="Main navigation">
  <Link href="/projects">Discover</Link><Link href="/projects/new">Create</Link>
  <Link href="/matches">Matching</Link><Link href="/requests">Requests</Link>
  <Link href="/profile">Profile</Link><Link href="/team">Teams</Link><Link href="/notifications">Alerts</Link><Link href="/feedback">Beta</Link>
  <button className="navbtn" onClick={async()=>{await supabase().auth.signOut();router.push('/login');}}>Sign out</button>
 </nav>
 </header>}
