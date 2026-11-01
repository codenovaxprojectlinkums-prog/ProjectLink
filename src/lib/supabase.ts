'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
let singleton: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
 if (!singleton) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Missing public Supabase URL or publishable key in .env.local');
  singleton = createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 }
 return singleton;
}
export async function currentUserId(): Promise<string> {
 const {data:{user},error}=await supabase().auth.getUser();
 if(error || !user) throw new Error('Please sign in first.');
 return user.id;
}
