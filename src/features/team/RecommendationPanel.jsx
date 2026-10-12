import { useState } from 'react';
import { recommend, validateAI, taskSignature } from '../../lib/recommendations.js';

export default function RecommendationPanel({task,members,tasks,onChange}) {
  const [ai,setAI]=useState(null);
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [useExperience,setExperience]=useState(true);
  const history=tasks.filter(t=>t.id!==task.id && t.status==='Done' && t.completionAccepted===true);
  const fingerprint=JSON.stringify([task.name,task.description,history]);
  const validAI=ai?.fingerprint===fingerprint ? ai : null;
  const candidates=recommend(task,members,tasks,{useExperience,relevantIds:null});
  async function analyse() {
    setBusy(true);setNotice('');setAI(null);
    try {
      const response=await fetch('/api/experience',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task:{name:task.name,description:task.description||''},history:[]}),signal:AbortSignal.timeout(30000)});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error || 'AI unavailable');
      setAI({...validateAI(data,[]),fingerprint,confirmed:false});
    } catch(error) {setNotice(error.message+' — manual skill entry remains available.');}
    finally {setBusy(false);}
  }
  function select(candidate) {
    const snapshot={signature:taskSignature(task),version:candidate.version,calculatedAt:new Date().toISOString(),taskId:task.id,memberId:candidate.member.id,method:'confirmed skill overlap',useExperience,requiredSkills:task.requiredSkills,estimatedHours:task.estimatedHours,remaining:candidate.remaining,evidenceIds:candidate.evidenceIds,skill:candidate.skill};
    onChange({assigneeId:candidate.member.id,recommendationSnapshot:snapshot});
  }
  return <section className="experience-panel">
    <h3>Experience-aware recommendations</h3>
    <p>Eligibility first, then accepted tasks sharing at least one confirmed required skill, declared skill level and remaining hours. These are planning rules, not predicted performance.</p>
    <label>Estimated hours <input type="number" min="0.5" max="10000" step="0.5" value={task.estimatedHours??''} onChange={e=>onChange({estimatedHours:e.target.value===''?null:Number(e.target.value)})}/></label>
    <label><input type="checkbox" checked={useExperience} onChange={e=>setExperience(e.target.checked)}/> Include experience (switch off for the baseline)</label>
    {task.status==='Done' && <label><input type="checkbox" checked={task.completionAccepted===true} onChange={e=>onChange({completionAccepted:e.target.checked,completionReviewedAt:new Date().toISOString()})}/> Manager accepts completion as an experience record</label>}
    <button disabled={busy} onClick={analyse}>{busy?'Analysing…':'AI: suggest task requirements'}</button>
    {notice && <p role="status">{notice}</p>}
    {validAI && <div className="ai-proposal"><b>Suggestions awaiting manager confirmation</b><p>{validAI.explanation}</p><p>Category: {validAI.category} · Skills: {validAI.requiredSkills.join(', ') || 'None suggested'}</p><small>AI history suggestions do not change the documented skill-overlap ranking rule.</small><button onClick={()=>{onChange({type:validAI.category,requiredSkills:validAI.requiredSkills,requirementsConfirmed:true,recommendationSnapshot:null});setAI({...validAI,confirmed:true});}}>Confirm suggested inputs</button><button onClick={()=>setAI(null)}>Dismiss</button></div>}
    {!candidates.some(c=>c.eligible) && <p role="status">No eligible candidate. Set skills, task hours and sprint capacity in member profiles.</p>}
    {candidates.map((c,i)=><article key={c.member.id} className={`candidate-row ${c.eligible?'eligible':''} ${c.eligible&&i===0?'recommended':''}`}><header><strong>{c.member.name}</strong><span>{c.eligible?(i===0?'Recommended':'Eligible'):'Not eligible'}</span></header><p>{c.remaining===null?'Capacity unknown':`${c.remaining} hours available`} · {c.evidenceIds.length} accepted relevant task(s) · skill match {c.skill}/100</p><p>{c.reasons.join('; ') || 'Meets configured skills and capacity requirements.'}</p><details><summary>Experience records</summary><ul>{c.evidenceIds.map(id=><li key={id}>{id}: {history.find(t=>t.id===id)?.name}</li>)}</ul>{!c.evidenceIds.length&&<p>No accepted relevant history. This is not a skill failure.</p>}</details><button disabled={!c.eligible || task.status==='Done'} onClick={()=>select(c)}>Select {c.member.name}</button></article>)}
    {task.recommendationSnapshot && <details><summary>Last recorded recommendation decision</summary><pre>{JSON.stringify(task.recommendationSnapshot,null,2)}</pre></details>}
  </section>;
}
