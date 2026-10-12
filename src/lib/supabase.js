import { createClient } from "@supabase/supabase-js";

const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured=Boolean(url&&key);
export const supabase=supabaseConfigured?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;

export async function signIn(email,password){
  if(!supabaseConfigured)return {data:{user:{email},session:{access_token:"local-prototype"}},error:null,local:true};
  const {data,error}=await supabase.auth.signInWithPassword({email,password});
  return {data,error,local:false};
}

export async function signUp(email,password,metadata={}){
  if(!supabaseConfigured)return {data:{user:{email,user_metadata:metadata},session:{access_token:"local-prototype"}},error:null,local:true};
  const {data,error}=await supabase.auth.signUp({email,password,options:{data:metadata}});
  return {data,error,local:false};
}

export async function signOut(){if(supabaseConfigured)await supabase.auth.signOut();}

export const dataApi={
  async loadWorkspace(){if(!supabaseConfigured)return null;const {data,error}=await supabase.from("organisation_members").select("role, organisations(*), profiles(*)").limit(1).maybeSingle();if(error)throw error;return data;},
  async listTasks(projectId){if(!supabaseConfigured)return null;let query=supabase.from("tasks").select("*, profiles:assignee_id(full_name), sprints(name)").order("created_at");if(projectId)query=query.eq("project_id",projectId);const {data,error}=await query;if(error)throw error;return data;},
  async updateTask(id,patch){if(!supabaseConfigured)return null;const {data,error}=await supabase.from("tasks").update(patch).eq("id",id).select().single();if(error)throw error;return data;},
  async createRisk(payload){if(!supabaseConfigured)return null;const {data,error}=await supabase.from("risks").insert(payload).select().single();if(error)throw error;return data;},
  async submitScores(rows){if(!supabaseConfigured)return null;const {data,error}=await supabase.from("scores").upsert(rows,{onConflict:"request_id,criterion_id,alternative_id,respondent_id"}).select();if(error)throw error;return data;},
};
