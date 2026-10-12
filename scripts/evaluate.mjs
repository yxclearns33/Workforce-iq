import {recommend} from '../src/lib/recommendations.js';
import {writeFileSync,mkdirSync} from 'node:fs';
const task={id:'new',type:'Backend',sprint:'current',estimatedHours:8};
const members=[{id:'alex',skills:{Backend:80},capacityHours:10},{id:'sam',skills:{Backend:95},capacityHours:12},{id:'jo',skills:{Backend:95},capacityHours:3}];
const history=[{id:'history-1',type:'Backend',status:'Done',completionAccepted:true,assigneeId:'alex'}];
// Expected answers are specified independently of recommend(). These are controlled demonstrations, not measured job performance.
const scenarios=[
 {name:'Relevant history favours Alex',task,members,tasks:history,eligible:['alex','sam'],winner:'alex'},
 {name:'No history uses skill tie-break',task,members,tasks:[],eligible:['alex','sam'],winner:'sam'},
 {name:'Reserved work excludes Alex',task,members,tasks:[...history,{id:'busy',sprint:'current',status:'Todo',assigneeId:'alex',estimatedHours:4}],eligible:['sam'],winner:'sam'},
 {name:'Nobody has capacity',task:{...task,estimatedHours:20},members,tasks:history,eligible:[],winner:null},
 {name:'Unaccepted history excluded',task,members,tasks:history.map(t=>({...t,completionAccepted:false})),eligible:['alex','sam'],winner:'sam'},
 {name:'Unknown estimates require review',task:{...task,estimatedHours:null},members,tasks:history,eligible:[],winner:null},
];
const results=scenarios.map(s=>{const start=performance.now();const ranked=recommend(s.task,s.members,s.tasks);const elapsed=performance.now()-start;const eligible=ranked.filter(c=>c.eligible);const baseline=recommend(s.task,s.members,s.tasks,{useExperience:false});const actual=eligible.map(c=>c.member.id).sort();return {scenario:s.name,expectedEligible:s.eligible.sort(),actualEligible:actual,expectedFirst:s.winner,actualFirst:eligible[0]?.member.id??null,baselineFirst:baseline.find(c=>c.eligible)?.member.id??null,pass:JSON.stringify(actual)===JSON.stringify(s.eligible.sort())&&(eligible[0]?.member.id??null)===s.winner,durationMs:Number(elapsed.toFixed(3))};});
mkdirSync('evaluation',{recursive:true});writeFileSync('evaluation/controlled-results.json',JSON.stringify({generatedAt:new Date().toISOString(),scope:'Six initial controlled scenarios; AI not evaluated here',results},null,2));console.table(results.map(({scenario,pass,actualFirst,baselineFirst})=>({scenario,pass,actualFirst,baselineFirst})));if(results.some(r=>!r.pass))process.exitCode=1;
