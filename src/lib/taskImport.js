import {normalizeSkill,validSkill} from './skills.js';
import { CATEGORIES } from './recommendations.js';
export function validateTaskRows(rows,members,sprint,existing=[]) {
  const errors=[],tasks=[],ids=new Set(existing.map(t=>t.id));
  if(!sprint) errors.push('Select a sprint');
  if(!rows.length) errors.push('File contains no records');
  if(rows.length>2000) return {tasks:[],errors:['Maximum 2,000 rows per import']};
  rows.forEach((row,index)=>{
    const normalized=Object.fromEntries(Object.entries(row).map(([k,v])=>[k.toLowerCase().replace(/[^a-z0-9]/g,''),v]));
    const get=(...names)=>names.map(n=>normalized[n]).find(v=>v!==undefined&&v!=='');
    const id=String(get('id','taskid')||`import-${Date.now()}-${index}`);
    const name=String(get('taskname','name','title','summary')||'').trim();
    const type=CATEGORIES.find(t=>t.toLowerCase()===String(get('type','category')||'').toLowerCase());
    const hours=Number(get('estimatedhours','hours'));
    const rawOwner=String(get('assigneeid','assignee','owner')||'').trim();
    const owner=members.find(m=>m.id===rawOwner||m.name.toLowerCase()===rawOwner.toLowerCase());
    const status=['Todo','In Progress','Review','Done','Blocked'].find(s=>s.toLowerCase()===String(get('status')||'Todo').toLowerCase());
    if(!name||!type||!Number.isFinite(hours)||hours<=0||hours>10000||!status||ids.has(id)||!/^[a-zA-Z0-9_-]+$/.test(id)||(rawOwner&&!owner)) errors.push(`Row ${index+2}: check name, category, positive hours, status, unique ID and exact owner`);
    const rawSkills=String(get('requiredskills')||type||'').split(';').map(normalizeSkill).filter(Boolean);
    if(rawSkills.some(s=>!validSkill(s))) errors.push(`Row ${index+2}: use valid skills separated by semicolons`);
    if(status==='Done'&&!owner)errors.push(`Row ${index+2}: Done requires an owner`);
    const min=Number(get('minimumlevel')??70);if(!Number.isFinite(min)||min<0||min>100)errors.push(`Row ${index+2}: minimum level must be 0–100`);
    ids.add(id);
    tasks.push({id,name,type,description:String(get('description')||''),estimatedHours:hours,effort:[1,2,3,5,8,13].includes(Number(get('effort','points')))?Number(get('effort','points')):3,requiredSkills:rawSkills,complexity:'Medium',priority:'Medium',status,sprint,assigneeId:owner?.id||null,requirementsConfirmed:true,minimumLevel:Number(get('minimumlevel')??70),completionAccepted:status==='Done' && Boolean(owner) && String(get('completionaccepted')||'').toLowerCase()==='true',completedAt:status==='Done'?String(get('completedat')||''):null,riskOverride:null});
  });
  return {tasks:errors.length?[]:tasks,errors};
}
