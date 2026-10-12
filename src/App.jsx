import Overview from "./features/evaluation/Overview";
import {validateBackup} from "./lib/backup";
import EvaluationPage from "./features/evaluation/EvaluationPage";
import SkillsWorkspace, {SkillPicker,SkillEditor} from "./features/skills/SkillControls";
import {catalog, importSkillRows, validSkill} from "./lib/skills";
import {syntheticSet} from "./lib/synthetic";
import * as XLSX from "xlsx";
import RecommendationPanel from "./features/team/RecommendationPanel";
import { transitionTask } from "./lib/recommendations";
import { validateTaskRows } from "./lib/taskImport";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import LandingPage from "./features/landing/LandingPage";
import ParticipantPortal from "./features/participants/ParticipantPortal";
import DecisionRoom from "./features/decisions/DecisionRoom";
import RiskCenter from "./features/risk/RiskCenter";
import { signIn, signUp, signOut as supabaseSignOut, supabaseConfigured } from "./lib/supabase";

/* ══════════════════════════════════════════════════════════
   DESIGN TOKENS — WorkForce IQ white glass system
══════════════════════════════════════════════════════════ */

const J = {
  bgBase:"var(--wiq-base)", bgSurface:"var(--wiq-surface)", bgSidebar:"var(--wiq-sidebar)",
  textPrimary:"var(--wiq-text)", textSecondary:"var(--wiq-secondary)", textMuted:"var(--wiq-muted)", textLink:"var(--wiq-blue)",
  blue:"var(--wiq-blue)", blueLight:"var(--wiq-blue-soft)", blueHover:"#0562D1",
  border:"var(--wiq-border)", borderFocus:"#84B8FF",
  sh1:"0 10px 30px rgba(32,50,84,.06),0 0 0 1px rgba(226,232,240,.7)",
  sh2:"0 16px 40px rgba(32,50,84,.09),0 0 0 1px rgba(226,232,240,.75)",
  sh3:"0 24px 64px rgba(32,50,84,.14),0 0 0 1px rgba(226,232,240,.8)",
  r:"10px", rm:"14px",
};

const TYPE_COLORS={Frontend:"#0052CC",Backend:"#00875A",Design:"#6554C0",DevOps:"#FF8B00",QA:"#00A3BF",Data:"#403294",Mobile:"#0052CC",Security:"#BF2600"};
const RISK_T={Low:{bg:"#E3FCEF",text:"#006644",dot:"#00875A"},Medium:{bg:"#DEEBFF",text:"#0052CC",dot:"#0065FF"},High:{bg:"#FFF0B3",text:"#172B4D",dot:"#FF8B00"},Critical:{bg:"#FFEBE6",text:"#BF2600",dot:"#DE350B"}};
const TASK_TYPES=["Frontend","Backend","Design","DevOps","QA","Data","Mobile","Security"];
const COMPLEXITIES=["Low","Medium","High","Critical"];
const PRIORITIES=["Low","Medium","High","Urgent"];
const STATUSES=["Todo","In Progress","Review","Done","Blocked"];
const EFFORTS=[1,2,3,5,8,13];
const RISK_LEVELS=["Low","Medium","High","Critical"];

/* ══════════════════════════════════════════════════════════
   SEED DATA
══════════════════════════════════════════════════════════ */
const INIT_MEMBERS=[
  {id:"m1",name:"Alice Chen",  role:"Frontend Lead",   contractor:false, color:"#6554C0",workload:72,skills:{Frontend:92,Backend:45,Design:78,DevOps:30,QA:60,Data:35,Mobile:70,Security:25}},
  {id:"m2",name:"Bob Martinez",role:"Backend Engineer", contractor:true,  color:"#00875A",workload:58,skills:{Frontend:40,Backend:88,Design:20,DevOps:65,QA:55,Data:72,Mobile:35,Security:60}},
  {id:"m3",name:"Carol Smith", role:"Full Stack Dev",   contractor:false, color:"#0052CC",workload:85,skills:{Frontend:75,Backend:70,Design:50,DevOps:45,QA:80,Data:60,Mobile:65,Security:40}},
  {id:"m4",name:"David Kim",   role:"DevOps Engineer",  contractor:true,  color:"#FF8B00",workload:45,skills:{Frontend:30,Backend:55,Design:15,DevOps:95,QA:40,Data:55,Mobile:25,Security:80}},
  {id:"m5",name:"Eve Johnson", role:"QA Lead",          contractor:false, color:"#00A3BF",workload:62,skills:{Frontend:50,Backend:40,Design:35,DevOps:30,QA:94,Data:45,Mobile:55,Security:50}},
];
const INIT_SPRINTS=[
  {id:"s1",name:"Sprint 1 — Foundation",start:"2025-01-06",end:"2025-01-17",status:"Completed"},
  {id:"s2",name:"Sprint 2 — Core Build", start:"2025-01-20",end:"2025-01-31",status:"Active"},
  {id:"s3",name:"Sprint 3 — Polish",     start:"2025-02-03",end:"2025-02-14",status:"Planned"},
];
const INIT_TASKS=[
  {id:"t1",name:"Auth System",      type:"Backend", complexity:"High",    priority:"Urgent",effort:8, sprint:"s2",status:"In Progress",assigneeId:"m2",riskOverride:null},
  {id:"t2",name:"Dashboard UI",     type:"Frontend",complexity:"Medium",  priority:"High",  effort:5, sprint:"s2",status:"In Progress",assigneeId:"m1",riskOverride:null},
  {id:"t3",name:"CI/CD Pipeline",   type:"DevOps",  complexity:"High",    priority:"High",  effort:8, sprint:"s2",status:"Todo",       assigneeId:"m4",riskOverride:null},
  {id:"t4",name:"API Rate Limiting",type:"Security",complexity:"Critical",priority:"Urgent",effort:13,sprint:"s2",status:"Blocked",    assigneeId:null,riskOverride:null},
  {id:"t5",name:"Mobile Nav",       type:"Mobile",  complexity:"Medium",  priority:"Medium",effort:5, sprint:"s2",status:"Review",     assigneeId:"m3",riskOverride:null},
  {id:"t6",name:"Data Pipeline",    type:"Data",    complexity:"High",    priority:"High",  effort:8, sprint:"s3",status:"Todo",       assigneeId:null,riskOverride:null},
  {id:"t7",name:"Design System",    type:"Design",  complexity:"Medium",  priority:"Medium",effort:5, sprint:"s3",status:"Todo",       assigneeId:"m1",riskOverride:null},
  {id:"t8",name:"Unit Test Suite",  type:"QA",      complexity:"Medium",  priority:"High",  effort:5, sprint:"s1",status:"Done",       assigneeId:"m5",riskOverride:null},
];

/* ══════════════════════════════════════════════════════════
   SCORING ENGINE
══════════════════════════════════════════════════════════ */
const cmx={Low:1,Medium:.9,High:.75,Critical:.6};
const efp=e=>e<=3?1:e<=5?.95:e<=8?.88:.78;

function calcProb(m,task,history=[]){
  const s=(m.skills[task.type]??50)/100;
  const w=m.workload>90?.6:m.workload>75?.8:m.workload>60?.92:1;
  const completed=history.filter(t=>t.assigneeId===m.id&&t.status==="Done");
  const sameType=completed.filter(t=>t.type===task.type).length;
  const evidence=Math.min(13,sameType*2+completed.length);
  return Math.min(99,Math.round(s*(cmx[task.complexity]??0.85)*efp(task.effort)*w*100)+evidence);
}
function calcRisk(task,members){
  if(task.riskOverride) return task.riskOverride;
  const m=members.find(m=>m.id===task.assigneeId);
  if(!m) return task.priority==="Urgent"||task.complexity==="Critical"?"Critical":"High";
  const p=calcProb(m,task);
  return p>=75?"Low":p>=55?"Medium":p>=35?"High":"Critical";
}
function rankCandidates(task,members,history=[]){
  return [...members].map(m=>{const completed=history.filter(t=>t.assigneeId===m.id&&t.status==="Done");const matching=completed.filter(t=>t.type===task.type).length;return{member:m,prob:calcProb(m,task,history),skill:m.skills[task.type]??50,completed:completed.length,matching,projects:new Set(completed.map(t=>t.sprint)).size};}).sort((a,b)=>b.prob-a.prob);
}
function memberRiskScore(member,tasks){
  // Composite risk: workload stress + high-risk task count + avg prob gap
  const myTasks=tasks.filter(t=>t.assigneeId===member.id);
  if(!myTasks.length) return {score:0,level:"Low",factors:[]};
  const factors=[];
  let score=0;
  if(member.workload>85){score+=40;factors.push(`Workload critical (${member.workload}%)`);}
  else if(member.workload>70){score+=20;factors.push(`Workload elevated (${member.workload}%)`);}
  const critTasks=myTasks.filter(t=>calcRisk(t,member.id?[member]:[])==="Critical"||calcRisk(t,[member])==="High");
  if(critTasks.length>=3){score+=30;factors.push(`${critTasks.length} high/critical tasks`);}
  else if(critTasks.length>=1){score+=15;factors.push(`${critTasks.length} high/critical tasks`);}
  const avgProb=myTasks.reduce((a,t)=>a+calcProb(member,t),0)/myTasks.length;
  if(avgProb<40){score+=30;factors.push(`Low avg legacy fit index (${Math.round(avgProb)}%)`);}
  else if(avgProb<60){score+=15;factors.push(`Moderate avg prob (${Math.round(avgProb)}%)`);}
  const blocked=myTasks.filter(t=>t.status==="Blocked").length;
  if(blocked>0){score+=10*blocked;factors.push(`${blocked} blocked task(s)`);}
  const level=score>=60?"Critical":score>=35?"High":score>=15?"Medium":"Low";
  return{score:Math.min(100,score),level,factors,avgProb:Math.round(avgProb),taskCount:myTasks.length};
}

/* ══════════════════════════════════════════════════════════
   CLAUDE API
══════════════════════════════════════════════════════════ */
async function callClaude(prompt,sys=""){
  void prompt; void sys;
  return "AI insights require a secure server-side API connection. Use Team & fit in a task to run the experience-matching AI. Other commentary is unavailable.";
}

/* ══════════════════════════════════════════════════════════
   PRIMITIVE UI COMPONENTS
══════════════════════════════════════════════════════════ */
function Avatar({name,color,size=24,onClick,style={}}){
  const ini=name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  return(
    <div onClick={onClick} style={{width:size,height:size,borderRadius:"50%",background:color||J.blue,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.38,fontWeight:700,flexShrink:0,cursor:onClick?"pointer":"default",transition:"transform 0.15s",userSelect:"none",...style}}
      onMouseEnter={e=>{if(onClick)e.currentTarget.style.transform="scale(1.1)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}>
      {ini}
    </div>
  );
}

function Lozenge({label,bg,color,bold=false}){
  return <span style={{display:"inline-block",background:bg,color,padding:"2px 6px",borderRadius:"3px",fontSize:"11px",fontWeight:bold?700:600,letterSpacing:"0.04em",textTransform:"uppercase",lineHeight:"1.4",whiteSpace:"nowrap"}}>{label}</span>;
}
function RiskLozenge({risk}){
  const r=RISK_T[risk]||RISK_T.Low;
  return <Lozenge label={risk} bg={r.bg} color={r.text} bold/>;
}
function PriorityIcon({priority,size=13}){
  return <span style={{color:{Urgent:"#CD1316",High:"#E2483D",Medium:"#E97F33",Low:"#2D8738"}[priority]||"#6B778C",fontSize:size,fontWeight:800}}>{({Urgent:"⬆⬆",High:"⬆",Medium:"➡",Low:"⬇"})[priority]||"➡"}</span>;
}

function JBtn({children,onClick,variant="default",disabled=false,small=false,style={}}){
  const [hov,setHov]=useState(false);
  const v={default:{bg:J.bgSurface,c:J.textPrimary,b:`1px solid ${J.border}`,h:"#EBECF0"},primary:{bg:J.blue,c:"#fff",b:"none",h:J.blueHover},success:{bg:"#00875A",c:"#fff",b:"none",h:"#006644"},danger:{bg:"#FFEBE6",c:"#BF2600",b:"1px solid #FFBDAD",h:"#FFBDAD"},ai:{bg:"#EAE6FF",c:"#403294",b:"1px solid #C0B6F2",h:"#C0B6F2"},ghost:{bg:"transparent",c:J.textSecondary,b:"none",h:"#EBECF0"}}[variant]||{bg:J.bgSurface,c:J.textPrimary,b:`1px solid ${J.border}`,h:"#EBECF0"};
  return <button onClick={onClick} disabled={disabled} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
    style={{background:hov&&!disabled?v.h:v.bg,color:v.c,border:v.b,borderRadius:J.r,padding:small?"3px 8px":"6px 12px",fontSize:small?"11px":"13px",fontWeight:500,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,fontFamily:"inherit",lineHeight:"1",whiteSpace:"nowrap",...style}}>
    {children}
  </button>;
}

function JSelect({value,options,onChange,style={}}){
  return <select value={value} onChange={e=>onChange(e.target.value)} style={{background:J.bgSurface,color:J.textPrimary,border:`2px solid ${J.border}`,borderRadius:J.r,padding:"4px 8px",fontSize:"12px",cursor:"pointer",fontFamily:"inherit",outline:"none",...style}}>
    {options.map(o=><option key={o}>{o}</option>)}
  </select>;
}

function JInput({value,onChange,placeholder,multiline=false,style={}}){
  const base={background:J.bgSurface,color:J.textPrimary,border:`2px solid ${J.border}`,borderRadius:J.r,padding:"6px 10px",fontSize:"13px",fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box",...style};
  if(multiline) return <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={3} style={{...base,resize:"vertical"}}
    onFocus={e=>e.target.style.borderColor=J.borderFocus} onBlur={e=>e.target.style.borderColor=J.border}/>;
  return <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={base}
    onFocus={e=>e.target.style.borderColor=J.borderFocus} onBlur={e=>e.target.style.borderColor=J.border}/>;
}

/* ══════════════════════════════════════════════════════════
   MODAL WRAPPER
══════════════════════════════════════════════════════════ */
function Modal({title,onClose,children,width="640px",noPad=false}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(9,30,66,.54)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:J.bgSurface,borderRadius:J.r,width,maxWidth:"96vw",maxHeight:"90vh",overflow:"auto",boxShadow:J.sh3,display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 24px 14px",borderBottom:`1px solid ${J.border}`,position:"sticky",top:0,background:J.bgSurface,zIndex:1,flexShrink:0}}>
          <h3 style={{margin:0,fontSize:"16px",fontWeight:600,color:J.textPrimary}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",color:J.textSecondary,cursor:"pointer",fontSize:"22px",padding:"0 4px",lineHeight:1}}>×</button>
        </div>
        <div style={noPad?{}:{padding:"20px 24px",overflow:"auto"}}>{children}</div>
      </div>
    </div>
  );
}

function AIModal({ title, prompt, onClose, extra }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getAIResponse() {
      try {
        setText(await callClaude(prompt));
      } catch (err) {
        setText("Error: " + err.message);
      }
      setLoading(false);
    }
    getAIResponse();
  }, [prompt]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,30,66,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', width: '600px', padding: '24px', borderRadius: J.r, boxShadow: J.sh3 }}>
        <h2 style={{ marginTop: 0, color: J.blue }}>{title}</h2>
        <div style={{ minHeight: '100px', maxHeight: '400px', overflowY: 'auto', background: J.bgBase, padding: '16px', borderRadius: J.r, whiteSpace: 'pre-wrap' }}>
          {loading ? "🤖 Claude is calculating..." : text}
        </div>
        {extra&&<div style={{marginTop:16}}>{extra}</div>}
        <button onClick={onClose} style={{ marginTop: '16px', background: J.blue, color: 'white', border: 'none', padding: '8px 16px', borderRadius: J.r, cursor: 'pointer' }}>Close</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MINI WORK TRACKER BARS
══════════════════════════════════════════════════════════ */
function WorkBar({done,inprog,review,todo,blocked,total}){
  if(!total) return <div style={{height:"8px",background:"#DFE1E6",borderRadius:"4px"}}/>
  const pct=n=>n/total*100;
  const segs=[{v:done,c:"#00875A"},{v:inprog,c:"#0052CC"},{v:review,c:"#6554C0"},{v:todo,c:"#DFE1E6"},{v:blocked,c:"#BF2600"}];
  return(
    <div style={{height:"8px",borderRadius:"4px",overflow:"hidden",display:"flex",background:"#DFE1E6"}}>
      {segs.filter(s=>s.v>0).map((s,i)=><div key={i} style={{width:`${pct(s.v)}%`,background:s.c,transition:"width .3s"}}/>)}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TASK DETAIL DRAWER (click any task)
══════════════════════════════════════════════════════════ */
function TaskDrawer({task,members,sprints,tasks,onUpdate,onClose}){
  const [t,setT]=useState({description:"",acceptanceCriteria:"",requiredSkills:[],...task});
  const [section,setSection]=useState("details");
  const activeSprint=sprints.find(s=>s.id===t.sprint)||sprints[0];
  const assignee=members.find(m=>m.id===t.assigneeId);
  const risk=calcRisk(t,members);const rt=RISK_T[risk];
  const prob=assignee?calcProb(assignee,t,tasks):null;
  const save=()=>{if(!t.name.trim()||!sprints.some(s=>s.id===t.sprint)){window.alert('Enter a name and valid sprint.');return;}if(t.minimumLevel!==undefined&&(t.minimumLevel===''||!Number.isFinite(Number(t.minimumLevel))||t.minimumLevel<0||t.minimumLevel>100)){window.alert('Enter a proficiency threshold from 0 to 100.');return;}if(t.estimatedHours!==undefined&&t.estimatedHours!==null&&(t.estimatedHours===''||!Number.isFinite(Number(t.estimatedHours))||t.estimatedHours<=0||t.estimatedHours>10000)){window.alert('Estimated hours must be positive.');return;}if(t.status==='Done'&&!t.assigneeId){window.alert('A completed task needs an owner.');return;}if(t.assigneeId!==task.assigneeId&&!t.recommendationSnapshot&&!t.assignmentReason?.trim()){window.alert('Record a reason for the manual assignment.');return;}onUpdate(t.id,{...t,name:t.name.trim(),updatedAt:new Date().toISOString()});onClose();};
  const suggestion=useMemo(()=>{
    const text=`${t.name} ${t.description}`.toLowerCase();
    const rules=[
      {words:["auth","login","identity","security","permission"],type:"Security",complexity:"High",effort:8,skill:"Security"},
      {words:["api","database","server","backend"],type:"Backend",complexity:"High",effort:8,skill:"Backend"},
      {words:["dashboard","page","component","ui","frontend"],type:"Frontend",complexity:"Medium",effort:5,skill:"Frontend"},
      {words:["pipeline","deploy","ci/cd","infrastructure"],type:"DevOps",complexity:"High",effort:8,skill:"DevOps"},
      {words:["test","quality","regression"],type:"QA",complexity:"Medium",effort:5,skill:"QA"},
      {words:["data","report","analytics"],type:"Data",complexity:"High",effort:8,skill:"Data"},
      {words:["mobile","ios","android"],type:"Mobile",complexity:"Medium",effort:5,skill:"Mobile"},
    ];
    return rules.find(rule=>rule.words.some(word=>text.includes(word)))||{type:t.type,complexity:t.complexity,effort:t.effort,skill:t.type};
  },[t.name,t.description,t.type,t.complexity,t.effort]);
  const applySuggestion=(field,value)=>setT(current=>({...current,[field]:value}));
  const applyAll=()=>setT(current=>({...current,type:suggestion.type,complexity:suggestion.complexity,effort:suggestion.effort,requiredSkills:[...new Set([...(current.requiredSkills||[]),suggestion.skill])]}));
  const toggleSkill=skill=>setT(current=>({...current,requiredSkills:(current.requiredSkills||[]).includes(skill)?current.requiredSkills.filter(item=>item!==skill):[...(current.requiredSkills||[]),skill]}));
  return <div className="task-drawer-backdrop" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <aside className="task-drawer" aria-label="Task details">
      <header className="task-drawer-head"><div><span>WORK ITEM · {activeSprint?.name||"Unplanned"}</span><h2>{task.name==="New issue"?"Create a task":"Edit task"}</h2><p>Define the work, review evidence and keep the final decision with you.</p></div><div><button className="drawer-save" onClick={save}>Save task</button><button className="drawer-close" onClick={onClose} aria-label="Close">×</button></div></header>
      <nav className="task-drawer-tabs">{[["details","Task details"],["team","Team & fit"],["risk","Risk & controls"]].map(([id,label])=><button key={id} className={section===id?"active":""} onClick={()=>setSection(id)}>{label}</button>)}</nav>
      <div className="task-drawer-body">
        {section==="details"&&<>
          <section className="drawer-section task-title-section"><div className="section-kicker"><span>01</span><div><b>Describe the outcome</b><small>Suggestions are optional and remain faded until you confirm them.</small></div></div><label className="drawer-field full"><span>Task name</span><input autoFocus value={t.name} onChange={e=>setT(p=>({...p,name:e.target.value,requirementsConfirmed:false}))} placeholder="What needs to be delivered?"/></label><label className="drawer-field full"><span>Short brief</span><textarea value={t.description} onChange={e=>setT(p=>({...p,description:e.target.value,requirementsConfirmed:false}))} placeholder="Add the purpose, users affected and expected result…"/></label>
            <div className="suggestion-strip"><div><b>Suggested from your wording</b><small>Confirm one suggestion or apply the set.</small></div><button onClick={applyAll}>Apply all</button></div>
            <div className="suggestion-grid">{[["Type",suggestion.type,"type"],["Complexity",suggestion.complexity,"complexity"],["Effort",`${suggestion.effort} points`,"effort"],["Skill",suggestion.skill,"skill"]].map(([label,value,field])=><button key={label} className={(field==="type"&&t.type===value)||(field==="complexity"&&t.complexity===value)||(field==="effort"&&t.effort===suggestion.effort)||(field==="skill"&&(t.requiredSkills||[]).includes(value))?"confirmed":""} onClick={()=>field==="skill"?toggleSkill(value):applySuggestion(field,field==="effort"?suggestion.effort:value)}><span>{label}</span><b>{value}</b><small>Click to confirm</small></button>)}</div>
          </section>
          <section className="drawer-section"><div className="section-kicker"><span>02</span><div><b>Plan the work</b><small>You choose every final value.</small></div></div><div className="drawer-field-grid">
            {[["Type",t.type,TASK_TYPES,v=>setT(p=>({...p,type:v}))],["Complexity",t.complexity,COMPLEXITIES,v=>setT(p=>({...p,complexity:v}))],["Priority",t.priority,PRIORITIES,v=>setT(p=>({...p,priority:v}))],["Status",t.status,STATUSES,v=>setT(p=>({...p,status:v}))],["Effort",String(t.effort),EFFORTS.map(String),v=>setT(p=>({...p,effort:Number(v)}))]].map(([label,value,options,change])=><label className="drawer-field" key={label}><span>{label}</span><select value={value} onChange={e=>change(e.target.value)}>{options.map(option=><option key={option}>{option}</option>)}</select></label>)}
            <label className="drawer-field"><span>Sprint</span><select value={t.sprint} onChange={e=>setT(p=>({...p,sprint:e.target.value}))}>{sprints.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          </div><label className="drawer-field full"><span>Acceptance criteria</span><textarea value={t.acceptanceCriteria} onChange={e=>setT(p=>({...p,acceptanceCriteria:e.target.value}))} placeholder="What must be true before this can move to Done?"/></label><SkillPicker value={t.requiredSkills} members={members} tasks={tasks} onChange={skills=>setT(p=>({...p,requiredSkills:skills,requirementsConfirmed:false,recommendationSnapshot:null}))}/><label className="drawer-field"><span>Minimum declared proficiency (0–100)</span><input type="number" min="0" max="100" value={t.minimumLevel??70} onChange={e=>setT(p=>({...p,minimumLevel:e.target.value===''?'':Number(e.target.value),recommendationSnapshot:null}))}/></label><label><input type="checkbox" checked={t.requirementsConfirmed===true} onChange={e=>setT(p=>({...p,requirementsConfirmed:e.target.checked}))}/> I have reviewed the required skills</label></section>
        </>}
        {section==="team"&&<section className="drawer-section"><RecommendationPanel task={t} members={members} tasks={tasks} onChange={patch=>setT(current=>({...current,...patch}))}/><label className="drawer-field"><span>Manual assignment</span><select value={t.assigneeId||""} onChange={e=>setT(p=>({...p,assigneeId:e.target.value||null,recommendationSnapshot:null}))}><option value="">Leave unassigned</option>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label className="drawer-field"><span>Assignment / override reason</span><textarea value={t.assignmentReason||""} onChange={e=>setT(p=>({...p,assignmentReason:e.target.value}))}/></label></section>}
        {section==="risk"&&<section className="drawer-section"><div className="section-kicker"><span>04</span><div><b>Review calculated risk</b><small>The calculation updates as task and assignee inputs change.</small></div></div><div className="risk-calculation"><div style={{background:rt.bg,borderColor:rt.dot}}><span>Calculated level</span><RiskLozenge risk={risk}/><strong>{prob==null?"Owner required":`${prob}% legacy fit index`}</strong></div><ul><li>Complexity: <b>{t.complexity}</b></li><li>Priority: <b>{t.priority}</b></li><li>Effort: <b>{t.effort} points</b></li><li>Owner capacity: <b>{assignee?`${assignee.workload}%`:"Unknown"}</b></li></ul></div><div className="risk-override"><span>Manager override</span><p>Use an override only when you have context not represented in the calculation.</p><div>{RISK_LEVELS.map(level=>{const colour=RISK_T[level];return <button key={level} className={t.riskOverride===level?"active":""} style={{"--risk":colour.dot,"--risk-bg":colour.bg}} onClick={()=>setT(p=>({...p,riskOverride:p.riskOverride===level?null:level}))}>{level}</button>})}</div>{t.riskOverride&&<small>Override recorded. Saving will preserve the manager-selected level.</small>}</div></section>}
      </div>
      <footer className="task-drawer-footer"><span>{t.name.trim()?"Ready to save":"Add a task name to continue"}</span><div><button onClick={onClose}>Cancel</button><button className="drawer-save" disabled={!t.name.trim()} onClick={save}>Save task</button></div></footer>
    </aside>
  </div>;
}

/* ══════════════════════════════════════════════════════════
   MEMBER PROFILE DRAWER
══════════════════════════════════════════════════════════ */
function MemberDrawer({member,tasks,sprints,onUpdate,onClose}){
  const [m,setM]=useState({...member});
  const myTasks=tasks.filter(t=>t.assigneeId===member.id);
  const risk=memberRiskScore(member,tasks);
  const rt=RISK_T[risk.level];
  const statusCounts=STATUSES.reduce((a,s)=>({...a,[s]:myTasks.filter(t=>t.status===s).length}),{});
  const completed=myTasks.filter(t=>t.status==="Done");
  const deliveredPoints=completed.reduce((n,t)=>n+Number(t.effort||0),0);
  const projectCount=new Set(myTasks.map(t=>t.sprint)).size;
  const completionRate=myTasks.length?Math.round(completed.length/myTasks.length*100):0;
  const save=()=>{if(!m.name.trim()||Object.entries(m.skills||{}).some(([k,v])=>!validSkill(k)||v===''||!Number.isFinite(Number(v))||v<0||v>100)||Object.values(m.sprintCapacityHours||{}).some(v=>v!==null&&(v===''||!Number.isFinite(Number(v))||v<0||v>10000))){window.alert('Check name, declared proficiency 0–100 and capacity hours.');return;}onUpdate(m.id,m);onClose();};

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(9,30,66,.4)",zIndex:900,display:"flex",justifyContent:"flex-end"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:"520px",maxWidth:"96vw",background:J.bgSurface,boxShadow:"-4px 0 20px rgba(9,30,66,.2)",display:"flex",flexDirection:"column",overflowY:"auto"}}>
        {/* Header */}
        <div style={{background:m.color,padding:"24px 20px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{display:"flex",gap:"14px",alignItems:"center"}}>
              <div style={{width:52,height:52,borderRadius:"50%",background:"rgba(255,255,255,.25)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800}}>
                {m.name.split(" ").map(w=>w[0]).join("").slice(0,2)}
              </div>
              <div>
                <input value={m.name} onChange={e=>setM(p=>({...p,name:e.target.value}))} style={{background:"none",border:"none",color:"#fff",fontSize:"18px",fontWeight:700,fontFamily:"inherit",width:"200px"}}/>
                <input value={m.role} onChange={e=>setM(p=>({...p,role:e.target.value}))} style={{background:"none",border:"none",color:"rgba(255,255,255,.8)",fontSize:"13px",fontFamily:"inherit",display:"block",width:"200px"}}/>
              </div>
            </div>

            <div style={{display:"flex",gap:"6px"}}>
              <JBtn variant="primary" small onClick={save} style={{background:"rgba(255,255,255,.2)",border:"1px solid rgba(255,255,255,.4)",color:"#fff"}}>Save</JBtn>
              <button onClick={onClose} style={{background:"rgba(255,255,255,.2)",border:"none",cursor:"pointer",color:"#fff",fontSize:"20px",borderRadius:J.r,padding:"2px 8px"}}>×</button>
            </div>
          </div>
        </div>

        <div style={{padding:"20px",flex:1,overflow:"auto"}}>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"16px"}}>
            <label style={{fontSize:"10px",color:J.textSecondary}}>Email<input value={m.email||""} onChange={e=>setM(p=>({...p,email:e.target.value}))} placeholder="name@company.com" style={{display:"block",width:"100%",marginTop:4,padding:8,border:`1px solid ${J.border}`,borderRadius:J.r,background:J.bgSurface,color:J.textPrimary}}/></label>
            <label style={{fontSize:"10px",color:J.textSecondary}}>Location<input value={m.location||""} onChange={e=>setM(p=>({...p,location:e.target.value}))} placeholder="London, UK" style={{display:"block",width:"100%",marginTop:4,padding:8,border:`1px solid ${J.border}`,borderRadius:J.r,background:J.bgSurface,color:J.textPrimary}}/></label>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"8px",marginBottom:"16px"}}>
            {[["Projects",projectCount],["Completed",completed.length],["Points",deliveredPoints],["Completion",`${completionRate}%`]].map(([label,value])=><div key={label} style={{padding:"12px 8px",background:J.bgBase,border:`1px solid ${J.border}`,borderRadius:J.r,textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:J.textPrimary}}>{value}</div><div style={{fontSize:9,color:J.textMuted,textTransform:"uppercase"}}>{label}</div></div>)}
          </div>

          <div className="experience-panel"><h3>Sprint capacity (hours)</h3><p>Enter net hours available for project tasks. This is separate from story points and the legacy workload percentage.</p>{sprints.map(sp=><label key={sp.id}>{sp.name}<input type="number" min="0" max="10000" value={m.sprintCapacityHours?.[sp.id]??''} onChange={e=>setM(current=>({...current,sprintCapacityHours:{...current.sprintCapacityHours,[sp.id]:e.target.value===''?null:Number(e.target.value)}}))}/></label>)}</div>
          {/* UK Compliance: IR35 / Contractor Toggle */}
<div style={{display:"flex", alignItems:"center", justifyContent:"space-between", background:m.contractor ? "#FFF7E6" : "#E3FCEF", padding:"10px 14px", borderRadius:J.r, border:`1px solid ${m.contractor ? "#FFAD14" : "#36B37E"}`, marginBottom:"16px"}}>
  <div>
    <div style={{fontSize:"11px", fontWeight:700, color:m.contractor ? "#8A5B00" : "#006644", textTransform:"uppercase"}}>Employment Status</div>
    <div style={{fontSize:"13px", fontWeight:600}}>{m.contractor ? "Contractor (IR35)" : "Permanent Staff"}</div>
  </div>
  <JBtn small onClick={() => setM(p => ({...p, contractor: !p.contractor}))} variant="ghost" style={{border:`1px solid ${m.contractor ? "#FFAD14" : "#36B37E"}`, background:"#fff"}}>
    Switch to {m.contractor ? "Permanent" : "Contractor"}
  </JBtn>
</div>

 <div style={{padding:"20px",flex:1,overflow:"auto"}}></div>

          {/* Risk card */}
          <div style={{background:rt.bg,border:`1px solid ${rt.dot}`,borderRadius:J.rm,padding:"14px",marginBottom:"16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
              <div style={{fontSize:"12px",fontWeight:700,color:rt.text,textTransform:"uppercase",letterSpacing:"0.05em"}}>⚑ Member Risk Score</div>
              <RiskLozenge risk={risk.level}/>
            </div>
            <div style={{fontSize:"24px",fontWeight:800,color:rt.dot,marginBottom:"6px"}}>{risk.score}/100</div>
            {risk.factors.length>0&&<div style={{fontSize:"12px",color:rt.text}}>
              {risk.factors.map((f,i)=><div key={i}>• {f}</div>)}
            </div>}
          </div>

          {/* Workload */}
          <div style={{marginBottom:"16px",background:"#F4F5F7",borderRadius:J.rm,padding:"14px",border:`1px solid ${J.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
              <span style={{fontSize:"11px",fontWeight:700,color:J.textPrimary,textTransform:"uppercase"}}>Workload</span>
              <span style={{fontSize:"14px",fontWeight:800,color:m.workload>80?"#BF2600":m.workload>65?"#FF8B00":"#006644"}}>{m.workload}%</span>
            </div>
            <div style={{height:"8px",background:"#DFE1E6",borderRadius:"4px",marginBottom:"6px"}}>
              <div style={{height:"100%",width:`${m.workload}%`,background:m.workload>80?"#BF2600":m.workload>65?"#FF8B00":"#00875A",borderRadius:"4px",transition:"width .3s"}}/>
            </div>
            <input type="range" min="0" max="100" value={m.workload} onChange={e=>setM(p=>({...p,workload:parseInt(e.target.value)}))} style={{width:"100%",accentColor:m.color,cursor:"pointer"}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",color:J.textMuted,marginTop:"2px"}}>
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>

          {/* Work tracker */}
          <div style={{marginBottom:"16px",background:"#F4F5F7",borderRadius:J.rm,padding:"14px",border:`1px solid ${J.border}`}}>
            <div style={{fontSize:"11px",fontWeight:700,color:J.textSecondary,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"10px"}}>Work Breakdown — {myTasks.length} tasks</div>
            <WorkBar done={statusCounts["Done"]} inprog={statusCounts["In Progress"]} review={statusCounts["Review"]} todo={statusCounts["Todo"]} blocked={statusCounts["Blocked"]} total={myTasks.length}/>
            <div style={{display:"flex",gap:"10px",flexWrap:"wrap",marginTop:"8px"}}>
              {[["Done",statusCounts["Done"],"#00875A"],["Doing",statusCounts["In Progress"],"#0052CC"],["Review",statusCounts["Review"],"#6554C0"],["Todo",statusCounts["Todo"],"#97A0AF"],["Blocked",statusCounts["Blocked"],"#BF2600"]].map(([l,v,c])=>(
                v>0&&<div key={l} style={{display:"flex",alignItems:"center",gap:"4px"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:c}}/>
                  <span style={{fontSize:"11px",color:J.textSecondary}}>{l}: <b style={{color:c}}>{v}</b></span>
                </div>
              ))}
            </div>
            {/* Task list */}
            <div style={{marginTop:"10px",display:"flex",flexDirection:"column",gap:"4px"}}>
              {myTasks.map(t=>{
                const sp=sprints.find(s=>s.id===t.sprint);
                return <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 8px",background:J.bgSurface,borderRadius:J.r,border:`1px solid ${J.border}`}}
                >
                  <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                    <PriorityIcon priority={t.priority} size={11}/>
                    <span style={{fontSize:"12px",color:J.textPrimary,fontWeight:500}}>{t.name}</span>
                    
                  </div>
                  
                  <div style={{display:"flex",gap:"5px",alignItems:"center"}}>
                    <span style={{fontSize:"10px",color:J.textMuted}}>{sp?.name?.split("—")[0]?.trim()}</span>
                    <Lozenge label={t.status} bg={{Todo:"#DFE1E6","In Progress":"#DEEBFF",Review:"#EAE6FF",Done:"#E3FCEF",Blocked:"#FFEBE6"}[t.status]||"#DFE1E6"} color={{Todo:"#42526E","In Progress":"#0052CC",Review:"#403294",Done:"#006644",Blocked:"#BF2600"}[t.status]||"#42526E"}/>
                  </div>
                </div>;
              })}
              {myTasks.length===0&&<div style={{textAlign:"center",padding:"16px",color:J.textMuted,fontSize:"12px"}}>No tasks assigned</div>}
            </div>
          </div>

          <SkillRadar member={m}/>

          <SkillEditor member={m} onChange={setM}/>

          {/* Color picker */}
          <div style={{display:"flex",alignItems:"center",gap:"12px",background:"#F4F5F7",borderRadius:J.rm,padding:"12px",border:`1px solid ${J.border}`}}>
            <span style={{fontSize:"11px",fontWeight:600,color:J.textSecondary,textTransform:"uppercase"}}>Avatar Color</span>
            <input type="color" value={m.color} onChange={e=>setM(p=>({...p,color:e.target.value}))} style={{width:"36px",height:"28px",border:`1px solid ${J.border}`,borderRadius:J.r,cursor:"pointer",padding:0}}/>
            <div style={{width:32,height:32,borderRadius:"50%",background:m.color}}/>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════════ */
function SkillRadar({member}){
  const skills=Object.keys(member.skills||{}).slice(0,6),cx=120,cy=110,r=82,point=(i,value=100)=>{const a=-Math.PI/2+i*Math.PI*2/skills.length,d=r*value/100;return `${cx+Math.cos(a)*d},${cy+Math.sin(a)*d}`};
  return <div className="viz-card"><div className="viz-title"><strong>Declared skill profile</strong><small>Human-declared proficiency; not a competence assessment</small></div><svg viewBox="0 0 240 225" className="radar" role="img" aria-label={`${member.name} capability radar`}><g>{[25,50,75,100].map(level=><polygon key={level} points={skills.map((_,i)=>point(i,level)).join(" ")} className="radar-grid"/>)}{skills.map((s,i)=><line key={s} x1={cx} y1={cy} x2={point(i).split(',')[0]} y2={point(i).split(',')[1]} className="radar-axis"/>)}</g><polygon points={skills.map((s,i)=>point(i,member.skills[s]||0)).join(" ")} className="radar-value"/>{skills.map((s,i)=>{const [x,y]=point(i,116).split(',');return <text key={s} x={x} y={y} textAnchor="middle" className="radar-label"><title>{s}: {member.skills[s]||0}/100</title>{s}</text>})}</svg></div>;
}
function WorkloadBars({members}){const [active,setActive]=useState(null);return <div className="viz-card"><div className="viz-title"><strong>Team capacity</strong><small>{active?`${active.name}: ${active.workload}% allocated`:'Select a bar for detail'}</small></div><div className="hbars">{members.map(m=><button key={m.id} onClick={()=>setActive(m)} className={active?.id===m.id?'active':''}><span>{m.name.split(' ')[0]}</span><i><b style={{width:`${m.workload}%`,background:m.workload>80?'#e34444':m.workload>65?'#e69000':'#0875f5'}}/></i><strong>{m.workload}%</strong></button>)}</div></div>}
function RaidHeatmap({tasks,members}){const [selected,setSelected]=useState(null);const cells=[];for(let y=5;y>=1;y--)for(let x=1;x<=5;x++){const count=tasks.filter(t=>Math.min(5,Math.ceil((t.effort||1)/3))===x&&({Low:1,Medium:2,High:4,Critical:5}[calcRisk(t,members)]||3)===y).length;cells.push({x,y,count});}return <div className="viz-card"><div className="viz-title"><strong>Interactive RAID exposure</strong><small>{selected?`Likelihood ${selected.x}, impact ${selected.y}: ${selected.count} task(s)`:'Select a cell to inspect exposure'}</small></div><div className="heatmap">{cells.map(c=><button key={`${c.x}-${c.y}`} onClick={()=>setSelected(c)} className={selected?.x===c.x&&selected?.y===c.y?'active':''} style={{background:`color-mix(in srgb, ${c.x*c.y>15?'#e34444':c.x*c.y>7?'#e69000':'#12a66a'} ${24+c.x*c.y*2}%, transparent)`}} aria-label={`Likelihood ${c.x}, impact ${c.y}, ${c.count} tasks`}>{c.count||''}</button>)}</div><div className="heat-axis"><span>Low likelihood</span><span>High likelihood</span></div></div>}
function OverviewTab({tasks,members,sprints,setTab}){
  const [week,setWeek]=useState(7);const active=sprints.find(s=>s.status==='Active')||sprints[0];const activeTasks=tasks.filter(t=>t.sprint===active?.id);const done=tasks.filter(t=>t.status==='Done').length;const high=tasks.filter(t=>['High','Critical'].includes(calcRisk(t,members)));const health=Math.max(0,Math.round((tasks.length?done/tasks.length:0)*45+55-high.length*3));const green=[58,61,60,65,67,70,69,health],amber=[26,24,27,23,22,20,21,Math.max(8,100-health-8)],red=[8,9,8,10,8,7,8,Math.min(30,high.length*5)];const pts=a=>a.map((v,i)=>`${40+i*82},${170-v*1.35}`).join(' ');
  return <div className="overview"><div className="overview-head"><div><span>PORTFOLIO OVERVIEW</span><h1>Good morning, {localStorage.getItem('wiq-workspace')?JSON.parse(localStorage.getItem('wiq-workspace')).name.split(' ')[0]:'Maya'}</h1><p>Here is how your full sprint portfolio is tracking today.</p></div><JBtn variant="primary" onClick={()=>setTab('backlog')}>+ New issue</JBtn></div><div className="kpis">{[['Portfolio health',`${health}%`,'◔'],['Active sprint tasks',activeTasks.length,'▣'],['High-risk tasks',high.length,'△'],['Completed tasks',done,'✓']].map(x=><div className="glass-kpi" key={x[0]}><i>{x[2]}</i><span>{x[0]}<strong>{x[1]}</strong><small>Live from current workspace</small></span></div>)}</div><div className="overview-main"><div className="viz-card trend"><div className="viz-title"><strong>Delivery health trend</strong><small>Interactive eight-week demonstration trend</small></div><svg viewBox="0 0 650 210" role="img" aria-label="Delivery health trend">{[50,90,130,170].map(y=><line key={y} x1="35" y1={y} x2="625" y2={y} className="chart-grid"/>)}<polyline points={pts(green)} className="trend-green"/><polyline points={pts(amber)} className="trend-amber"/><polyline points={pts(red)} className="trend-red"/><line x1={40+week*82} y1="32" x2={40+week*82} y2="176" className="chart-guide"/>{green.map((v,i)=><circle key={i} cx={40+i*82} cy={170-v*1.35} r="9" className={week===i?'chart-point active':'chart-point'} onMouseEnter={()=>setWeek(i)} onClick={()=>setWeek(i)}/>)}</svg><div className="chart-readout"><span>Week {week+1}</span><b className="good">● {green[week]}% on track</b><b className="warn">● {amber[week]}% at risk</b><b className="bad">● {red[week]}% off track</b></div></div><div className="viz-card attention-viz"><div className="viz-title"><strong>Needs attention</strong><small>{high.length} high-impact tasks</small></div>{high.slice(0,4).map(t=><button key={t.id} onClick={()=>setTab('risk')}><i>!</i><span><strong>{t.name}</strong><small>{sprints.find(s=>s.id===t.sprint)?.name||'Unplanned'} · {t.status}</small></span><RiskLozenge risk={calcRisk(t,members)}/></button>)}{!high.length&&<p>Nothing urgent right now.</p>}</div></div><div className="overview-lower"><WorkloadBars members={members}/><RaidHeatmap tasks={tasks} members={members}/></div><div className="viz-card portfolio-table"><div className="viz-title"><strong>Sprint portfolio</strong><small>Same sprint data, richer interpretation</small></div><table><thead><tr><th>Sprint</th><th>Status</th><th>Tasks</th><th>Progress</th><th>Risk</th></tr></thead><tbody>{sprints.map(s=>{const st=tasks.filter(t=>t.sprint===s.id),complete=st.filter(t=>t.status==='Done').length,pct=st.length?Math.round(complete/st.length*100):0,risky=st.filter(t=>['High','Critical'].includes(calcRisk(t,members))).length;return <tr key={s.id} onClick={()=>setTab('board')}><td><strong>{s.name}</strong><small>{s.start||'No start date'} → {s.end||'Open'}</small></td><td>{s.status}</td><td>{st.length}</td><td><div className="mini-progress"><i style={{width:`${pct}%`}}/></div>{pct}%</td><td><Lozenge label={`${risky} flagged`} bg={risky?'#FFF0B3':'#E3FCEF'} color={risky?'#8A5B00':'#006644'}/></td></tr>})}</tbody></table></div></div>;
}
function AccessScreen({onLogin,mode="signin"}){
  const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  const submit=async e=>{e.preventDefault();if(!/^\S+@\S+\.\S+$/.test(email)){setError("Enter a valid work email.");return;}if(password.length<8){setError("Password must contain at least 8 characters.");return;}setBusy(true);setError("");try{await onLogin({email,password});}catch(err){setError(err.message||"Could not sign in.");}finally{setBusy(false);}};
  const creating=mode==="signup";
  return <div className="access-shell"><div className="access-glow"/><form className="access-card" onSubmit={submit}><div className="access-mark">W</div><span>WORKFORCE IQ</span><h1>{creating?"Create your workspace":"Welcome back"}</h1><p>{creating?"Start a research-led delivery workspace for your team.":"Continue to your delivery workspace."}</p><label>Work email<input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="8+ characters"/></label>{error&&<div className="validation">{error}</div>}<button disabled={busy}>{busy?(creating?"Creating account…":"Signing in…"):(creating?"Create account":"Sign in securely")}</button><small>{supabaseConfigured?"Protected by Supabase authentication.":"Demo mode is active until Supabase environment variables are added."}</small></form></div>;
}
function Onboarding({onDone}){
  const [step,setStep]=useState(1);const [name,setName]=useState("");const [company,setCompany]=useState("");const [role,setRole]=useState("Delivery manager");const [industry,setIndustry]=useState("Software consultancy");const [teamSize,setTeamSize]=useState("6–20");const [cadence,setCadence]=useState("Daily");const [timezone,setTimezone]=useState("Europe/London");const [error,setError]=useState("");
  const next=e=>{e.preventDefault();setError("");if(step===1&&name.trim().length<2){setError("Add your name.");return;}if(step===2&&company.trim().length<2){setError("Add your organisation.");return;}if(step<3){setStep(s=>s+1);return;}onDone({name:name.trim(),company:company.trim(),role,industry,teamSize,cadence,timezone});};
  return <div className="access-shell"><div className="access-glow"/><form className="access-card" onSubmit={next}><div className="setup-progress"><i className={step>=1?"active":""}/><i className={step>=2?"active":""}/><i className={step>=3?"active":""}/></div><span>SETUP · {step} OF 3</span><h1>{step===1?"Tell us about you":step===2?"Create your organisation":"Configure check-ins"}</h1><p>{step===1?"Your role determines the workspace and information you can access.":step===2?"This creates the boundary for projects, data and permissions.":"Choose a starting cadence. You can change it later."}</p>{step===1&&<><label>Your name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Maya Verma"/></label><label>Primary role<select value={role} onChange={e=>setRole(e.target.value)}><option>Delivery manager</option><option>Project manager</option><option>Risk owner</option><option>Administrator</option><option>Team member</option><option>Contractor</option><option>Client</option><option>Executive viewer</option></select></label></>}{step===2&&<><label>Organisation<input value={company} onChange={e=>setCompany(e.target.value)} placeholder="Acme Delivery"/></label><label>Industry<select value={industry} onChange={e=>setIndustry(e.target.value)}><option>Software consultancy</option><option>SaaS product team</option><option>Internal IT</option><option>Managed services</option><option>Creative production</option><option>Construction and design</option></select></label><label>Team size<select value={teamSize} onChange={e=>setTeamSize(e.target.value)}><option>1–5</option><option>6–20</option><option>21–50</option><option>51+</option></select></label></>}{step===3&&<><label>Check-in cadence<select value={cadence} onChange={e=>setCadence(e.target.value)}><option>Daily</option><option>Weekdays</option><option>Weekly</option><option>Configure later</option></select></label><label>Time zone<select value={timezone} onChange={e=>setTimezone(e.target.value)}><option>Europe/London</option><option>Europe/Dublin</option><option>America/New_York</option><option>America/Los_Angeles</option><option>Asia/Kolkata</option></select></label><div className="onboarding-note">Team invitations, project import and risk templates are available inside the workspace.</div></>}{error&&<div className="validation">{error}</div>}<button>{step<3?"Continue":["Team member","Contractor","Client","Executive viewer"].includes(role)?"Open participant workspace":"Create management workspace"}</button>{step>1&&<button type="button" className="back-button" onClick={()=>setStep(s=>s-1)}>Back</button>}</form></div>;
}
export default function App(){
  const load=(key,fallback)=>{try{return JSON.parse(localStorage.getItem("proposal-"+key)||localStorage.getItem(key))||fallback;}catch{return fallback;}};
  const [session,setSession]=useState(()=>load("wiq-session",null));
  const [workspace,setWorkspace]=useState(()=>load("wiq-workspace",null));
  const [publicView,setPublicView]=useState("landing");
  const [theme,setTheme]=useState(()=>localStorage.getItem("wiq-theme")||"light");
  const [tasks,  setTasks]  =useState(()=>load("wiq-tasks",syntheticSet().tasks));
  const [members,setMembers]=useState(()=>load("wiq-members",syntheticSet().members));
  const [sprints,setSprints]=useState(()=>load("wiq-sprints",syntheticSet().sprints));
  const [collapsed,setCollapsed]=useState(()=>new Set(load("wiq-collapsed",[])));
  const [collapsedMembers,setCollapsedMembers]=useState(()=>new Set(load("wiq-collapsed-members",[])));
  const [boardSprint,setBoardSprint]=useState(()=>localStorage.getItem("proposal-wiq-board-sprint")||"");
  const [draggingTask,setDraggingTask]=useState(null);
  const [carryNotice,setCarryNotice]=useState("");
  const restoreRef=useRef();const [workspaceRevision,setWorkspaceRevision]=useState(0);
  const [decisions,setDecisions]=useState(()=>load("wiq-decisions",[]));
  useEffect(()=>{localStorage.setItem("proposal-wiq-decisions",JSON.stringify(decisions));},[decisions]);
  const [tab,    setTab]    =useState("overview");
  const [aiModal,setAiModal]=useState(null);
  const [selectedTask,  setSelectedTask]  =useState(null);
  const [selectedMember,setSelectedMember]=useState(null);
  const [importModal,setImportModal]=useState(null);
  const [importFile, setImportFile] =useState(null);
  const [importSpId, setImportSpId] =useState("");
  const [skillFile,  setSkillFile]  =useState(null);
  const [weeklyChecks,setWeeklyChecks]=useState(()=>{
    try{return JSON.parse(localStorage.getItem('workforce-weekly-checks')||'{}');}catch{return {};}
  });
  const [weekStart,setWeekStart]=useState(()=>new Date().toISOString().slice(0,10));
  const [pdfBusy,setPdfBusy]=useState(false);
  const [pdfNotice,setPdfNotice]=useState('');
  // AI Bot
  const [botMin, setBotMin] =useState(true);
  const [banner, setBanner] =useState({text:"",loading:true});
  const importRef=useRef();const skillRef=useRef();const pdfRef=useRef();

  useEffect(()=>{localStorage.setItem('workforce-weekly-checks',JSON.stringify(weeklyChecks));},[weeklyChecks]);
  useEffect(()=>{localStorage.setItem("proposal-wiq-tasks",JSON.stringify(tasks));},[tasks]);
  useEffect(()=>{localStorage.setItem("proposal-wiq-members",JSON.stringify(members));},[members]);
  useEffect(()=>{localStorage.setItem("proposal-wiq-sprints",JSON.stringify(sprints));},[sprints]);
  useEffect(()=>{localStorage.setItem("proposal-wiq-collapsed",JSON.stringify([...collapsed]));},[collapsed]);
  useEffect(()=>{localStorage.setItem("proposal-wiq-collapsed-members",JSON.stringify([...collapsedMembers]));},[collapsedMembers]);
  useEffect(()=>{if(boardSprint)localStorage.setItem("proposal-wiq-board-sprint",boardSprint);},[boardSprint]);
  useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem("wiq-theme",theme);},[theme]);

  const refreshBanner=useCallback(()=>{
    setBanner({text:"",loading:true});
    const high=tasks.filter(t=>["High","Critical"].includes(calcRisk(t,members)));
    const burn=members.filter(m=>m.workload>80);
    callClaude(
      `Team: ${members.map(m=>`${m.name}(${m.workload}%,${tasks.filter(t=>t.assigneeId===m.id).length} tasks)`).join(", ")}. `+
      `High-risk tasks: ${high.map(t=>t.name).join(", ")||"none"}. `+
      `Burnout: ${burn.map(m=>m.name).join(", ")||"none"}. `+
      `Give a 2-sentence PM insight + one bullet action.`,
      "You are a PM advisor. Max 2 sentences + 1 bullet. No markdown asterisks or symbols."
    ).then(t=>setBanner({text:t,loading:false}));
  },[tasks,members]);
  useEffect(()=>{refreshBanner();},[refreshBanner]);

  const upTask=(id,p)=>{const old=tasks.find(t=>t.id===id);if(!old)return;const fields=['name','description','requiredSkills','sprint','estimatedHours','minimumLevel'];const invalidated=fields.some(k=>p[k]!==undefined&&JSON.stringify(p[k])!==JSON.stringify(old[k]));const patch={...p};if(invalidated&&(!p.recommendationSnapshot||p.recommendationSnapshot===old.recommendationSnapshot))patch.recommendationSnapshot=null;if(p.assigneeId!==undefined&&p.assigneeId!==old.assigneeId&&!p.recommendationSnapshot)patch.recommendationSnapshot=null;const next=transitionTask(old,patch);if(next.assigneeId!==old.assigneeId||next.recommendationSnapshot!==old.recommendationSnapshot||next.completionAccepted!==old.completionAccepted)setDecisions(ds=>[...ds,{at:new Date().toISOString(),taskId:id,owner:next.assigneeId,reason:next.assignmentReason||'',accepted:next.completionAccepted===true,snapshot:next.recommendationSnapshot||null}]);setTasks(ts=>ts.map(t=>t.id===id?next:t));};
  const upMember=(id,p)=>{if(members.some(m=>m.id!==id&&m.name.toLowerCase()===p.name?.trim().toLowerCase())){window.alert('Member names must be unique for exact Excel matching.');return;}setMembers(ms=>ms.map(m=>m.id===id?{...m,...p}:m));};
  const delTask =(id)=>setTasks(ts=>ts.filter(t=>t.id!==id));
  const addTask=(sprintId,status="Todo")=>{const sid=typeof sprintId==="string"?sprintId:(sprints.find(s=>s.status==="Active")||sprints[0])?.id;const task={id:"t"+Date.now(),name:"New issue",type:"Frontend",complexity:"Medium",priority:"Medium",effort:3,sprint:sid||"s1",status,assigneeId:null,riskOverride:null,requiredSkills:[],requirementsConfirmed:false};setTasks(ts=>[...ts,task]);setSelectedTask(task);};
  const addSprint=()=>setSprints(ss=>[...ss,{id:"s"+Date.now(),name:"New Sprint",start:"",end:"",status:"Planned"}]);
  const toggleSprint=id=>setCollapsed(prev=>{const next=new Set(prev);next.has(id)?next.delete(id):next.add(id);return next;});
  const nextSprintFor=id=>{const current=sprints.findIndex(s=>s.id===id);let target=sprints[current+1];if(!target){target={id:"s"+Date.now(),name:"Next Sprint",start:"",end:"",status:"Planned"};setSprints(ss=>[...ss,target]);}return target;};
  const carryOpen=id=>{const target=nextSprintFor(id);const count=tasks.filter(t=>t.sprint===id&&t.status!=="Done").length;if(!count){setCarryNotice("No unfinished tasks to carry forward.");return;}setTasks(ts=>ts.map(t=>t.sprint===id&&t.status!=="Done"?{...t,sprint:target.id,carriedFrom:id,carriedAt:new Date().toISOString()}:t));setCarryNotice(`${count} task${count===1?"":"s"} carried to ${target.name}. Status and owner preserved.`);setTimeout(()=>setCarryNotice(""),4500);};
  const carryOne=(task)=>{const target=nextSprintFor(task.sprint);setTasks(ts=>ts.map(t=>t.id===task.id?{...t,sprint:target.id,carriedFrom:task.sprint,carriedAt:new Date().toISOString()}:t));setCarryNotice(`${task.name} carried to ${target.name}.`);setTimeout(()=>setCarryNotice(""),4500);};
  const toggleMember=id=>setCollapsedMembers(prev=>{const next=new Set(prev);next.has(id)?next.delete(id):next.add(id);return next;});
  const moveTask=(id,status,assigneeId)=>{if(status==='Done'&&!assigneeId){window.alert('Assign an owner before completing this task.');setDraggingTask(null);return;}const current=tasks.find(t=>t.id===id);let reason=current?.assignmentReason||'';if(current&&current.assigneeId!==(assigneeId||null)){reason=window.prompt('Reason for this manual reassignment:')||'';if(!reason.trim()){setDraggingTask(null);return;}}upTask(id,{status,assigneeId:assigneeId||null,assignmentReason:reason});setDraggingTask(null);};
  const deleteSprint=id=>{const target=sprints.find(s=>s.id!==id);if(!target)return;setTasks(ts=>ts.map(t=>t.sprint===id?{...t,sprint:target.id}:t));setSprints(ss=>ss.filter(s=>s.id!==id));};
  const addMember=()=>{const cols=["#6554C0","#00875A","#0052CC","#FF8B00","#00A3BF","#CD1316"];setMembers(ms=>[...ms,{id:"m"+Date.now(),name:`New Member ${ms.length+1}`,role:"Developer",color:cols[ms.length%cols.length],workload:50,skills:{},sprintCapacityHours:{}}]);};

  const weeklySprint=sprints.find(s=>s.start===weekStart)||sprints.find(s=>s.status==="Active")||sprints[0];
  const weeklyTasks=tasks.filter(t=>t.sprint===weeklySprint?.id);
  const checkFor=id=>weeklyChecks[id]||{scenario:"",likelihood:3,impact:3,comment:"",action:"",updated:""};
  const updateCheck=(id,patch)=>setWeeklyChecks(prev=>({...prev,[id]:{...checkFor(id),...patch,updated:new Date().toISOString()}}));
  const raidEntries=tasks.flatMap(t=>{
    const c=checkFor(t.id);if(!["Risk","Issue","Dependency"].includes(c.scenario))return [];
    const score=c.scenario==="Issue"?Number(c.impact||0)*5:Number(c.likelihood||0)*Number(c.impact||0);
    const rating=score>=20?"Critical":score>=12?"High":score>=6?"Medium":"Low";
    return [{...t,...c,score,rating,owner:members.find(m=>m.id===t.assigneeId)?.name||"Unassigned"}];
  });

  const ensurePdfJs=()=>new Promise((resolve,reject)=>{
    if(window.pdfjsLib){resolve(window.pdfjsLib);return;}
    const script=document.createElement('script');script.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload=()=>{window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';resolve(window.pdfjsLib);};script.onerror=reject;document.head.appendChild(script);
  });
  const importWeeklyPdf=async(file)=>{
    if(!file)return;setPdfBusy(true);setPdfNotice('Reading task PDF…');
    try{
      const pdfjs=await ensurePdfJs();const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;const lines=[];
      for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p);const content=await page.getTextContent();const text=content.items.map(i=>i.str).join(' ');text.split(/\s{2,}|[•▪◦]\s*/).map(x=>x.trim()).filter(x=>x.length>8&&!/^page\s+\d+/i.test(x)).forEach(x=>lines.push(x));}
      const unique=[...new Set(lines)].slice(0,50);if(!unique.length)throw new Error('No task text found');
      const sid='week-'+weekStart;const sprint={id:sid,name:`Week of ${weekStart}`,start:weekStart,end:"",status:"Active"};
      setSprints(ss=>[...ss.filter(s=>s.id!==sid),sprint]);
      setTasks(ts=>[...ts.filter(t=>t.sprint!==sid),...unique.map((name,i)=>({id:`${sid}-${i+1}`,name,type:"Frontend",complexity:"Medium",priority:"Medium",effort:3,sprint:sid,status:"Todo",assigneeId:null,riskOverride:null}))]);
      setPdfNotice(`${unique.length} tasks loaded into Week of ${weekStart}. Review names and assignments below.`);
    }catch(e){setPdfNotice(`Could not read this PDF automatically: ${e.message}. Export it to Excel/CSV and use Backlog import.`);}finally{setPdfBusy(false);}
  };

  /* file parse */
  const parseFile=async(file,onData)=>{
    try{if(!file||file.size>8000000)throw new Error("Maximum file size is 8 MB");const wb=XLSX.read(await file.arrayBuffer(),{type:"array"});onData(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:""}));}
    catch(error){window.alert(`Could not import: ${error.message}`);}
  };
  const ensureXLSX=cb=>{window.XLSX=XLSX;cb();};
  const handleTaskImport=(file,spId)=>parseFile(file,rows=>{
    const result=validateTaskRows(rows,members,spId,tasks);
    if(result.errors.length){window.alert(result.errors.join("\n"));return;}
    if(!window.confirm(`Import ${result.tasks.length} validated tasks into the selected sprint? Existing tasks will be retained.`))return;
    setTasks(ts=>[...ts,...result.tasks]);setImportModal(null);setImportFile(null);
  });
  const handleSkillImport=(file)=>parseFile(file,rows=>{try{const next=importSkillRows(rows,members);if(!window.confirm(`Apply ${rows.length} validated member rows? Exact names are matched; new names create profiles.`))return;setMembers(next);setImportModal(null);setSkillFile(null);}catch(e){window.alert(e.message);}});

  const downloadTemplate=()=>{
    ensureXLSX(()=>{const skills=catalog(members,tasks);const data=[["Member Name",...skills],...members.map(m=>[m.name,...skills.map(t=>m.skills[t]??"" )])];const ws=window.XLSX.utils.aoa_to_sheet(data);const wb=window.XLSX.utils.book_new();window.XLSX.utils.book_append_sheet(wb,ws,"Skills");window.XLSX.writeFile(wb,"skill_matrix_template.xlsx");});
  };

  const saveBackup=()=>{const blob=new Blob([JSON.stringify({schemaVersion:3,members,tasks,sprints,decisions,expected:JSON.parse(localStorage.getItem('wiq-eval-expected')||'[]'),label:localStorage.getItem('wiq-eval-label')||'',notes:localStorage.getItem('wiq-eval-notes')||''},null,2)],{type:'application/json'});const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download='WorkForce-IQ-Workspace-Backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const restoreBackup=async file=>{if(!file)return;try{if(file.size>8000000)throw new Error('Maximum 8 MB');const data=validateBackup(JSON.parse(await file.text()));if(!window.confirm(`Replace workspace with ${data.members.length} members and ${data.tasks.length} tasks? A backup will download first.`))return;saveBackup();setMembers(data.members);setTasks(data.tasks);setSprints(data.sprints);setDecisions(data.decisions||[]);setBoardSprint(data.sprints.find(s=>s.status==='Active')?.id||data.sprints[0]?.id||'');localStorage.setItem('wiq-eval-expected',JSON.stringify(data.expected||[]));localStorage.setItem('wiq-eval-label',data.label||'Restored synthetic evaluation');localStorage.setItem('wiq-eval-notes',data.notes||'');setWorkspaceRevision(v=>v+1);}catch(e){window.alert(e.message);}finally{if(restoreRef.current)restoreRef.current.value='';}};
  const loadSynthetic=()=>{saveBackup();const data=syntheticSet();setMembers(data.members);setTasks(data.tasks);setSprints(data.sprints);setDecisions([]);setBoardSprint('syn-sprint');return data;};
  /* AI Actions */
  const aiAssign=(task)=>{
    const cands=rankCandidates(task,members,tasks);
    setAiModal({title:`🤖 Smart Assignment — ${task.name}`,
      prompt:`Task "${task.name}" (${task.type}, ${task.complexity}, ${task.priority} priority, ${task.effort}pts). Candidates: ${cands.map((c,i)=>`${i+1}. ${c.member.name}: skill ${c.skill}/100, fit index ${c.prob}/100, load ${c.member.workload}%`).join("; ")}. Recommend who to assign with 3-4 sentence reasoning covering skill fit, workload risk and trade-offs.`,
      extra:<div>
        <div style={{fontSize:"11px",color:J.textSecondary,marginBottom:"10px",fontWeight:700,textTransform:"uppercase"}}>Ranked Candidates</div>
        {cands.map((c,i)=><div key={c.member.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",marginBottom:"6px",background:i===0?J.blueLight:"#F4F5F7",borderRadius:J.r,border:`1px solid ${i===0?J.blue:J.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <Avatar name={c.member.name} color={c.member.color} size={28}/>
            <div><div style={{fontSize:"13px",fontWeight:600,color:J.textPrimary}}>{c.member.name}</div><div style={{fontSize:"11px",color:J.textSecondary}}>{c.member.role}</div></div>
            {i===0&&<Lozenge label="Best fit" bg={J.blue} color="#fff" bold/>}
          </div>
          <div style={{display:"flex",gap:"14px",alignItems:"center"}}>
            {[["Skill",c.skill,J.textPrimary],["Fit",`${c.prob}%`,c.prob>=70?"#006644":c.prob>=50?"#FF8B00":"#BF2600"],["Load",`${c.member.workload}%`,c.member.workload>80?"#BF2600":J.textPrimary],["Done",c.completed,J.textPrimary],["Matching",c.matching,J.blue],["Sprints",c.projects,J.textPrimary]].map(([l,v,col])=><div key={l} style={{textAlign:"center"}}><div style={{fontSize:"13px",fontWeight:700,color:col}}>{v}</div><div style={{fontSize:"9px",color:J.textMuted,textTransform:"uppercase"}}>{l}</div></div>)}
            <JBtn variant="primary" small onClick={()=>{upTask(task.id,{assigneeId:c.member.id});setAiModal(null);}}>Assign</JBtn>
          </div>
        </div>)}
      </div>
    });
  };
  const aiRisk=(task)=>{
    const risk=calcRisk(task,members);const m=members.find(mm=>mm.id===task.assigneeId);const prob=m?calcProb(m,task,tasks):null;
    setAiModal({title:`⚠️ Risk Analysis — ${task.name}`,
      prompt:`Task "${task.name}" (${task.type}, ${task.complexity}, ${task.priority}). Risk: ${risk}. ${m?`Assignee: ${m.name} (load: ${m.workload}%, skill: ${m.skills[task.type]??50}/100, prob: ${prob}%).`:"Unassigned."} Explain this risk level and give 2-3 concrete mitigations.`,
      extra:<div style={{display:"flex",gap:"10px",marginBottom:"4px"}}>
        <div style={{flex:1,padding:"12px",background:"#F4F5F7",borderRadius:J.r,border:`1px solid ${J.border}`}}>
          <div style={{fontSize:"11px",color:J.textSecondary,marginBottom:"5px",fontWeight:600,textTransform:"uppercase"}}>Risk</div>
          <RiskLozenge risk={risk}/>
        </div>
        {m&&<><div style={{flex:1,padding:"12px",background:"#F4F5F7",borderRadius:J.r,border:`1px solid ${J.border}`}}>
          <div style={{fontSize:"11px",color:J.textSecondary,marginBottom:"6px",fontWeight:600,textTransform:"uppercase"}}>Assignee</div>
          <div style={{display:"flex",alignItems:"center",gap:"6px"}}><Avatar name={m.name} color={m.color} size={22}/><span style={{fontSize:"13px",color:J.textPrimary}}>{m.name}</span></div>
        </div>
        <div style={{flex:1,padding:"12px",background:"#F4F5F7",borderRadius:J.r,border:`1px solid ${J.border}`}}>
          <div style={{fontSize:"11px",color:J.textSecondary,marginBottom:"5px",fontWeight:600,textTransform:"uppercase"}}>Success Prob</div>
          <div style={{fontSize:"22px",fontWeight:800,color:prob>=70?"#006644":prob>=50?"#FF8B00":"#BF2600"}}>{prob}%</div>
        </div></>}
      </div>
    });
  };
  const aiSprintHealth=(sprint)=>{
    const st=tasks.filter(t=>t.sprint===sprint.id);
    const unass=st.filter(t=>!t.assigneeId).length;const high=st.filter(t=>["High","Critical"].includes(calcRisk(t,members))).length;
    setAiModal({title:`🏃 Sprint Health — ${sprint.name}`,
      prompt:`Sprint "${sprint.name}" (${sprint.status}, ${sprint.start}→${sprint.end}). ${st.length} tasks, ${unass} unassigned, ${high} high-risk. Tasks: ${st.map(t=>`${t.name}(${t.status},${calcRisk(t,members)}${t.assigneeId?"":",UNASSIGNED"})`).join("; ")}. Team: ${members.map(m=>`${m.name}:${m.workload}%`).join(", ")}. Give: health score /100, top 3 risks+mitigations, resource balance, key recommendation.`,
      extra:<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px",marginBottom:"4px"}}>
        {[["Tasks",st.length,J.blue],["Unassigned",unass,"#FF8B00"],["High Risk",high,"#BF2600"]].map(([l,v,c])=><div key={l} style={{padding:"14px",background:"#F4F5F7",borderRadius:J.r,border:`1px solid ${J.border}`,textAlign:"center"}}><div style={{fontSize:"26px",fontWeight:800,color:c}}>{v}</div><div style={{fontSize:"11px",color:J.textSecondary,fontWeight:600,textTransform:"uppercase"}}>{l}</div></div>)}
      </div>
    });
  };

  /* ── NAV ── */
  const NAV=[{id:"analytics",icon:"▥",label:"Analytics & Evaluation"},{id:"overview",icon:"⌂",label:"Overview"},{id:"board",icon:"⊞",label:"Sprint Board"},{id:"backlog",icon:"☰",label:"Tasks"},{id:"checkin",icon:"☑",label:"Check-ins"},{id:"skills",icon:"⬡",label:"Skill Matrix"},{id:"team",icon:"◎",label:"Team"},{id:"risk",icon:"⚑",label:"Risk Centre"},{id:"decisions",icon:"◇",label:"Decision Room"}];

  /* ── BOARD ── */
  const BoardTab=()=>{
    const COLS=["Todo","In Progress","Review","Done","Blocked"];
    const selected=sprints.find(s=>s.id===(boardSprint||sprints.find(x=>x.status==="Active")?.id||sprints[0]?.id))||sprints[0];
    const sprintTasks=tasks.filter(t=>t.sprint===selected?.id);
    const lanes=[...members.map(m=>({id:m.id,member:m,label:m.name})),{id:"unassigned",member:null,label:"Unassigned"}];
    const progress=sprintTasks.length?Math.round(sprintTasks.filter(t=>t.status==="Done").length/sprintTasks.length*100):0;
    const shift=(task,delta)=>{const index=COLS.indexOf(task.status);const next=COLS[Math.max(0,Math.min(COLS.length-1,index+delta))];moveTask(task.id,next,task.assigneeId);};
    return <div className="team-board">
      {carryNotice&&<div className="action-toast">✓ {carryNotice}</div>}
      <div className="board-toolbar"><div><span>SPRINT</span><select value={selected?.id||""} onChange={e=>setBoardSprint(e.target.value)}>{sprints.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><small>{selected?.start||"No start"} → {selected?.end||"Open end"}</small></div><div><button className="secondary-button" onClick={()=>aiSprintHealth(selected)}>Sprint health</button><button className="secondary-button" onClick={()=>carryOpen(selected.id)}>Carry open tasks</button><button className="primary-button" onClick={()=>addTask(selected.id)}>+ Add task</button></div></div>
      <div className="board-summary"><article><strong>{members.length}</strong><span>Team members</span></article><article><strong>{sprintTasks.length}</strong><span>Tasks</span></article><article><strong>{sprintTasks.reduce((n,t)=>n+Number(t.effort||0),0)}</strong><span>Total points</span></article><article><strong>{sprintTasks.filter(t=>t.status==="Blocked").length}</strong><span>Blocked</span></article><article><strong>{progress}%</strong><span>Sprint progress</span></article></div>
      <div className="swimlane-grid board-labels"><b>Team member</b>{COLS.map(col=><b key={col}>{col}<span>{sprintTasks.filter(t=>t.status===col).length}</span></b>)}</div>
      {lanes.map(lane=>{
        const laneTasks=sprintTasks.filter(t=>lane.member?t.assigneeId===lane.id:!t.assigneeId);
        const done=laneTasks.filter(t=>t.status==="Done");const points=done.reduce((n,t)=>n+Number(t.effort||0),0);
        const blocked=laneTasks.filter(t=>t.status==="Blocked").length;
        const laneProgress=laneTasks.length?Math.round(done.length/laneTasks.length*100):0;
        const avgFit=lane.member&&laneTasks.length?Math.round(laneTasks.reduce((n,t)=>n+calcProb(lane.member,t,tasks),0)/laneTasks.length):0;
        const isCollapsed=collapsedMembers.has(lane.id);
        return <section className={`member-lane ${isCollapsed?"collapsed":""}`} key={lane.id}>
          <div className="swimlane-grid">
            <div className="member-cell"><button className="lane-toggle" onClick={()=>toggleMember(lane.id)}>{isCollapsed?"›":"⌄"}</button>{lane.member?<Avatar name={lane.member.name} color={lane.member.color} size={38} onClick={()=>setSelectedMember(lane.member)}/>:<div className="unassigned-avatar">?</div>}<div className="member-identity"><strong>{lane.label}</strong><span>{lane.member?.role||"Tasks waiting for an owner"}</span></div>{lane.member&&<div className="member-metrics"><span><b>{lane.member.workload}%</b> workload</span><span><b>{laneProgress}%</b> progress</span><span><b>{blocked}</b> blocked</span><span><b>{points}</b> done pts</span><span><b>{avgFit}%</b> fit</span></div>}</div>
            {!isCollapsed&&COLS.map(col=><div className={`status-cell ${draggingTask?"drop-ready":""}`} key={col} data-status={col} data-owner={lane.member?.id||''} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData("text/task-id")||draggingTask;moveTask(id,col,lane.member?.id)}}>
              {laneTasks.filter(t=>t.status===col).map(task=>{const risk=calcRisk(task,members);return <article className="board-task" data-task-id={task.id} draggable onDragStart={e=>{setDraggingTask(task.id);e.dataTransfer.setData("text/task-id",task.id);}} onDragEnd={()=>setDraggingTask(null)} onClick={()=>setSelectedTask(task)} key={task.id}><div><span className="drag-handle">⠿</span><small style={{color:TYPE_COLORS[task.type]}}>{task.type}</small><PriorityIcon priority={task.priority}/></div><strong>{task.name}</strong><footer><span>{task.estimatedHours==null?"Hours unknown":`${task.estimatedHours}h`}</span><b className={`risk-dot ${risk.toLowerCase()}`}>{risk}</b></footer><div className="task-actions" onClick={e=>e.stopPropagation()}><button disabled={col==="Todo"} onClick={()=>shift(task,-1)}>←</button><button onClick={()=>carryOne(task)} title="Carry to next sprint">↗</button><button disabled={col==="Blocked"} onClick={()=>shift(task,1)}>→</button></div>{task.carriedFrom&&<em className="carried-tag">Carried forward</em>}</article>})}
              <button className="add-lane-task" onClick={()=>{const task={id:"t"+Date.now(),name:"New issue",type:"Frontend",complexity:"Medium",priority:"Medium",effort:3,sprint:selected.id,status:col,assigneeId:lane.member?.id||null,riskOverride:null,requiredSkills:[],requirementsConfirmed:false};setTasks(ts=>[...ts,task]);setSelectedTask(task);}}>+ Add</button>
            </div>)}
          </div>
        </section>;
      })}
    </div>;
  };

  /* ── BACKLOG ── */
  const BacklogTab=()=>(
    <div>
      <div style={{display:"flex",gap:"8px",marginBottom:"16px"}}>
        <JBtn variant="primary" onClick={()=>addTask()}>Create issue</JBtn>
        <JBtn variant="success" onClick={()=>setImportModal("tasks")}>📥 Import Excel/CSV</JBtn>
        <JBtn onClick={addSprint}>+ Sprint</JBtn>
      </div>
      {sprints.map(sprint=>{
        const st=tasks.filter(t=>t.sprint===sprint.id);
        return <div key={sprint.id} style={{background:J.bgSurface,borderRadius:J.rm,border:`1px solid ${J.border}`,marginBottom:"12px",overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 16px",background:"#F4F5F7",borderBottom:`1px solid ${J.border}`,flexWrap:"wrap"}}>
            <button onClick={()=>toggleSprint(sprint.id)} aria-label="Collapse sprint" style={{border:0,background:"transparent",color:J.textSecondary,cursor:"pointer"}}>{collapsed.has(sprint.id)?"▶":"▼"}</button>
            <input value={sprint.name} onChange={e=>setSprints(ss=>ss.map(s=>s.id===sprint.id?{...s,name:e.target.value}:s))} style={{background:"none",border:"none",fontSize:"13px",fontWeight:700,color:J.textPrimary,fontFamily:"inherit"}}/>
            <JSelect value={sprint.status} options={["Planned","Active","Completed"]} onChange={v=>setSprints(ss=>ss.map(s=>s.id===sprint.id?{...s,status:v}:s))} style={{fontSize:"11px"}}/>
            <span style={{color:J.textMuted,fontSize:"12px"}}>{st.length} issues</span>
            <div style={{marginLeft:"auto",display:"flex",gap:"6px"}}>
              <JBtn variant="ai" small onClick={()=>aiSprintHealth(sprint)}>🤖 Health</JBtn>
              <JBtn small onClick={()=>addTask(sprint.id)}>+ Issue here</JBtn>
              <JBtn small onClick={()=>carryOpen(sprint.id)}>Carry open</JBtn>
              <JBtn variant="danger" small onClick={()=>deleteSprint(sprint.id)}>Delete</JBtn>
            </div>
          </div>
          {!collapsed.has(sprint.id)&&<div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
              <thead><tr style={{background:"#FAFBFC",borderBottom:`1px solid ${J.border}`}}>
                {["","Issue","Type","Complexity","Priority","Effort","Status","Assignee","Risk",""].map((h,i)=><th key={i} style={{padding:"7px 8px",textAlign:"left",color:J.textSecondary,fontWeight:600,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {st.length===0&&<tr><td colSpan={10} style={{padding:"16px",textAlign:"center",color:J.textMuted}}>No issues — create one or import from Excel.</td></tr>}
                {st.map(task=>{
                  const risk=calcRisk(task,members);const assignee=members.find(m=>m.id===task.assigneeId);
                  return <tr key={task.id} style={{borderBottom:`1px solid ${J.border}`,cursor:"pointer"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#F4F5F7"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    onClick={()=>setSelectedTask(task)}>
                    <td style={{padding:"7px 8px",width:"16px"}} onClick={e=>e.stopPropagation()}><PriorityIcon priority={task.priority} size={12}/></td>
                    <td style={{padding:"7px 8px"}}><span style={{fontWeight:500,color:J.textLink}}>{task.name}</span></td>
                    <td style={{padding:"7px 6px"}} onClick={e=>e.stopPropagation()}><JSelect value={task.type} options={TASK_TYPES} onChange={v=>upTask(task.id,{type:v})} style={{fontSize:"11px"}}/></td>
                    <td style={{padding:"7px 6px"}} onClick={e=>e.stopPropagation()}><JSelect value={task.complexity} options={COMPLEXITIES} onChange={v=>upTask(task.id,{complexity:v})} style={{fontSize:"11px"}}/></td>
                    <td style={{padding:"7px 6px"}} onClick={e=>e.stopPropagation()}><JSelect value={task.priority} options={PRIORITIES} onChange={v=>upTask(task.id,{priority:v})} style={{fontSize:"11px"}}/></td>
                    <td style={{padding:"7px 6px"}} onClick={e=>e.stopPropagation()}><JSelect value={String(task.effort)} options={EFFORTS.map(String)} onChange={v=>upTask(task.id,{effort:parseInt(v)})} style={{fontSize:"11px",width:"58px"}}/></td>
                    <td style={{padding:"7px 6px"}} onClick={e=>e.stopPropagation()}><JSelect value={task.status} options={STATUSES} onChange={v=>upTask(task.id,{status:v})} style={{fontSize:"11px"}}/></td>
                    <td style={{padding:"7px 8px"}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                        {assignee&&<Avatar name={assignee.name} color={assignee.color} size={20} onClick={()=>setSelectedMember(assignee)}/>}
                        <select value={task.assigneeId||""} onChange={e=>upTask(task.id,{assigneeId:e.target.value||null})} style={{background:J.bgSurface,color:J.textPrimary,border:`1px solid ${J.border}`,borderRadius:J.r,padding:"3px 5px",fontSize:"11px",fontFamily:"inherit"}}>
                          <option value="">Unassigned</option>
                          {rankCandidates(task,members,tasks).map(c=><option key={c.member.id} value={c.member.id}>{c.member.name} ({c.prob}% · {c.completed} done)</option>)}
                        </select>
                      </div>
                    </td>
                    <td style={{padding:"7px 8px"}}><RiskLozenge risk={risk}/>{task.riskOverride&&<div style={{fontSize:"9px",color:J.textMuted}}>manual</div>}</td>
                    <td style={{padding:"7px 8px"}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:"flex",gap:"3px"}}>
                        <JBtn variant="ai" small onClick={()=>aiAssign(task)}>🤖</JBtn>
                        <JBtn small onClick={()=>aiRisk(task)} style={{background:"#FFEBE6",color:"#BF2600",border:"1px solid #FFBDAD"}}>⚠️</JBtn>
                        <JBtn variant="danger" small onClick={()=>delTask(task.id)}>🗑</JBtn>
                      </div>
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>}
        </div>;
      })}
    </div>
  );

  /* ── WEEKLY CHECK-IN ── */
  const WeeklyCheckinTab=()=>{
    const counts={OnTrack:0,Risk:0,Issue:0,Dependency:0};weeklyTasks.forEach(t=>{const s=checkFor(t.id).scenario;if(s==="On track")counts.OnTrack++;if(counts[s]!=null)counts[s]++;});
    return <div>
      <div style={{background:J.bgSurface,border:`1px solid ${J.border}`,borderRadius:J.rm,padding:"16px",marginBottom:"16px",display:"flex",gap:"14px",alignItems:"end",flexWrap:"wrap"}}>
        <div><div style={{fontSize:"11px",fontWeight:700,color:J.textSecondary,textTransform:"uppercase",marginBottom:"5px"}}>Week starting</div><input type="date" value={weekStart} onChange={e=>setWeekStart(e.target.value)} style={{border:`2px solid ${J.border}`,borderRadius:J.r,padding:"7px 9px",fontFamily:"inherit"}}/></div>
        <div><div style={{fontSize:"11px",fontWeight:700,color:J.textSecondary,textTransform:"uppercase",marginBottom:"5px"}}>Load weekly tasks</div><JBtn variant="primary" disabled={pdfBusy} onClick={()=>pdfRef.current?.click()}>{pdfBusy?"Reading PDF…":"Upload task PDF"}</JBtn><input ref={pdfRef} type="file" accept="application/pdf,.pdf" hidden onChange={e=>importWeeklyPdf(e.target.files?.[0])}/></div>
        <div style={{fontSize:"12px",color:pdfNotice.startsWith('Could not')?'#BF2600':J.textSecondary,flex:"1 1 280px"}}>{pdfNotice||'Upload a new PDF each week, or use existing sprint tasks.'}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(100px,1fr))",gap:"10px",marginBottom:"16px"}}>
        {[["Tasks",weeklyTasks.length,J.blue],["On track",counts.OnTrack,"#00875A"],["Risks",counts.Risk,"#FF8B00"],["Issues",counts.Issue,"#BF2600"],["Dependencies",counts.Dependency,"#6554C0"]].map(([l,v,c])=><div key={l} style={{background:J.bgSurface,border:`1px solid ${J.border}`,borderRadius:J.rm,padding:"12px"}}><div style={{fontSize:"22px",fontWeight:800,color:c}}>{v}</div><div style={{fontSize:"11px",color:J.textSecondary,textTransform:"uppercase",fontWeight:700}}>{l}</div></div>)}
      </div>
      <div style={{background:J.bgSurface,border:`1px solid ${J.border}`,borderRadius:J.rm,overflow:"auto",marginBottom:"18px"}}>
        <div style={{padding:"12px 16px",background:J.bgBase,borderBottom:`1px solid ${J.border}`,fontWeight:700}}>Team checkbox collection · {weeklySprint?.name||'No week selected'}</div>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:"1050px",fontSize:"12px"}}><thead><tr style={{background:"#FAFBFC",borderBottom:`1px solid ${J.border}`}}>{["Task","Owner","On track","Risk","Issue","Dependency","Likelihood","Impact","Comment / scenario","Action / support"].map(h=><th key={h} style={{padding:"8px",textAlign:"left",color:J.textSecondary,fontSize:"10px",textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
          <tbody>{weeklyTasks.map(t=>{const c=checkFor(t.id);return <tr key={t.id} style={{borderBottom:`1px solid ${J.border}`}}>
            <td style={{padding:"9px",fontWeight:600,color:J.textLink,minWidth:"190px"}}>{t.name}</td><td style={{padding:"9px"}}><select value={t.assigneeId||''} onChange={e=>upTask(t.id,{assigneeId:e.target.value||null})} style={{border:`1px solid ${J.border}`,padding:"5px",borderRadius:J.r}}><option value="">Unassigned</option>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></td>
            {["On track","Risk","Issue","Dependency"].map(s=><td key={s} style={{padding:"9px",textAlign:"center"}}><input type="checkbox" aria-label={`${s} for ${t.name}`} checked={c.scenario===s} onChange={()=>updateCheck(t.id,{scenario:c.scenario===s?'':s})} style={{width:18,height:18,cursor:'pointer'}}/></td>)}
            <td style={{padding:"9px"}}><select value={c.likelihood} onChange={e=>updateCheck(t.id,{likelihood:Number(e.target.value)})} disabled={!['Risk','Dependency'].includes(c.scenario)}>{[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select></td><td style={{padding:"9px"}}><select value={c.impact} onChange={e=>updateCheck(t.id,{impact:Number(e.target.value)})} disabled={!['Risk','Issue','Dependency'].includes(c.scenario)}>{[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select></td>
            <td style={{padding:"9px"}}><input value={c.comment} onChange={e=>updateCheck(t.id,{comment:e.target.value})} placeholder="What could happen?" style={{border:`1px solid ${J.border}`,borderRadius:J.r,padding:"6px",minWidth:"180px"}}/></td><td style={{padding:"9px"}}><input value={c.action} onChange={e=>updateCheck(t.id,{action:e.target.value})} placeholder="Help or next action" style={{border:`1px solid ${J.border}`,borderRadius:J.r,padding:"6px",minWidth:"180px"}}/></td>
          </tr>})}{!weeklyTasks.length&&<tr><td colSpan={10} style={{padding:"28px",textAlign:"center",color:J.textMuted}}>Upload this week’s task PDF or select a week that already has tasks.</td></tr>}</tbody></table>
      </div>
      <div style={{background:J.bgSurface,border:`1px solid ${J.border}`,borderRadius:J.rm,overflow:"auto"}}><div style={{padding:"12px 16px",background:J.bgBase,borderBottom:`1px solid ${J.border}`,fontWeight:700}}>Automatic RAID log · {raidEntries.length} flagged items</div><table style={{width:"100%",borderCollapse:"collapse",minWidth:"900px",fontSize:"12px"}}><thead><tr style={{background:"#FAFBFC",borderBottom:`1px solid ${J.border}`}}>{["Task","Type","Owner","Likelihood","Impact","Score","Rating","Scenario","Action"].map(h=><th key={h} style={{padding:"8px",textAlign:"left",color:J.textSecondary,fontSize:"10px",textTransform:"uppercase"}}>{h}</th>)}</tr></thead><tbody>{raidEntries.map(r=><tr key={r.id} style={{borderBottom:`1px solid ${J.border}`}}><td style={{padding:"9px",fontWeight:600,color:J.textLink}}>{r.name}</td><td style={{padding:"9px"}}>{r.scenario}</td><td style={{padding:"9px"}}>{r.owner}</td><td style={{padding:"9px"}}>{r.scenario==='Issue'?'—':r.likelihood}</td><td style={{padding:"9px"}}>{r.impact}</td><td style={{padding:"9px",fontWeight:700}}>{r.score}</td><td style={{padding:"9px"}}><RiskLozenge risk={r.rating}/></td><td style={{padding:"9px"}}>{r.comment||'—'}</td><td style={{padding:"9px"}}>{r.action||'—'}</td></tr>)}{!raidEntries.length&&<tr><td colSpan={9} style={{padding:"22px",textAlign:"center",color:J.textMuted}}>No risks, issues, or dependencies have been checked yet.</td></tr>}</tbody></table></div>
    </div>;
  };

  /* ── SKILLS ── */
  const SkillsTab=()=>(
    <div>
      <div style={{display:"flex",gap:"8px",marginBottom:"16px"}}>
        <JBtn variant="success" onClick={()=>setImportModal("skills")}>📊 Upload Skill Matrix</JBtn>
        <JBtn onClick={downloadTemplate}>⬇ Download Template</JBtn>
        <JBtn onClick={()=>setMembers(ms=>ms.map(m=>({...m,_xlsx:false,skills:INIT_MEMBERS.find(im=>im.id===m.id)?.skills||m.skills})))}>↺ Reset</JBtn>
      </div>
      <div style={{background:J.bgSurface,borderRadius:J.rm,border:`1px solid ${J.border}`,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr style={{background:"#F4F5F7",borderBottom:`1px solid ${J.border}`}}>
            <th style={{padding:"10px 16px",textAlign:"left",color:J.textSecondary,fontWeight:600,fontSize:"11px",textTransform:"uppercase"}}>Member</th>
            {TASK_TYPES.map(t=><th key={t} style={{padding:"10px",textAlign:"center",color:TYPE_COLORS[t]||J.blue,fontWeight:700,fontSize:"11px",textTransform:"uppercase"}}>{t}</th>)}
          </tr></thead>
          <tbody>
            {members.map((m,idx)=><tr key={m.id} style={{borderBottom:`1px solid ${J.border}`,background:idx%2===0?"#FAFBFC":J.bgSurface}}>
              <td style={{padding:"10px 16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px",cursor:"pointer"}} onClick={()=>setSelectedMember(m)}>
                  <Avatar name={m.name} color={m.color} size={32}/>
                  <div><div style={{fontWeight:600,color:J.textLink,fontSize:"13px"}}>{m.name}</div><div style={{color:J.textSecondary,fontSize:"11px"}}>{m.role}</div></div>
                  {m._xlsx&&<Lozenge label="xlsx" bg="#E3FCEF" color="#006644"/>}
                </div>
              </td>
              {TASK_TYPES.map(type=>{
                const score=m.skills[type]??50;const tier=score>=80?"Expert":score>=60?"Proficient":"Developing";const tc=score>=80?"#006644":score>=60?"#FF8B00":"#6B778C";
                return <td key={type} style={{padding:"8px",textAlign:"center"}}>
                  <input type="number" min="0" max="100" value={score} onChange={e=>upMember(m.id,{skills:{...m.skills,[type]:Math.min(100,Math.max(0,parseInt(e.target.value)||0))}})} style={{width:"46px",border:`1px solid ${J.border}`,borderRadius:J.r,padding:"3px 4px",textAlign:"center",fontSize:"12px",fontWeight:700,color:tc,background:J.bgSurface,fontFamily:"inherit"}}/>
                  <div style={{height:"3px",background:"#DFE1E6",borderRadius:"2px",width:"46px",margin:"3px auto 1px"}}><div style={{height:"100%",width:`${score}%`,background:tc,borderRadius:"2px",transition:"width .3s"}}/></div>
                  <div style={{fontSize:"9px",color:tc,fontWeight:700,textTransform:"uppercase"}}>{tier}</div>
                </td>;
              })}
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );

  /* ── TEAM ── */
  const TeamTab=()=>(
    <div>
      <div style={{marginBottom:"16px"}}><JBtn variant="primary" onClick={addMember}>+ Add team member</JBtn></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"14px"}}>
        {members.map(m=>{
          const myTasks=tasks.filter(t=>t.assigneeId===m.id);
          const risk=memberRiskScore(m,tasks);
          const statusCounts=STATUSES.reduce((a,s)=>({...a,[s]:myTasks.filter(t=>t.status===s).length}),{});
          return <div key={m.id} onClick={()=>setSelectedMember(m)} style={{background:J.bgSurface,borderRadius:J.rm,border:`1px solid ${J.border}`,boxShadow:J.sh1,overflow:"hidden",cursor:"pointer",transition:"box-shadow .15s"}}
            onMouseEnter={e=>e.currentTarget.style.boxShadow=J.sh2}
            onMouseLeave={e=>e.currentTarget.style.boxShadow=J.sh1}>
            <div style={{height:"4px",background:m.color}}/>
            <div style={{padding:"14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px"}}>
                <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
                  <Avatar name={m.name} color={m.color} size={40}/>
                  <div><div style={{fontWeight:700,color:J.textPrimary,fontSize:"14px"}}>{m.name}</div><div style={{color:J.textSecondary,fontSize:"12px"}}>{m.role}</div></div>
                </div>
                <RiskLozenge risk={risk.level}/>
              </div>
              {/* Workload bar */}
              <div style={{marginBottom:"10px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
                  <span style={{fontSize:"11px",color:J.textSecondary,fontWeight:600,textTransform:"uppercase"}}>Workload</span>
                  <span style={{fontSize:"12px",fontWeight:700,color:m.workload>80?"#BF2600":m.workload>65?"#FF8B00":"#006644"}}>{m.workload}%{m.workload>80&&" ⚠"}</span>
                </div>
                <div style={{height:"6px",background:"#DFE1E6",borderRadius:"3px"}}>
                  <div style={{height:"100%",width:`${m.workload}%`,background:m.workload>80?"#BF2600":m.workload>65?"#FF8B00":"#00875A",borderRadius:"3px",transition:"width .3s"}}/>
                </div>
              </div>
              {/* Work tracker */}
              <div style={{marginBottom:"8px"}}>
                <div style={{fontSize:"11px",color:J.textSecondary,marginBottom:"4px"}}>{myTasks.length} tasks</div>
                <WorkBar done={statusCounts["Done"]} inprog={statusCounts["In Progress"]} review={statusCounts["Review"]} todo={statusCounts["Todo"]} blocked={statusCounts["Blocked"]} total={myTasks.length}/>
                <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginTop:"4px"}}>
                  {[["✓",statusCounts["Done"],"#006644"],["▶",statusCounts["In Progress"],"#0052CC"],["◉",statusCounts["Review"],"#6554C0"],["○",statusCounts["Todo"],"#97A0AF"],["✗",statusCounts["Blocked"],"#BF2600"]].map(([sym,v,c])=>v>0&&<span key={sym} style={{fontSize:"10px",color:c,fontWeight:600}}>{sym} {v}</span>)}
                </div>
              </div>
              <div style={{fontSize:"11px",color:J.textMuted,borderTop:`1px solid ${J.border}`,paddingTop:"8px"}}>Click to view profile & edit →</div>
            </div>
          </div>;
        })}
      </div>
    </div>
  );

  /* ── RISK REGISTER ── */
  const RiskTab=()=>{
    const dist=RISK_LEVELS.reduce((a,r)=>({...a,[r]:tasks.filter(t=>calcRisk(t,members)===r).length}),{});
    // Member risk scores
    const memberRisks=members.map(m=>({member:m,...memberRiskScore(m,tasks)})).sort((a,b)=>b.score-a.score);
    return <div>
      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px",marginBottom:"20px"}}>
        {RISK_LEVELS.map(r=>{const rc=RISK_T[r];return <div key={r} style={{background:J.bgSurface,borderRadius:J.rm,border:`1px solid ${J.border}`,padding:"14px",textAlign:"center",borderTop:`3px solid ${rc.dot}`,boxShadow:J.sh1}}>
          <div style={{fontSize:"28px",fontWeight:800,color:rc.dot,marginBottom:"4px"}}>{dist[r]}</div>
          <Lozenge label={r} bg={rc.bg} color={rc.text} bold/>
        </div>;})}
      </div>

      <RaidHeatmap tasks={tasks} members={members}/>

      {/* Member Risk Table */}
      <div style={{background:J.bgSurface,borderRadius:J.rm,border:`1px solid ${J.border}`,marginBottom:"20px",overflow:"hidden"}}>
        <div style={{padding:"12px 16px",background:"#F4F5F7",borderBottom:`1px solid ${J.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:700,color:J.textPrimary,fontSize:"13px"}}>⚑ Team Member Risk Analysis</span>
          <span style={{fontSize:"11px",color:J.textSecondary}}>Click member to view profile</span>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr style={{background:"#FAFBFC",borderBottom:`1px solid ${J.border}`}}>
            {["Member","Role","Workload","Tasks","Done","Doing","Blocked","Avg Fit","Risk Score","Level"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",color:J.textSecondary,fontWeight:600,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {memberRisks.map(({member:m,score,level,avgProb,taskCount})=>{
              const myTasks=tasks.filter(t=>t.assigneeId===m.id);
              const done=myTasks.filter(t=>t.status==="Done").length;
              const doing=myTasks.filter(t=>t.status==="In Progress").length;
              const blocked=myTasks.filter(t=>t.status==="Blocked").length;
              const rt=RISK_T[level];
              return <tr key={m.id} style={{borderBottom:`1px solid ${J.border}`,cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.background="#F4F5F7"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                onClick={()=>setSelectedMember(m)}>
                <td style={{padding:"10px 10px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <Avatar name={m.name} color={m.color} size={26}/>
                    <span style={{fontWeight:600,color:J.textLink}}>{m.name}</span>
                  </div>
                </td>
                <td style={{padding:"10px",color:J.textSecondary}}>{m.role}</td>
                <td style={{padding:"10px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                    <div style={{width:"60px",height:"6px",background:"#DFE1E6",borderRadius:"3px"}}>
                      <div style={{height:"100%",width:`${m.workload}%`,background:m.workload>80?"#BF2600":m.workload>65?"#FF8B00":"#00875A",borderRadius:"3px"}}/>
                    </div>
                    <span style={{fontSize:"11px",fontWeight:700,color:m.workload>80?"#BF2600":m.workload>65?"#FF8B00":"#006644"}}>{m.workload}%</span>
                  </div>
                </td>
                <td style={{padding:"10px",fontWeight:600,color:J.textPrimary}}>{taskCount}</td>
                <td style={{padding:"10px",color:"#006644",fontWeight:600}}>{done}</td>
                <td style={{padding:"10px",color:"#0052CC",fontWeight:600}}>{doing}</td>
                <td style={{padding:"10px",color:blocked>0?"#BF2600":"#97A0AF",fontWeight:600}}>{blocked}</td>
                <td style={{padding:"10px"}}>
                  <span style={{fontSize:"12px",fontWeight:700,color:avgProb>=70?"#006644":avgProb>=50?"#FF8B00":"#BF2600"}}>{avgProb||0}%</span>
                </td>
                <td style={{padding:"10px"}}>
                  <div style={{width:"80px",height:"6px",background:"#DFE1E6",borderRadius:"3px",marginBottom:"2px"}}>
                    <div style={{height:"100%",width:`${score}%`,background:rt.dot,borderRadius:"3px"}}/>
                  </div>
                  <span style={{fontSize:"11px",color:rt.dot,fontWeight:700}}>{score}/100</span>
                </td>
                <td style={{padding:"10px"}}><RiskLozenge risk={level}/></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>

      {/* Issue Risk Register */}
      <div style={{background:J.bgSurface,borderRadius:J.rm,border:`1px solid ${J.border}`,overflow:"auto"}}>
        <div style={{padding:"12px 16px",background:"#F4F5F7",borderBottom:`1px solid ${J.border}`}}>
          <span style={{fontWeight:700,color:J.textPrimary,fontSize:"13px"}}>Issue Risk Register</span>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr style={{background:"#FAFBFC",borderBottom:`1px solid ${J.border}`}}>
            {["","Issue","Sprint","Type","Assignee","Workload","Success Prob","Risk","Actions"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",color:J.textSecondary,fontWeight:600,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.04em"}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {[...tasks].sort((a,b)=>({Critical:0,High:1,Medium:2,Low:3}[calcRisk(a,members)]-({Critical:0,High:1,Medium:2,Low:3}[calcRisk(b,members)]))).map(task=>{
              const risk=calcRisk(task,members);const assignee=members.find(m=>m.id===task.assigneeId);
              const prob=assignee?calcProb(assignee,task):null;const sprint=sprints.find(s=>s.id===task.sprint);
              return <tr key={task.id} style={{borderBottom:`1px solid ${J.border}`,cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.background="#F4F5F7"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                onClick={()=>setSelectedTask(task)}>
                <td style={{padding:"8px 10px"}}><PriorityIcon priority={task.priority}/></td>
                <td style={{padding:"8px 10px"}}><span style={{fontWeight:600,color:J.textLink}}>{task.name}</span></td>
                <td style={{padding:"8px 10px",color:J.textSecondary,fontSize:"11px"}}>{sprint?.name?.split("—")[0]?.trim()||"—"}</td>
                <td style={{padding:"8px 10px"}}><Lozenge label={task.type} bg="#EBECF0" color={TYPE_COLORS[task.type]||J.blue}/></td>
                <td style={{padding:"8px 10px"}}>
                  {assignee?<div style={{display:"flex",alignItems:"center",gap:"6px",cursor:"pointer"}} onClick={e=>{e.stopPropagation();setSelectedMember(assignee);}}>
                    <Avatar name={assignee.name} color={assignee.color} size={22}/>
                    <span style={{fontSize:"12px",color:J.textLink,fontWeight:500}}>{assignee.name}</span>
                  </div>:<Lozenge label="Unassigned" bg="#FFEBE6" color="#BF2600"/>}
                </td>
                <td style={{padding:"8px 10px"}}>{assignee?<span style={{fontWeight:600,color:assignee.workload>80?"#BF2600":J.textPrimary}}>{assignee.workload}%</span>:"—"}</td>
                <td style={{padding:"8px 10px"}}>{prob!=null?<span style={{fontWeight:700,color:prob>=70?"#006644":prob>=50?"#FF8B00":"#BF2600"}}>{prob}%</span>:<span style={{color:J.textMuted}}>—</span>}</td>
                <td style={{padding:"8px 10px"}}><RiskLozenge risk={risk}/>{task.riskOverride&&<div style={{fontSize:"9px",color:J.textMuted}}>manual</div>}</td>
                <td style={{padding:"8px 10px"}} onClick={e=>e.stopPropagation()}>
                  <div style={{display:"flex",gap:"4px"}}>
                    <JBtn variant="ai" small onClick={()=>aiRisk(task)}>🤖 Explain</JBtn>
                    {task.riskOverride&&<JBtn small onClick={()=>upTask(task.id,{riskOverride:null})}>↺</JBtn>}
                  </div>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>;
  };

  /* ── IMPORT MODALS ── */
  const TaskImportModal=()=>(
    <Modal title="Import issues from Excel / CSV" onClose={()=>{setImportModal(null);setImportFile(null);}}>
      <p style={{fontSize:"13px",color:J.textSecondary,margin:"0 0 16px"}}>Supported columns: <b>Task Name, Type, Complexity, Priority, Effort, Status, Assignee</b>. Matched automatically.</p>
      <div style={{marginBottom:"14px"}}>
        <div style={{fontSize:"11px",fontWeight:600,color:J.textSecondary,marginBottom:"5px",textTransform:"uppercase"}}>Target Sprint</div>
        <select value={importSpId||sprints[0]?.id||""} onChange={e=>setImportSpId(e.target.value)} style={{width:"100%",border:`2px solid ${J.border}`,borderRadius:J.r,padding:"7px 10px",fontSize:"13px",color:J.textPrimary,fontFamily:"inherit",background:J.bgSurface}}>
          {sprints.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div style={{marginBottom:"16px"}}>
        <div style={{fontSize:"11px",fontWeight:600,color:J.textSecondary,marginBottom:"5px",textTransform:"uppercase"}}>File</div>
        <div onClick={()=>importRef.current?.click()} style={{border:`2px dashed ${importFile?J.blue:J.border}`,borderRadius:J.r,padding:"28px",textAlign:"center",cursor:"pointer",background:importFile?"#DEEBFF":"#FAFBFC"}}>
          {importFile?<span style={{color:J.blue,fontWeight:600}}>✅ {importFile.name}</span>:<span style={{color:J.textSecondary}}>Click or drop .xlsx, .xls, .csv</span>}
        </div>
        <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>setImportFile(e.target.files[0])}/>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:"8px"}}>
        <JBtn onClick={()=>{setImportModal(null);setImportFile(null);}}>Cancel</JBtn>
        <JBtn variant="primary" disabled={!importFile} onClick={()=>handleTaskImport(importFile,importSpId||sprints[0]?.id)}>Import issues</JBtn>
      </div>
    </Modal>
  );

  const SkillImportModal=()=>(
    <Modal title="Upload skill matrix" onClose={()=>{setImportModal(null);setSkillFile(null);}}>
      <p style={{fontSize:"13px",color:J.textSecondary,margin:"0 0 16px"}}>Member names in column 1, skill scores (0–100) in subsequent columns. Download pre-filled template.</p>
      <div style={{marginBottom:"16px"}}><JBtn variant="success" onClick={downloadTemplate}>⬇ Download Template</JBtn></div>
      <div style={{marginBottom:"16px"}}>
        <div onClick={()=>skillRef.current?.click()} style={{border:`2px dashed ${skillFile?J.blue:J.border}`,borderRadius:J.r,padding:"28px",textAlign:"center",cursor:"pointer",background:skillFile?"#DEEBFF":"#FAFBFC"}}>
          {skillFile?<span style={{color:J.blue,fontWeight:600}}>✅ {skillFile.name}</span>:<span style={{color:J.textSecondary}}>Click or drop .xlsx, .xls, .csv</span>}
        </div>
        <input ref={skillRef} type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>setSkillFile(e.target.files[0])}/>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:"8px"}}>
        <JBtn onClick={()=>{setImportModal(null);setSkillFile(null);}}>Cancel</JBtn>
        <JBtn variant="primary" disabled={!skillFile} onClick={()=>handleSkillImport(skillFile)}>Apply Matrix</JBtn>
      </div>
    </Modal>
  );

  /* ── STATS BAR ── */
  const done=tasks.filter(t=>t.status==="Done").length;
  const blocked=tasks.filter(t=>t.status==="Blocked").length;
  const critical=tasks.filter(t=>calcRisk(t,members)==="Critical").length;

  if(!session&&publicView==="landing")return <LandingPage onSignIn={()=>setPublicView("signin")} onStart={()=>setPublicView("signup")}/>;
  if(!session)return <AccessScreen mode={publicView} onLogin={async value=>{const result=publicView==="signup"?await signUp(value.email,value.password):await signIn(value.email,value.password);if(result.error)throw result.error;if(supabaseConfigured&&!result.data.session)throw new Error("Check your email to confirm the account, then return to sign in.");const next={email:value.email,userId:result.data.user?.id||"local-user",local:result.local};localStorage.setItem("wiq-session",JSON.stringify(next));setSession(next);}}/>;
  if(!workspace)return <Onboarding onDone={value=>{const next={...value,email:session.email};localStorage.setItem("wiq-workspace",JSON.stringify(next));setWorkspace(next);}}/>;
  if(["Team member","Contractor","Client","Executive viewer"].includes(workspace.role))return <ParticipantPortal workspace={workspace} tasks={tasks} members={members} checks={weeklyChecks} onTaskUpdate={upTask} onSignOut={async()=>{await supabaseSignOut();localStorage.removeItem("wiq-session");setSession(null);setPublicView("landing");}}/>;

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  return(
    <div style={{display:"flex",minHeight:"100vh",background:J.bgBase,fontFamily:"Inter, system-ui, sans-serif",fontSize:"13px",position:"relative"}}>

      {/* ── SIDEBAR ── */}
      <aside className="wiq-sidebar" style={{width:"235px",background:J.bgSidebar,backdropFilter:"blur(24px)",borderRight:`1px solid ${J.border}`,display:"flex",flexDirection:"column",flexShrink:0,minHeight:"100vh",position:"sticky",top:0,height:"100vh",overflow:"auto"}}>
        <div style={{padding:"18px 14px 14px",borderBottom:`1px solid ${J.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <div style={{width:"40px",height:"34px",background:"transparent",borderRadius:J.r,display:"flex",alignItems:"center",justifyContent:"center"}}><img src="/workforce-logo.svg" alt="WorkForce IQ" width="36" height="28"/></div>
            <div><div style={{color:J.textPrimary,fontWeight:700,fontSize:"13px"}}>WorkForce IQ</div><div style={{color:J.textMuted,fontSize:"10px"}}>Software project</div></div>
          </div>
        </div>
        <nav style={{padding:"10px 8px",flex:1}}>
          <div style={{fontSize:"10px",color:J.textMuted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",padding:"8px 8px 4px"}}>Planning</div>
          {NAV.map(item=>(
            <button key={item.id} onClick={()=>setTab(item.id)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:"9px",padding:"9px 10px",borderRadius:J.r,border:"none",cursor:"pointer",textAlign:"left",background:tab===item.id?J.blueLight:"transparent",color:tab===item.id?J.blue:J.textSecondary,fontSize:"13px",fontWeight:tab===item.id?600:400,marginBottom:"2px",fontFamily:"inherit"}}
              onMouseEnter={e=>{if(tab!==item.id)e.currentTarget.style.background="#F2F6FB";}}
              onMouseLeave={e=>{if(tab!==item.id)e.currentTarget.style.background="transparent";}}>
              <span style={{fontSize:"14px",width:"16px",textAlign:"center"}}>{item.icon}</span>{item.label}
            </button>
          ))}
          <div style={{fontSize:"10px",color:J.textMuted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",padding:"14px 8px 4px"}}>Team</div>
          {members.map(m=>{
            const risk=memberRiskScore(m,tasks);const myTasks=tasks.filter(t=>t.assigneeId===m.id);
            return <button key={m.id} onClick={()=>setSelectedMember(m)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:"7px",padding:"5px 10px",borderRadius:J.r,border:"none",cursor:"pointer",background:"transparent",textAlign:"left",fontFamily:"inherit",marginBottom:"1px"}}
              onMouseEnter={e=>e.currentTarget.style.background="#F2F6FB"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{position:"relative"}}>
                <Avatar name={m.name} color={m.color} size={24}/>
                {risk.level==="Critical"&&<div style={{position:"absolute",top:-2,right:-2,width:8,height:8,borderRadius:"50%",background:"#DE350B",border:"1px solid #0052CC"}}/>}
                {risk.level==="High"&&<div style={{position:"absolute",top:-2,right:-2,width:8,height:8,borderRadius:"50%",background:"#FF8B00",border:"1px solid #0052CC"}}/>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"11px",color:J.textPrimary,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name.split(" ")[0]}</div>
                <div style={{fontSize:"10px",color:m.workload>80?"#BF2600":J.textMuted}}>{m.workload}% · {myTasks.length}t</div>
              </div>
            </button>;
          })}
        </nav>
        <div style={{padding:"10px 14px",borderTop:`1px solid ${J.border}`}}>
          <div style={{fontSize:"10px",color:J.textMuted,textAlign:"center"}}>WorkForce IQ · Decision Support</div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
        {/* Topbar */}
        <header style={{background:J.bgSurface,borderBottom:`1px solid ${J.border}`,padding:"0 24px",height:"52px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,position:"sticky",top:0,zIndex:100}}>
          <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
            {["Projects","WorkForce IQ",NAV.find(n=>n.id===tab)?.label].map((crumb,i,arr)=>(
              <span key={i} style={{display:"flex",alignItems:"center",gap:"5px"}}>
                <span style={{fontSize:"12px",color:i===arr.length-1?J.textPrimary:J.textSecondary,fontWeight:i===arr.length-1?500:400}}>{crumb}</span>
                {i<arr.length-1&&<span style={{color:J.textMuted}}>/</span>}
              </span>
            ))}
          </div>
          <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
            <button aria-label="Toggle light and dark mode" onClick={()=>setTheme(t=>t==="light"?"dark":"light")} style={{width:34,height:34,borderRadius:"50%",border:`1px solid ${J.border}`,background:J.bgSurface,color:J.textPrimary,cursor:"pointer",fontSize:"16px"}}>{theme==="light"?"💡":"☾"}</button>
            <button onClick={async()=>{await supabaseSignOut();localStorage.removeItem("wiq-session");setSession(null);setPublicView("landing");}} style={{border:`1px solid ${J.border}`,background:J.bgSurface,color:J.textSecondary,borderRadius:J.r,padding:"6px 9px",cursor:"pointer",fontSize:"10px"}}>Sign out</button>
            <button onClick={saveBackup}>Backup workspace</button><button onClick={()=>restoreRef.current.click()}>Restore backup</button><input ref={restoreRef} type="file" hidden accept=".json" onChange={e=>restoreBackup(e.target.files[0])}/>{[["Total",tasks.length,J.textPrimary],["Done",done,"#006644"],["Blocked",blocked,"#BF2600"],["Critical",critical,"#DE350B"]].map(([l,v,c])=>(
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontSize:"15px",fontWeight:700,color:c}}>{v}</div>
                <div style={{fontSize:"10px",color:J.textMuted,textTransform:"uppercase",letterSpacing:"0.04em"}}>{l}</div>
              </div>
            ))}
          </div>
        </header>

        {/* Content */}
        <div style={{flex:1,padding:"22px 24px",overflowY:"auto"}}>
          <div style={{marginBottom:"18px"}}>
            <h2 style={{margin:"0 0 2px",fontSize:"20px",fontWeight:700,color:J.textPrimary}}>{NAV.find(n=>n.id===tab)?.label}</h2>
            <p style={{margin:0,fontSize:"12px",color:J.textSecondary}}>{{overview:"Match work with skills, capacity and accepted experience",board:"Manage sprint delivery around team-member swimlanes",backlog:"Create and manage issues, assign to sprints, import from Excel/CSV",checkin:"Collect task-linked updates and draft RAID signals",skills:"Click a member name to open their full profile",team:"Click any card to open member profile and edit all details",risk:"Review risks, controls, KRIs, treatments and RAID signals",decisions:"Collect scores, apply transparent calculations and record approvals"}[tab]}</p>
          </div>
          {tab==="overview"&&<Overview members={members} tasks={tasks} sprints={sprints} onTask={setSelectedTask} onBoard={()=>setTab("board")} onAnalytics={()=>setTab("analytics")}/>}
          {tab==="board"   &&<BoardTab/>}
          {tab==="backlog" &&<BacklogTab/>}
          {tab==="checkin" &&<WeeklyCheckinTab/>}
          {tab==="skills" &&<SkillsWorkspace members={members} tasks={tasks} onOpen={setSelectedMember} onImport={()=>setImportModal("skills")} onTemplate={downloadTemplate}/>}
          {tab==="analytics"&&<EvaluationPage key={workspaceRevision} members={members} tasks={tasks} sprints={sprints} decisions={decisions} onLoadSynthetic={loadSynthetic}/>}
          {tab==="team"    &&<TeamTab/>}
          {tab==="risk"    &&<RiskCenter tasks={tasks} members={members} calcRisk={calcRisk}/>}
          {tab==="decisions"&&<DecisionRoom/>}
        </div>
      </main>

      {/* ══════════════════════════════════════════
          MINIMIZABLE AI BOT (floating)
      ══════════════════════════════════════════ */}
      <div style={{position:"fixed",bottom:"20px",right:"20px",zIndex:500,width:botMin?"auto":"360px",transition:"width .2s"}}>
        {botMin
          ?<button onClick={()=>setBotMin(false)} style={{background:"#403294",color:"#fff",border:"none",borderRadius:"999px",padding:"10px 18px",cursor:"pointer",boxShadow:J.sh3,fontSize:"13px",fontWeight:600,display:"flex",alignItems:"center",gap:"7px"}}>
            <span>🤖</span> AI Assistant {banner.loading&&<span style={{opacity:.6}}>…</span>}
          </button>
          :<div style={{background:J.bgSurface,border:`1px solid #C0B6F2`,borderRadius:"8px",boxShadow:J.sh3,overflow:"hidden"}}>
            {/* Bot header */}
            <div style={{background:"#403294",padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <span style={{fontSize:"16px"}}>🤖</span>
                <span style={{color:"#fff",fontWeight:600,fontSize:"13px"}}>AI Assistant</span>
              </div>
              <div style={{display:"flex",gap:"4px"}}>
                <button onClick={refreshBanner} style={{background:"rgba(255,255,255,.15)",border:"none",color:"rgba(255,255,255,.8)",borderRadius:J.r,padding:"3px 8px",cursor:"pointer",fontSize:"11px"}}>{banner.loading?"⏳":"↺"}</button>
                <button onClick={()=>setBotMin(true)} style={{background:"rgba(255,255,255,.15)",border:"none",color:"rgba(255,255,255,.8)",borderRadius:J.r,padding:"3px 8px",cursor:"pointer",fontSize:"11px"}}>−</button>
              </div>
            </div>
            {/* Bot body */}
            <div style={{padding:"12px 14px",background:"#EAE6FF",minHeight:"60px"}}>
              {banner.loading
                ?<div style={{display:"flex",alignItems:"center",gap:"8px",color:"#403294",fontSize:"12px"}}>
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                  <div style={{width:"12px",height:"12px",borderRadius:"50%",border:"2px solid #403294",borderTopColor:"transparent",animation:"spin .8s linear infinite"}}/>
                  Analysing your team…
                </div>
                :<div style={{fontSize:"12px",color:"#172B4D",lineHeight:"1.7"}}>{banner.text}</div>
              }
            </div>
            {/* Quick AI actions */}
            <div style={{padding:"10px 14px",borderTop:`1px solid ${J.border}`,display:"flex",gap:"6px",flexWrap:"wrap",background:J.bgSurface}}>
              <JBtn variant="ai" small onClick={()=>{const h=tasks.filter(t=>["High","Critical"].includes(calcRisk(t,members)));setAiModal({title:"🤖 High-Risk Tasks",prompt:`These tasks are high/critical risk: ${h.map(t=>`${t.name}(${t.type},${calcRisk(t,members)},${t.assigneeId?members.find(m=>m.id===t.assigneeId)?.name:"unassigned"})`).join("; ")}. Give a prioritised action plan for the PM.`,extra:null});}}>🔥 Risk Plan</JBtn>
              <JBtn variant="ai" small onClick={()=>{const burn=members.filter(m=>m.workload>75);setAiModal({title:"🤖 Burnout Analysis",prompt:`High workload members: ${burn.map(m=>`${m.name}(${m.workload}%, ${tasks.filter(t=>t.assigneeId===m.id).length} tasks)`).join("; ")||"none"}. Suggest how to rebalance workload across the team.`,extra:null});}}>😓 Burnout</JBtn>
              <JBtn variant="ai" small onClick={()=>{const unass=tasks.filter(t=>!t.assigneeId);setAiModal({title:"🤖 Unassigned Tasks",prompt:`${unass.length} unassigned tasks: ${unass.map(t=>`${t.name}(${t.type},${t.priority})`).join("; ")||"none"}. Team: ${members.map(m=>`${m.name}(${m.workload}%)`).join(", ")}. Who should take each task?`,extra:null});}}>📋 Unassigned</JBtn>
            </div>
          </div>
        }
      </div>

      {/* ── MODALS & DRAWERS ── */}
      {aiModal&&<AIModal title={aiModal.title} prompt={aiModal.prompt} extra={aiModal.extra} onClose={()=>setAiModal(null)}/>}
      {importModal==="tasks"&&<TaskImportModal/>}
      {importModal==="skills"&&<SkillImportModal/>}

      {selectedTask&&(()=>{const t=tasks.find(tt=>tt.id===selectedTask.id)||selectedTask;return <TaskDrawer task={t} members={members} sprints={sprints} tasks={tasks} onUpdate={upTask} onClose={()=>setSelectedTask(null)}/>;})()}
      {selectedMember&&(()=>{const m=members.find(mm=>mm.id===selectedMember.id)||selectedMember;return <MemberDrawer member={m} tasks={tasks} sprints={sprints} onUpdate={upMember} onClose={()=>setSelectedMember(null)}/>;})()}
    </div>
  );
}
