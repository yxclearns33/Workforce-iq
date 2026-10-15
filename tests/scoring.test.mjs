import test from "node:test";
import assert from "node:assert/strict";
import {ahp,consensusScore,normalizeWeights,weightedScore} from "../src/lib/scoring.js";

test("weights normalize to one",()=>{const weights=normalizeWeights([{weight:30},{weight:20}]);assert.equal(weights.reduce((s,w)=>s+w.normalizedWeight,0),1);});
test("weighted score remains transparent",()=>{assert.equal(weightedScore({a:8,b:6},[{id:"a",weight:75},{id:"b",weight:25}]),7.5);});
test("identical responses have full consensus",()=>assert.equal(consensusScore([7,7,7]),100));
test("consistent AHP matrix passes the ratio threshold",()=>{const result=ahp([[1,2,4],[.5,1,2],[.25,.5,1]]);assert.ok(result.consistencyRatio<=.1);assert.ok(Math.abs(result.weights.reduce((s,w)=>s+w,0)-1)<.0001);});
