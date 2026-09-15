// Diagnostic, not an acceptance test. Reports both accepted default and quarantined candidate.
import fs from 'node:fs/promises';import * as T from 'three';import {Fighter} from '../src/engine/entity.js';import {ROSTER} from '../src/data/characters.js';import {STRIKES} from '../src/data/martial.js';
const rows=[];
for(const candidate of [false,true])for(const key of ['jab','cross'])for(const side of [-1,1]){
 const def=structuredClone(ROSTER.find(d=>d.id==='sol'));def.art='boxing';const f=new Fighter(def);f._paidBoxerPreview=candidate;f._openSky=true;f.gait='grounded';f.flying=false;f.animT=0;f.vel.set(0,0,0);f.mId=key;f.poseStrike=1;f._meleeMotion={side,point:new T.Vector3(side*.3,7,3.5)};
 let previous,maxAngle=0,worst=null,maxContactGap=0;
 try{for(const state of ['startup','active','recover']){const count=Math.ceil(STRIKES[key][state]*120);for(let i=0;i<=count;i++){
  f.mstate=state;f.mT=STRIKES[key][state]*(1-i/count);f._animate(1/120);f.obj.updateMatrixWorld(true);
  const names=['body','pelvis','head','armL','armR','legL','legR'],joints=names.map(n=>f.parts[n].quaternion.clone());
  if(previous)joints.forEach((q,j)=>{const angle=q.angleTo(previous[j]);if(angle>maxAngle){maxAngle=angle;worst={state,sample:i,count,joint:names[j]};}});previous=joints;
  if(state==='active')maxContactGap=Math.max(maxContactGap,(side===1?f.parts.armR:f.parts.armL).children[2].getWorldPosition(new T.Vector3()).distanceTo(f._meleeMotion.point));
 }}rows.push({mode:candidate?'quarantined-candidate':'accepted-default',key,side,maxAngle,worst,maxContactGap,passes:maxAngle<.6&&maxContactGap<.02});}finally{f.dispose();}
}
const report={status:'paid-boxing-default-disabled',acceptance:'No rendered acceptance. Diagnostic records native fast-clock contact incompatibility; source clips remain available in the library.',rows};
await fs.mkdir('artifacts/paid-boxer',{recursive:true});await fs.writeFile('artifacts/paid-boxer/native-compatibility.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
