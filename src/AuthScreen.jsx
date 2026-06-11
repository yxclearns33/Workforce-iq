import { useState } from "react";
import { supabase } from "./supabase";
import { TEMPLATES } from "./templates";

const J={
  bg:"#F8F9FB",surf:"#FFFFFF",side:"#1E1B4B",
  t1:"#111827",t2:"#6B7280",tm:"#9CA3AF",
  blue:"#4F46E5",blueL:"#EEF2FF",blueH:"#4338CA",
  bdr:"#E5E7EB",bdrF:"#A5B4FC",r:"8px",
  sh1:"0 1px 3px rgba(0,0,0,.06)",
  sh2:"0 4px 12px rgba(0,0,0,.08)",
  sh3:"0 10px 30px rgba(0,0,0,.12)",
};

/* ═══════════ CARD WRAPPER — outside AuthScreen ═══════════ */
function Card({children,title,sub}){
  return(
    <div style={{minHeight:"100vh",background:J.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
      <div style={{width:"100%",maxWidth:"440px"}}>
        <div style={{textAlign:"center",marginBottom:"28px"}}>
          <div style={{width:"44px",height:"44px",background:J.side,borderRadius:"12px",
            display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",
            boxShadow:J.sh2}}>
            <span style={{color:"#fff",fontWeight:700,fontSize:"20px"}}>W</span>
          </div>
          <div style={{fontSize:"22px",fontWeight:600,color:J.t1,marginBottom:"4px"}}>WorkForce IQ</div>
          <div style={{fontSize:"13px",color:J.t2}}>AI-powered team management</div>
        </div>
        <div style={{background:J.surf,borderRadius:"14px",boxShadow:J.sh3,
          border:`1px solid ${J.bdr}`,overflow:"hidden"}}>
          <div style={{padding:"24px 28px 0"}}>
            <div style={{fontSize:"18px",fontWeight:600,color:J.t1,marginBottom:"4px"}}>{title}</div>
            {sub&&<div style={{fontSize:"13px",color:J.t2,marginBottom:"20px"}}>{sub}</div>}
          </div>
          <div style={{padding:"16px 28px 24px"}}>{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ INP ═══════════ */
function Inp({label,type="text",value,onChange,placeholder,error}){
  const [focus,setFocus]=useState(false);
  return(
    <div style={{marginBottom:"14px"}}>
      {label&&<div style={{fontSize:"12px",fontWeight:500,color:J.t2,marginBottom:"5px",
        textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</div>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}
        style={{width:"100%",boxSizing:"border-box",padding:"10px 13px",fontSize:"14px",
          fontFamily:"inherit",color:J.t1,background:J.surf,outline:"none",
          border:`1.5px solid ${error?"#DC2626":focus?J.bdrF:J.bdr}`,
          borderRadius:J.r,transition:"border-color .15s"}}/>
      {error&&<div style={{fontSize:"11px",color:"#DC2626",marginTop:"4px"}}>{error}</div>}
    </div>
  );
}

/* ═══════════ BTN ═══════════ */
function Btn({children,onClick,loading,disabled,v="pri",style={}}){
  const [h,sH]=useState(false);
  const vs={
    pri:{bg:J.blue,c:"#fff",hb:J.blueH,b:"none"},
    def:{bg:J.surf,c:J.t1,hb:"#F3F4F6",b:`1px solid ${J.bdr}`},
    ghost:{bg:"transparent",c:J.t2,hb:"#F3F4F6",b:"none"},
  }[v]||{bg:J.blue,c:"#fff",hb:J.blueH,b:"none"};
  return(
    <button onClick={onClick} disabled={disabled||loading}
      onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
      style={{width:"100%",padding:"11px",fontSize:"14px",fontWeight:500,
        fontFamily:"inherit",cursor:disabled||loading?"not-allowed":"pointer",
        background:h&&!disabled?vs.hb:vs.bg,color:vs.c,border:vs.b,
        borderRadius:J.r,opacity:disabled?.6:1,transition:"background .15s",...style}}>
      {loading?"Please wait…":children}
    </button>
  );
}

/* ═══════════ TEMPLATE CARD — outside AuthScreen ═══════════ */
function TemplateCard({t,selected,onSelect,customSkills,onCustomSkills}){
  const sel=selected===t.id;
  return(
    <div onClick={()=>onSelect(t.id)}
      style={{border:`1.5px solid ${sel?t.color:J.bdr}`,borderRadius:"10px",
        padding:"14px",cursor:"pointer",background:sel?t.color+"0D":J.surf,
        transition:"all .15s",position:"relative"}}
      onMouseEnter={e=>{if(!sel)e.currentTarget.style.borderColor="#C7D2FE";}}
      onMouseLeave={e=>{if(!sel)e.currentTarget.style.borderColor=J.bdr;}}>
      {sel&&(
        <div style={{position:"absolute",top:"10px",right:"10px",width:"18px",height:"18px",
          borderRadius:"50%",background:t.color,display:"flex",alignItems:"center",
          justifyContent:"center",fontSize:"10px",color:"#fff",fontWeight:700}}>✓</div>
      )}
      <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
        <div style={{width:"36px",height:"36px",borderRadius:"8px",background:t.color+"18",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",flexShrink:0}}>
          {t.icon}
        </div>
        <div>
          <div style={{fontSize:"13px",fontWeight:600,color:J.t1}}>{t.name}</div>
          <div style={{fontSize:"11px",color:J.t2}}>{t.desc}</div>
        </div>
      </div>
      {t.skills.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:"4px",marginBottom:"6px"}}>
          {t.skills.slice(0,4).map(s=>(
            <span key={s} style={{fontSize:"10px",padding:"2px 7px",borderRadius:"999px",
              background:t.color+"18",color:t.color,fontWeight:500}}>{s}</span>
          ))}
          {t.skills.length>4&&(
            <span style={{fontSize:"10px",padding:"2px 7px",borderRadius:"999px",
              background:"#F3F4F6",color:J.t2,fontWeight:500}}>+{t.skills.length-4} more</span>
          )}
        </div>
      )}
      {t.id==="custom"&&sel&&(
        <div onClick={e=>e.stopPropagation()} style={{marginTop:"10px"}}>
          <div style={{fontSize:"11px",color:J.t2,marginBottom:"5px",fontWeight:500}}>
            Enter your skill columns (comma separated)
          </div>
          <input value={customSkills} onChange={e=>onCustomSkills(e.target.value)}
            placeholder="e.g. Planning, Research, Writing, Design"
            style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",fontSize:"12px",
              fontFamily:"inherit",color:J.t1,background:J.surf,outline:"none",
              border:`1.5px solid ${J.bdrF}`,borderRadius:J.r}}/>
          <div style={{fontSize:"10px",color:J.tm,marginTop:"4px"}}>
            These become your skill matrix columns
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════ ERROR BOX ═══════════ */
function ErrBox({msg}){
  if(!msg)return null;
  return(
    <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:J.r,
      padding:"10px 13px",marginBottom:"14px",fontSize:"12px",color:"#DC2626"}}>
      {msg}
    </div>
  );
}

/* ═══════════ AUTH SCREEN ═══════════ */
export default function AuthScreen({onAuth, onBack}){
  const [mode,setMode]=useState("signin");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [workspaceName,setWorkspaceName]=useState("");
  const [template,setTemplate]=useState("software");
  const [customSkills,setCustomSkills]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");

  const validate=()=>{
    if(!email.trim()){setError("Email is required.");return false;}
    if(!email.includes("@")){setError("Enter a valid email.");return false;}
    if(password.length<6){setError("Password must be at least 6 characters.");return false;}
    return true;
  };

  const handleSignIn=async()=>{
  if(!validate())return;
  setLoading(true);setError("");
  const{error:e}=await supabase.auth.signInWithPassword({email,password});
  if(e){setError(e.message);setLoading(false);return;}
  const{data:{user}}=await supabase.auth.getUser();
  // check if workspace already exists
  const{data:ws}=await supabase.from("workspaces").select("*").eq("owner_id",user.id).single();
  if(ws){
    // returning user — load their template and go straight to app
    const{TEMPLATES}=await import("./templates");
    const tpl=TEMPLATES.find(t=>t.id===ws.template)||TEMPLATES[0];
    tpl.skills=ws.skill_cols||tpl.skills;
    onAuth(user,tpl,ws.name);
  } else {
    // new user — show workspace setup
    setLoading(false);
    setMode("workspace");
  }
};

  const handleSignUp=async()=>{
    if(!validate())return;
    setLoading(true);setError("");
    const{error:e}=await supabase.auth.signUp({email,password});
    if(e){setError(e.message);setLoading(false);}
    else{
      setSuccess("Account created! Check your email to confirm, then sign in.");
      setMode("signin");
      setLoading(false);
    }
  };

  const handleWorkspace=async()=>{
    if(!workspaceName.trim()){setError("Give your workspace a name.");return;}
    const selectedTemplate={...TEMPLATES.find(t=>t.id===template)};
    if(template==="custom"){
      const cols=customSkills.split(",").map(s=>s.trim()).filter(Boolean);
      if(cols.length<2){setError("Enter at least 2 skill columns.");return;}
      selectedTemplate.skills=cols;
      selectedTemplate.taskTypes=cols;
    }
    setLoading(true);setError("");
    const{data:{user}}=await supabase.auth.getUser();
    await supabase.from("workspaces").insert({
      name:workspaceName.trim(),
      owner_id:user.id,
      template:template,
      skill_cols:selectedTemplate.skills,
    }).then(({error:e})=>{
      if(e)console.warn("Workspace table not ready yet — will set up next step:",e.message);
    });
    setLoading(false);
    onAuth(user,selectedTemplate,workspaceName.trim());
  };

  const switchLink=(label,to)=>(
    <button onClick={()=>{setMode(to);setError("");}}
      style={{background:"none",border:"none",color:J.blue,cursor:"pointer",
        fontWeight:500,fontSize:"13px",fontFamily:"inherit"}}>
      {label}
    </button>
  );

  /* ── SIGN IN ── */
 if(mode==="signin") return(
  <Card title="Welcome back" sub="Sign in to your workspace">
    <div style={{marginBottom:"16px"}}>
      <button onClick={onBack}
        style={{background:"none",border:"none",color:J.t2,cursor:"pointer",
          fontSize:"13px",fontFamily:"inherit",display:"flex",alignItems:"center",gap:"4px"}}>
        ← Back to home
      </button>
    </div>
      
      {success&&(
        <div style={{background:"#F0FDF4",border:"1px solid #A7F3D0",borderRadius:J.r,
          padding:"10px 13px",marginBottom:"14px",fontSize:"12px",color:"#065F46"}}>
          {success}
        </div>
      )}
      <ErrBox msg={error}/>
      <Inp label="Email" type="email" value={email}
        onChange={v=>{setEmail(v);setError("");}} placeholder="you@company.com"/>
      <Inp label="Password" type="password" value={password}
        onChange={v=>{setPassword(v);setError("");}} placeholder="••••••••"/>
      <Btn onClick={handleSignIn} loading={loading}>Sign in</Btn>
      <div style={{textAlign:"center",marginBottom:"12px"}}>
  <button onClick={()=>window.history.back()}
    style={{background:"none",border:"none",color:J.t2,cursor:"pointer",
      fontSize:"13px",fontFamily:"inherit",display:"flex",alignItems:"center",
      gap:"4px",margin:"0 auto"}}>
    ← Back to home
  </button>
</div>
    </Card>
  );

  /* ── SIGN UP ── */
  if(mode==="signup") return(
    <Card title="Create your account" sub="Free to start — no credit card needed">
      <ErrBox msg={error}/>
      <Inp label="Email" type="email" value={email}
        onChange={v=>{setEmail(v);setError("");}} placeholder="you@company.com"/>
      <Inp label="Password" type="password" value={password}
        onChange={v=>{setPassword(v);setError("");}} placeholder="Min. 6 characters"/>
      <Btn onClick={handleSignUp} loading={loading}>Create account</Btn>
      <div style={{textAlign:"center",marginTop:"16px",fontSize:"13px",color:J.t2}}>
        Already have an account? {switchLink("Sign in","signin")}
      </div>
    </Card>
  );

  /* ── WORKSPACE + TEMPLATE ── */
  if(mode==="workspace") return(
    <div style={{minHeight:"100vh",background:J.bg,padding:"24px 20px",overflowY:"auto"}}>
      <div style={{maxWidth:"680px",margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"28px"}}>
          <div style={{width:"36px",height:"36px",background:J.side,borderRadius:"9px",
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{color:"#fff",fontWeight:700,fontSize:"16px"}}>W</span>
          </div>
          <span style={{fontSize:"16px",fontWeight:600,color:J.t1}}>WorkForce IQ</span>
        </div>
        <div style={{background:J.surf,borderRadius:"14px",boxShadow:J.sh2,
          border:`1px solid ${J.bdr}`,padding:"28px"}}>
          <div style={{fontSize:"20px",fontWeight:600,color:J.t1,marginBottom:"4px"}}>
            Set up your workspace
          </div>
          <div style={{fontSize:"13px",color:J.t2,marginBottom:"24px"}}>
            This takes 30 seconds. You can change everything later.
          </div>
          <ErrBox msg={error}/>
          <Inp label="Workspace name" value={workspaceName}
            onChange={v=>{setWorkspaceName(v);setError("");}}
            placeholder="e.g. Acme Engineering, Marketing Team, Studio X"/>
          <div style={{fontSize:"12px",fontWeight:500,color:J.t2,marginBottom:"10px",
            textTransform:"uppercase",letterSpacing:"0.05em"}}>
            Choose your template
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"24px"}}>
            {TEMPLATES.map(t=>(
              <TemplateCard key={t.id} t={t} selected={template} onSelect={setTemplate}
                customSkills={customSkills} onCustomSkills={setCustomSkills}/>
            ))}
          </div>
          {template!=="custom"&&(()=>{
            const tpl=TEMPLATES.find(t=>t.id===template);
            return(
              <div style={{background:"#F9FAFB",border:`1px solid ${J.bdr}`,borderRadius:J.r,
                padding:"12px 14px",marginBottom:"20px"}}>
                <div style={{fontSize:"11px",fontWeight:600,color:J.t2,textTransform:"uppercase",
                  letterSpacing:"0.05em",marginBottom:"8px"}}>What you'll get</div>
                <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                  {tpl.skills.map(s=>(
                    <span key={s} style={{fontSize:"11px",padding:"2px 8px",borderRadius:"999px",
                      background:tpl.color+"15",color:tpl.color,fontWeight:500}}>{s}</span>
                  ))}
                </div>
                <div style={{fontSize:"11px",color:J.t2,marginTop:"8px"}}>
                  + {tpl.exampleTasks.length} example tasks to get you started
                </div>
              </div>
            );
          })()}
          <Btn onClick={handleWorkspace} loading={loading}>
            Launch my workspace →
          </Btn>
        </div>
      </div>
    </div>
  );

  return null;
}