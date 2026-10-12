import { normalizeSkill, skillNames, skillValue, SKILLS } from './skills.js';
export const VERSION = 'experience-skills-v2';
export const CATEGORIES = ['Frontend','Backend','Design','DevOps','QA','Data','Mobile','Security'];
const finite = value => value !== '' && value != null && Number.isFinite(Number(value)) && Number(value) >= 0;

export function requirements(task) {
  const skills = task.requiredSkills?.length ? task.requiredSkills : [task.type];
  return skills.map(skill => typeof skill === 'string' ? {name:normalizeSkill(skill), min:Number(task.minimumLevel ?? 70)} : {name:normalizeSkill(skill.name), min:Number(skill.min ?? skill.requiredLevel ?? 70)});
}

export function recommend(task, members, tasks, {useExperience=true, relevantIds=null}={}) {
  const need = requirements(task);
  return members.map(member => {
    const reasons=[];
    const capacity=member.sprintCapacityHours?.[task.sprint] ?? member.capacityHours;
    const active=tasks.filter(t=>t.id!==task.id && t.sprint===task.sprint && t.assigneeId===member.id && t.status!=='Done');
    const known=finite(capacity) && active.every(t=>finite(t.remainingHours ?? t.estimatedHours));
    const reserved=active.reduce((sum,t)=>sum+Number(t.remainingHours ?? t.estimatedHours ?? 0),0);
    const remaining=known ? Number(capacity)-reserved : null;
    if(!task.sprint) reasons.push('Choose a sprint');
    if(task.requirementsConfirmed===false) reasons.push('Confirm task requirements');
    if(!need.length) reasons.push('Set required skills');
    if(!finite(task.estimatedHours) || Number(task.estimatedHours)<=0) reasons.push('Set positive estimated hours; story points are not hours');
    if(!known) reasons.push('Set sprint capacity and hours for existing open tasks');
    if(remaining!==null && remaining<Number(task.estimatedHours)) reasons.push('Insufficient sprint capacity');
    need.forEach(r=>{
      if(!r.name || !finite(r.min) || r.min>100 || !finite(skillValue(member,r.name)) || Number(member.skills[r.name])<r.min) reasons.push(`Required skill: ${r.name || 'unknown'} ≥ ${r.min}`);
    });
    const history=tasks.filter(t=>t.id!==task.id && t.assigneeId===member.id && t.status==='Done' && t.completionAccepted===true);
    const matches=history.filter(t=>relevantIds ? relevantIds.includes(t.id) : skillNames(t).some(s=>need.some(r=>r.name===s)));
    const skill=need.length ? Math.round(need.reduce((sum,r)=>sum+Number(skillValue(member,r.name) ?? 0),0)/need.length) : 0;
    return {member,eligible:reasons.length===0,reasons,remaining,reserved,skill,evidenceIds:matches.map(t=>t.id),experience:useExperience ? matches.length : 0,version:VERSION};
  }).sort((a,b)=>Number(b.eligible)-Number(a.eligible) || b.experience-a.experience || b.skill-a.skill || (b.remaining ?? -1)-(a.remaining ?? -1) || a.member.id.localeCompare(b.member.id));
}

export function validateAI(result, history) {
  if(!result || !Array.isArray(result.requiredSkills) || !Array.isArray(result.relevantTaskIds)) throw new Error('Invalid AI response');
  const allowed=new Set(history.map(t=>t.id));
  if(result.requiredSkills.some(s=>!SKILLS.includes(normalizeSkill(s))) || !CATEGORIES.includes(result.category) || result.relevantTaskIds.some(id=>!allowed.has(id))) throw new Error('AI returned an unsupported category, skill or evidence ID');
  return {category:result.category, requiredSkills:[...new Set(result.requiredSkills.map(normalizeSkill))], relevantTaskIds:[...new Set(result.relevantTaskIds)], explanation:String(result.explanation ?? '').slice(0,1500)};
}

export function transitionTask(task, patch, now=new Date().toISOString()) {
  const next={...task,...patch,updatedAt:now};
  if(task.status==='Done' && ['assigneeId','name','description','requiredSkills'].some(k=>patch[k]!==undefined&&JSON.stringify(patch[k])!==JSON.stringify(task[k]))) return {...next,completionAccepted:false};
  if(patch.status==='Done' && task.status!=='Done') return {...next,completedAt:now,completionAccepted:false};
  if(patch.status && patch.status!=='Done' && task.status==='Done') return {...next,completionAccepted:false,completedAt:null};
  return next;
}
