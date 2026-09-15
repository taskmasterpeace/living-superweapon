import {Box3,Vector3} from 'three';

const axes=['x','y','z'],partBox=new Box3(),skin=.015;
function solid(f){return f.alive&&!f.phase&&!(f.sprintT>0&&f._sprintThrough)&&!f._scoutVehicle&&!f._aircraftVehicle&&!f._fleetVehicle&&!f._banished;}
function joined(a,b){return a.grabbing===b||b.grabbing===a||a.grabbedBy===b||b.grabbedBy===a;}

// A released payload begins inside the carrier's contact envelope. Let that
// pair separate once; collisions with everyone else remain active throughout.
function clearingThrow(a,ar,b,br){
 for(const [victim,vr,owner,or]of [[a,ar,b,br],[b,br,a,ar]]){
  const token=victim._personThrow;
  if(token?.owner!==owner||token.bodyCleared||!(victim._thrownT>0))continue;
  for(const k of axes)if(victim.pos[k]+vr.local.max[k]<owner.pos[k]+or.local.min[k]||victim.pos[k]+vr.local.min[k]>owner.pos[k]+or.local.max[k]){token.bodyCleared=true;break;}
  return true;
 }
 return false;
}

// Solid core and legs: weapons and reaching fists must not become invisible
// body walls, but dangling boots cannot pass through somebody's head either.
// World-space bounds follow the real prone/hover orientation and authored size.
function coreBounds(f,out){
 out.makeEmpty();f.obj.updateMatrixWorld(true);
 const include=p=>{if(!p?.geometry)return;
  if(!p.geometry.boundingBox)p.geometry.computeBoundingBox();
  out.union(partBox.copy(p.geometry.boundingBox).applyMatrix4(p.matrixWorld));
 };
 for(const key of ['torso','head','pelvis'])include(f.parts?.[key]);
 for(const leg of [f.parts?.legL,f.parts?.legR])for(const key of ['thigh','shin','boot'])include(leg?.userData?.[key]);
 if(out.isEmpty())out.set(new Vector3(f.pos.x-f.radius,f.pos.y,f.pos.z-f.radius),new Vector3(f.pos.x+f.radius,f.pos.y+10,f.pos.z+f.radius));
 out.min.sub(f.pos);out.max.sub(f.pos);return out;
}

export function beginBodyContactFrame(entities){
 const frame=new Map();
 for(const f of entities)if(solid(f))frame.set(f,{start:f.pos.clone(),local:coreBounds(f,new Box3()),root:f.obj});
 return frame;
}

function contact(a,ar,b,br){
 let enter=0,leave=1,axis=null,sign=1;
 for(const k of axes){
  const start=ar.start[k]-br.start[k],delta=a.pos[k]-b.pos[k]-start;
  const lo=br.local.min[k]-ar.local.max[k],hi=br.local.max[k]-ar.local.min[k];
  if(Math.abs(delta)<1e-10){if(start<lo||start>hi)return null;continue;}
  const t0=(lo-start)/delta,t1=(hi-start)/delta,near=Math.min(t0,t1),far=Math.max(t0,t1);
  if(near>=enter){enter=near;axis=k;sign=delta>0?1:-1;}
  leave=Math.min(leave,far);if(enter>leave)return null;
 }
 if(leave<0||enter>1)return null;
 if(!axis){
  // Existing overlap (spawn/pose transition). Choose the least separating
  // distance, with stable axes for coincident centers; moving apart is free.
  let depth=Infinity;
  for(const k of axes){
   const low=a.pos[k]+ar.local.max[k]-b.pos[k]-br.local.min[k];
   const high=b.pos[k]+br.local.max[k]-a.pos[k]-ar.local.min[k];
   if(low<=0||high<=0)return null;
   if(Math.min(low,high)<depth){depth=Math.min(low,high);axis=k;sign=low<=high?1:-1;}
  }
 }
 return {t:enter,axis,sign};
}

function resolve(a,ar,b,br,c,onContact){
 const k=c.axis,n=c.sign;
 const gap=n>0?b.pos[k]+br.local.min[k]-a.pos[k]-ar.local.max[k]:a.pos[k]+ar.local.min[k]-b.pos[k]-br.local.max[k];
 if(gap>=skin)return;
 const intoA=Math.max(0,(a.pos[k]-ar.start[k])*n),intoB=Math.max(0,-(b.pos[k]-br.start[k])*n),sum=intoA+intoB;
 const weight=sum>1e-9?intoA/sum:.5;
 a.pos[k]-=n*(skin-gap)*weight;b.pos[k]+=n*(skin-gap)*(1-weight);
 // Preserve authored fist speed before either response removes inward travel.
 let av=a.vel[k]*n,bv=b.vel[k]*n;
 if(av>bv)for(const f of [a,b])if(f._abilityMeleePose?.physicalContact)f._abilityMeleePose.contactVelocity??=f.vel.clone();
 // The game owns injury/impulse admission. Throws can also make contact while
 // moving tangentially; do not gate their existing owner on closing velocity.
 if(onContact?.(a,b,c))return;
 av=a.vel[k]*n;bv=b.vel[k]*n;
 // Allies, low-speed contact and attack-owned contacts retain body blocking.
 if(av>bv){
  const common=Math.max(Math.min(0,av),Math.min(Math.max(0,bv),av));
  a.vel[k]=Math.min(av,common)*n;b.vel[k]=Math.max(bv,common)*n;
 }
}

export function resolveBodyContacts(entities,frame,onContact){
 const records=new Map();
 for(const f of entities)if(solid(f)){
  const current=coreBounds(f,new Box3()),old=frame?.get(f);
  const record=old?.root===f.obj?old:{start:f.pos.clone(),local:current.clone(),root:f.obj};
  // Enclose both endpoint poses. Rotation must not shrink away a head/chest
  // that was present at the start of the synchronous movement interval.
  record.local.union(current);records.set(f,record);
 }
 const pairs=[];
 for(let i=0;i<entities.length;i++)for(let j=i+1;j<entities.length;j++){
  const a=entities[i],b=entities[j];
  if(!(a._openSky||b._openSky)||!records.has(a)||!records.has(b)||joined(a,b))continue;
  if(clearingThrow(a,records.get(a),b,records.get(b)))continue;
  pairs.push([a,records.get(a),b,records.get(b)]);
 }
 // Revisit contacts after an earlier collision changes a path (a short line of
 // soldiers, for example). Bounded pair passes, independent of flight speed.
 for(let pass=0;pass<4;pass++){
  const hits=[];
  for(const pair of pairs){const c=contact(...pair);if(c)hits.push({pair,c});}
  if(!hits.length)break;
  hits.sort((a,b)=>a.c.t-b.c.t);
  for(const {pair} of hits){const c=contact(...pair);if(c)resolve(...pair,c,onContact);}
 }
}
