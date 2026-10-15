import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async(req)=>{
  if(req.method!=="POST")return new Response("Method not allowed",{status:405});
  const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:req.headers.get("Authorization")||""}}});
  const {decisionId,recipients=[]}=await req.json();
  if(!decisionId||!Array.isArray(recipients)||!recipients.length)return Response.json({error:"decisionId and recipients are required"},{status:400});
  const rows=recipients.map((email:string)=>({decision_id:decisionId,recipient_email:email,status:"pending",expires_at:new Date(Date.now()+7*86400000).toISOString()}));
  const {data,error}=await supabase.from("score_requests").insert(rows).select("id,recipient_email,expires_at");
  if(error)return Response.json({error:error.message},{status:400});
  // Connect an email provider here. Never expose provider secrets to the browser.
  return Response.json({created:data,emailDelivery:"provider_not_configured"},{status:201});
});
