export function normalizeWeights(criteria){
  const total=criteria.reduce((sum,c)=>sum+Math.max(0,Number(c.weight)||0),0)||1;
  return criteria.map(c=>({...c,normalizedWeight:Math.max(0,Number(c.weight)||0)/total}));
}

export function weightedScore(scores,criteria){
  return normalizeWeights(criteria).reduce((sum,c)=>sum+(Number(scores[c.id])||0)*c.normalizedWeight,0);
}

export function consensusScore(values,scaleMin=1,scaleMax=10){
  if(values.length<2)return 100;
  const mean=values.reduce((s,v)=>s+Number(v),0)/values.length;
  const variance=values.reduce((s,v)=>s+(Number(v)-mean)**2,0)/values.length;
  return Math.max(0,Math.round((1-Math.sqrt(variance)/(scaleMax-scaleMin))*100));
}

export function ahp(matrix){
  const n=matrix.length;
  if(n<2||matrix.some(row=>row.length!==n))return {weights:[],lambdaMax:0,consistencyIndex:0,consistencyRatio:0,consistent:true};
  const columnTotals=Array.from({length:n},(_,j)=>matrix.reduce((sum,row)=>sum+Number(row[j]||0),0));
  const weights=matrix.map(row=>row.reduce((sum,value,j)=>sum+Number(value||0)/Math.max(columnTotals[j],Number.EPSILON),0)/n);
  const weightedSums=matrix.map(row=>row.reduce((sum,value,j)=>sum+Number(value||0)*weights[j],0));
  const lambdaMax=weights.reduce((sum,w,i)=>sum+weightedSums[i]/Math.max(w,Number.EPSILON),0)/n;
  const consistencyIndex=n>1?(lambdaMax-n)/(n-1):0;
  const randomIndex={1:0,2:0,3:.58,4:.9,5:1.12,6:1.24,7:1.32,8:1.41,9:1.45,10:1.49}[n]||1.49;
  const consistencyRatio=randomIndex?consistencyIndex/randomIndex:0;
  return {weights,lambdaMax,consistencyIndex,consistencyRatio,consistent:consistencyRatio<=.1};
}
