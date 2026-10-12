import {validateExpected} from './evaluation.js';
import {validSkill} from './skills.js';
export function validateBackup(data){
 if(data?.schemaVersion!==3||!Array.isArray(data.members)||!Array.isArray(data.tasks)||!Array.isArray(data.sprints)||data.members.length>2000||data.tasks.length>5000)throw new Error('Expected a schemaVersion 3 WorkForce IQ backup.');
 for(const rows of [data.members,data.tasks,data.sprints]){const ids=rows.map(r=>r.id);if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)throw new Error('Missing or duplicate IDs in backup.');}
 for(const m of data.members){if(typeof m.name!=='string'||!m.name.trim()||!m.skills||Object.entries(m.skills).some(([k,v])=>!validSkill(k)||typeof v!=='number'||!Number.isFinite(v)||v<0||v>100)||Object.values(m.sprintCapacityHours||{}).some(v=>v!==null&&(typeof v!=='number'||!Number.isFinite(v)||v<0||v>10000)))throw new Error('Invalid profile in backup.');}
 for(const t of data.tasks){if(typeof t.name!=='string'||!t.name.trim()||!data.sprints.some(s=>s.id===t.sprint)||!['Todo','In Progress','Review','Done','Blocked'].includes(t.status)||(t.assigneeId&&!data.members.some(m=>m.id===t.assigneeId))||(t.estimatedHours!=null&&(typeof t.estimatedHours!=='number'||!Number.isFinite(t.estimatedHours)||t.estimatedHours<=0||t.estimatedHours>10000))||(t.status==='Done'&&!t.assigneeId))throw new Error('Invalid task in backup.');}
 if(data.decisions!==undefined&&!Array.isArray(data.decisions))throw new Error('Invalid decision log.');
 if(data.expected!==undefined){if(!Array.isArray(data.expected))throw new Error('Invalid expected outcomes.');if(data.expected.length)validateExpected(data.expected.map(e=>({TaskID:e.taskId,ExpectedWinner:e.expectedWinner||'NONE',ExpectedBaseline:e.expectedBaseline||'NONE',ExpectedEligible:e.expectedEligible?.join(';')||''})),data.tasks.map(t=>t.id),data.members.map(m=>m.id));}
 return data;
}
