import { useMemo } from "react";

export default function ParticipantPortal({ workspace, tasks, members, checks, onTaskUpdate, onSignOut }) {
  const member = members.find(m=>m.email?.toLowerCase()===workspace.email?.toLowerCase());
  const mine = useMemo(()=>tasks.filter(t=>t.assigneeId===member?.id),[tasks,member]);
  const open = mine.filter(t=>t.status!=="Done");
  return <div className="participant-shell">
    <header><div className="brand"><span>W</span>WorkForce IQ</div><div><small>PARTICIPANT WORKSPACE</small><b>{workspace.company}</b></div><button onClick={onSignOut}>Sign out</button></header>
    <main>
      <section className="participant-welcome"><span>MY WORK</span><h1>Welcome, {workspace.name.split(" ")[0]}</h1><p>Update your work, complete check-ins and respond to scoring requests without the management dashboard.</p></section>
      <div className="participant-kpis"><article><strong>{open.length}</strong><span>Open tasks</span></article><article><strong>{mine.filter(t=>t.status==="Blocked").length}</strong><span>Blocked</span></article><article><strong>{Object.keys(checks||{}).length}</strong><span>Check-ins sent</span></article><article><strong>0</strong><span>Score requests</span></article></div>
      <section className="participant-panel"><div className="panel-title"><div><span>TODAY</span><h2>Your assigned work</h2></div><small>Move work forward as it changes</small></div>
        {!mine.length&&<div className="empty-state">No tasks are assigned to your account yet.</div>}
        {mine.map(task=><article className="participant-task" key={task.id}><div><span>{task.type} · {task.effort} points</span><strong>{task.name}</strong></div><select value={task.status} onChange={e=>onTaskUpdate(task.id,{status:e.target.value})}>{["Todo","In Progress","Review","Done","Blocked"].map(s=><option key={s}>{s}</option>)}</select></article>)}
      </section>
      <section className="privacy-note"><strong>Your privacy</strong><p>You can see your own work and aggregated team signals. Private colleague responses and management-only recommendations are not shown here.</p></section>
    </main>
  </div>;
}
