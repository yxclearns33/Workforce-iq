import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIServer} from '../server/ai.mjs';
async function request(config,input){const server=createAIServer(config);await new Promise(r=>server.listen(0,'127.0.0.1',r));try{return await fetch(`http://127.0.0.1:${server.address().port}/api/experience`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});}finally{server.close();}}
test('missing key reports unavailable without exposing secrets',async()=>{assert.equal((await request({key:''},{task:{name:'API'},history:[]})).status,503);});
test('AI hallucinated IDs are rejected by server',async()=>{const fetchImpl=async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({category:'Backend',requiredSkills:['Backend'],relevantTaskIds:['fake']})}]}}]})});assert.equal((await request({key:'test',fetchImpl},{task:{name:'API'},history:[]})).status,502);});
test('valid mock model response returns structured suggestions',async()=>{const fetchImpl=async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({category:'Backend',requiredSkills:['Backend'],relevantTaskIds:[],explanation:'API task'})}]}}]})});const r=await request({key:'test',fetchImpl},{task:{name:'API'},history:[]});assert.equal(r.status,200);assert.equal((await r.json()).category,'Backend');});
