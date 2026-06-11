import { useState } from "react";

const S = {
  navy:"#1E1B4B", indigo:"#4F46E5", indigoDark:"#4338CA",
  indigoLight:"#EEF2FF", indigoMid:"#C7D2FE",
  white:"#FFFFFF", grey50:"#F8F9FB", grey100:"#F3F4F6",
  grey200:"#E5E7EB", grey400:"#9CA3AF", grey600:"#6B7280", grey900:"#111827",
};

function Nav({onSignIn,onGetStarted}){
  const [hSign,sHSign]=useState(false);
  return(
    <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,
      background:"rgba(255,255,255,0.92)",backdropFilter:"blur(12px)",
      borderBottom:`1px solid ${S.grey200}`,padding:"0 5%",height:"60px",
      display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
        <div style={{width:"32px",height:"32px",background:S.navy,borderRadius:"8px",
          display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{color:"#fff",fontWeight:700,fontSize:"16px"}}>W</span>
        </div>
        <span style={{fontSize:"15px",fontWeight:600,color:S.grey900}}>WorkForce IQ</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
        <button onClick={onSignIn}
          onMouseEnter={()=>sHSign(true)} onMouseLeave={()=>sHSign(false)}
          style={{color:hSign?S.grey900:S.grey600,fontSize:"13px",fontWeight:500,
            background:hSign?S.grey100:"transparent",border:`1px solid ${S.grey200}`,
            borderRadius:"8px",padding:"7px 14px",cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
          Sign in
        </button>
        <button onClick={onGetStarted}
          style={{background:S.indigo,color:"#fff",border:"none",borderRadius:"8px",
            padding:"8px 18px",fontSize:"13px",fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>
          Join the beta
        </button>
      </div>
    </nav>
  );
}

function Hero({onGetStarted,onSignIn}){
  return(
    <section style={{minHeight:"100vh",background:`linear-gradient(160deg,${S.navy} 0%,#312E81 50%,#1E1B4B 100%)`,
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      textAlign:"center",padding:"100px 5% 80px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 60% at 50% 0%,rgba(79,70,229,0.4) 0%,transparent 70%)",pointerEvents:"none"}}/>
      {/* Badge */}
      <div style={{display:"inline-flex",alignItems:"center",gap:"6px",
        background:"rgba(79,70,229,0.25)",border:"1px solid rgba(165,180,252,0.3)",
        color:"#A5B4FC",borderRadius:"999px",padding:"5px 14px",
        fontSize:"12px",fontWeight:500,marginBottom:"28px",letterSpacing:"0.04em",textTransform:"uppercase"}}>
        <div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#818CF8",
          animation:"pulse 2s infinite"}}/>
        Beta — now open
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      <h1 style={{fontSize:"clamp(36px,6vw,72px)",fontWeight:700,color:"#fff",lineHeight:1.1,
        maxWidth:"800px",margin:"0 auto 24px",letterSpacing:"-0.02em",fontFamily:"inherit"}}>
        Stop assigning tasks<br/>by{" "}
        <em style={{fontStyle:"normal",color:"#818CF8"}}>gut feel</em>
      </h1>
      <p style={{fontSize:"clamp(16px,2vw,20px)",color:"rgba(255,255,255,0.65)",
        maxWidth:"560px",margin:"0 auto 48px",lineHeight:1.7}}>
        WorkForce IQ ranks every team member against every task — using skill, workload, and completion history — and tells you exactly who should do it and why.
      </p>
      <button onClick={onGetStarted}
        style={{background:S.indigo,color:"#fff",border:"none",borderRadius:"10px",
          padding:"14px 32px",fontSize:"15px",fontWeight:600,cursor:"pointer",
          fontFamily:"inherit",marginBottom:"12px"}}>
        Try WorkForce IQ free →
      </button>
      <p style={{fontSize:"12px",color:"rgba(255,255,255,0.35)",marginBottom:"8px"}}>No credit card. Free beta access.</p>
      <p style={{fontSize:"13px",color:"rgba(255,255,255,0.5)"}}>
        Already have an account?{" "}
        <button onClick={onSignIn} style={{background:"none",border:"none",color:"#818CF8",
          cursor:"pointer",fontWeight:500,fontSize:"13px",fontFamily:"inherit"}}>
          Sign in →
        </button>
      </p>

      {/* Preview card */}
      <div style={{marginTop:"64px",width:"100%",maxWidth:"680px",
        background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",
        borderRadius:"16px",overflow:"hidden",textAlign:"left"}}>
        <div style={{background:"rgba(255,255,255,0.05)",padding:"10px 16px",
          borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",gap:"6px"}}>
          {["#EF4444","#F59E0B","#10B981"].map(c=>(
            <div key={c} style={{width:"10px",height:"10px",borderRadius:"50%",background:c}}/>
          ))}
          <span style={{fontSize:"12px",color:"rgba(255,255,255,0.4)",marginLeft:"6px"}}>
            WorkForce IQ — Task: Auth System (Backend · High · 8pts)
          </span>
        </div>
        <div style={{padding:"16px"}}>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"10px"}}>
            Ranked candidates — who should do this?
          </div>
          {[
            {ini:"BM",col:"#059669",name:"Bob Martinez",best:true,reason:"3 Backend tasks completed · Expert skill · 58% load · Low risk",pct:"87%",pctCol:"#10B981",risk:"Low",riskBg:"#F0FDF4",riskT:"#166534"},
            {ini:"CS",col:"#4F46E5",name:"Carol Smith",best:false,reason:"1 Backend task completed · Advanced skill · 85% load",pct:"54%",pctCol:"#F59E0B",risk:"Medium",riskBg:"#FFFBEB",riskT:"#92400E"},
            {ini:"AC",col:"#6554C0",name:"Alice Chen",best:false,reason:"No Backend completions · Basic skill · 72% load",pct:"28%",pctCol:"#EF4444",risk:"High",riskBg:"#FEF2F2",riskT:"#991B1B"},
          ].map((c,i)=>(
            <div key={c.ini} style={{display:"flex",alignItems:"center",gap:"12px",
              background:i===0?"rgba(79,70,229,0.2)":"rgba(255,255,255,0.05)",
              borderRadius:"10px",padding:"12px 14px",marginBottom:"8px",
              border:`1px solid ${i===0?"rgba(129,140,248,0.3)":"rgba(255,255,255,0.08)"}`}}>
              <div style={{width:"32px",height:"32px",borderRadius:"50%",background:c.col,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:"12px",fontWeight:700,color:"#fff",flexShrink:0}}>{c.ini}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:"13px",fontWeight:600,color:"#fff",marginBottom:"2px"}}>
                  {c.name}
                  {c.best&&<span style={{fontSize:"10px",fontWeight:600,background:S.indigo,color:"#fff",
                    padding:"2px 8px",borderRadius:"999px",marginLeft:"6px"}}>Best fit</span>}
                </div>
                <div style={{fontSize:"11px",color:"rgba(255,255,255,0.5)"}}>{c.reason}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:"18px",fontWeight:700,color:c.pctCol}}>{c.pct}</div>
                <div style={{fontSize:"10px",fontWeight:600,padding:"2px 8px",borderRadius:"999px",
                  background:c.riskBg,color:c.riskT,display:"inline-block",marginTop:"2px"}}>{c.risk}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Problem(){
  const cards=[
    {icon:"🎯",title:"Skill mismatches",desc:"Tasks get assigned to whoever's available, not whoever's capable. Rework and delays follow."},
    {icon:"🔥",title:"Invisible burnout",desc:"Workload imbalances build silently until someone breaks. No tool surfaces this before it's too late."},
    {icon:"🚧",title:"Blocked sprints",desc:"The wrong person on a complex task is the leading cause of mid-sprint blockage. It's preventable."},
    {icon:"🔄",title:"Repeated mistakes",desc:"Without data, the same bad allocation decisions happen sprint after sprint. Nothing improves."},
  ];
  return(
    <section style={{padding:"96px 5%",background:S.grey50}}>
      <div style={{maxWidth:"1100px",margin:"0 auto"}}>
        <div style={{fontSize:"12px",fontWeight:600,color:S.indigo,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"12px"}}>The problem</div>
        <h2 style={{fontSize:"clamp(28px,4vw,44px)",fontWeight:700,color:S.grey900,lineHeight:1.15,letterSpacing:"-0.02em",marginBottom:"16px",maxWidth:"600px"}}>
          Every PM tool gives you a dropdown. None tell you who to pick.
        </h2>
        <p style={{fontSize:"17px",color:S.grey600,maxWidth:"520px",lineHeight:1.7,marginBottom:"48px"}}>
          Jira, Linear, Monday — they track work. They don't tell you if the right person is doing it.
        </p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:"20px"}}>
          {cards.map(c=>(
            <div key={c.title} style={{background:S.white,border:`1px solid ${S.grey200}`,borderRadius:"12px",padding:"24px"}}>
              <div style={{fontSize:"28px",marginBottom:"12px"}}>{c.icon}</div>
              <h3 style={{fontSize:"15px",fontWeight:600,color:S.grey900,marginBottom:"8px"}}>{c.title}</h3>
              <p style={{fontSize:"13px",color:S.grey600,lineHeight:1.6}}>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks(){
  const steps=[
    {n:"1",title:"Upload your team",desc:"Import your skill matrix from Excel or build it manually. Rate each member 1–5 per skill type."},
    {n:"2",title:"Add your tasks",desc:"Create tasks with type, complexity, priority, and effort. Import from CSV or build in the backlog."},
    {n:"3",title:"Get ranked suggestions",desc:"Every task shows every candidate ranked by fit score with a plain-English reason for each."},
    {n:"4",title:"System gets smarter",desc:"Each completed task updates skill scores automatically. Recommendations improve every sprint."},
  ];
  return(
    <section style={{padding:"96px 5%",background:S.white}}>
      <div style={{maxWidth:"1100px",margin:"0 auto"}}>
        <div style={{fontSize:"12px",fontWeight:600,color:S.indigo,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"12px"}}>How it works</div>
        <h2 style={{fontSize:"clamp(28px,4vw,44px)",fontWeight:700,color:S.grey900,lineHeight:1.15,letterSpacing:"-0.02em",marginBottom:"16px",maxWidth:"600px"}}>
          From backlog to assigned — in seconds.
        </h2>
        <p style={{fontSize:"17px",color:S.grey600,maxWidth:"520px",lineHeight:1.7,marginBottom:"48px"}}>
          WorkForce IQ sits alongside your sprint planning and tells you the optimal assignment for every task.
        </p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"32px"}}>
          {steps.map(s=>(
            <div key={s.n}>
              <div style={{width:"40px",height:"40px",background:S.indigoLight,borderRadius:"10px",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:"16px",fontWeight:700,color:S.indigo,marginBottom:"16px"}}>{s.n}</div>
              <h3 style={{fontSize:"16px",fontWeight:600,color:S.grey900,marginBottom:"8px"}}>{s.title}</h3>
              <p style={{fontSize:"13px",color:S.grey600,lineHeight:1.7}}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Algorithm(){
  const vars=[
    {name:"Skill Score",desc:"1–5 rating per skill from the team matrix. Normalised to a capability proportion."},
    {name:"Completion Boost",desc:"+0.2 per completed task of matching type. Proven performance lifts the score."},
    {name:"Complexity",desc:"Low=1.00 · Medium=0.90 · High=0.75 · Critical=0.60"},
    {name:"Effort Penalty",desc:"Longer tasks carry more inherent risk. 13pt task penalised by 22%."},
    {name:"Workload Factor",desc:">90% load=0.60 · >75%=0.80 · >60%=0.92 · else=1.00"},
  ];
  return(
    <section style={{padding:"96px 5%",background:S.navy}}>
      <div style={{maxWidth:"1100px",margin:"0 auto"}}>
        <div style={{fontSize:"12px",fontWeight:600,color:"#818CF8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"12px"}}>The algorithm</div>
        <h2 style={{fontSize:"clamp(28px,4vw,44px)",fontWeight:700,color:"#fff",lineHeight:1.15,letterSpacing:"-0.02em",marginBottom:"16px",maxWidth:"600px"}}>
          Not a black box. Every score is explainable.
        </h2>
        <p style={{fontSize:"17px",color:"rgba(255,255,255,0.55)",maxWidth:"520px",lineHeight:1.7,marginBottom:"32px"}}>
          A deterministic scoring formula — transparent, auditable, and justified for every recommendation.
        </p>
        <div style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(165,180,252,0.2)",
          borderRadius:"12px",padding:"20px 24px",marginBottom:"32px",
          fontFamily:"'Courier New',monospace",fontSize:"clamp(12px,1.5vw,14px)",
          color:"#A5B4FC",lineHeight:1.8,overflowX:"auto",whiteSpace:"nowrap"}}>
          Fit% = round( (min(5, Skill + CompletionBoost) / 5) × Complexity × Effort × Workload × 100 )
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"16px"}}>
          {vars.map(v=>(
            <div key={v.name} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"10px",padding:"16px"}}>
              <div style={{fontSize:"12px",fontWeight:700,color:"#818CF8",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.05em"}}>{v.name}</div>
              <div style={{fontSize:"12px",color:"rgba(255,255,255,0.5)",lineHeight:1.5}}>{v.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features(){
  const feats=[
    {icon:"⊞",bg:"#EEF2FF",title:"Swim Lane Board",desc:"Each row is a team member. Each column is a task status. Workload and risk visible at a glance."},
    {icon:"🎯",bg:"#F0FDF4",title:"Ranked Assignment Engine",desc:"Every task shows every candidate ranked by fit — with skill, load, completions, and a plain reason."},
    {icon:"📈",bg:"#FEF3C7",title:"Skill Growth Tracking",desc:"Scores update as tasks are completed. The more your team works, the smarter the recommendations."},
    {icon:"⚑",bg:"#FEF2F2",title:"Risk Register",desc:"Auto-calculated risk per task and per person. Catch burnout and blockage before they happen."},
    {icon:"◎",bg:"#F5F3FF",title:"What's Next",desc:"Suggests follow-on tasks based on proven completions. The system knows who's ready for what."},
    {icon:"⬡",bg:"#ECFDF5",title:"Skill Matrix",desc:"Upload from Excel or build manually. Percentile rankings show where each person stands."},
  ];
  return(
    <section style={{padding:"96px 5%",background:S.grey50}}>
      <div style={{maxWidth:"1100px",margin:"0 auto"}}>
        <div style={{fontSize:"12px",fontWeight:600,color:S.indigo,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"12px"}}>Features</div>
        <h2 style={{fontSize:"clamp(28px,4vw,44px)",fontWeight:700,color:S.grey900,lineHeight:1.15,letterSpacing:"-0.02em",marginBottom:"48px",maxWidth:"600px"}}>
          Everything your team needs. Nothing it doesn't.
        </h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"20px"}}>
          {feats.map(f=>(
            <div key={f.title} style={{background:S.white,border:`1px solid ${S.grey200}`,borderRadius:"12px",padding:"24px",transition:"box-shadow .15s,border-color .15s",cursor:"default"}}
              onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 20px rgba(79,70,229,0.1)";e.currentTarget.style.borderColor=S.indigoMid;}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=S.grey200;}}>
              <div style={{width:"40px",height:"40px",borderRadius:"10px",background:f.bg,marginBottom:"14px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px"}}>{f.icon}</div>
              <h3 style={{fontSize:"15px",fontWeight:600,color:S.grey900,marginBottom:"8px"}}>{f.title}</h3>
              <p style={{fontSize:"13px",color:S.grey600,lineHeight:1.6}}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Templates(){
  const tpls=[
    {icon:"⌨",name:"Software Dev",desc:"Frontend · Backend · DevOps · QA"},
    {icon:"📣",name:"Marketing",desc:"SEO · Paid · Email · Analytics"},
    {icon:"🎨",name:"Creative Agency",desc:"Copy · Art Direction · Motion"},
    {icon:"💼",name:"Sales",desc:"Prospecting · Demo · Closing"},
    {icon:"🏗",name:"Construction",desc:"Electrical · Structural · Safety"},
    {icon:"⚙",name:"Custom",desc:"Define your own skill columns"},
  ];
  return(
    <section style={{padding:"96px 5%",background:S.white}}>
      <div style={{maxWidth:"1100px",margin:"0 auto"}}>
        <div style={{fontSize:"12px",fontWeight:600,color:S.indigo,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"12px"}}>Templates</div>
        <h2 style={{fontSize:"clamp(28px,4vw,44px)",fontWeight:700,color:S.grey900,lineHeight:1.15,letterSpacing:"-0.02em",marginBottom:"16px",maxWidth:"600px"}}>
          Works for any team, any industry.
        </h2>
        <p style={{fontSize:"17px",color:S.grey600,maxWidth:"520px",lineHeight:1.7,marginBottom:"48px"}}>
          Same scoring engine. Different skill vocabularies. Pick your template and start in 30 seconds.
        </p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"14px"}}>
          {tpls.map(t=>(
            <div key={t.name} style={{border:`1.5px solid ${S.grey200}`,borderRadius:"12px",padding:"20px 16px",textAlign:"center",transition:"all .15s",cursor:"default"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=S.indigoMid;e.currentTarget.style.background=S.indigoLight;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=S.grey200;e.currentTarget.style.background="transparent";}}>
              <div style={{fontSize:"28px",marginBottom:"10px"}}>{t.icon}</div>
              <div style={{fontSize:"13px",fontWeight:600,color:S.grey900,marginBottom:"4px"}}>{t.name}</div>
              <div style={{fontSize:"11px",color:S.grey400}}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA({onGetStarted,onSignIn}){
  return(
    <section style={{background:`linear-gradient(135deg,${S.navy} 0%,#312E81 100%)`,
      textAlign:"center",padding:"96px 5%"}}>
      <div style={{maxWidth:"640px",margin:"0 auto"}}>
        <div style={{fontSize:"12px",fontWeight:600,color:"#818CF8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"12px"}}>Beta testing</div>
        <h2 style={{fontSize:"clamp(28px,4vw,44px)",fontWeight:700,color:"#fff",lineHeight:1.15,letterSpacing:"-0.02em",marginBottom:"16px"}}>
          Help us shape the product.
        </h2>
        <p style={{fontSize:"17px",color:"rgba(255,255,255,0.6)",lineHeight:1.7,marginBottom:"40px"}}>
          Join our beta testing programme and get free early access to WorkForce IQ. Your feedback directly shapes what we build next.
        </p>
        <button onClick={onGetStarted}
          style={{background:"#fff",color:S.navy,border:"none",borderRadius:"10px",
            padding:"14px 32px",fontSize:"15px",fontWeight:700,cursor:"pointer",
            fontFamily:"inherit",marginBottom:"12px"}}>
          Get free beta access →
        </button>
        <p style={{fontSize:"12px",color:"rgba(255,255,255,0.35)",marginBottom:"8px"}}>No credit card. No spam. Cancel anytime.</p>
        <p style={{fontSize:"13px",color:"rgba(255,255,255,0.5)"}}>
          Already have an account?{" "}
          <button onClick={onSignIn} style={{background:"none",border:"none",color:"#818CF8",
            cursor:"pointer",fontWeight:500,fontSize:"13px",fontFamily:"inherit"}}>
            Sign in →
          </button>
        </p>
      </div>
    </section>
  );
}

function Footer(){
  return(
    <footer style={{background:S.grey900,padding:"32px 5%",display:"flex",
      alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"16px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
        <div style={{width:"28px",height:"28px",background:S.indigo,borderRadius:"7px",
          display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{color:"#fff",fontWeight:700,fontSize:"13px"}}>W</span>
        </div>
        <span style={{fontSize:"13px",fontWeight:600,color:"#fff"}}>WorkForce IQ</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"4px"}}>
        <span style={{fontSize:"12px",color:"rgba(255,255,255,0.3)"}}>© 2026 Samuel Adebusoye. All rights reserved.</span>
        <span style={{fontSize:"11px",color:"rgba(255,255,255,0.2)"}}>MVP — Beta version</span>
      </div>
    </footer>
  );
}

export default function LandingPage({onGetStarted,onSignIn}){
  return(
    <div style={{fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
      color:S.grey900,lineHeight:1.6,WebkitFontSmoothing:"antialiased"}}>
      <Nav onSignIn={onSignIn} onGetStarted={onGetStarted}/>
      <Hero onGetStarted={onGetStarted} onSignIn={onSignIn}/>
      <Problem/>
      <HowItWorks/>
      <Algorithm/>
      <Features/>
      <Templates/>
      <CTA onGetStarted={onGetStarted} onSignIn={onSignIn}/>
      <Footer/>
    </div>
  );
}
