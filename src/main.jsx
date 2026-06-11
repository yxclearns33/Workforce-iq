import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AuthScreen from './AuthScreen.jsx'
import LandingPage from './LandingPage.jsx'
import { supabase } from './supabase.js'
import './index.css'

function Root(){
  const [user,      setUser]      = useState(null);
  const [template,  setTemplate]  = useState(null);
  const [workspace, setWorkspace] = useState("");
  const [checking,  setChecking]  = useState(true);
  const [page,      setPage]      = useState("landing"); // landing | auth | app

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session?.user){
        setUser(session.user);
        setPage("app");
      }
      setChecking(false);
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      if(session?.user){
        setUser(session.user);
      } else {
        setUser(null);
        setPage("landing");
      }
    });
    return()=>subscription.unsubscribe();
  },[]);

  const handleAuth=(u,tpl,wsName)=>{
    setUser(u);
    setTemplate(tpl);
    setWorkspace(wsName||"My Workspace");
    setPage("app");
  };

  const handleSignOut=async()=>{
    await supabase.auth.signOut();
    setUser(null);
    setTemplate(null);
    setPage("landing");
  };

  if(checking)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",
      justifyContent:"center",background:"#F8F9FB",fontFamily:"system-ui"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:"36px",height:"36px",background:"#1E1B4B",borderRadius:"9px",
          display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
          <span style={{color:"#fff",fontWeight:700,fontSize:"16px"}}>W</span>
        </div>
        <div style={{fontSize:"13px",color:"#6B7280"}}>Loading…</div>
      </div>
    </div>
  );

  if(page==="landing")return(
    <LandingPage
      onGetStarted={()=>setPage("auth")}
      onSignIn={()=>setPage("auth")}
    />
  );

  if(page==="auth"||!user||!template)return(
  <AuthScreen onAuth={handleAuth} onBack={()=>setPage("landing")}/>
);

  return(
    <App
      template={template}
      workspace={workspace}
      user={user}
      onSignOut={handleSignOut}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root/>
  </React.StrictMode>
)
