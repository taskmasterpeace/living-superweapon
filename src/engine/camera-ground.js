import * as THREE from 'three';

const cuts=[],xSlices=[],zSlices=[],desired=new THREE.Vector3(),extended=new THREE.Vector3();
const clamp=THREE.MathUtils.clamp;
const arcPreferred=new THREE.Vector3(),arcBest=new THREE.Vector3(),baseEye=new THREE.Vector3(),correction=new THREE.Vector3();
const diagonalStart=new THREE.Vector3(),diagonalEnd=new THREE.Vector3();
const frameHead=new THREE.Vector3(),frameEye=new THREE.Vector3(),frameBest=new THREE.Vector3(),frameDirection=new THREE.Vector3();
const frameNominal=new THREE.Quaternion(),frameLook=new THREE.Quaternion();

// Presentation correction after the normal aim ray has been captured. A wall
// detour changes the eye position; retaining the old parallel view direction
// can put the entire knocked-back actor outside the frame. Keep collision and
// movement unchanged during incapacitation. Hand the resulting view back to
// mouse aim once recovery ends, rather than permanently looking at the actor.
export function frameWallRecovery(world,subject,anchor,camera,pad,dt){
 const reacting=subject.stunT>0||subject.staggerT>0||subject.launchT>0||subject._impactRecovery||subject.state==='hit';
 let state=world._wallRecoveryFrame;
 if(!state||state.subject!==subject)state=world._wallRecoveryFrame={subject,weight:0};
 const handoff=state.wasReacting&&!reacting&&state.weight>0;
 state.wasReacting=!!reacting;
 camera.updateMatrixWorld(true);
 const size=subject.sizeScale??1,minRange=12*size;
 (subject.parts?.head?subject.parts.head.getWorldPosition(frameHead):frameHead.copy(anchor)).project(camera);
 const crowded=camera.position.distanceTo(anchor)<minRange||Math.abs(frameHead.x)>.8||Math.abs(frameHead.y)>.8||frameHead.z>1;
 const active=!!((reacting||handoff)&&world._groundCamState?.cover<.999&&(crowded||state.weight>.01));
 if(active&&camera.position.distanceTo(anchor)<minRange){
  const angle=Math.atan2(camera.position.x-anchor.x,camera.position.z-anchor.z);let best=Infinity;
  for(let i=0;i<=24;i++)for(const sign of [-1,1]){
   const turn=i*Math.PI/24*sign;
   frameEye.set(anchor.x+Math.sin(angle+turn)*minRange,anchor.y+4*size,anchor.z+Math.cos(angle+turn)*minRange);
   if(world._camNearestT(...anchor.toArray(),...frameEye.toArray(),pad)<.99999||traceCameraGround(world,anchor,frameEye,pad)<.99999)continue;
   if(Math.abs(turn)<best){best=Math.abs(turn);frameBest.copy(frameEye);}
  }
  if(best<Infinity)camera.position.copy(frameBest);
 }
 // Correct immediately when the body is lost; ease out after the contact.
 state.weight=active?1:Math.max(0,state.weight-Math.max(0,dt)*6);
 if(state.weight<=0)return false;
 frameNominal.copy(camera.quaternion);camera.lookAt(anchor);frameLook.copy(camera.quaternion);
 camera.quaternion.copy(frameNominal).slerp(frameLook,state.weight);camera.updateMatrixWorld(true);
 world.camPos.copy(camera.position);camera.getWorldDirection(frameDirection);
 world.camTarget.copy(camera.position).addScaledVector(frameDirection,100);
 if(handoff){
  // Adopt the view the player is already seeing once, so the ordinary boom
  // and shot direction resume together. Subsequent mouse input is unmodified.
  world._lookYaw=Math.atan2(frameDirection.x,frameDirection.z);
  world._lookPitch=Math.asin(clamp(frameDirection.y,-1,1));
  state.weight=0;
 }
 return true;
}

// Terrain has already set a safe camera height. If cover blocks the lateral
// clearance, keep that horizontal radius and find nearby visible space around
// the rear half of the fighter. Scaling the whole offset instead would put the
// lens inside the torso. This moves the camera, never the aimed view direction.
function clearGroundArc(world,anchor,eye,pad,preference=0){
 arcPreferred.copy(eye);
 const dx=eye.x-anchor.x,dz=eye.z-anchor.z,radius=Math.hypot(dx,dz);
 if(radius<1e-5)return false;
 const theta=Math.atan2(dx,dz)+preference,yaw=world._lookYaw,sy=Math.sin(yaw),cy=Math.cos(yaw);
 let best=Infinity;
 const offer=angle=>{
  const turn=Math.atan2(Math.sin(angle-theta),Math.cos(angle-theta));
  if(Math.abs(turn)>=best||Math.sin(angle)*sy+Math.cos(angle)*cy>1e-8)return false;
  eye.set(anchor.x+Math.sin(angle)*radius,arcPreferred.y,anchor.z+Math.cos(angle)*radius);
  if(world._camNearestT(anchor.x,anchor.y,anchor.z,eye.x,eye.y,eye.z,pad)<1-1e-8||traceCameraGround(world,anchor,eye,pad)<1-1e-8)return false;
  best=Math.abs(turn);arcBest.copy(eye);return true;
 };
 if(offer(theta)){eye.copy(arcBest);return true;}
 const edge=(x,z)=>{const angle=Math.atan2(x,z);offer(angle-1e-6);offer(angle+1e-6);};
 const box=(c,top=c.top??c.h)=>{
  if(c.hidden||c.noCam===true)return;
  const hx=c.hx??c.r,hz=c.hz??c.r;
  if(hx==null||hz==null||top==null)return;
  let lo=0,hi=1;const dy=arcPreferred.y-anchor.y;
  if(Math.abs(dy)<1e-10){if(anchor.y>top+pad||anchor.y< -pad)return;}
  else{
   const p=(-pad-anchor.y)/dy,q=(top+pad-anchor.y)/dy;
   lo=Math.max(0,Math.min(p,q));hi=Math.min(1,Math.max(p,q));if(lo>hi)return;
  }
  const lx=c.x-hx-pad-anchor.x,rx=c.x+hx+pad-anchor.x,lz=c.z-hz-pad-anchor.z,rz=c.z+hz+pad-anchor.z;
  if(Math.hypot(Math.max(lx,0,-rx),Math.max(lz,0,-rz))>radius*hi)return;
  // Contact-angle boundaries come from box-corner rays and intersections
  // with the radial circles where the segment enters/exits the box's height.
  // Considering BOTH directions avoids a wall-end jump, and exact boundaries
  // cannot skip a narrow free interval between two blockers.
  for(const x of [lx,rx])for(const z of [lz,rz])edge(x,z);
  for(const t of [lo,hi]){
   const r=radius*t;if(r<1e-8)continue;
   for(const x of [lx,rx])if(Math.abs(x)<=r){const z=Math.sqrt(Math.max(0,r*r-x*x));if(z>=lz&&z<=rz)edge(x,z);if(-z>=lz&&-z<=rz)edge(x,-z);}
   for(const z of [lz,rz])if(Math.abs(z)<=r){const x=Math.sqrt(Math.max(0,r*r-z*z));if(x>=lx&&x<=rx)edge(x,z);if(-x>=lx&&-x<=rx)edge(-x,z);}
  }
 };
 for(const c of world.cover||[])box(c);
 for(const room of world.interiors||[])for(const wall of room.walls||[])box(wall,room.top);
 offer(yaw+Math.PI/2+1e-6);offer(yaw-Math.PI/2-1e-6);
 // Heightfield clearance can begin between the exact box events. Probe the
 // intervening arcs, then refine a discovered terrain boundary. Every offered
 // point still receives the full footprint/cover traces (not a height sample).
 const step=Math.PI/36;
 for(let turn=step;turn-step<best&&turn<=Math.PI;turn+=step)for(const sign of [-1,1]){
  if(offer(theta+turn*sign)){
   let lo=turn-step,hi=turn;
   for(let i=0;i<18;i++){const mid=(lo+hi)*.5;if(offer(theta+mid*sign))hi=mid;else lo=mid;}
  }
 }
 if(best<Infinity){eye.copy(arcBest);return true;}
 eye.copy(arcPreferred);return false;
}

// Split at native grid edges (and rendered diagonals for triangle terrain),
// then solve the quadratic/linear clearance inside each continuous patch.
// This catches a ridge even when both ends (and coarse samples) are clear.
function traceColumn(world,start,end,pad,ox,oz,lo=0,hi=1,fixedX=null,fixedZ=null){
 if(lo>=hi)return 1;
 const x=fixedX??start.x+ox,z=fixedZ??start.z+oz;
 const dx=fixedX===null?end.x-start.x:0,dy=end.y-start.y,dz=fixedZ===null?end.z-start.z:0;
 const clearance=t=>start.y+dy*t-pad-world.heightAt(x+dx*t,z+dz*t);
 cuts.length=0;cuts.push(lo,hi);
 const segments=world._gseg,arena=world._ghArena||world.ARENA;
 if(world._gh&&segments&&arena){
  const cell=arena*2/segments;
  for(const [from,delta]of [[x,dx],[z,dz]]){
   if(Math.abs(delta)<1e-12)continue;
   const low=Math.max(0,Math.ceil((Math.min(from+delta*lo,from+delta*hi)+arena)/cell));
   const high=Math.min(segments,Math.floor((Math.max(from+delta*lo,from+delta*hi)+arena)/cell));
   for(let i=low;i<=high;i++){const t=(i*cell-arena-from)/delta;if(t>lo&&t<hi)cuts.push(t);}
   // Match heightAt's clamped final edge, not an invented unbounded field.
   const edge=(arena-cell*.0001-from)/delta;if(edge>lo&&edge<hi)cuts.push(edge);
  }
 }
 cuts.sort((a,b)=>a-b);
 if(world._ghTriangles&&world._gh&&segments&&arena){
  const k=segments/(2*arena),count=cuts.length;
  const gx=t=>clamp((x+dx*t+arena)*k,0,segments-.0001);
  const gz=t=>clamp((z+dz*t+arena)*k,0,segments-.0001);
  for(let i=1;i<count;i++){
   const l=cuts[i-1],r=cuts[i],m=(l+r)*.5;
   const diagonal=Math.floor(gx(m))+Math.floor(gz(m))+1;
   const a=gx(l)+gz(l)-diagonal,b=gx(r)+gz(r)-diagonal;
   if(a*b<0)cuts.push(l+(r-l)*a/(a-b));
  }
  cuts.sort((a,b)=>a-b);
 }
 for(let i=1;i<cuts.length;i++){
  const lo=cuts[i-1],hi=cuts[i];if(hi-lo<1e-12)continue;
  const c=clearance(lo);if(c<=0)return lo;
  const last=clearance(hi),mid=clearance((lo+hi)*.5),a=2*(c+last-2*mid),b=last-c-a;
  let root=Infinity;
  if(Math.abs(a)<1e-10){if(b<0)root=-c/b;}
  else{
   const discriminant=b*b-4*a*c;
   if(discriminant>=0){
    const d=Math.sqrt(discriminant),r1=(-b-d)/(2*a),r2=(-b+d)/(2*a);
    if(r1>=0)root=r1;if(r2>=0)root=Math.min(root,r2);
   }
  }
  if(root<=1)return lo+(hi-lo)*Math.max(0,root);
 }
 return 1;
}

// Each entry is a native grid boundary and the time interval during which the
// moving footprint contains it. Include heightAt's clamped outer boundaries.
function footprintSlices(out,world,start,end,pad){
 out.length=0;
 const segments=world._gseg,arena=world._ghArena||world.ARENA,cell=2*arena/segments,delta=end-start;
 const add=value=>{
  let lo=0,hi=1;
  if(Math.abs(delta)<1e-12){if(Math.abs(value-start)>pad)return;}
  else{const a=(value-pad-start)/delta,b=(value+pad-start)/delta;lo=Math.max(0,Math.min(a,b));hi=Math.min(1,Math.max(a,b));}
  if(lo<hi)out.push(value,lo,hi);
 };
 const low=Math.max(0,Math.ceil((Math.min(start,end)-pad+arena)/cell));
 const high=Math.min(segments-1,Math.floor((Math.max(start,end)+pad+arena)/cell));
 for(let i=low;i<=high;i++)add(i*cell-arena);
 add(arena-cell*.0001);
}

export function traceCameraGround(world,start,end,pad){
 let t=traceColumn(world,start,end,pad,0,0);
 if(pad<=0)return clamp(t,0,1);
 for(const x of [-pad,pad])for(const z of [-pad,pad])t=Math.min(t,traceColumn(world,start,end,pad,x,z));
 if(world._gh&&world._gseg&&(world._ghArena||world.ARENA)){
  // A bilinear patch reaches its extrema at rectangle corners. The footprint
  // can straddle several patches: cover its moving corners, intersections of
  // its edges with grid lines, AND the enclosed stationary grid vertices.
  // Five ray samples alone miss a narrow ridge between the rays.
  footprintSlices(xSlices,world,start.x,end.x,pad);footprintSlices(zSlices,world,start.z,end.z,pad);
  for(let i=0;i<xSlices.length;i+=3){
   const x=xSlices[i],lo=xSlices[i+1],hi=xSlices[i+2];
   for(const edge of [-pad,pad])t=Math.min(t,traceColumn(world,start,end,pad,0,edge,lo,Math.min(hi,t),x));
   for(let j=0;j<zSlices.length;j+=3)t=Math.min(t,traceColumn(world,start,end,pad,0,0,Math.max(lo,zSlices[j+1]),Math.min(hi,zSlices[j+2],t),x,zSlices[j]));
  }
  for(let j=0;j<zSlices.length;j+=3)for(const edge of [-pad,pad])t=Math.min(t,traceColumn(world,start,end,pad,edge,0,zSlices[j+1],Math.min(zSlices[j+2],t),null,zSlices[j]));
  if(world._ghTriangles){
   // A triangle ridge can cross a footprint edge between all four corner
   // rays, entirely inside one grid cell. Trace each moving edge/diagonal
   // intersection as well; these complete the clipped triangle's vertices.
   const arena=world._ghArena||world.ARENA,cell=2*arena/world._gseg;
   const sum=start.x+start.z,delta=end.x+end.z-sum;
   const low=Math.max(1,Math.ceil((Math.min(sum,sum+delta)-2*pad+2*arena)/cell));
   const high=Math.min(2*world._gseg-1,Math.floor((Math.max(sum,sum+delta)+2*pad+2*arena)/cell));
   for(let k=low;k<=high;k++)for(const side of [-pad,pad]){
    const line=k*cell-2*arena,offset=line-sum-side;
    let lo=0,hi=t;
    if(Math.abs(delta)<1e-12){if(Math.abs(offset)>pad)continue;}
    else{const a=(offset-pad)/delta,b=(offset+pad)/delta;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}
    if(lo>=hi)continue;
    diagonalStart.set(start.x+side,start.y,line-start.x-side);
    diagonalEnd.set(end.x+side,end.y,line-end.x-side);
    t=Math.min(t,traceColumn(world,diagonalStart,diagonalEnd,pad,0,0,lo,hi));
    diagonalStart.set(line-start.z-side,start.y,start.z+side);
    diagonalEnd.set(line-end.z-side,end.y,end.z+side);
    t=Math.min(t,traceColumn(world,diagonalStart,diagonalEnd,pad,0,0,lo,Math.min(hi,t)));
   }
  }
 }
 return clamp(t,0,1);
}

export function resolveGroundCamera(world,subject,anchor,eye,pad,dt=1/60){
 desired.copy(eye);
 let state=world._groundCamState;
 if(!state||world._chaseSnap||state.subject!==subject||state.anchor.distanceToSquared(anchor)>3600){
  state=world._groundCamState={subject,anchor:anchor.clone(),offset:0,pullback:0,correction:null};
 }
 // Only collision correction has history. Physics travel and mouse aim retain
 // their direct response. Project a small return-to-center step into free arc
 // space, so an equally good route on the other side cannot steal ownership.
 const preference=state.offset-Math.sign(state.offset)*Math.min(Math.abs(state.offset),Math.PI*Math.max(0,Math.min(dt,.05)));
 // Anticipate contact over half a boom. A smooth minimum rounds the transition
 // without ever exceeding the safe trace distance, so near-floor pitch does
 // not suddenly pull a 25u boom into the fighter. Clear air remains exact.
 extended.copy(anchor).lerp(desired,1.5);
 const safe=traceCameraGround(world,anchor,extended,pad)*1.5;
 const h=Math.max(.5-Math.abs(1-safe),0)/.5;
 const ground=Math.max(0,Math.min(1,safe)-h*h*.125);
 const cover=world._camNearestT(anchor.x,anchor.y,anchor.z,desired.x,desired.y,desired.z,pad);
 state.cover=cover;
 const activation=clamp((1-ground)/.6,0,1);
 // Cover can compress an airborne boom into the chest even with completely
 // clear terrain. Recover rear-arc space before entering the body envelope;
 // the smooth ramp leaves ordinary distant cover contraction unchanged.
 const size=subject.sizeScale??1;
 // Prone flight and raised casting arms occupy more of the optical axis than
 // an upright standing body. Begin its detour before a pauldron fills the aim.
 const envelope=subject.flying?18:8;
 const proximity=clamp((envelope*size-anchor.distanceTo(desired)*cover)/(4*size),0,1);
 const coverClearance=proximity*proximity*(3-2*proximity);
 const blend=Math.max(activation*activation*(3-2*activation),coverClearance);
 // Begin at the ordinary cover-contracted boom, then gradually recover its
 // radius as ground clearance takes over. ground===1 must not change owners
 // abruptly: the two paths agree exactly at the first terrain contact.
 eye.copy(anchor).lerp(desired,Math.min(ground,cover)*(1-blend)+ground*blend);
 if(ground<1){
  // Ground compression is the sole owner of this clearance. It vanishes
  // continuously at the boundary: no persistent shoulder camera or aim change.
  const p=subject.parts,frame=p?.g.userData.frame;
  // Bind dimensions, NEVER an animated shoulder translation: source strides
  // rotate/translate that pivot and would pump the camera each running step.
  // Include arm reach in the horizontal envelope as the body turns to strafe.
  const reach=(p?.armR.userData.upperLength??1.65)+(p?.armR.userData.foreLength??1.55);
  const width=(Math.hypot(1.58*(frame?.broad??1),reach)+.9*(frame?.bulk??1))*(subject.sizeScale??1);
  const side=(subject.def?.model?.camera?.shoulder??0)<0?-1:1;
  const clearance=(width+pad)*(1-ground)*side,yaw=world._lookYaw;
  eye.x-=Math.cos(yaw)*clearance;eye.z+=Math.sin(yaw)*clearance;
  // Moving sideways creates a new terrain path. Resolve it first, then retain
  // the safe horizontal clearance around cover instead of collapsing it.
  eye.lerp(anchor,1-traceCameraGround(world,anchor,eye,pad));
 }
 const theta=Math.atan2(eye.x-anchor.x,eye.z-anchor.z);
 baseEye.copy(eye);
 const radius=Math.hypot(eye.x-anchor.x,eye.z-anchor.z),height=eye.y;
 const carry=Math.min(radius,Math.max(0,state.pullback-8*Math.max(0,Math.min(dt,.05))));
 if(radius>1e-5&&carry>0){eye.x=anchor.x+Math.sin(theta)*(radius-carry);eye.z=anchor.z+Math.cos(theta)*(radius-carry);}
 let wall=world._camNearestT(anchor.x,anchor.y,anchor.z,eye.x,eye.y,eye.z,pad);
 if(((ground<1||coverClearance>0)&&wall<1)||Math.abs(preference)>1e-7){
  if(!clearGroundArc(world,anchor,eye,pad,preference))eye.lerp(anchor,1-wall);
 }
 // A rear arc can end at the forward half-plane. Anticipate that end rather
 // than holding a full-radius branch until it disappears: ease inward around
 // the cover corner, then recover range over time. This lets lateral travel
 // leave a detour without switching across the obstacle in one frame.
 for(let i=0;i<2;i++){
  const angle=Math.atan2(eye.x-anchor.x,eye.z-anchor.z),r=Math.hypot(eye.x-anchor.x,eye.z-anchor.z);
  const rear=world._lookYaw+Math.PI,delta=Math.atan2(Math.sin(rear-angle),Math.cos(rear-angle));
  const margin=Math.PI/2-Math.abs(delta);if(margin>=.4||r<1e-5)break;
  const probe=angle+Math.sign(delta)*.3;
  extended.set(anchor.x+Math.sin(probe)*radius,height,anchor.z+Math.cos(probe)*radius);
  const t=world._camNearestT(anchor.x,anchor.y,anchor.z,extended.x,extended.y,extended.z,pad);
  if(t>=1)break;
  const u=clamp(margin/.4,0,1),weight=u*u*(3-2*u),shorter=Math.min(r,radius*(t+(1-t)*weight));
  if(shorter>=r-1e-7)break;
  eye.set(anchor.x+Math.sin(theta)*shorter,height,anchor.z+Math.cos(theta)*shorter);
  wall=world._camNearestT(anchor.x,anchor.y,anchor.z,eye.x,eye.y,eye.z,pad);
  if(!clearGroundArc(world,anchor,eye,pad,preference))eye.lerp(anchor,1-wall);
 }
 // Limit the correction itself, not the subject's travel or mouse-driven boom.
 // The interpolated offset may cut a convex cover corner, so retrace the whole
 // visibility segment before accepting it; no interpolation bypasses solids.
 correction.copy(eye).sub(baseEye);
 if(state.correction){
  const distance=correction.distanceTo(state.correction),step=90*Math.max(0,Math.min(dt,.05));
  if(distance>step){correction.lerp(state.correction,1-step/distance);eye.copy(baseEye).add(correction);}
 }
 eye.lerp(anchor,1-traceCameraGround(world,anchor,eye,pad));
 eye.lerp(anchor,1-world._camNearestT(anchor.x,anchor.y,anchor.z,eye.x,eye.y,eye.z,pad));
 state.offset=Math.atan2(Math.sin(Math.atan2(eye.x-anchor.x,eye.z-anchor.z)-theta),Math.cos(Math.atan2(eye.x-anchor.x,eye.z-anchor.z)-theta));
 state.pullback=Math.max(0,radius-Math.hypot(eye.x-anchor.x,eye.z-anchor.z));
 (state.correction||(state.correction=new THREE.Vector3())).copy(eye).sub(baseEye);
 state.anchor.copy(anchor);
}
