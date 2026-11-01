'use client';
import { useEffect,useState,type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
export default function RequireAuth({children}:{children:ReactNode}){
 const [ready,setReady]=useState(false);const router=useRouter();
 useEffect(()=>{
  let active=true;
  supabase().auth.getUser().then(({data:{user}})=>{
   if(!active)return;
   if(!user)router.replace('/login');else setReady(true);
  }).catch(()=>router.replace('/login'));
  return()=>{active=false;};
 },[router]);
 if(!ready)return <main className="container"><p>Checking your login...</p></main>;
 return <>{children}</>;
}
