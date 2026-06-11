import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";

/* ═══════════ DESIGN TOKENS ═══════════ */
const J={
  bg:"#F5F6FA",
  surf:"#FFFFFF",
  side:"#1E1B4B",
  sideAcc:"#4F46E5",
  t1:"#111827",
  t2:"#6B7280",
  tm:"#9CA3AF",
  tl:"#4F46E5",
  blue:"#4F46E5",
  blueL:"#EEF2FF",
  blueH:"#4338CA",
  bdr:"#E5E7EB",
  bdrF:"#4F46E5",
  r:"6px",
  rm:"8px",
  sh1:"0 1px 3px rgba(0,0,0,.07),0 1px 2px rgba(0,0,0,.05)",
  sh2:"0 4px 12px rgba(0,0,0,.1),0 1px 3px rgba(0,0,0,.08)",
  sh3:"0 10px 30px rgba(0,0,0,.12),0 2px 6px rgba(0,0,0,.08)",
};
const AC=["#6554C0","#00875A","#4F46E5","#FF8B00","#00A3BF","#CD1316","#403294","#172B4D"];
const TC={Frontend:"#4F46E5",Backend:"#059669",Design:"#7C3AED",DevOps:"#D97706",QA:"#0891B2",Data:"#4338CA",Mobile:"#2563EB",Security:"#DC2626"};
const RT={Low:{bg:"#F0FDF4",t:"#166534",d:"#16A34A"},Medium:{bg:"#EFF6FF",t:"#1D4ED8",d:"#3B82F6"},High:{bg:"#FFFBEB",t:"#92400E",d:"#F59E0B"},Critical:{bg:"#FEF2F2",t:"#991B1B",d:"#EF4444"}};
const SL={1:"Beginner",2:"Basic",3:"Intermediate",4:"Advanced",5:"Expert"};
const SC={1:"#EF4444",2:"#F59E0B",3:"#4F46E5",4:"#16A34A",5:"#15803D"};
const COMPLEXITIES=["Low","Medium","High","Critical"];
const PRIORITIES=["Low","Medium","High","Urgent"];
const STATUSES=["Todo","In Progress","Review","Done","Blocked"];
const EFFORTS=[1,2,3,5,8,13];
const RISK_LEVELS=["Low","Medium","High","Critical"];
const DEF_SKILLS=["Frontend","Backend","Design","DevOps","QA","Data","Mobile","Security"];

/* ═══════════ SEED DATA ═══════════ */
const SEED_MEMBERS=[
  {id:"m1",name:"Alice Chen",  role:"Frontend Lead",   color:"#6554C0",workload:72,skills:{Frontend:4,Backend:2,Design:4,DevOps:1,QA:3,Data:2,Mobile:4,Security:1}},
  {id:"m2",name:"Bob Martinez",role:"Backend Engineer", color:"#059669",workload:58,skills:{Frontend:2,Backend:5,Design:1,DevOps:3,QA:3,Data:4,Mobile:2,Security:3}},
  {id:"m3",name:"Carol Smith", role:"Full Stack Dev",   color:"#4F46E5",workload:85,skills:{Frontend:4,Backend:4,Design:3,DevOps:2,QA:4,Data:3,Mobile:3,Security:2}},
  {id:"m4",name:"David Kim",   role:"DevOps Engineer",  color:"#D97706",workload:45,skills:{Frontend:1,Backend:3,Design:1,DevOps:5,QA:2,Data:3,Mobile:1,Security:4}},
  {id:"m5",name:"Eve Johnson",  role:"QA Lead",          color:"#0891B2",workload:62,skills:{Frontend:3,Backend:2,Design:2,DevOps:1,QA:5,Data:2,Mobile:3,Security:3}},
];
const SEED_SPRINTS=[
  {id:"s1",name:"Sprint 1",start:"2025-01-06",end:"2025-01-17",status:"Completed"},
  {id:"s2",name:"Sprint 2",start:"2025-01-20",end:"2025-01-31",status:"Active"},
  {id:"s3",name:"Sprint 3",start:"2025-02-03",end:"2025-02-14",status:"Planned"},
];
const SEED_TASKS=[
  {id:"t1",name:"Auth System",      type:"Backend", complexity:"High",   priority:"Urgent",effort:8, sprint:"s2",status:"In Progress",assigneeId:"m2",riskOverride:null},
  {id:"t2",name:"Dashboard UI",     type:"Frontend",complexity:"Medium", priority:"High",  effort:5, sprint:"s2",status:"In Progress",assigneeId:"m1",riskOverride:null},
  {id:"t3",name:"CI/CD Pipeline",   type:"DevOps",  complexity:"High",   priority:"High",  effort:8, sprint:"s2",status:"Todo",       assigneeId:"m4",riskOverride:null},
  {id:"t4",name:"API Rate Limiting",type:"Security",complexity:"Critical",priority:"Urgent",effort:13,sprint:"s2",status:"Blocked",   assigneeId:null, riskOverride:null},
  {id:"t5",name:"Mobile Nav",       type:"Mobile",  complexity:"Medium", priority:"Medium",effort:5, sprint:"s2",status:"Review",     assigneeId:"m3",riskOverride:null},
  {id:"t6",name:"Data Pipeline",    type:"Data",    complexity:"High",   priority:"High",  effort:8, sprint:"s3",status:"Todo",       assigneeId:null, riskOverride:null},
  {id:"t7",name:"Design System",    type:"Design",  complexity:"Medium", priority:"Medium",effort:5, sprint:"s3",status:"Todo",       assigneeId:"m1",riskOverride:null},
  {id:"t8",name:"Unit Test Suite",  type:"QA",      complexity:"Medium", priority:"High",  effort:5, sprint:"s1",status:"Done",       assigneeId:"m5",riskOverride:null},
];

/* ═══════════ SCORING ═══════════ */
const cmx={Low:1,Medium:.9,High:.75,Critical:.6};
const efp=e=>e<=3?1:e<=5?.95:e<=8?.88:.78;

function getSkill(member,type){
  if(!member?.skills)return 1;
  return member.skills[type]??Object.values(member.skills)[0]??1;
}
function calcProb(member,task){
  const s=Math.max(1,Math.min(5,getSkill(member,task.type)))/5;
  const w=member.workload>90?.6:member.workload>75?.8:member.workload>60?.92:1;
  return Math.round(s*(cmx[task.complexity]??0.85)*efp(task.effort)*w*100);
}
function calcRisk(task,members){
  if(task.riskOverride)return task.riskOverride;
  const m=members.find(m=>m.id===task.assigneeId);
  if(!m)return task.priority==="Urgent"||task.complexity==="Critical"?"Critical":"High";
  const p=calcProb(m,task);
  return p>=75?"Low":p>=55?"Medium":p>=35?"High":"Critical";
}
function rankCandidates(task,members){
  return [...members]
    .map(m=>({member:m,prob:calcProb(m,task),skill:getSkill(m,task.type)}))
    .sort((a,b)=>b.prob-a.prob);
}
function pct(score,allScores){
  if(!allScores.length)return 0;
  const below=allScores.filter(s=>s<score).length;
  return Math.round((below/allScores.length)*100);
}
function memberStats(member,members,skillCols){
  const stats={};
  skillCols.forEach(sk=>{
    const myScore=member.skills[sk]??1;
    const allScores=members.map(m=>m.skills[sk]??1);
    stats[sk]={score:myScore,percentile:pct(myScore,allScores),label:SL[myScore]||"—",color:SC[myScore]||J.t2};
  });
  return stats;
}
function memberRiskScore(member,tasks,members){
  const myTasks=tasks.filter(t=>t.assigneeId===member.id);
  if(!myTasks.length)return{score:0,level:"Low",factors:[],avgProb:0,taskCount:0};
  let score=0;const factors=[];
  if(member.workload>85){score+=40;factors.push(`Workload critical (${member.workload}%)`);}
  else if(member.workload>70){score+=20;factors.push(`Workload elevated (${member.workload}%)`);}
  const highR=myTasks.filter(t=>["High","Critical"].includes(calcRisk(t,members)));
  if(highR.length>=2){score+=30;factors.push(`${highR.length} high/critical tasks`);}
  else if(highR.length===1){score+=15;factors.push(`1 high/critical task`);}
  const avgProb=myTasks.reduce((a,t)=>a+calcProb(member,t),0)/myTasks.length;
  if(avgProb<40){score+=30;factors.push(`Low avg fit (${Math.round(avgProb)}%)`);}
  else if(avgProb<60){score+=15;factors.push(`Moderate fit (${Math.round(avgProb)}%)`);}
  const blocked=myTasks.filter(t=>t.status==="Blocked").length;
  if(blocked>0){score+=10*blocked;factors.push(`${blocked} blocked`);}
  return{score:Math.min(100,score),level:score>=60?"Critical":score>=35?"High":score>=15?"Medium":"Low",factors,avgProb:Math.round(avgProb),taskCount:myTasks.length};
}

/* ═══════════ EXCEL DETECTION ═══════════ */
function looksLikeName(v){
  if(!v||typeof v!=="string")return false;
  const t=v.trim();
  return /^[A-Z][a-z]/.test(t)&&t.length>2&&t.length<60&&!/^\d/.test(t)&&!t.includes("@");
}
function isMetaCol(col){
  const c=col.toLowerCase();
  return["role","department","team","title","position","job","level","grade","id","email","phone","date","notes","comment","status"].some(k=>c.includes(k));
}
function detectNameCol(allCols,rows){
  for(const col of allCols){
    const vals=rows.map(r=>String(r[col]||"")).filter(v=>v.trim());
    if(vals.length>0&&vals.filter(v=>looksLikeName(v)).length/vals.length>0.5)return col;
  }
  return allCols[0];
}
function detectSkillCols(allCols,nameCol,rows){
  const numeric=allCols.filter(col=>{
    if(col===nameCol||isMetaCol(col))return false;
    const vals=rows.map(r=>r[col]).filter(v=>v!==""&&v!=null);
    return vals.length>0&&vals.every(v=>!isNaN(parseFloat(v)));
  });
  if(numeric.length>0)return numeric;
  return allCols.filter(c=>c!==nameCol&&!isMetaCol(c));
}
function normaliseScore(raw,is100){
  const n=parseFloat(raw)||0;
  if(is100)return n>=80?5:n>=60?4:n>=40?3:n>=20?2:n>0?1:1;
  return Math.max(1,Math.min(5,Math.round(n)||1));
}

/* ═══════════ XLSX ═══════════ */
function ensureXLSX(cb){
  if(window.XLSX){cb();return;}
  const s=document.createElement("script");
  s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
  s.onload=cb;document.head.appendChild(s);
}
function parseXLFile(file,cb){
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      if(window.XLSX){
        const wb=window.XLSX.read(e.target.result,{type:"binary"});
        const ws=wb.Sheets[wb.SheetNames[0]];
        cb(window.XLSX.utils.sheet_to_json(ws,{defval:""}));
      }else{
        const lines=e.target.result.split("\n").filter(Boolean);
        const hdr=lines[0].split(",").map(h=>h.trim().replace(/^"|"$/g,""));
        cb(lines.slice(1).map(l=>{
          const v=l.split(",").map(x=>x.trim().replace(/^"|"$/g,""));
          return Object.fromEntries(hdr.map((h,i)=>[h,v[i]||""]));
        }));
      }
    }catch(err){alert("Parse error: "+err.message);}
  };
  if(file.name.endsWith(".csv"))reader.readAsText(file);
  else reader.readAsBinaryString(file);
}

/* ═══════════ CLAUDE ═══════════ */
async function callClaude(prompt,sys=""){
  try{
    const r=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,
        system:sys||"You are a senior project manager. Be concise. No markdown asterisks.",
        messages:[{role:"user",content:prompt}]})
    });
    const d=await r.json();
    return d.content?.map(b=>b.text||"").join("")||"No response.";
  }catch{return"Unable to reach AI.";}
}

/* ═══════════ PRIMITIVES ═══════════ */
function Avatar({name,color,size=24,onClick,style={}}){
  const ini=(name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  return(
    <div onClick={onClick}
      onMouseEnter={e=>{if(onClick)e.currentTarget.style.opacity=".75";}}
      onMouseLeave={e=>{e.currentTarget.style.opacity="1";}}
      style={{width:size,height:size,borderRadius:"50%",background:color||J.blue,color:"#fff",
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:size*.38,fontWeight:600,flexShrink:0,
        cursor:onClick?"pointer":"default",userSelect:"none",letterSpacing:"0.02em",...style}}>
      {ini}
    </div>
  );
}

function Loz({label,bg,color,bold=false}){
  return(
    <span style={{display:"inline-block",background:bg,color,padding:"2px 8px",
      borderRadius:"999px",fontSize:"11px",fontWeight:bold?600:500,
      letterSpacing:"0.02em",lineHeight:"1.6",whiteSpace:"nowrap"}}>
      {label}
    </span>
  );
}
function RLoz({risk}){const r=RT[risk]||RT.Low;return <Loz label={risk} bg={r.bg} color={r.t} bold/>;}
function PIco({p,size=13}){
  return(
    <span style={{color:{Urgent:"#EF4444",High:"#F59E0B",Medium:"#6B7280",Low:"#9CA3AF"}[p]||J.t2,fontSize:size,fontWeight:700}}>
      {({Urgent:"↑↑",High:"↑",Medium:"→",Low:"↓"})[p]||"→"}
    </span>
  );
}

function Btn({children,onClick,v="def",disabled=false,sm=false,style={}}){
  const [h,sH]=useState(false);
  const vs={
    def:{bg:J.surf,c:J.t1,b:`1px solid ${J.bdr}`,hb:"#F9FAFB"},
    pri:{bg:J.blue,c:"#fff",b:"none",hb:J.blueH},
    suc:{bg:"#059669",c:"#fff",b:"none",hb:"#047857"},
    dan:{bg:"#FEF2F2",c:"#DC2626",b:`1px solid #FECACA`,hb:"#FECACA"},
    ai:{bg:"#EEF2FF",c:"#4338CA",b:`1px solid #C7D2FE`,hb:"#C7D2FE"},
  }[v]||{bg:J.surf,c:J.t1,b:`1px solid ${J.bdr}`,hb:"#F9FAFB"};
  return(
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
      style={{background:h&&!disabled?vs.hb:vs.bg,color:vs.c,border:vs.b,borderRadius:J.r,
        padding:sm?"3px 10px":"6px 14px",fontSize:sm?"11px":"12px",fontWeight:500,
        cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,
        fontFamily:"inherit",lineHeight:"1.4",whiteSpace:"nowrap",transition:"all .15s",...style}}>
      {children}
    </button>
  );
}
function Sel({value,options,onChange,style={}}){
  return(
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{background:J.surf,color:J.t1,border:`1px solid ${J.bdr}`,borderRadius:J.r,
        padding:"5px 9px",fontSize:"12px",cursor:"pointer",fontFamily:"inherit",outline:"none",
        transition:"border-color .15s",...style}}
      onFocus={e=>e.target.style.borderColor=J.bdrF}
      onBlur={e=>e.target.style.borderColor=J.bdr}>
      {(options||[]).map(o=>{
        const val=typeof o==="object"?o.v:o;
        const lbl=typeof o==="object"?o.l:o;
        return <option key={val} value={val}>{lbl}</option>;
      })}
    </select>
  );
}
function Inp({value,onChange,placeholder,style={}}){
  return(
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{background:J.surf,color:J.t1,border:`1px solid ${J.bdr}`,borderRadius:J.r,
        padding:"7px 11px",fontSize:"13px",fontFamily:"inherit",outline:"none",
        width:"100%",boxSizing:"border-box",transition:"border-color .15s",...style}}
      onFocus={e=>e.target.style.borderColor=J.bdrF}
      onBlur={e=>e.target.style.borderColor=J.bdr}/>
  );
}
function Modal({title,onClose,children,width="640px"}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,.5)",zIndex:1000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:J.surf,borderRadius:"12px",width,maxWidth:"97vw",
        maxHeight:"92vh",overflow:"auto",boxShadow:J.sh3,display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"16px 20px 14px",borderBottom:`1px solid ${J.bdr}`,
          position:"sticky",top:0,background:J.surf,zIndex:1,flexShrink:0}}>
          <h3 style={{margin:0,fontSize:"15px",fontWeight:600,color:J.t1}}>{title}</h3>
          <button onClick={onClose} style={{background:"#F3F4F6",border:"none",color:J.t2,cursor:"pointer",
            fontSize:"16px",lineHeight:1,padding:"4px 8px",borderRadius:"6px",fontWeight:500}}>✕</button>
        </div>
        <div style={{padding:"18px 20px",overflow:"auto",flex:1}}>{children}</div>
      </div>
    </div>
  );
}

/* ═══════════ SKILL DOTS ═══════════ */
function SkillDots({score,onChange}){
  const tc=SC[score]||J.t2;
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"3px"}}>
      <div style={{display:"flex",gap:"3px"}}>
        {[1,2,3,4,5].map(i=>(
          <button key={i} onClick={()=>onChange&&onChange(i)}
            style={{width:"14px",height:"14px",borderRadius:"50%",
              background:i<=score?tc:"#E5E7EB",border:`1px solid ${i<=score?tc:"#E5E7EB"}`,
              cursor:onChange?"pointer":"default",fontSize:"7px",
              color:i<=score?"#fff":J.tm,fontWeight:600,
              display:"flex",alignItems:"center",justifyContent:"center",transition:"all .1s",
              flexShrink:0}}>
            {i}
          </button>
        ))}
      </div>
      <span style={{fontSize:"9px",color:tc,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em"}}>{SL[score]||"—"}</span>
    </div>
  );
}

/* ═══════════ SMART SUGGEST POPUP ═══════════ */
function SmartSuggest({query,members,skillCols,onPick,onClose}){
  const q=query.toLowerCase();
  const matchedSkill=skillCols.find(s=>s.toLowerCase().includes(q)||q.includes(s.toLowerCase()))||skillCols[0];
  const syntheticTask={type:matchedSkill,complexity:"Medium",priority:"Medium",effort:3};
  const ranked=rankCandidates(syntheticTask,members);
  if(!members.length)return null;
  return(
    <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,width:"420px",background:J.surf,
      border:`1px solid ${J.blue}`,borderRadius:"10px",boxShadow:J.sh3,zIndex:300,overflow:"hidden"}}>
      <div style={{background:J.blueL,padding:"10px 14px",borderBottom:`1px solid #C7D2FE`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:"12px",fontWeight:600,color:J.blue}}>Smart suggest — <b>#{query}</b></span>
        <button onClick={onClose} style={{background:"none",border:"none",color:J.t2,cursor:"pointer",fontSize:"16px",lineHeight:1}}>✕</button>
      </div>
      {ranked.map((c,i)=>{
        const rt=RT[c.prob>=75?"Low":c.prob>=55?"Medium":c.prob>=35?"High":"Critical"];
        const skillScore=getSkill(c.member,matchedSkill);
        const allSkillScores=members.map(m=>getSkill(m,matchedSkill));
        const percentile=pct(skillScore,allSkillScores);
        return(
          <div key={c.member.id}
            style={{padding:"10px 14px",borderBottom:`1px solid ${J.bdr}`,
              background:i===0?"#FAFBFF":J.surf,cursor:"pointer"}}
            onMouseEnter={e=>e.currentTarget.style.background=i===0?"#F0F3FF":"#F9FAFB"}
            onMouseLeave={e=>e.currentTarget.style.background=i===0?"#FAFBFF":J.surf}
            onClick={()=>onPick(c.member)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{display:"flex",alignItems:"center",gap:"9px"}}>
                <Avatar name={c.member.name} color={c.member.color} size={28}/>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                    <span style={{fontSize:"13px",fontWeight:600,color:J.t1}}>{c.member.name}</span>
                    {i===0&&<Loz label="Best fit" bg={J.blue} color="#fff" bold/>}
                  </div>
                  <span style={{fontSize:"11px",color:J.t2}}>{c.member.role}</span>
                </div>
              </div>
              <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:"14px",fontWeight:700,color:c.prob>=70?"#16A34A":c.prob>=50?"#F59E0B":"#EF4444"}}>{c.prob}%</div>
                  <div style={{fontSize:"9px",color:J.tm,textTransform:"uppercase"}}>fit</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:"14px",fontWeight:700,color:SC[skillScore]||J.t2}}>{skillScore}/5</div>
                  <div style={{fontSize:"9px",color:J.tm,textTransform:"uppercase"}}>{matchedSkill}</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:"14px",fontWeight:700,color:percentile>=70?"#16A34A":percentile>=40?"#F59E0B":"#EF4444"}}>{percentile}th</div>
                  <div style={{fontSize:"9px",color:J.tm,textTransform:"uppercase"}}>pctl</div>
                </div>
                <div style={{width:"22px",height:"22px",borderRadius:"50%",background:rt.bg,border:`2px solid ${rt.d}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:"8px",fontWeight:700,color:rt.t}}>{c.prob>=75?"L":c.prob>=55?"M":c.prob>=35?"H":"!"}</span>
                </div>
              </div>
            </div>
            <div style={{marginTop:"6px",padding:"5px 8px",background:"#F9FAFB",borderRadius:"6px",fontSize:"11px",color:J.t2,lineHeight:"1.5"}}>
              <b style={{color:J.t1}}>Why:</b> Skill {skillScore}/5 ({SL[skillScore]}) in {matchedSkill} · {percentile}th percentile · {c.member.workload}% load{c.member.workload>80?" ⚠":""}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════ AI MODAL ═══════════ */
function AIModal({title,prompt,onClose,extra}){
  const [text,sT]=useState("");const [load,sL]=useState(true);
  useEffect(()=>{callClaude(prompt).then(r=>{sT(r);sL(false);});},[]);
  return(
    <Modal title={title} onClose={onClose} width="680px">
      {extra&&<div style={{marginBottom:"14px"}}>{extra}</div>}
      {load
        ?<div style={{display:"flex",alignItems:"center",gap:"10px",padding:"18px",background:"#F9FAFB",borderRadius:"8px",color:J.t2}}>
          <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
          <div style={{width:"14px",height:"14px",borderRadius:"50%",border:`2px solid ${J.blue}`,borderTopColor:"transparent",animation:"sp .8s linear infinite"}}/>
          Analysing…
        </div>
        :<div style={{background:"#F9FAFB",borderRadius:"8px",padding:"16px",color:J.t1,fontSize:"13px",lineHeight:"1.8",whiteSpace:"pre-wrap",border:`1px solid ${J.bdr}`}}>{text}</div>
      }
    </Modal>
  );
}

/* ═══════════ TASK DRAWER ═══════════ */
function TaskDrawer({task,members,sprints,skillCols,onUpdate,onClose}){
  const [t,sT]=useState({...task});
  const [hash,sHash]=useState("");
  const [hashPos,sHashPos]=useState(null);
  const nameRef=useRef();
  const assignee=members.find(m=>m.id===t.assigneeId);
  const risk=calcRisk(t,members);
  const rt=RT[risk];
  const prob=assignee?calcProb(assignee,t):null;

  const onNameChange=v=>{
    sT(p=>({...p,name:v}));
    const hi=v.lastIndexOf("#");
    if(hi!==-1&&hi===v.length-1-0){
      const q=v.slice(hi+1);
      sHash(q);
      const el=nameRef.current;
      if(el){const r=el.getBoundingClientRect();sHashPos({top:r.height});}
    } else if(hi!==-1&&v.slice(hi).match(/^#\w*$/)){
      sHash(v.slice(hi+1));
    } else {
      sHash("");sHashPos(null);
    }
  };

  const pickSuggest=member=>{
    sT(p=>({...p,assigneeId:member.id,name:p.name.replace(/#\S*$/,"").trim()}));
    sHash("");sHashPos(null);
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,.45)",zIndex:900,display:"flex",justifyContent:"flex-end"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:"460px",maxWidth:"96vw",background:J.surf,boxShadow:"-4px 0 24px rgba(0,0,0,.15)",display:"flex",flexDirection:"column",overflowY:"auto"}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${J.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:"#F9FAFB"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <span style={{fontSize:"11px",fontWeight:600,color:TC[t.type]||J.blue,textTransform:"uppercase",letterSpacing:"0.05em"}}>{t.type}</span>
            <PIco p={t.priority}/>
          </div>
          <div style={{display:"flex",gap:"6px"}}>
            <Btn v="pri" sm onClick={()=>{onUpdate(t.id,t);onClose();}}>Save</Btn>
            <button onClick={onClose} style={{background:"#F3F4F6",border:"none",cursor:"pointer",color:J.t2,fontSize:"14px",lineHeight:1,padding:"5px 9px",borderRadius:"6px"}}>✕</button>
          </div>
        </div>
        <div style={{padding:"18px"}}>
          {/* Name */}
          <div style={{marginBottom:"18px"}}>
            <div style={{fontSize:"11px",color:J.t2,fontWeight:600,textTransform:"uppercase",marginBottom:"6px",letterSpacing:"0.05em"}}>
              Issue <span style={{color:J.tm,fontWeight:400,textTransform:"none",fontSize:"10px"}}>— type # for smart assignment</span>
            </div>
            <div style={{position:"relative"}}>
              <input ref={nameRef} value={t.name} onChange={e=>onNameChange(e.target.value)}
                style={{background:J.surf,color:J.t1,border:`1px solid ${J.bdr}`,borderRadius:J.r,
                  padding:"9px 12px",fontSize:"15px",fontWeight:600,fontFamily:"inherit",
                  outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color .15s"}}
                onFocus={e=>e.target.style.borderColor=J.bdrF}
                onBlur={e=>e.target.style.borderColor=J.bdr}
                placeholder="Issue name... type # for smart suggestions"/>
              {hash!=""&&(
                <SmartSuggest query={hash} members={members} skillCols={skillCols}
                  onPick={pickSuggest} onClose={()=>{sHash("");sHashPos(null);}}/>
              )}
            </div>
          </div>
          {/* Fields */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"18px"}}>
            {[["Type",t.type,v=>sT(p=>({...p,type:v})),skillCols.length?skillCols:DEF_SKILLS],
              ["Complexity",t.complexity,v=>sT(p=>({...p,complexity:v})),COMPLEXITIES],
              ["Priority",t.priority,v=>sT(p=>({...p,priority:v})),PRIORITIES],
              ["Status",t.status,v=>sT(p=>({...p,status:v})),STATUSES],
              ["Effort",String(t.effort),v=>sT(p=>({...p,effort:parseInt(v)})),EFFORTS.map(String)],
            ].map(([lbl,val,fn,opts])=>(
              <div key={lbl}>
                <div style={{fontSize:"11px",color:J.t2,fontWeight:600,textTransform:"uppercase",marginBottom:"5px",letterSpacing:"0.05em"}}>{lbl}</div>
                <Sel value={val} options={opts} onChange={fn} style={{width:"100%"}}/>
              </div>
            ))}
            <div>
              <div style={{fontSize:"11px",color:J.t2,fontWeight:600,textTransform:"uppercase",marginBottom:"5px",letterSpacing:"0.05em"}}>Sprint</div>
              <select value={t.sprint} onChange={e=>sT(p=>({...p,sprint:e.target.value}))}
                style={{width:"100%",border:`1px solid ${J.bdr}`,borderRadius:J.r,padding:"6px 9px",fontSize:"12px",fontFamily:"inherit",background:J.surf,color:J.t1,outline:"none"}}
                onFocus={e=>e.target.style.borderColor=J.bdrF}
                onBlur={e=>e.target.style.borderColor=J.bdr}>
                {sprints.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          {/* Assignee */}
          <div style={{marginBottom:"18px"}}>
            <div style={{fontSize:"11px",color:J.t2,fontWeight:600,textTransform:"uppercase",marginBottom:"9px",letterSpacing:"0.05em"}}>Assignee</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
              <div onClick={()=>sT(p=>({...p,assigneeId:null}))}
                style={{display:"flex",alignItems:"center",gap:"5px",padding:"5px 10px",borderRadius:"999px",
                  border:`1.5px solid ${!t.assigneeId?J.blue:J.bdr}`,cursor:"pointer",
                  background:!t.assigneeId?J.blueL:J.surf,transition:"all .15s"}}>
                <span style={{fontSize:"12px",color:!t.assigneeId?J.blue:J.t2,fontWeight:!t.assigneeId?600:400}}>None</span>
              </div>
              {rankCandidates(t,members).map(({member:m,prob:p})=>{
                const sel=t.assigneeId===m.id;
                return(
                  <div key={m.id} onClick={()=>sT(pp=>({...pp,assigneeId:m.id}))}
                    style={{display:"flex",alignItems:"center",gap:"6px",padding:"5px 10px",borderRadius:"999px",
                      border:`1.5px solid ${sel?m.color:J.bdr}`,cursor:"pointer",
                      background:sel?m.color+"22":J.surf,transition:"all .15s"}}>
                    <Avatar name={m.name} color={m.color} size={20}/>
                    <div>
                      <div style={{fontSize:"12px",fontWeight:600,color:sel?m.color:J.t1}}>{m.name.split(" ")[0]}</div>
                      <div style={{fontSize:"10px",fontWeight:600,color:p>=70?"#16A34A":p>=50?"#F59E0B":"#EF4444"}}>{p}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Risk */}
          <div style={{background:rt.bg,borderRadius:"8px",padding:"14px",border:`1px solid ${rt.d}22`,marginBottom:"14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
              <span style={{fontSize:"11px",color:rt.t,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>Auto Risk</span>
              <RLoz risk={risk}/>
            </div>
            {prob!=null&&<div style={{fontSize:"12px",color:J.t2,marginBottom:"8px"}}>Fit prob: <b style={{color:prob>=70?"#16A34A":prob>=50?"#F59E0B":"#EF4444"}}>{prob}%</b></div>}
            <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
              {RISK_LEVELS.map(r=>{const rc=RT[r];return(
                <button key={r} onClick={()=>sT(p=>({...p,riskOverride:p.riskOverride===r?null:r}))}
                  style={{background:t.riskOverride===r?rc.bg:"transparent",border:`1px solid ${t.riskOverride===r?rc.d:J.bdr}`,
                    color:t.riskOverride===r?rc.t:J.t2,borderRadius:"999px",padding:"3px 10px",cursor:"pointer",fontSize:"11px",fontWeight:500,transition:"all .15s"}}>
                  {r}
                </button>
              );})}
              {t.riskOverride&&<span style={{fontSize:"10px",color:J.tm,alignSelf:"center"}}>manual</span>}
            </div>
          </div>
          {assignee&&(
            <div style={{background:"#F9FAFB",borderRadius:"8px",padding:"14px",border:`1px solid ${J.bdr}`}}>
              <div style={{fontSize:"11px",color:J.t2,fontWeight:600,textTransform:"uppercase",marginBottom:"10px",letterSpacing:"0.05em"}}>Assignee Stats</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px",textAlign:"center"}}>
                {[["Load",`${assignee.workload}%`,assignee.workload>80?"#EF4444":assignee.workload>65?"#F59E0B":"#16A34A"],
                  ["Skill",`${getSkill(assignee,t.type)}/5`,J.t1],
                  ["Fit",`${prob}%`,prob>=70?"#16A34A":prob>=50?"#F59E0B":"#EF4444"]
                ].map(([l,val,c])=>(
                  <div key={l} style={{padding:"10px",background:J.surf,borderRadius:"8px",border:`1px solid ${J.bdr}`}}>
                    <div style={{fontSize:"17px",fontWeight:700,color:c}}>{val}</div>
                    <div style={{fontSize:"9px",color:J.tm,textTransform:"uppercase",marginTop:"2px"}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════ MEMBER DRAWER ═══════════ */
function MemberDrawer({member,tasks,sprints,skillCols,members,onUpdate,onDelete,onClose}){
  const [m,sM]=useState({...member,skills:{...member.skills}});
  const myTasks=tasks.filter(t=>t.assigneeId===member.id);
  const risk=memberRiskScore(member,tasks,members);
  const rt=RT[risk.level];
  const stats=memberStats(member,members,skillCols);
  const sc=STATUSES.reduce((a,s)=>({...a,[s]:myTasks.filter(t=>t.status===s).length}),{});
  const wc=m.workload>80?"#EF4444":m.workload>65?"#F59E0B":"#16A34A";

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(17,24,39,.45)",zIndex:900,display:"flex",justifyContent:"flex-end"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:"500px",maxWidth:"96vw",background:J.surf,boxShadow:"-4px 0 24px rgba(0,0,0,.15)",overflowY:"auto",display:"flex",flexDirection:"column"}}>
        {/* Header */}
        <div style={{background:m.color,padding:"20px 18px 16px",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{display:"flex",gap:"13px",alignItems:"center"}}>
              <div style={{width:48,height:48,borderRadius:"50%",background:"rgba(255,255,255,.25)",
                color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,fontWeight:700}}>
                {m.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
              </div>
              <div>
                <input value={m.name} onChange={e=>sM(p=>({...p,name:e.target.value}))}
                  style={{background:"none",border:"none",color:"#fff",fontSize:"17px",fontWeight:600,fontFamily:"inherit",width:"175px",display:"block"}}/>
                <input value={m.role} onChange={e=>sM(p=>({...p,role:e.target.value}))}
                  style={{background:"none",border:"none",color:"rgba(255,255,255,.8)",fontSize:"12px",fontFamily:"inherit",width:"175px",display:"block"}}/>
              </div>
            </div>
            <div style={{display:"flex",gap:"5px"}}>
              <button onClick={()=>{onUpdate(m.id,m);onClose();}}
                style={{background:"rgba(255,255,255,.2)",border:"1px solid rgba(255,255,255,.35)",color:"#fff",borderRadius:"6px",padding:"5px 10px",cursor:"pointer",fontSize:"12px",fontWeight:500}}>
                Save
              </button>
              <button onClick={()=>{if(window.confirm(`Delete ${member.name}?`))onDelete(member.id);}}
                style={{background:"rgba(180,0,0,.25)",border:"1px solid rgba(255,100,100,.35)",color:"#fff",borderRadius:"6px",padding:"5px 10px",cursor:"pointer",fontSize:"12px"}}>
                🗑
              </button>
              <button onClick={onClose}
                style={{background:"rgba(255,255,255,.15)",border:"none",cursor:"pointer",color:"#fff",fontSize:"16px",borderRadius:"6px",padding:"4px 9px",lineHeight:1}}>
                ✕
              </button>
            </div>
          </div>
        </div>

        <div style={{padding:"16px",flex:1,overflow:"auto"}}>
          {/* Risk */}
          <div style={{background:rt.bg,border:`1px solid ${rt.d}33`,borderRadius:"8px",padding:"12px 14px",marginBottom:"12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"5px"}}>
              <span style={{fontSize:"11px",fontWeight:600,color:rt.t,textTransform:"uppercase",letterSpacing:"0.05em"}}>Risk Score</span>
              <RLoz risk={risk.level}/>
            </div>
            <div style={{fontSize:"22px",fontWeight:700,color:rt.d,marginBottom:"4px"}}>{risk.score}/100</div>
            {risk.factors.map((f,i)=><div key={i} style={{fontSize:"11px",color:rt.t}}>• {f}</div>)}
          </div>

          {/* Workload */}
          <div style={{background:"#F9FAFB",borderRadius:"8px",padding:"12px 14px",border:`1px solid ${J.bdr}`,marginBottom:"12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
              <span style={{fontSize:"11px",fontWeight:600,color:J.t2,textTransform:"uppercase",letterSpacing:"0.05em"}}>Workload</span>
              <span style={{fontSize:"13px",fontWeight:700,color:wc}}>{m.workload}%</span>
            </div>
            <div style={{height:"6px",background:"#E5E7EB",borderRadius:"3px",marginBottom:"6px"}}>
              <div style={{height:"100%",width:`${m.workload}%`,background:wc,borderRadius:"3px",transition:"width .3s"}}/>
            </div>
            <input type="range" min="0" max="100" value={m.workload}
              onChange={e=>sM(p=>({...p,workload:parseInt(e.target.value)}))}
              style={{width:"100%",accentColor:m.color,cursor:"pointer"}}/>
          </div>

          {/* Tasks */}
          <div style={{background:"#F9FAFB",borderRadius:"8px",padding:"12px 14px",border:`1px solid ${J.bdr}`,marginBottom:"12px"}}>
            <div style={{fontSize:"11px",fontWeight:600,color:J.t2,textTransform:"uppercase",marginBottom:"8px",letterSpacing:"0.05em"}}>
              Tasks ({myTasks.length})
            </div>
            {myTasks.length>0&&(
              <div style={{height:"5px",display:"flex",borderRadius:"3px",overflow:"hidden",background:"#E5E7EB",marginBottom:"7px"}}>
                {[["Done","#16A34A"],["In Progress","#4F46E5"],["Review","#7C3AED"],["Todo","#E5E7EB"],["Blocked","#EF4444"]]
                  .map(([s,c])=>sc[s]>0&&<div key={s} style={{width:`${sc[s]/myTasks.length*100}%`,background:c}}/>)}
              </div>
            )}
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"8px"}}>
              {[["✓","Done","#16A34A"],["▶","In Progress","#4F46E5"],["◉","Review","#7C3AED"],["○","Todo","#9CA3AF"],["✗","Blocked","#EF4444"]]
                .map(([sym,s,c])=>sc[s]>0&&<span key={s} style={{fontSize:"10px",color:c,fontWeight:600}}>{sym} {sc[s]}</span>)}
              {myTasks.length===0&&<span style={{fontSize:"11px",color:J.tm}}>No tasks</span>}
            </div>
            {myTasks.map(t=>{
              const stBg={"Todo":"#F3F4F6","In Progress":"#EEF2FF","Review":"#F5F3FF","Done":"#F0FDF4","Blocked":"#FEF2F2"};
              const stT={"Todo":"#6B7280","In Progress":"#4F46E5","Review":"#7C3AED","Done":"#166534","Blocked":"#DC2626"};
              return(
                <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                  padding:"5px 8px",background:J.surf,borderRadius:"6px",border:`1px solid ${J.bdr}`,marginBottom:"4px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
                    <PIco p={t.priority} size={10}/>
                    <span style={{fontSize:"12px",color:J.t1}}>{t.name}</span>
                  </div>
                  <Loz label={t.status} bg={stBg[t.status]||"#F3F4F6"} color={stT[t.status]||"#6B7280"}/>
                </div>
              );
            })}
          </div>

          {/* Skills */}
          <div style={{background:"#F9FAFB",borderRadius:"8px",padding:"12px 14px",border:`1px solid ${J.bdr}`,marginBottom:"12px"}}>
            <div style={{fontSize:"11px",fontWeight:600,color:J.t2,textTransform:"uppercase",marginBottom:"10px",letterSpacing:"0.05em"}}>
              Skills — Score & Team Percentile
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              {skillCols.map(type=>{
                const score=m.skills[type]??1;
                const st=stats[type]||{score,percentile:0,label:SL[score]||"—",color:SC[score]||J.t2};
                const hc=TC[type]||J.blue;
                return(
                  <div key={type} style={{background:J.surf,borderRadius:"6px",padding:"9px 11px",border:`1px solid ${J.bdr}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                      <span style={{fontSize:"12px",fontWeight:600,color:hc}}>{type}</span>
                      <div style={{display:"flex",alignItems:"center",gap:"9px"}}>
                        <span style={{fontSize:"10px",color:st.color,fontWeight:600}}>{st.percentile}th pctl</span>
                        <SkillDots score={score} onChange={v=>sM(p=>({...p,skills:{...p.skills,[type]:v}}))}/>
                      </div>
                    </div>
                    <div style={{height:"4px",background:"#E5E7EB",borderRadius:"2px"}}>
                      <div style={{height:"100%",width:`${(score/5)*100}%`,background:hc,borderRadius:"2px",transition:"width .3s"}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Color */}
          <div style={{display:"flex",alignItems:"center",gap:"12px",background:"#F9FAFB",borderRadius:"8px",padding:"10px 14px",border:`1px solid ${J.bdr}`}}>
            <span style={{fontSize:"11px",fontWeight:600,color:J.t2,textTransform:"uppercase",letterSpacing:"0.05em"}}>Color</span>
            <input type="color" value={m.color} onChange={e=>sM(p=>({...p,color:e.target.value}))}
              style={{width:"30px",height:"22px",border:`1px solid ${J.bdr}`,borderRadius:"4px",cursor:"pointer",padding:0}}/>
            <div style={{width:26,height:26,borderRadius:"50%",background:m.color}}/>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ EXCEL PREVIEW MODAL ═══════════ */
function ExcelPreviewModal({parsed,onApply,onClose}){
  const [cols,sCols]=useState(parsed.skillCols);
  const [rows,sRows]=useState(()=>parsed.members.map((m,i)=>({
    id:"p"+i,
    name:m.name||"Member "+(i+1),
    role:m.role||"Team Member",
    color:m.color||AC[i%AC.length],
    workload:m.workload||50,
    keep:true,
    skills:Object.fromEntries(parsed.skillCols.map(c=>[c,Math.max(1,Math.min(5,parseInt(m.skills?.[c])||1))]))
  })));
  const [sortCol,sSortCol]=useState(null);
  const [sortDir,sSortDir]=useState(-1);

  const sortedRows=[...rows].sort((a,b)=>{
    if(!sortCol)return 0;
    return((b.skills[sortCol]??0)-(a.skills[sortCol]??0))*sortDir;
  });
  const toggleSort=col=>{
    if(sortCol===col)sSortDir(d=>-d);
    else{sSortCol(col);sSortDir(-1);}
  };
  const kept=rows.filter(r=>r.keep);
  const colColor=ci=>TC[cols[ci]]||AC[ci%AC.length];

  const addMemberRow=()=>sRows(rs=>[...rs,{
    id:"pnew"+Date.now(),
    name:"New Member",
    role:"Team Member",
    color:AC[rs.length%AC.length],
    workload:50,
    keep:true,
    skills:Object.fromEntries(cols.map(c=>[c,1]))
  }]);

  const removeRow=(id)=>sRows(rs=>rs.filter(r=>r.id!==id));

  return(
    <Modal title="Excel Import — Preview & Edit" onClose={onClose} width="95vw">
      <div style={{background:J.blueL,border:`1px solid #C7D2FE`,borderRadius:"8px",padding:"11px 14px",marginBottom:"14px",fontSize:"12px",color:J.t1,lineHeight:"1.7"}}>
        <b>Members = rows &nbsp;|&nbsp; Skills = columns.</b> Edit inline. Use + Add Member for new rows. Click <b>Apply & Import</b> when ready.
      </div>
      <div style={{display:"flex",gap:"8px",marginBottom:"14px",flexWrap:"wrap"}}>
        <div style={{background:"#F9FAFB",borderRadius:"8px",padding:"9px 16px",border:`1px solid ${J.bdr}`,textAlign:"center"}}>
          <div style={{fontSize:"20px",fontWeight:700,color:J.blue}}>{kept.length}</div>
          <div style={{fontSize:"10px",color:J.t2,textTransform:"uppercase"}}>Members</div>
        </div>
        <div style={{background:"#F9FAFB",borderRadius:"8px",padding:"9px 16px",border:`1px solid ${J.bdr}`,textAlign:"center"}}>
          <div style={{fontSize:"20px",fontWeight:700,color:"#059669"}}>{cols.length}</div>
          <div style={{fontSize:"10px",color:J.t2,textTransform:"uppercase"}}>Skills</div>
        </div>
        <div style={{flex:1,background:"#F0FDF4",borderRadius:"8px",padding:"9px 14px",border:"1px solid #A7F3D0",fontSize:"12px",color:J.t1,display:"flex",alignItems:"center",gap:"6px"}}>
          ✅ <span><b>Existing members are updated (skills merged).</b> New names are added. Task assignments kept.</span>
        </div>
      </div>

      <div style={{overflowX:"auto",border:`1px solid ${J.bdr}`,borderRadius:"8px",marginBottom:"12px"}}>
        <table style={{borderCollapse:"collapse",fontSize:"12px",width:"100%",tableLayout:"auto"}}>
          <thead>
            <tr style={{background:"#F9FAFB"}}>
              <th style={{padding:"9px 11px",textAlign:"center",color:J.t2,fontWeight:600,fontSize:"10px",textTransform:"uppercase",whiteSpace:"nowrap",position:"sticky",left:0,background:"#F9FAFB",zIndex:2,borderBottom:`1px solid ${J.bdr}`}}>✓</th>
              <th style={{padding:"9px 11px",textAlign:"left",color:J.t2,fontWeight:600,fontSize:"10px",textTransform:"uppercase",whiteSpace:"nowrap",position:"sticky",left:"40px",background:"#F9FAFB",zIndex:2,borderBottom:`1px solid ${J.bdr}`,minWidth:"140px"}}>Member</th>
              <th style={{padding:"9px 11px",textAlign:"left",color:J.t2,fontWeight:600,fontSize:"10px",textTransform:"uppercase",whiteSpace:"nowrap",borderBottom:`1px solid ${J.bdr}`,minWidth:"120px"}}>Role</th>
              {cols.map((c,ci)=>(
                <th key={c} onClick={()=>toggleSort(c)}
                  style={{padding:"9px 11px",textAlign:"center",color:colColor(ci),fontWeight:600,fontSize:"11px",
                    textTransform:"uppercase",whiteSpace:"nowrap",cursor:"pointer",userSelect:"none",
                    borderTop:`2px solid ${colColor(ci)}`,borderBottom:`1px solid ${J.bdr}`,
                    background:sortCol===c?"#EEF2FF":"transparent",minWidth:"80px"}}>
                  {c} {sortCol===c?(sortDir===-1?"↓":"↑"):"↕"}
                </th>
              ))}
              <th style={{padding:"9px 11px",textAlign:"center",color:J.t2,fontWeight:600,fontSize:"10px",textTransform:"uppercase",whiteSpace:"nowrap",borderBottom:`1px solid ${J.bdr}`}}>Color</th>
              <th style={{padding:"9px 11px",textAlign:"center",color:J.t2,fontWeight:600,fontSize:"10px",textTransform:"uppercase",whiteSpace:"nowrap",borderBottom:`1px solid ${J.bdr}`}}></th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(row=>{
              const idx=rows.findIndex(r=>r.id===row.id);
              return(
                <tr key={row.id} style={{borderBottom:`1px solid ${J.bdr}`,opacity:row.keep?1:.35,background:row.keep?J.surf:"#FAFAFA"}}>
                  <td style={{padding:"8px 11px",textAlign:"center",position:"sticky",left:0,background:row.keep?J.surf:"#FAFAFA",zIndex:1}}>
                    <input type="checkbox" checked={row.keep}
                      onChange={e=>sRows(rs=>rs.map((r,i)=>i===idx?{...r,keep:e.target.checked}:r))}
                      style={{width:"14px",height:"14px",cursor:"pointer",accentColor:J.blue}}/>
                  </td>
                  <td style={{padding:"7px 11px",position:"sticky",left:"40px",background:row.keep?J.surf:"#FAFAFA",zIndex:1,minWidth:"140px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"7px"}}>
                      <Avatar name={row.name||"?"} color={row.color} size={24}/>
                      <input value={row.name}
                        onChange={e=>sRows(rs=>rs.map((r,i)=>i===idx?{...r,name:e.target.value}:r))}
                        style={{background:"none",border:"none",color:J.t1,fontWeight:600,fontSize:"12px",fontFamily:"inherit",width:"100px",outline:"none"}}/>
                    </div>
                  </td>
                  <td style={{padding:"7px 11px",minWidth:"120px"}}>
                    <input value={row.role}
                      onChange={e=>sRows(rs=>rs.map((r,i)=>i===idx?{...r,role:e.target.value}:r))}
                      style={{background:"none",border:`1px solid transparent`,color:J.t2,fontSize:"11px",
                        fontFamily:"inherit",width:"110px",borderRadius:"6px",padding:"2px 5px",outline:"none"}}
                      onMouseEnter={e=>e.target.style.borderColor=J.bdr}
                      onMouseLeave={e=>e.target.style.borderColor="transparent"}
                      onFocus={e=>e.target.style.borderColor=J.bdrF}
                      onBlur={e=>e.target.style.borderColor="transparent"}/>
                  </td>
                  {cols.map((c,ci)=>{
                    const score=Math.max(1,Math.min(5,parseInt(row.skills[c])||1));
                    return(
                      <td key={c} style={{padding:"7px 9px",textAlign:"center",minWidth:"88px"}}>
                        <SkillDots score={score}
                          onChange={v=>sRows(rs=>rs.map((r,i)=>i===idx?{...r,skills:{...r.skills,[c]:v}}:r))}/>
                        <input
                          type="number" min="1" max="5" value={score}
                          onChange={e=>{
                            const v=Math.max(1,Math.min(5,parseInt(e.target.value)||1));
                            sRows(rs=>rs.map((r,i)=>i===idx?{...r,skills:{...r.skills,[c]:v}}:r));
                          }}
                          style={{
                            width:"36px",marginTop:"3px",border:`1px solid ${J.bdr}`,
                            borderRadius:"4px",padding:"2px 4px",textAlign:"center",
                            fontSize:"11px",fontWeight:600,color:SC[score]||J.t2,
                            background:J.surf,fontFamily:"inherit",outline:"none",display:"block",margin:"3px auto 0"
                          }}
                          onFocus={e=>e.target.style.borderColor=J.bdrF}
                          onBlur={e=>e.target.style.borderColor=J.bdr}
                        />
                      </td>
                    );
                  })}
                  <td style={{padding:"7px 11px",textAlign:"center"}}>
                    <input type="color" value={row.color}
                      onChange={e=>sRows(rs=>rs.map((r,i)=>i===idx?{...r,color:e.target.value}:r))}
                      style={{width:"26px",height:"20px",border:`1px solid ${J.bdr}`,borderRadius:"4px",cursor:"pointer",padding:0}}/>
                  </td>
                  <td style={{padding:"7px 9px",textAlign:"center"}}>
                    <button onClick={()=>removeRow(row.id)}
                      style={{background:"#FEF2F2",border:"1px solid #FECACA",color:"#DC2626",
                        borderRadius:"6px",padding:"2px 8px",cursor:"pointer",fontSize:"11px",fontWeight:500}}>
                      🗑
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button onClick={addMemberRow}
        style={{width:"100%",background:"transparent",border:`2px dashed ${J.bdr}`,borderRadius:"8px",
          padding:"9px",color:J.blue,cursor:"pointer",fontSize:"12px",fontWeight:600,marginBottom:"14px",
          display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",transition:"all .15s"}}
        onMouseEnter={e=>{e.currentTarget.style.background=J.blueL;}}
        onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
        + Add Team Member Row
      </button>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:`1px solid ${J.bdr}`,paddingTop:"14px"}}>
        <span style={{fontSize:"12px",color:J.t2}}>{kept.length} of {rows.length} members will be imported</span>
        <div style={{display:"flex",gap:"8px"}}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn v="pri" disabled={kept.length===0}
            onClick={()=>onApply(cols,rows.filter(r=>r.keep))}>
            ✓ Apply & Replace Team ({kept.length} members)
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════ MAIN APP ═══════════ */
export default function App({template,workspace,user,onSignOut}){
  const [tasks,   sTasks]  =useState([]);
  const [members, sMembers]=useState([]);
  const [sprints, sSprints]=useState([]);
  const [skillCols,sSkillCols]=useState(template?.skills||DEF_SKILLS);
  const [wsId,sWsId]=useState(null);
  const [loading,sLoading]=useState(true);
  const [tab,     sTab]    =useState("board");
  const [aiModal, sAiModal]=useState(null);
  const [selTask, sSelTask]=useState(null);
  const [selMem,  sSelMem] =useState(null);
  const [banner,  sBanner] =useState({text:"",loading:true});
  const [botMin,  sBotMin] =useState(false);
  const [excelPreview,sExcelPreview]=useState(null);
  const [importMod,sImportMod]=useState(null);
  const [importFile,sImportFile]=useState(null);
  const [taskFile, sTaskFile] =useState(null);
  const [importSpId,sImportSpId]=useState("");
  const [dragTask,sDragTask]=useState(null);
  const [dragOver,sDragOver]=useState(null);
  const [sbUrl,setSbUrl]=useState("");
  const [sbKey,setSbKey]=useState("");
  const [sbOn,setSbOn]=useState(false);
  const [sbStatus,setSbStatus]=useState("");
  const [showSb,setShowSb]=useState(false);
  const importRef=useRef();

  /* ═══════ SUPABASE LOAD ═══════ */
  useEffect(()=>{
    if(!user)return;
    const init=async()=>{
      sLoading(true);
      let{data:ws}=await supabase.from("workspaces").select("*").eq("owner_id",user.id).single();
      if(!ws){
        const{data:newWs}=await supabase.from("workspaces").insert({
          name:workspace||"My Workspace",
          owner_id:user.id,
          template:template?.id||"software",
          skill_cols:template?.skills||DEF_SKILLS,
        }).select().single();
        ws=newWs;
      }
      if(!ws){sLoading(false);return;}
      sWsId(ws.id);
      sSkillCols(ws.skill_cols||template?.skills||DEF_SKILLS);
      const{data:dbMembers}=await supabase.from("members").select("*").eq("workspace_id",ws.id);
      if(dbMembers?.length){
        sMembers(dbMembers.map(m=>({...m,skills:m.skills||{}})));
      } else {
        const seeded=SEED_MEMBERS.map(m=>({...m,workspace_id:ws.id}));
        const{data:ins}=await supabase.from("members").insert(seeded).select();
        if(ins)sMembers(ins.map(m=>({...m,skills:m.skills||{}})));
      }
      const{data:dbSprints}=await supabase.from("sprints").select("*").eq("workspace_id",ws.id);
      if(dbSprints?.length){
        sSprints(dbSprints);
      } else {
        const seeded=SEED_SPRINTS.map(s=>({...s,workspace_id:ws.id}));
        const{data:ins}=await supabase.from("sprints").insert(seeded).select();
        if(ins)sSprints(ins);
      }
      const{data:dbTasks}=await supabase.from("tasks").select("*").eq("workspace_id",ws.id);
      if(dbTasks?.length){
        sTasks(dbTasks.map(t=>({...t,assigneeId:t.assignee_id,riskOverride:t.risk_override})));
      } else {
        const seeded=SEED_TASKS.map(t=>({...t,workspace_id:ws.id,assignee_id:t.assigneeId,risk_override:t.riskOverride}));
        const{data:ins}=await supabase.from("tasks").insert(seeded).select();
        if(ins)sTasks(ins.map(t=>({...t,assigneeId:t.assignee_id,riskOverride:t.risk_override})));
      }
      sLoading(false);
    };
    init();
  },[user]);
  const taskRef=useRef();

  /* Banner */
  const refreshBanner=useCallback(()=>{
    sBanner({text:"",loading:true});
    const high=tasks.filter(t=>["High","Critical"].includes(calcRisk(t,members)));
    const burn=members.filter(m=>m.workload>80);
    callClaude(
      `Team: ${members.map(m=>`${m.name}(${m.workload}%,${tasks.filter(t=>t.assigneeId===m.id).length}t)`).join(", ")||"empty"}. `+
      `High-risk: ${high.map(t=>t.name).join(", ")||"none"}. `+
      `Burnout: ${burn.map(m=>m.name).join(", ")||"none"}. 2-sentence PM insight + one bullet action.`,
      "PM advisor. Max 2 sentences + 1 bullet. No markdown."
    ).then(t=>sBanner({text:t,loading:false}));
  },[tasks,members]);
  useEffect(()=>{refreshBanner();},[]);

  /* CRUD */
  const upTask=(id,p)=>{
    sTasks(ts=>ts.map(t=>t.id===id?{...t,...p}:t));
    const dbP={...p};
    if(p.assigneeId!==undefined)dbP.assignee_id=p.assigneeId;
    if(p.riskOverride!==undefined)dbP.risk_override=p.riskOverride;
    supabase.from("tasks").update(dbP).eq("id",id).then(()=>{});
  };
  const upMember=(id,p)=>{
    sMembers(ms=>ms.map(m=>m.id===id?{...m,...p}:m));
    supabase.from("members").update(p).eq("id",id).then(()=>{});
  };
  const delTask  =(id)=>sTasks(ts=>ts.filter(t=>t.id!==id));
  const delMember=(id)=>{sMembers(ms=>ms.filter(m=>m.id!==id));sTasks(ts=>ts.map(t=>t.assigneeId===id?{...t,assigneeId:null}:t));sSelMem(null);};
  const addTask  =(spId)=>sTasks(ts=>[...ts,{id:"t"+Date.now(),name:"New issue",type:skillCols[0]||"Frontend",complexity:"Medium",priority:"Medium",effort:3,sprint:spId||sprints[1]?.id||sprints[0]?.id||"s1",status:"Todo",assigneeId:null,riskOverride:null}]);
  const addSprint=()=>{const id="s"+Date.now();sSprints(ss=>[...ss,{id,name:"New Sprint",start:"",end:"",status:"Planned"}]);return id;};
  const delSprint=(id)=>{sSprints(ss=>ss.filter(s=>s.id!==id));sTasks(ts=>ts.filter(t=>t.sprint!==id));};
  const addMember=()=>sMembers(ms=>[...ms,{id:"m"+Date.now(),name:"New Member",role:"Developer",color:AC[ms.length%AC.length],workload:50,skills:Object.fromEntries(skillCols.map(c=>[c,1]))}]);

  /* File parse */
  const parseFile=(file,cb)=>{
    const reader=new FileReader();
    reader.onload=e=>{
      try{
        if(window.XLSX){
          const wb=window.XLSX.read(e.target.result,{type:"binary"});
          const ws=wb.Sheets[wb.SheetNames[0]];
          cb(window.XLSX.utils.sheet_to_json(ws,{defval:""}));
        }else{
          const lines=e.target.result.split("\n").filter(Boolean);
          const hdr=lines[0].split(",").map(h=>h.trim().replace(/^"|"$/g,""));
          cb(lines.slice(1).map(l=>{
            const v=l.split(",").map(x=>x.trim().replace(/^"|"$/g,""));
            return Object.fromEntries(hdr.map((h,i)=>[h,v[i]||""]));
          }));
        }
      }catch(err){alert("Parse error: "+err.message);}
    };
    if(file.name.endsWith(".csv"))reader.readAsText(file);
    else reader.readAsBinaryString(file);
  };

  const openSkillPreview=(file)=>{
    ensureXLSX(()=>parseFile(file,rows=>{
      if(!rows.length){alert("File is empty.");return;}
      const allCols=Object.keys(rows[0]);
      if(allCols.length<2){alert("Need at least 2 columns: name + one skill.");return;}
      const nameCol=detectNameCol(allCols,rows);
      const roleCols=allCols.filter(c=>c!==nameCol&&["role","title","position","department","team"].some(k=>c.toLowerCase().includes(k)));
      const roleCol=roleCols[0]||null;
      const skillColsRaw=detectSkillCols(allCols,nameCol,rows).filter(c=>c!==roleCol);
      if(!skillColsRaw.length){alert("No skill columns found.");return;}
      const maxVal=Math.max(...rows.flatMap(r=>skillColsRaw.map(c=>parseFloat(r[c])||0)));
      const is100=maxVal>10;
      const membersParsed=rows.map((row,i)=>{
        const skills=Object.fromEntries(skillColsRaw.map(c=>[c,normaliseScore(row[c],is100)]));
        return{name:String(row[nameCol]||"").trim()||`Member ${i+1}`,role:roleCol?String(row[roleCol]||""):"Team Member",skills,color:AC[i%AC.length],workload:50};
      }).filter(m=>m.name);
      if(!membersParsed.length){alert("No members found.");return;}
      sExcelPreview({members:membersParsed,skillCols:skillColsRaw});
      sImportMod(null);sImportFile(null);
    }));
  };

  const applyExcelTeam=(newSkillCols,incomingMembers)=>{
    sMembers(existing=>{
      const usedIds=new Set(existing.map(m=>m.id));
      return incomingMembers.map((incoming,i)=>{
        const match=existing.find(e=>e.name.toLowerCase()===incoming.name.toLowerCase());
        const skills=Object.fromEntries(newSkillCols.map(c=>[c,Math.max(1,Math.min(5,incoming.skills?.[c]??1))]));
        if(match){
          return{...match,name:incoming.name.trim(),role:incoming.role||match.role,skills};
        }
        let newId="m"+Date.now()+i;
        while(usedIds.has(newId))newId="m"+(Date.now()+i+(Math.random()*999|0));
        usedIds.add(newId);
        return{id:newId,name:incoming.name.trim(),role:incoming.role||"Team Member",color:incoming.color||AC[i%AC.length],workload:incoming.workload??50,skills};
      });
    });
    sSkillCols(newSkillCols);
    sTasks(ts=>ts.map(t=>({...t,type:newSkillCols.includes(t.type)?t.type:newSkillCols[0]})));
    sExcelPreview(null);
    sTab("skills");
  };

  /* Export */
  const exportSkillMatrix=()=>{
    ensureXLSX(()=>{
      const data=[["Member Name","Role",...skillCols],...members.map(m=>[m.name,m.role,...skillCols.map(c=>m.skills[c]??1)])];
      const ws=window.XLSX.utils.aoa_to_sheet(data);
      const wb=window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb,ws,"Skills");
      window.XLSX.writeFile(wb,"skill_matrix.xlsx");
    });
  };

  /* Task import */
  const handleTaskImport=(file,spId)=>{
    ensureXLSX(()=>parseFile(file,rows=>{
      if(!rows.length){alert("File empty.");return;}
      const h=Object.keys(rows[0]);
      const tm=cs=>h.find(k=>cs.some(c=>k.toLowerCase().includes(c)));
      const col={name:tm(["task name","name","title","summary","issue"]),type:tm(["type","category"]),complexity:tm(["complexity","difficulty"]),priority:tm(["priority","urgency"]),effort:tm(["effort","points","story"]),status:tm(["status","state"]),assignee:tm(["assignee","assigned","owner"])};
      sTasks(ts=>[...ts,...rows.map((row,i)=>{
        const rawA=col.assignee?row[col.assignee]:"";
        const found=members.find(m=>m.name.toLowerCase().includes((rawA||"").toLowerCase())&&rawA);
        const effort=EFFORTS.includes(parseInt(col.effort?row[col.effort]:3))?parseInt(col.effort?row[col.effort]:3):3;
        const status=STATUSES.find(s=>s.toLowerCase()===(col.status?row[col.status]||"Todo":"Todo").toLowerCase())||"Todo";
        const type=skillCols.find(t=>t.toLowerCase()===(col.type?row[col.type]||skillCols[0]:skillCols[0]).toLowerCase())||skillCols[0];
        const cx=COMPLEXITIES.find(c=>c.toLowerCase()===(col.complexity?row[col.complexity]||"Medium":"Medium").toLowerCase())||"Medium";
        const pri=PRIORITIES.find(p=>p.toLowerCase()===(col.priority?row[col.priority]||"Medium":"Medium").toLowerCase())||"Medium";
        return{id:"ti"+Date.now()+i,name:(col.name?row[col.name]:"")||`Issue ${i+1}`,type,complexity:cx,priority:pri,effort,status,sprint:spId,assigneeId:found?.id||null,riskOverride:null};
      })]);
      sTaskFile(null);sImportMod(null);
    }));
  };

  /* AI helpers */
  const aiAssign=(task)=>{
    const cands=rankCandidates(task,members);
    sAiModal({title:`Smart Assignment — ${task.name}`,
      prompt:`Task "${task.name}" (${task.type}, ${task.complexity}, ${task.priority}, ${task.effort}pts). Candidates: ${cands.map((c,i)=>`${i+1}. ${c.member.name}: skill ${c.skill}/5, fit ${c.prob}%, load ${c.member.workload}%`).join("; ")}. Recommend best person with brief reasoning.`,
      extra:(
        <div>
          {cands.map((c,i)=>{
            const allS=members.map(m=>getSkill(m,task.type));
            const p2=pct(c.skill,allS);
            return(
              <div key={c.member.id}
                style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",marginBottom:"6px",background:i===0?J.blueL:"#F9FAFB",borderRadius:"8px",border:`1px solid ${i===0?"#C7D2FE":J.bdr}`}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                  <Avatar name={c.member.name} color={c.member.color} size={26}/>
                  <div>
                    <div style={{fontSize:"13px",fontWeight:600,color:J.t1}}>{c.member.name}</div>
                    <div style={{fontSize:"11px",color:J.t2}}>{c.member.role} · {p2}th pctl in {task.type}</div>
                  </div>
                  {i===0&&<Loz label="Best fit" bg={J.blue} color="#fff" bold/>}
                </div>
                <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
                  {[["Skill",`${c.skill}/5`,J.t1],["Fit",`${c.prob}%`,c.prob>=70?"#16A34A":c.prob>=50?"#F59E0B":"#EF4444"],["Load",`${c.member.workload}%`,c.member.workload>80?"#EF4444":J.t1]].map(([l,val,col])=>(
                    <div key={l} style={{textAlign:"center"}}>
                      <div style={{fontSize:"13px",fontWeight:700,color:col}}>{val}</div>
                      <div style={{fontSize:"9px",color:J.tm,textTransform:"uppercase"}}>{l}</div>
                    </div>
                  ))}
                  <Btn v="pri" sm onClick={()=>{upTask(task.id,{assigneeId:c.member.id});sAiModal(null);}}>Assign</Btn>
                </div>
              </div>
            );
          })}
        </div>
      )
    });
  };
  const aiRisk=(task)=>{
    const risk=calcRisk(task,members);const m=members.find(mm=>mm.id===task.assigneeId);const prob=m?calcProb(m,task):null;
    sAiModal({title:`Risk — ${task.name}`,
      prompt:`Task "${task.name}" (${task.type}, ${task.complexity}, ${task.priority}). Risk: ${risk}. ${m?`Assignee: ${m.name} (${m.workload}% load, skill ${getSkill(m,task.type)}/5, fit ${prob}%).`:"Unassigned."} Explain risk and give 2-3 mitigations.`,
      extra:(
        <div style={{display:"flex",gap:"8px",marginBottom:"4px",flexWrap:"wrap"}}>
          {[["Risk",<RLoz key="r" risk={risk}/>],m&&["Assignee",<div key="a" style={{display:"flex",alignItems:"center",gap:"5px"}}><Avatar name={m.name} color={m.color} size={18}/>{m.name}</div>],m&&["Fit Prob",<b key="p" style={{color:prob>=70?"#16A34A":prob>=50?"#F59E0B":"#EF4444"}}>{prob}%</b>]].filter(Boolean).map(([l,v])=>(
            <div key={l} style={{flex:"1 1 80px",padding:"10px",background:"#F9FAFB",borderRadius:"8px",border:`1px solid ${J.bdr}`}}>
              <div style={{fontSize:"10px",color:J.t2,fontWeight:600,textTransform:"uppercase",marginBottom:"4px"}}>{l}</div>
              <div style={{fontSize:"13px",color:J.t1}}>{v}</div>
            </div>
          ))}
        </div>
      )
    });
  };
  const aiSprintHealth=(sprint)=>{
    const st=tasks.filter(t=>t.sprint===sprint.id);
    const unass=st.filter(t=>!t.assigneeId).length;const high=st.filter(t=>["High","Critical"].includes(calcRisk(t,members))).length;
    sAiModal({title:`Sprint Health — ${sprint.name}`,
      prompt:`Sprint "${sprint.name}" (${sprint.status}). ${st.length} tasks, ${unass} unassigned, ${high} high-risk. Tasks: ${st.map(t=>`${t.name}(${t.status},${calcRisk(t,members)}${t.assigneeId?"":",UNASSIGNED"})`).join("; ")}. Team: ${members.map(m=>`${m.name}:${m.workload}%`).join(", ")||"none"}. Health score /100, top 3 risks, recommendation.`,
      extra:(
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px",marginBottom:"4px"}}>
          {[["Tasks",st.length,J.blue],["Unassigned",unass,"#F59E0B"],["High Risk",high,"#EF4444"]].map(([l,v,c])=>(
            <div key={l} style={{padding:"12px",background:"#F9FAFB",borderRadius:"8px",border:`1px solid ${J.bdr}`,textAlign:"center"}}>
              <div style={{fontSize:"24px",fontWeight:700,color:c}}>{v}</div>
              <div style={{fontSize:"10px",color:J.t2,fontWeight:600,textTransform:"uppercase"}}>{l}</div>
            </div>
          ))}
        </div>
      )
    });
  };

  /* Drag */
  const onDragStart=(e,id)=>{sDragTask(id);e.dataTransfer.effectAllowed="move";};
  const onDragOver2=(e,id)=>{e.preventDefault();sDragOver(id);};
  const onDrop=(e,spId)=>{e.preventDefault();if(dragTask)upTask(dragTask,{sprint:spId});sDragTask(null);sDragOver(null);};

  /* ═══════ BOARD ═══════ */
  const BoardTab=()=>{
    const assignedMs=members.filter(m=>tasks.some(t=>t.assigneeId===m.id));
    const unassigned=tasks.filter(t=>!t.assigneeId);
    const colAccent={"Todo":"#D1D5DB","In Progress":"#4F46E5","Review":"#7C3AED","Done":"#16A34A","Blocked":"#EF4444"};
    const colBg={"Done":"#F0FDF4","Blocked":"#FEF2F2"};
    return(
      <div>
        <div style={{display:"flex",gap:"8px",marginBottom:"16px",alignItems:"center",flexWrap:"wrap"}}>
          {sprints.filter(s=>s.status==="Active").map(s=>(
            <span key={s.id} style={{background:J.blueL,color:J.blue,padding:"4px 12px",borderRadius:"999px",fontSize:"12px",fontWeight:600}}>
              📌 {s.name}
            </span>
          ))}
          <Btn v="pri" sm onClick={()=>addTask()} style={{marginLeft:"auto"}}>+ Issue</Btn>
        </div>
        {members.length===0&&(
          <div style={{padding:"40px",textAlign:"center",color:J.tm,background:J.surf,borderRadius:"12px",border:`2px dashed ${J.bdr}`}}>
            <div style={{fontSize:"32px",marginBottom:"10px"}}>👥</div>
            <div style={{fontWeight:600,marginBottom:"5px",color:J.t1}}>No team yet</div>
            <div style={{fontSize:"12px",marginBottom:"14px"}}>Upload a skill matrix to get started</div>
            <Btn v="suc" onClick={()=>sImportMod("skill")}>Upload Excel</Btn>
          </div>
        )}
        {assignedMs.map(member=>{
          const mTasks=tasks.filter(t=>t.assigneeId===member.id);
          const sc2=STATUSES.reduce((a,s)=>({...a,[s]:mTasks.filter(t=>t.status===s).length}),{});
          const risk=memberRiskScore(member,tasks,members);
          return(
            <div key={member.id} style={{background:J.surf,borderRadius:"10px",border:`1px solid ${J.bdr}`,marginBottom:"12px",overflow:"hidden",boxShadow:J.sh1}}>
              {/* Lane header */}
              <div style={{borderLeft:`3px solid ${member.color}`,padding:"11px 14px",display:"flex",alignItems:"center",gap:"11px",flexWrap:"wrap",background:"#FAFAFA",borderBottom:`1px solid ${J.bdr}`}}>
                <Avatar name={member.name} color={member.color} size={32} onClick={()=>sSelMem(member)}/>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
                    <span style={{fontSize:"14px",fontWeight:600,color:J.t1,cursor:"pointer"}} onClick={()=>sSelMem(member)}>{member.name}</span>
                    <span style={{fontSize:"11px",color:J.t2}}>{member.role}</span>
                    <RLoz risk={risk.level}/>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"12px",marginTop:"3px"}}>
                    <span style={{fontSize:"11px",color:J.t2}}>{mTasks.length} task{mTasks.length!==1?"s":""}</span>
                    <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
                      <div style={{width:"60px",height:"4px",background:"#E5E7EB",borderRadius:"2px",overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${member.workload}%`,background:member.workload>80?"#EF4444":member.workload>65?"#F59E0B":"#16A34A",borderRadius:"2px"}}/>
                      </div>
                      <span style={{fontSize:"11px",fontWeight:600,color:member.workload>80?"#EF4444":member.workload>65?"#F59E0B":"#16A34A"}}>{member.workload}%{member.workload>80?" ⚠":""}</span>
                    </div>
                    <div style={{display:"flex",gap:"5px"}}>
                      {[["Done","#16A34A"],["In Progress","#4F46E5"],["Blocked","#EF4444"]].map(([s,c])=>sc2[s]>0&&(
                        <span key={s} style={{fontSize:"10px",color:c,fontWeight:600}}>
                          {s==="Done"?"✓":s==="In Progress"?"▶":"✗"} {sc2[s]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <Btn v="ai" sm onClick={()=>sAiModal({title:`${member.name} Analysis`,prompt:`${member.name} (${member.role}, ${member.workload}% load). Tasks: ${mTasks.map(t=>`${t.name}(${t.status},${calcRisk(t,members)})`).join("; ")||"none"}. Top skills: ${skillCols.slice(0,3).map(s=>`${s}:${member.skills[s]??1}/5`).join(", ")}. Capacity and recommendation.`,extra:null})}>AI</Btn>
              </div>
              {/* Status columns */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)"}}>
                {["Todo","In Progress","Review","Done","Blocked"].map((col,ci)=>{
                  const colTasks=mTasks.filter(t=>t.status===col);
                  return(
                    <div key={col} style={{borderRight:ci<4?`1px solid ${J.bdr}`:"none",padding:"9px",minHeight:"64px",background:colBg[col]||"transparent"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"4px",marginBottom:"8px",borderTop:`2px solid ${colAccent[col]}`,paddingTop:"6px"}}>
                        <span style={{fontSize:"9px",fontWeight:600,color:J.t2,textTransform:"uppercase",letterSpacing:"0.05em"}}>{col}</span>
                        <span style={{background:"#F3F4F6",color:J.tm,borderRadius:"999px",padding:"0 5px",fontSize:"9px",fontWeight:600,marginLeft:"auto"}}>{colTasks.length}</span>
                      </div>
                      {colTasks.map(task=>{
                        const risk2=calcRisk(task,members);const rt2=RT[risk2];
                        return(
                          <div key={task.id} onClick={()=>sSelTask(task)}
                            style={{background:J.surf,borderRadius:"7px",boxShadow:J.sh1,padding:"8px 9px",marginBottom:"6px",border:`1px solid ${J.bdr}`,cursor:"pointer",transition:"border-color .15s,box-shadow .15s"}}
                            onMouseEnter={e=>{e.currentTarget.style.boxShadow=J.sh2;e.currentTarget.style.borderColor="#C7D2FE";}}
                            onMouseLeave={e=>{e.currentTarget.style.boxShadow=J.sh1;e.currentTarget.style.borderColor=J.bdr;}}>
                            <div style={{fontSize:"9px",fontWeight:600,color:TC[task.type]||J.blue,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:"3px"}}>{task.type}</div>
                            <div style={{fontSize:"12px",fontWeight:500,color:J.t1,marginBottom:"6px",lineHeight:"1.35"}}>{task.name}</div>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                              <div style={{display:"flex",alignItems:"center",gap:"3px"}}>
                                <div style={{width:5,height:5,borderRadius:"50%",background:rt2.d}}/>
                                <span style={{fontSize:"9px",color:rt2.t,fontWeight:600}}>{risk2}</span>
                              </div>
                              <div style={{display:"flex",gap:"4px",alignItems:"center"}}>
                                <PIco p={task.priority} size={9}/>
                                <span style={{fontSize:"9px",color:J.tm,background:"#F3F4F6",padding:"1px 4px",borderRadius:"4px"}}>{task.effort}pt</span>
                              </div>
                            </div>
                            {col!=="Done"&&(
                              <div style={{borderTop:`1px solid ${J.bdr}`,paddingTop:"5px",marginTop:"6px"}} onClick={e=>e.stopPropagation()}>
                                <button onClick={()=>upTask(task.id,{status:"Done"})}
                                  style={{width:"100%",background:"#F0FDF4",border:"1px solid #A7F3D0",color:"#166534",borderRadius:"5px",padding:"3px 0",fontSize:"9px",fontWeight:600,cursor:"pointer"}}>
                                  ✓ Done
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {unassigned.length>0&&(
          <div style={{background:J.surf,borderRadius:"10px",border:`2px dashed ${J.bdr}`,padding:"14px"}}>
            <div style={{fontSize:"11px",fontWeight:600,color:J.t2,marginBottom:"9px",textTransform:"uppercase",letterSpacing:"0.05em"}}>⚠ Unassigned ({unassigned.length})</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
              {unassigned.map(task=>(
                <div key={task.id} onClick={()=>sSelTask(task)}
                  style={{background:"#F9FAFB",borderRadius:"7px",padding:"5px 10px",border:`1px solid ${J.bdr}`,cursor:"pointer",display:"flex",alignItems:"center",gap:"5px",transition:"all .15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.background=J.blueL;e.currentTarget.style.borderColor="#C7D2FE";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="#F9FAFB";e.currentTarget.style.borderColor=J.bdr;}}>
                  <PIco p={task.priority} size={10}/>
                  <span style={{fontSize:"12px",color:J.tl,fontWeight:500}}>{task.name}</span>
                  <RLoz risk={calcRisk(task,members)}/>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ═══════ BACKLOG ═══════ */
  const BacklogTab=()=>(
    <div>
      <div style={{display:"flex",gap:"8px",marginBottom:"14px",flexWrap:"wrap"}}>
        <Btn v="pri" onClick={()=>addTask()}>+ Create Issue</Btn>
        <Btn v="suc" onClick={()=>sImportMod("task")}>Import Tasks</Btn>
        <Btn onClick={addSprint}>+ Sprint</Btn>
      </div>
      {sprints.map(sprint=>{
        const st=tasks.filter(t=>t.sprint===sprint.id);
        const isTarget=dragOver===sprint.id;
        return(
          <div key={sprint.id} id={`sp-${sprint.id}`}
            style={{background:isTarget?J.blueL:J.surf,borderRadius:"10px",border:`1px solid ${isTarget?J.blue:J.bdr}`,marginBottom:"10px",overflow:"hidden",transition:"all .15s",boxShadow:J.sh1}}
            onDragOver={e=>onDragOver2(e,sprint.id)} onDrop={e=>onDrop(e,sprint.id)} onDragLeave={()=>sDragOver(null)}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"10px 14px",background:"#F9FAFB",borderBottom:`1px solid ${J.bdr}`,flexWrap:"wrap"}}>
              <span style={{color:J.t2,fontSize:"12px"}}>▼</span>
              <input value={sprint.name} onChange={e=>sSprints(ss=>ss.map(s=>s.id===sprint.id?{...s,name:e.target.value}:s))}
                style={{background:"none",border:"none",fontSize:"13px",fontWeight:600,color:J.t1,fontFamily:"inherit",minWidth:"100px"}}/>
              <Sel value={sprint.status} options={["Planned","Active","Completed"]} onChange={v=>sSprints(ss=>ss.map(s=>s.id===sprint.id?{...s,status:v}:s))} style={{fontSize:"11px"}}/>
              <input type="date" value={sprint.start} onChange={e=>sSprints(ss=>ss.map(s=>s.id===sprint.id?{...s,start:e.target.value}:s))}
                style={{border:`1px solid ${J.bdr}`,borderRadius:"6px",padding:"3px 6px",fontSize:"11px",color:J.t2,fontFamily:"inherit"}}/>
              <span style={{color:J.tm,fontSize:"11px"}}>→</span>
              <input type="date" value={sprint.end} onChange={e=>sSprints(ss=>ss.map(s=>s.id===sprint.id?{...s,end:e.target.value}:s))}
                style={{border:`1px solid ${J.bdr}`,borderRadius:"6px",padding:"3px 6px",fontSize:"11px",color:J.t2,fontFamily:"inherit"}}/>
              <span style={{fontSize:"11px",color:J.tm}}>{st.length} issues</span>
              <div style={{marginLeft:"auto",display:"flex",gap:"5px"}}>
                <Btn v="pri" sm onClick={()=>addTask(sprint.id)}>+ Issue</Btn>
                <Btn v="ai" sm onClick={()=>aiSprintHealth(sprint)}>AI</Btn>
                <Btn v="dan" sm onClick={()=>{if(window.confirm(`Delete "${sprint.name}" and its ${st.length} issues?`))delSprint(sprint.id);}}>🗑</Btn>
              </div>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                <thead><tr style={{background:"#FAFAFA",borderBottom:`1px solid ${J.bdr}`}}>
                  {["","Issue","Type","Complexity","Priority","Effort","Status","Assignee","Risk",""].map((h,i)=>(
                    <th key={i} style={{padding:"7px 9px",textAlign:"left",color:J.t2,fontWeight:600,fontSize:"10px",textTransform:"uppercase",whiteSpace:"nowrap",letterSpacing:"0.04em"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {st.length===0&&<tr><td colSpan={10} style={{padding:"14px",textAlign:"center",color:J.tm,fontSize:"12px"}}>{isTarget?"Drop here":"No issues."}</td></tr>}
                  {st.map(task=>{
                    const risk2=calcRisk(task,members);
                    const assignee=members.find(m=>m.id===task.assigneeId);
                    return(
                      <tr key={task.id} draggable
                        style={{borderBottom:`1px solid ${J.bdr}`,cursor:"pointer",opacity:dragTask===task.id?.5:1,transition:"background .1s"}}
                        onDragStart={e=>onDragStart(e,task.id)}
                        onMouseEnter={e=>e.currentTarget.style.background="#F9FAFB"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                        onClick={()=>sSelTask(task)}>
                        <td style={{padding:"6px 9px",cursor:"grab"}} onClick={e=>e.stopPropagation()}><span style={{color:J.tm}}>⠿</span></td>
                        <td style={{padding:"6px 9px"}}><span style={{fontWeight:500,color:J.tl}}>{task.name}</span></td>
                        <td style={{padding:"6px 7px"}} onClick={e=>e.stopPropagation()}><Sel value={task.type} options={skillCols.length?skillCols:DEF_SKILLS} onChange={v=>upTask(task.id,{type:v})} style={{fontSize:"11px"}}/></td>
                        <td style={{padding:"6px 7px"}} onClick={e=>e.stopPropagation()}><Sel value={task.complexity} options={COMPLEXITIES} onChange={v=>upTask(task.id,{complexity:v})} style={{fontSize:"11px"}}/></td>
                        <td style={{padding:"6px 7px"}} onClick={e=>e.stopPropagation()}><Sel value={task.priority} options={PRIORITIES} onChange={v=>upTask(task.id,{priority:v})} style={{fontSize:"11px"}}/></td>
                        <td style={{padding:"6px 7px"}} onClick={e=>e.stopPropagation()}><Sel value={String(task.effort)} options={EFFORTS.map(String)} onChange={v=>upTask(task.id,{effort:parseInt(v)})} style={{fontSize:"11px",width:"50px"}}/></td>
                        <td style={{padding:"6px 7px"}} onClick={e=>e.stopPropagation()}><Sel value={task.status} options={STATUSES} onChange={v=>upTask(task.id,{status:v})} style={{fontSize:"11px"}}/></td>
                        <td style={{padding:"6px 9px"}} onClick={e=>e.stopPropagation()}>
                          <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
                            {assignee&&<Avatar name={assignee.name} color={assignee.color} size={18} onClick={()=>sSelMem(assignee)}/>}
                            <select value={task.assigneeId||""} onChange={e=>upTask(task.id,{assigneeId:e.target.value||null})}
                              style={{background:J.surf,color:J.t1,border:`1px solid ${J.bdr}`,borderRadius:"6px",padding:"2px 6px",fontSize:"11px",fontFamily:"inherit"}}>
                              <option value="">Unassigned</option>
                              {rankCandidates(task,members).map(c=>(
                                <option key={c.member.id} value={c.member.id}>{c.member.name} ({c.prob}%)</option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td style={{padding:"6px 9px"}}><RLoz risk={risk2}/>{task.riskOverride&&<div style={{fontSize:"9px",color:J.tm}}>manual</div>}</td>
                        <td style={{padding:"6px 9px"}} onClick={e=>e.stopPropagation()}>
                          <div style={{display:"flex",gap:"3px"}}>
                            <Btn v="ai" sm onClick={()=>aiAssign(task)}>AI</Btn>
                            <Btn sm onClick={()=>aiRisk(task)} style={{background:"#FEF2F2",color:"#DC2626",border:"1px solid #FECACA"}}>Risk</Btn>
                            <Btn v="dan" sm onClick={()=>{if(window.confirm("Delete?"))delTask(task.id);}}>🗑</Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      <button onClick={addSprint}
        style={{width:"100%",background:"transparent",border:`2px dashed ${J.bdr}`,borderRadius:"10px",
          padding:"11px",color:J.tm,cursor:"pointer",fontSize:"12px",fontWeight:500,transition:"all .15s"}}
        onMouseEnter={e=>{e.currentTarget.style.background="#F9FAFB";}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
        + Add New Sprint
      </button>
    </div>
  );

  /* ═══════ SKILLS TAB ═══════ */
  const SkillsTab=()=>(
    <div>
      <div style={{background:J.surf,borderRadius:"10px",border:`1px solid ${J.bdr}`,padding:"16px 18px",marginBottom:"16px",boxShadow:J.sh1}}>
        <div style={{fontSize:"15px",fontWeight:600,color:J.t1,marginBottom:"5px"}}>Team Skill Management</div>
        <div style={{fontSize:"12px",color:J.t2,lineHeight:"1.7",marginBottom:"12px"}}>
          Upload your Excel/CSV. First column = member names. Numeric columns = skills (1–5 or 0–100 auto-converted). Click any score to edit inline.
        </div>
        <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"12px"}}>
          <Btn v="suc" onClick={()=>sImportMod("skill")}>Upload Skill Matrix</Btn>
          <Btn onClick={exportSkillMatrix}>Export</Btn>
          <Btn onClick={()=>sSkillCols(DEF_SKILLS)}>Reset Default Skills</Btn>
          <Btn v="pri" onClick={addMember}>+ Add Member</Btn>
        </div>
        <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
          {[1,2,3,4,5].map(v=>(
            <div key={v} style={{display:"flex",alignItems:"center",gap:"4px",background:"#F9FAFB",padding:"3px 9px",borderRadius:"999px",border:`1px solid ${J.bdr}`}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:SC[v]}}/>
              <span style={{fontSize:"11px",color:J.t2,fontWeight:500}}>{v} = {SL[v]}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{background:J.surf,borderRadius:"10px",border:`1px solid ${J.bdr}`,overflow:"auto",boxShadow:J.sh1}}>
        <table style={{borderCollapse:"collapse",fontSize:"12px",width:"100%"}}>
          <thead>
            <tr style={{background:"#F9FAFB",borderBottom:`1px solid ${J.bdr}`}}>
              <th style={{padding:"11px 15px",textAlign:"left",color:J.t2,fontWeight:600,fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap",position:"sticky",left:0,background:"#F9FAFB",zIndex:2,minWidth:"180px"}}>Member</th>
              {skillCols.map((c,ci)=>{
                const hc=TC[c]||AC[ci%AC.length];
                return(
                  <th key={c} style={{padding:"11px",textAlign:"center",color:hc,fontWeight:600,fontSize:"11px",
                    textTransform:"uppercase",whiteSpace:"nowrap",minWidth:"90px",borderBottom:`2px solid ${hc}33`,letterSpacing:"0.04em"}}>
                    {c}
                  </th>
                );
              })}
              <th style={{padding:"11px",textAlign:"center",color:J.t2,fontWeight:600,fontSize:"11px",textTransform:"uppercase",whiteSpace:"nowrap",letterSpacing:"0.05em"}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m,idx)=>(
              <tr key={m.id} style={{borderBottom:`1px solid ${J.bdr}`,background:idx%2===0?"#FAFAFA":J.surf,transition:"background .1s"}}
                onMouseEnter={e=>e.currentTarget.style.background="#F5F6FF"}
                onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?"#FAFAFA":J.surf}>
                <td style={{padding:"11px 15px",position:"sticky",left:0,background:idx%2===0?"#FAFAFA":J.surf,zIndex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:"9px",cursor:"pointer"}} onClick={()=>sSelMem(m)}>
                    <Avatar name={m.name} color={m.color} size={30}/>
                    <div>
                      <div style={{fontWeight:600,color:J.tl,fontSize:"13px"}}>{m.name}</div>
                      <div style={{color:J.t2,fontSize:"11px"}}>{m.role}</div>
                    </div>
                  </div>
                </td>
                {skillCols.map(type=>{
                  const score=m.skills[type]??1;
                  const allS=members.map(mm=>mm.skills[type]??1);
                  const p=pct(score,allS);
                  return(
                    <td key={type} style={{padding:"9px",textAlign:"center"}}>
                      <SkillDots score={score} onChange={v=>upMember(m.id,{skills:{...m.skills,[type]:v}})}/>
                      <div style={{fontSize:"9px",color:J.tm,marginTop:"3px"}}>{p}th pctl</div>
                    </td>
                  );
                })}
                <td style={{padding:"9px",textAlign:"center"}}>
                  <Btn v="dan" sm onClick={()=>{if(window.confirm(`Delete ${m.name}?`))delMember(m.id);}}>🗑</Btn>
                </td>
              </tr>
            ))}
            {members.length===0&&(
              <tr><td colSpan={skillCols.length+2} style={{padding:"28px",textAlign:"center",color:J.tm}}>
                No members. Upload a skill matrix or add manually.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  /* ═══════ TEAM TAB ═══════ */
  const TeamTab=()=>(
    <div>
      <div style={{display:"flex",gap:"8px",marginBottom:"14px"}}>
        <Btn v="pri" onClick={addMember}>+ Add Member</Btn>
        <Btn v="suc" onClick={()=>sImportMod("skill")}>Import from Excel</Btn>
      </div>
      {members.length===0&&(
        <div style={{padding:"48px",textAlign:"center",color:J.tm,background:J.surf,borderRadius:"12px",border:`2px dashed ${J.bdr}`}}>
          <div style={{fontSize:"36px",marginBottom:"10px"}}>👥</div>
          <div style={{fontWeight:600,marginBottom:"5px",color:J.t1}}>No team members</div>
          <div style={{fontSize:"12px",marginBottom:"14px"}}>Upload your skill matrix to populate your team</div>
          <Btn v="suc" onClick={()=>sImportMod("skill")}>Upload Excel</Btn>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:"12px"}}>
        {members.map(m=>{
          const myTasks=tasks.filter(t=>t.assigneeId===m.id);
          const risk=memberRiskScore(m,tasks,members);
          const rt=RT[risk.level];
          const sc2=STATUSES.reduce((a,s)=>({...a,[s]:myTasks.filter(t=>t.status===s).length}),{});
          return(
            <div key={m.id} onClick={()=>sSelMem(m)}
              style={{background:J.surf,borderRadius:"10px",border:`1px solid ${J.bdr}`,boxShadow:J.sh1,overflow:"hidden",cursor:"pointer",transition:"all .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.boxShadow=J.sh2;e.currentTarget.style.borderColor="#C7D2FE";}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow=J.sh1;e.currentTarget.style.borderColor=J.bdr;}}>
              <div style={{height:"3px",background:m.color}}/>
              <div style={{padding:"14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px"}}>
                  <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
                    <Avatar name={m.name} color={m.color} size={36}/>
                    <div>
                      <div style={{fontWeight:600,color:J.t1,fontSize:"13px"}}>{m.name}</div>
                      <div style={{color:J.t2,fontSize:"11px"}}>{m.role}</div>
                    </div>
                  </div>
                  <RLoz risk={risk.level}/>
                </div>
                <div style={{marginBottom:"9px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
                    <span style={{fontSize:"10px",color:J.t2,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em"}}>Workload</span>
                    <span style={{fontSize:"11px",fontWeight:700,color:m.workload>80?"#EF4444":m.workload>65?"#F59E0B":"#16A34A"}}>{m.workload}%{m.workload>80&&" ⚠"}</span>
                  </div>
                  <div style={{height:"5px",background:"#E5E7EB",borderRadius:"3px"}}>
                    <div style={{height:"100%",width:`${m.workload}%`,background:m.workload>80?"#EF4444":m.workload>65?"#F59E0B":"#16A34A",borderRadius:"3px"}}/>
                  </div>
                </div>
                {myTasks.length>0&&(
                  <div style={{height:"4px",display:"flex",borderRadius:"3px",overflow:"hidden",background:"#E5E7EB",marginBottom:"6px"}}>
                    {[["Done","#16A34A"],["In Progress","#4F46E5"],["Review","#7C3AED"],["Todo","#E5E7EB"],["Blocked","#EF4444"]]
                      .map(([s,c])=>sc2[s]>0&&<div key={s} style={{width:`${sc2[s]/myTasks.length*100}%`,background:c}}/>)}
                  </div>
                )}
                <div style={{display:"flex",flexWrap:"wrap",gap:"4px",marginBottom:"7px"}}>
                  {skillCols.slice(0,5).map(c=>{
                    const score=m.skills[c]??1;
                    return(
                      <div key={c} style={{display:"flex",alignItems:"center",gap:"3px",background:"#F9FAFB",padding:"2px 7px",borderRadius:"999px",border:`1px solid ${J.bdr}`}}>
                        <span style={{fontSize:"10px",color:J.t2}}>{c}</span>
                        <span style={{fontSize:"10px",fontWeight:700,color:SC[score]||J.t2}}>{score}/5</span>
                      </div>
                    );
                  })}
                  {skillCols.length>5&&<span style={{fontSize:"10px",color:J.tm}}>+{skillCols.length-5} more</span>}
                </div>
                <div style={{fontSize:"10px",color:J.tm,borderTop:`1px solid ${J.bdr}`,paddingTop:"7px"}}>Click to open profile →</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  /* ═══════ RISK TAB ═══════ */
  const RiskTab=()=>{
    const dist=RISK_LEVELS.reduce((a,r)=>({...a,[r]:tasks.filter(t=>calcRisk(t,members)===r).length}),{});
    const mRisks=members.map(m=>({m,...memberRiskScore(m,tasks,members)})).sort((a,b)=>b.score-a.score);
    return(
      <div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px",marginBottom:"18px"}}>
          {RISK_LEVELS.map(r=>{const rc=RT[r];return(
            <div key={r} style={{background:J.surf,borderRadius:"10px",border:`1px solid ${J.bdr}`,padding:"14px",textAlign:"center",borderTop:`3px solid ${rc.d}`,boxShadow:J.sh1}}>
              <div style={{fontSize:"26px",fontWeight:700,color:rc.d,marginBottom:"5px"}}>{dist[r]}</div>
              <RLoz label={r} bg={rc.bg} color={rc.t} bold/>
            </div>
          );})}
        </div>
        {/* Member risk */}
        <div style={{background:J.surf,borderRadius:"10px",border:`1px solid ${J.bdr}`,marginBottom:"16px",overflow:"hidden",boxShadow:J.sh1}}>
          <div style={{padding:"11px 16px",background:"#F9FAFB",borderBottom:`1px solid ${J.bdr}`,display:"flex",justifyContent:"space-between"}}>
            <span style={{fontWeight:600,color:J.t1,fontSize:"13px"}}>Member Risk</span>
            <span style={{fontSize:"11px",color:J.t2}}>Click to open profile</span>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
              <thead><tr style={{background:"#FAFAFA",borderBottom:`1px solid ${J.bdr}`}}>
                {["Member","Role","Load","Tasks","Done","Doing","Blocked","Avg Fit","Score","Level"].map(h=>(
                  <th key={h} style={{padding:"8px 11px",textAlign:"left",color:J.t2,fontWeight:600,fontSize:"10px",textTransform:"uppercase",whiteSpace:"nowrap",letterSpacing:"0.04em"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {mRisks.map(({m,score,level,avgProb,taskCount})=>{
                  const myT=tasks.filter(t=>t.assigneeId===m.id);
                  const done=myT.filter(t=>t.status==="Done").length;
                  const doing=myT.filter(t=>t.status==="In Progress").length;
                  const blk=myT.filter(t=>t.status==="Blocked").length;
                  const rt2=RT[level];
                  return(
                    <tr key={m.id} style={{borderBottom:`1px solid ${J.bdr}`,cursor:"pointer",transition:"background .1s"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#F9FAFB"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                      onClick={()=>sSelMem(m)}>
                      <td style={{padding:"9px 11px"}}><div style={{display:"flex",alignItems:"center",gap:"7px"}}><Avatar name={m.name} color={m.color} size={22}/><span style={{fontWeight:600,color:J.tl}}>{m.name}</span></div></td>
                      <td style={{padding:"9px 11px",color:J.t2}}>{m.role}</td>
                      <td style={{padding:"9px 11px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
                          <div style={{width:"52px",height:"4px",background:"#E5E7EB",borderRadius:"2px"}}><div style={{height:"100%",width:`${m.workload}%`,background:m.workload>80?"#EF4444":m.workload>65?"#F59E0B":"#16A34A",borderRadius:"2px"}}/></div>
                          <span style={{fontSize:"11px",fontWeight:600,color:m.workload>80?"#EF4444":m.workload>65?"#F59E0B":"#16A34A"}}>{m.workload}%</span>
                        </div>
                      </td>
                      <td style={{padding:"9px 11px",fontWeight:600}}>{taskCount}</td>
                      <td style={{padding:"9px 11px",color:"#16A34A",fontWeight:600}}>{done}</td>
                      <td style={{padding:"9px 11px",color:"#4F46E5",fontWeight:600}}>{doing}</td>
                      <td style={{padding:"9px 11px",color:blk>0?"#EF4444":"#9CA3AF",fontWeight:600}}>{blk}</td>
                      <td style={{padding:"9px 11px"}}><span style={{fontWeight:700,color:avgProb>=70?"#16A34A":avgProb>=50?"#F59E0B":"#EF4444"}}>{avgProb||0}%</span></td>
                      <td style={{padding:"9px 11px"}}>
                        <div style={{width:"64px",height:"4px",background:"#E5E7EB",borderRadius:"2px",marginBottom:"3px"}}><div style={{height:"100%",width:`${score}%`,background:rt2.d,borderRadius:"2px"}}/></div>
                        <span style={{fontSize:"11px",color:rt2.d,fontWeight:600}}>{score}/100</span>
                      </td>
                      <td style={{padding:"9px 11px"}}><RLoz risk={level}/></td>
                    </tr>
                  );
                })}
                {members.length===0&&<tr><td colSpan={10} style={{padding:"20px",textAlign:"center",color:J.tm}}>No team members.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        {/* Issue register */}
        <div style={{background:J.surf,borderRadius:"10px",border:`1px solid ${J.bdr}`,overflow:"auto",boxShadow:J.sh1}}>
          <div style={{padding:"11px 16px",background:"#F9FAFB",borderBottom:`1px solid ${J.bdr}`}}>
            <span style={{fontWeight:600,color:J.t1,fontSize:"13px"}}>Issue Risk Register</span>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
            <thead><tr style={{background:"#FAFAFA",borderBottom:`1px solid ${J.bdr}`}}>
              {["","Issue","Sprint","Type","Assignee","Load","Fit","Risk",""].map(h=>(
                <th key={h} style={{padding:"8px 11px",textAlign:"left",color:J.t2,fontWeight:600,fontSize:"10px",textTransform:"uppercase",whiteSpace:"nowrap",letterSpacing:"0.04em"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {[...tasks].sort((a,b)=>({Critical:0,High:1,Medium:2,Low:3}[calcRisk(a,members)]-{Critical:0,High:1,Medium:2,Low:3}[calcRisk(b,members)])).map(task=>{
                const risk2=calcRisk(task,members);
                const assignee=members.find(m=>m.id===task.assigneeId);
                const prob=assignee?calcProb(assignee,task):null;
                const sprint=sprints.find(s=>s.id===task.sprint);
                return(
                  <tr key={task.id} style={{borderBottom:`1px solid ${J.bdr}`,cursor:"pointer",transition:"background .1s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#F9FAFB"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    onClick={()=>sSelTask(task)}>
                    <td style={{padding:"8px 11px"}}><PIco p={task.priority}/></td>
                    <td style={{padding:"8px 11px"}}><span style={{fontWeight:500,color:J.tl}}>{task.name}</span></td>
                    <td style={{padding:"8px 11px",color:J.t2,fontSize:"11px"}}>{sprint?.name?.split("—")[0]?.trim()||sprint?.name||"—"}</td>
                    <td style={{padding:"8px 11px"}}><Loz label={task.type} bg="#F3F4F6" color={TC[task.type]||J.blue}/></td>
                    <td style={{padding:"8px 11px"}}>
                      {assignee
                        ?<div style={{display:"flex",alignItems:"center",gap:"5px",cursor:"pointer"}} onClick={e=>{e.stopPropagation();sSelMem(assignee);}}>
                          <Avatar name={assignee.name} color={assignee.color} size={18}/><span style={{color:J.tl,fontSize:"12px"}}>{assignee.name}</span>
                        </div>
                        :<Loz label="Unassigned" bg="#FEF2F2" color="#DC2626"/>
                      }
                    </td>
                    <td style={{padding:"8px 11px"}}>{assignee?<span style={{fontWeight:600,color:assignee.workload>80?"#EF4444":J.t1}}>{assignee.workload}%</span>:"—"}</td>
                    <td style={{padding:"8px 11px"}}>{prob!=null?<span style={{fontWeight:700,color:prob>=70?"#16A34A":prob>=50?"#F59E0B":"#EF4444"}}>{prob}%</span>:"—"}</td>
                    <td style={{padding:"8px 11px"}}><RLoz risk={risk2}/>{task.riskOverride&&<div style={{fontSize:"9px",color:J.tm}}>manual</div>}</td>
                    <td style={{padding:"8px 11px"}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:"flex",gap:"3px"}}>
                        <Btn v="ai" sm onClick={()=>aiRisk(task)}>AI</Btn>
                        {task.riskOverride&&<Btn sm onClick={()=>upTask(task.id,{riskOverride:null})}>↺</Btn>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {tasks.length===0&&<tr><td colSpan={9} style={{padding:"18px",textAlign:"center",color:J.tm}}>No tasks.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  /* ═══════ MODALS ═══════ */
  const SkillUploadModal=()=>(
    <Modal title="Upload Skill Matrix" onClose={()=>{sImportMod(null);sImportFile(null);}}>
      <div style={{background:J.blueL,border:`1px solid #C7D2FE`,borderRadius:"8px",padding:"11px 14px",marginBottom:"14px",fontSize:"12px",color:J.t1,lineHeight:"1.7"}}>
        <b>Format:</b> Column 1 = member names. Other numeric columns = skill scores (1–5 or 0–100). Columns like "Role" are ignored automatically.
      </div>
      <Btn v="suc" onClick={exportSkillMatrix} style={{marginBottom:"14px",display:"block"}}>Download Current Matrix as Template</Btn>
      <div onClick={()=>importRef.current?.click()}
        style={{border:`2px dashed ${importFile?J.blue:J.bdr}`,borderRadius:"8px",padding:"32px",textAlign:"center",cursor:"pointer",background:importFile?"#EEF2FF":"#F9FAFB",marginBottom:"14px",transition:"all .15s"}}>
        {importFile
          ?<div><div style={{fontSize:"24px",marginBottom:"6px"}}>✅</div><span style={{color:J.blue,fontWeight:600}}>{importFile.name}</span></div>
          :<div><div style={{fontSize:"28px",marginBottom:"7px"}}>📊</div><span style={{color:J.t2}}>Click to browse or drop .xlsx / .csv</span></div>
        }
      </div>
      <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>sImportFile(e.target.files[0])}/>
      <div style={{display:"flex",justifyContent:"flex-end",gap:"8px"}}>
        <Btn onClick={()=>{sImportMod(null);sImportFile(null);}}>Cancel</Btn>
        <Btn v="pri" disabled={!importFile} onClick={()=>openSkillPreview(importFile)}>Preview Team →</Btn>
      </div>
    </Modal>
  );

  const TaskImportModal=()=>(
    <Modal title="Import Tasks" onClose={()=>{sImportMod(null);sTaskFile(null);}}>
      <p style={{fontSize:"12px",color:J.t2,margin:"0 0 14px"}}>Columns: Task Name, Type, Complexity, Priority, Effort, Status, Assignee — matched automatically.</p>
      <div style={{marginBottom:"14px"}}>
        <div style={{fontSize:"11px",fontWeight:600,color:J.t2,marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Target Sprint</div>
        <select value={importSpId||sprints[0]?.id||""} onChange={e=>sImportSpId(e.target.value)}
          style={{width:"100%",border:`1px solid ${J.bdr}`,borderRadius:"6px",padding:"8px 11px",fontSize:"13px",color:J.t1,fontFamily:"inherit",background:J.surf,outline:"none"}}>
          {sprints.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div onClick={()=>taskRef.current?.click()}
        style={{border:`2px dashed ${taskFile?J.blue:J.bdr}`,borderRadius:"8px",padding:"28px",textAlign:"center",cursor:"pointer",background:taskFile?"#EEF2FF":"#F9FAFB",marginBottom:"14px",transition:"all .15s"}}>
        {taskFile?<span style={{color:J.blue,fontWeight:600}}>✅ {taskFile.name}</span>:<span style={{color:J.t2}}>Click or drop .xlsx, .xls, .csv</span>}
      </div>
      <input ref={taskRef} type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>sTaskFile(e.target.files[0])}/>
      <div style={{display:"flex",justifyContent:"flex-end",gap:"8px"}}>
        <Btn onClick={()=>{sImportMod(null);sTaskFile(null);}}>Cancel</Btn>
        <Btn v="pri" disabled={!taskFile} onClick={()=>handleTaskImport(taskFile,importSpId||sprints[0]?.id)}>Import</Btn>
      </div>
    </Modal>
  );

  const SupabaseModal=()=>(
    <Modal title="Supabase Connection" onClose={()=>setShowSb(false)}>
      <div style={{background:sbOn?"#F0FDF4":"#FFFBEB",border:`1px solid ${sbOn?"#A7F3D0":"#FDE68A"}`,borderRadius:"8px",padding:"10px 14px",marginBottom:"14px",fontSize:"12px"}}>
        <b>{sbOn?"✅ Connected":"⚠ Not connected"}</b>{sbStatus&&<span style={{marginLeft:"8px"}}>{sbStatus}</span>}
      </div>
      <div style={{marginBottom:"12px"}}>
        <div style={{fontSize:"11px",fontWeight:600,color:J.t2,marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Project URL</div>
        <Inp value={sbUrl} onChange={setSbUrl} placeholder="https://xxxx.supabase.co"/>
      </div>
      <div style={{marginBottom:"14px"}}>
        <div style={{fontSize:"11px",fontWeight:600,color:J.t2,marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Anon Key</div>
        <Inp value={sbKey} onChange={setSbKey} placeholder="eyJ..."/>
      </div>
      <div style={{background:"#F9FAFB",borderRadius:"8px",padding:"12px",border:`1px solid ${J.bdr}`,marginBottom:"14px",fontSize:"11px",color:J.t2,lineHeight:"1.8"}}>
        Required tables: <code style={{background:"#F3F4F6",padding:"1px 5px",borderRadius:"4px"}}>tasks</code>, <code style={{background:"#F3F4F6",padding:"1px 5px",borderRadius:"4px"}}>members</code>, <code style={{background:"#F3F4F6",padding:"1px 5px",borderRadius:"4px"}}>sprints</code>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:"8px"}}>
        <Btn onClick={()=>setShowSb(false)}>Close</Btn>
        <Btn v="pri" onClick={async()=>{
          if(!sbUrl||!sbKey){setSbStatus("Fill both fields.");return;}
          setSbStatus("Testing…");
          try{const r=await fetch(`${sbUrl}/rest/v1/`,{headers:{"apikey":sbKey,"Authorization":`Bearer ${sbKey}`}});
            if(r.ok||r.status===200){setSbOn(true);setSbStatus("Connected!");}
            else setSbStatus(`Status ${r.status} — check settings`);
          }catch{setSbStatus("Connection failed.");}
        }}>Test Connection</Btn>
      </div>
    </Modal>
  );

  /* ═══════ STATS ═══════ */
  const done=tasks.filter(t=>t.status==="Done").length;
  const blk=tasks.filter(t=>t.status==="Blocked").length;
  const crit=tasks.filter(t=>calcRisk(t,members)==="Critical").length;
  const NAV=[
    {id:"board",  icon:"⊞", label:"Board"},
    {id:"backlog",icon:"☰", label:"Backlog"},
    {id:"skills", icon:"⬡", label:"Skill Matrix"},
    {id:"team",   icon:"◎", label:"Team"},
    {id:"risk",   icon:"⚑", label:"Risk Register"},
  ];

  const tabLabels={board:"Board",backlog:"Backlog",skills:"Skill Matrix",team:"Team",risk:"Risk Register"};
  const tabDescs={
    board:"Team swim lanes — each row is a developer · columns are task statuses · type # for smart assignment",
    backlog:"Drag issues between sprints · type # in issue name for smart assignments",
    skills:"Upload Excel · skills = columns · members = rows · click scores to edit",
    team:"Your team · click any card for full profile",
    risk:"Auto-calculated risk scores for members and issues",
  };

  /* ═══════ RENDER ═══════ */
  if(loading)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:J.bg,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:"36px",height:"36px",background:J.side,borderRadius:"9px",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
          <span style={{color:"#fff",fontWeight:700,fontSize:"16px"}}>W</span>
        </div>
        <style>{"@keyframes sp{to{transform:rotate(360deg)}}"}</style>
        <div style={{width:"20px",height:"20px",borderRadius:"50%",border:`2px solid ${J.blue}`,borderTopColor:"transparent",animation:"sp .8s linear infinite",margin:"0 auto 8px"}}/>
        <div style={{fontSize:"13px",color:J.t2}}>Loading your workspace…</div>
      </div>
    </div>
  );

  return(
    <div style={{display:"flex",minHeight:"100vh",background:J.bg,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",fontSize:"13px"}}>

      {/* SIDEBAR */}
      <aside style={{width:"212px",background:J.side,display:"flex",flexDirection:"column",flexShrink:0,minHeight:"100vh",position:"sticky",top:0,height:"100vh",overflow:"auto"}}>
        {/* Logo */}
        <div style={{padding:"14px 14px 12px",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
          <div style={{display:"flex",alignItems:"center",gap:"9px"}}>
            <div style={{width:"28px",height:"28px",background:J.sideAcc,borderRadius:"7px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{color:"#fff",fontWeight:700,fontSize:"14px"}}>W</span>
            </div>
            <div>
              <div style={{color:"#fff",fontWeight:600,fontSize:"12px"}}>WorkForce IQ</div>
              <div style={{color:"rgba(255,255,255,.4)",fontSize:"10px"}}>AI Project Manager</div>
            </div>
          </div>
        </div>

        {/* Upload buttons */}
        <div style={{padding:"10px 10px 6px"}}>
          <button onClick={()=>sImportMod("skill")}
            style={{width:"100%",background:"rgba(79,70,229,.25)",border:"1px solid rgba(79,70,229,.45)",color:"rgba(255,255,255,.85)",borderRadius:"7px",padding:"7px 10px",cursor:"pointer",fontSize:"11px",fontWeight:500,fontFamily:"inherit",textAlign:"left",marginBottom:"5px",transition:"all .15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(79,70,229,.4)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(79,70,229,.25)"}>
            ↑ Upload Skill Matrix
          </button>
          <button onClick={()=>sImportMod("task")}
            style={{width:"100%",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"rgba(255,255,255,.6)",borderRadius:"7px",padding:"7px 10px",cursor:"pointer",fontSize:"11px",fontWeight:500,fontFamily:"inherit",textAlign:"left",transition:"all .15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.1)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.05)"}>
            ↑ Import Tasks
          </button>
        </div>

        <nav style={{padding:"6px 8px",flex:1}}>
          <div style={{fontSize:"9px",color:"rgba(255,255,255,.3)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.1em",padding:"8px 6px 4px"}}>Planning</div>
          {NAV.map(item=>(
            <button key={item.id} onClick={()=>sTab(item.id)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:"8px",padding:"7px 10px",borderRadius:"7px",border:"none",cursor:"pointer",textAlign:"left",
                background:tab===item.id?"rgba(255,255,255,.14)":"transparent",
                color:tab===item.id?"#fff":"rgba(255,255,255,.6)",
                fontSize:"12px",fontWeight:tab===item.id?500:400,marginBottom:"1px",fontFamily:"inherit",transition:"all .15s"}}
              onMouseEnter={e=>{if(tab!==item.id)e.currentTarget.style.background="rgba(255,255,255,.08)";}}
              onMouseLeave={e=>{if(tab!==item.id)e.currentTarget.style.background="transparent";}}>
              {tab===item.id&&<div style={{width:"3px",height:"14px",background:J.sideAcc,borderRadius:"999px",marginLeft:"-2px"}}/>}
              <span style={{fontSize:"12px",width:"14px",textAlign:"center",flexShrink:0}}>{item.icon}</span>
              {item.label}
            </button>
          ))}

          <div style={{fontSize:"9px",color:"rgba(255,255,255,.3)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.1em",padding:"12px 6px 4px"}}>
            Team <span style={{color:"rgba(255,255,255,.25)",fontSize:"9px"}}>({members.length})</span>
          </div>
          {members.map(m=>{
            const risk=memberRiskScore(m,tasks,members);
            const myT=tasks.filter(t=>t.assigneeId===m.id);
            return(
              <button key={m.id} onClick={()=>sSelMem(m)}
                style={{width:"100%",display:"flex",alignItems:"center",gap:"7px",padding:"5px 10px",borderRadius:"7px",border:"none",cursor:"pointer",background:"transparent",textAlign:"left",fontFamily:"inherit",marginBottom:"1px",transition:"all .15s"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.08)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{position:"relative",flexShrink:0}}>
                  <Avatar name={m.name} color={m.color} size={22}/>
                  {["Critical","High"].includes(risk.level)&&<div style={{position:"absolute",top:-2,right:-2,width:6,height:6,borderRadius:"50%",background:risk.level==="Critical"?"#EF4444":"#F59E0B",border:"1.5px solid "+J.side}}/>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"11px",color:"rgba(255,255,255,.8)",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name.split(" ")[0]}</div>
                  <div style={{fontSize:"9px",color:m.workload>80?"#FCA5A5":"rgba(255,255,255,.35)"}}>{m.workload}% · {myT.length}t</div>
                </div>
              </button>
            );
          })}
          {members.length===0&&<div style={{fontSize:"11px",color:"rgba(255,255,255,.25)",padding:"5px 10px",fontStyle:"italic"}}>Upload Excel ↑ to add team</div>}

         
        </nav>

        <div style={{padding:"10px 14px",borderTop:"1px solid rgba(255,255,255,.07)"}}>
          <div style={{fontSize:"9px",color:"rgba(255,255,255,.2)",textAlign:"center",letterSpacing:"0.05em"}}>WorkForce IQ · AI-Powered</div>
        </div>
        <div style={{padding:"8px 10px",borderTop:"1px solid rgba(255,255,255,.07)"}}>
          <button onClick={onSignOut}
            style={{width:"100%",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",
              color:"rgba(255,255,255,.5)",borderRadius:J.r,padding:"6px",cursor:"pointer",
              fontSize:"11px",fontWeight:500,fontFamily:"inherit",transition:"background .15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.12)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.06)"}>
            Sign out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
        {/* Topbar */}
        <header style={{background:J.surf,borderBottom:`1px solid ${J.bdr}`,padding:"0 22px",height:"48px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}>
          <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
            {["Projects","WorkForce IQ",tabLabels[tab]].map((c,i,arr)=>(
              <span key={i} style={{display:"flex",alignItems:"center",gap:"5px"}}>
                <span style={{fontSize:"12px",color:i===arr.length-1?J.t1:J.t2,fontWeight:i===arr.length-1?500:400}}>{c}</span>
                {i<arr.length-1&&<span style={{color:J.tm,fontSize:"12px"}}>/</span>}
              </span>
            ))}
          </div>
          <div style={{display:"flex",gap:"16px",alignItems:"center"}}>
            {[["Total",tasks.length,J.t1],["Done",done,"#16A34A"],["Blocked",blk,"#EF4444"],["Critical",crit,"#EF4444"]].map(([l,v,c])=>(
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontSize:"13px",fontWeight:700,color:c}}>{v}</div>
                <div style={{fontSize:"9px",color:J.tm,textTransform:"uppercase",letterSpacing:"0.05em"}}>{l}</div>
              </div>
            ))}
          </div>
        </header>

        {/* Content */}
        <div style={{flex:1,padding:"20px 22px",overflowY:"auto"}}>
          <div style={{marginBottom:"16px"}}>
            <h2 style={{margin:"0 0 3px",fontSize:"18px",fontWeight:600,color:J.t1}}>
              {tabLabels[tab]}
            </h2>
            <p style={{margin:0,fontSize:"12px",color:J.t2}}>{tabDescs[tab]}</p>
          </div>
          {tab==="board"  &&<BoardTab/>}
          {tab==="backlog"&&<BacklogTab/>}
          {tab==="skills" &&<SkillsTab/>}
          {tab==="team"   &&<TeamTab/>}
          {tab==="risk"   &&<RiskTab/>}
        </div>
      </main>

      {/* AI BOT */}
      <div style={{position:"fixed",bottom:"20px",right:"20px",zIndex:500,width:botMin?"auto":"340px"}}>
        {botMin
          ?<button onClick={()=>sBotMin(false)}
            style={{background:J.blue,color:"#fff",border:"none",borderRadius:"999px",padding:"10px 18px",cursor:"pointer",boxShadow:J.sh3,fontSize:"12px",fontWeight:500,display:"flex",alignItems:"center",gap:"7px"}}>
            AI{banner.loading&&<span style={{opacity:.6}}>…</span>}
          </button>
          :<div style={{background:J.surf,border:`1px solid #C7D2FE`,borderRadius:"12px",boxShadow:J.sh3,overflow:"hidden"}}>
            <div style={{background:J.blue,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <span style={{fontSize:"14px"}}>🤖</span>
                <span style={{color:"#fff",fontWeight:500,fontSize:"12px"}}>AI Assistant</span>
                {sbOn&&<span style={{background:"rgba(16,185,129,.3)",color:"#6EE7B7",fontSize:"9px",padding:"1px 6px",borderRadius:"999px"}}>DB</span>}
              </div>
              <div style={{display:"flex",gap:"4px"}}>
                <button onClick={refreshBanner} style={{background:"rgba(255,255,255,.15)",border:"none",color:"rgba(255,255,255,.85)",borderRadius:"5px",padding:"3px 8px",cursor:"pointer",fontSize:"11px"}}>{banner.loading?"…":"↺"}</button>
                <button onClick={()=>sBotMin(true)} style={{background:"rgba(255,255,255,.15)",border:"none",color:"rgba(255,255,255,.85)",borderRadius:"5px",padding:"3px 8px",cursor:"pointer",fontSize:"11px"}}>−</button>
              </div>
            </div>
            <div style={{padding:"12px 14px",background:J.blueL,minHeight:"52px"}}>
              {banner.loading
                ?<div style={{display:"flex",alignItems:"center",gap:"8px",color:J.blue,fontSize:"12px"}}>
                  <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
                  <div style={{width:"11px",height:"11px",borderRadius:"50%",border:`2px solid ${J.blue}`,borderTopColor:"transparent",animation:"sp .8s linear infinite"}}/>
                  Analysing team…
                </div>
                :<div style={{fontSize:"12px",color:J.t1,lineHeight:"1.7"}}>{banner.text}</div>
              }
            </div>
            <div style={{padding:"8px 12px",borderTop:`1px solid ${J.bdr}`,display:"flex",gap:"5px",flexWrap:"wrap",background:J.surf}}>
              <Btn v="ai" sm onClick={()=>{const h=tasks.filter(t=>["High","Critical"].includes(calcRisk(t,members)));sAiModal({title:"Risk Plan",prompt:`High-risk tasks: ${h.map(t=>`${t.name}(${t.type},${calcRisk(t,members)},${t.assigneeId?members.find(m=>m.id===t.assigneeId)?.name:"unassigned"})`).join("; ")||"none"}. Prioritised PM action plan.`,extra:null});}}>Risks</Btn>
              <Btn v="ai" sm onClick={()=>{const b=members.filter(m=>m.workload>75);sAiModal({title:"Burnout",prompt:`High load: ${b.map(m=>`${m.name}(${m.workload}%,${tasks.filter(t=>t.assigneeId===m.id).length}t)`).join("; ")||"none"}. How to rebalance?`,extra:null});}}>Load</Btn>
              <Btn v="ai" sm onClick={()=>{const u=tasks.filter(t=>!t.assigneeId);sAiModal({title:"Unassigned",prompt:`${u.length} unassigned: ${u.map(t=>`${t.name}(${t.type},${t.priority})`).join("; ")||"none"}. Team: ${members.map(m=>`${m.name}(${m.workload}%,skills:${skillCols.slice(0,2).map(s=>`${s}:${m.skills[s]??1}`).join(",")})`).join(", ")||"none"}. Who takes each?`,extra:null});}}>Assign</Btn>
            </div>
          </div>
        }
      </div>

      {/* MODALS */}
      {aiModal&&<AIModal title={aiModal.title} prompt={aiModal.prompt} extra={aiModal.extra} onClose={()=>sAiModal(null)}/>}
      {importMod==="skill"&&<SkillUploadModal/>}
      {importMod==="task"&&<TaskImportModal/>}
      {showSb&&<SupabaseModal/>}
      {excelPreview&&<ExcelPreviewModal parsed={excelPreview} onApply={applyExcelTeam} onClose={()=>sExcelPreview(null)}/>}
      {selTask&&<TaskDrawer task={tasks.find(t=>t.id===selTask.id)||selTask} members={members} sprints={sprints} skillCols={skillCols} onUpdate={upTask} onClose={()=>sSelTask(null)}/>}
      {selMem&&<MemberDrawer member={members.find(m=>m.id===selMem.id)||selMem} tasks={tasks} sprints={sprints} skillCols={skillCols} members={members} onUpdate={upMember} onDelete={delMember} onClose={()=>sSelMem(null)}/>}
    </div>
  );
}
