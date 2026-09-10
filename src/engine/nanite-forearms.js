// Figure-owned, forearm-local solids and bounded actual-cell contact queries.
// Damage policy remains in the native Fighter pipeline, never in the query.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {naniteConfig,validateNaniteLoadout} from '../data/nanite-tuning.js';
import {attackIdentity} from '../data/attack-tuning.js';
import {slotUnlocked} from '../data/progression.js';

const PALETTES={steel:['#aeb7bb',.8,.35],titanium:['#bdc2b8',.85,.4],blackened:['#4b5256',.7,.55]};
const vec=new THREE.Vector3(),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),size=new THREE.Vector3();
const clamp=THREE.MathUtils.clamp;
function ownedInstances(name,geometry,material,count){
 const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.name=name;mesh.count=0;mesh.frustumCulled=false;
 mesh.userData.naniteOwned=true;mesh.castShadow=true;mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);return mesh;
}
function measure(parts,arm,root){
 parts.g.updateMatrixWorld(true);parts.skin?.skeleton.update();
 const inverse=root.matrixWorld.clone().invert(),fore=arm.children[1],hand=arm.children[2];
 let skinRadius=0,skinFront=-Infinity,handFront=Infinity,wristRadius=0,foreSamples=0,handSamples=0;
 const handVertices=[];
 const sample=(mesh,i,foreWeight,handWeight,skinned)=>{
  if(skinned)mesh.getVertexPosition(i,vec);else vec.fromBufferAttribute(mesh.geometry.attributes.position,i);
  vec.applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
  if(foreWeight>=.5){skinRadius=Math.max(skinRadius,Math.hypot(vec.x,vec.z));skinFront=Math.max(skinFront,vec.z);foreSamples++;}
  if(handWeight>=.5){handFront=Math.min(handFront,vec.y);wristRadius=Math.max(wristRadius,Math.hypot(vec.x,vec.z));handSamples++;handVertices.push([mesh,i]);}
 };
 if(parts.skin){
  const records=parts.skin.records,foreIndices=new Set(),handIndices=new Set();
  for(const r of records){if(r.driver===fore)foreIndices.add(r.i);if(r.driver===hand||r.hand===hand)handIndices.add(r.i);}
  for(const mesh of parts.skin.meshes){
   const {position,skinIndex,skinWeight}=mesh.geometry.attributes;
   for(let i=0;i<position.count;i++){
    let fw=0,hw=0;for(let j=0;j<4;j++){const index=skinIndex.array[i*4+j],weight=skinWeight.array[i*4+j];if(foreIndices.has(index))fw+=weight;if(handIndices.has(index))hw+=weight;}
    if(fw>=.5||hw>=.5)sample(mesh,i,fw,hw,true);
   }
  }
 }else for(const [mesh,isFore]of [[fore,true],[hand,false]])for(let i=0;i<mesh.geometry.attributes.position.count;i++)sample(mesh,i,isFore?1:0,isFore?0:1,false);
 if(!foreSamples||!handSamples||!Number.isFinite(skinRadius+skinFront+handFront))throw new Error('Nanite forearm has no measurable skin/hand surface.');
 // Fit the hand as well as the sleeve: the source female fingers extend past
 // the sleeve in an open grip. Probe the native open/rest finger transforms and
 // a bounded wrist envelope once at construction, then restore every matrix.
 // No new pose, per-frame vertex sampling, or whole-body bounding proxy is used.
 const savedHand=hand.quaternion.clone(),savedMorph=hand.morphTargetInfluences?.[0],fingers=(parts.skin?.records||[]).filter(r=>!r.driver&&r.hand===hand);
 const savedBones=fingers.map(r=>parts.skin.skeleton.bones[r.i].matrix.clone());
 try{
  if(savedMorph!==undefined)hand.morphTargetInfluences[0]=1;
  for(const r of fingers)parts.skin.skeleton.bones[r.i].matrix.compose(r.position,r.quaternion,r.scale);
  for(const angle of [-.35,0,.35]){
   hand.quaternion.copy(savedHand).multiply(rotation.setFromAxisAngle(size.set(0,0,1),angle));parts.g.updateMatrixWorld(true);parts.skin?.skeleton.update();
   for(const [mesh,i]of handVertices){mesh.getVertexPosition(i,vec).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);wristRadius=Math.max(wristRadius,Math.hypot(vec.x,vec.z));}
  }
 }finally{
  hand.quaternion.copy(savedHand);if(savedMorph!==undefined)hand.morphTargetInfluences[0]=savedMorph;
  fingers.forEach((r,i)=>parts.skin.skeleton.bones[r.i].matrix.copy(savedBones[i]));parts.g.updateMatrixWorld(true);parts.skin?.skeleton.update();
 }
 return {skinRadius,skinFront,handFront,wristRadius,shoulderOffset:Math.abs(arm.position.x),foreSamples,handSamples,sampleKind:parts.skin?'skinned':'procedural'};
}
function cuffGeometry(inner,thickness,length){
 // EllipseCurve uses twice curveSegments samples. Fit the polygon apothem,
 // not its corner radius, so its flat inner faces retain the full clearance.
 inner/=Math.cos(Math.PI/24);
 const outer=inner+thickness,shape=new THREE.Shape();shape.absarc(0,0,outer,0,Math.PI*2,false);
 const hole=new THREE.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);shape.holes.push(hole);
 const g=new THREE.ExtrudeGeometry(shape,{depth:length,bevelEnabled:false,curveSegments:12,steps:1});g.translate(0,0,-length/2);g.rotateX(Math.PI/2);return g;
}
function box(cell,center,dimensions,yaw=0){
 const quaternion=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw),matrix=new THREE.Matrix4().compose(center,quaternion,dimensions);
 return {cell,center,size:dimensions,quaternion,matrix};
}
function bodyVolumes(parts){
 const drivers=[parts.torso,parts.head,parts.pelvis,parts.neck].filter(Boolean),volumes=drivers.map(driver=>({driver,box:new THREE.Box3(),inverse:driver.matrixWorld.clone().invert()}));
 if(parts.skin){
  const byIndex=new Map(parts.skin.records.filter(r=>r.driver).map(r=>[r.i,r.driver]));
  for(const mesh of parts.skin.meshes){const {position,skinIndex,skinWeight}=mesh.geometry.attributes;
   for(let i=0;i<position.count;i++)for(const volume of volumes){
    let weight=0;for(let j=0;j<4;j++)if(byIndex.get(skinIndex.array[i*4+j])===volume.driver)weight+=skinWeight.array[i*4+j];
    if(weight>=.5){mesh.getVertexPosition(i,vec).applyMatrix4(mesh.matrixWorld).applyMatrix4(volume.inverse);volume.box.expandByPoint(vec);}
   }
  }
 }
 for(const volume of volumes)if(volume.box.isEmpty()){volume.driver.geometry.computeBoundingBox();volume.box.copy(volume.driver.geometry.boundingBox);}
 return volumes.map(({driver,box})=>({driver,box}));
}
export function buildNaniteForearms(parts,def){
 validateNaniteLoadout(def.abilities);
 if(Object.values(def.abilities||{}).some(source=>source.naniteForm)){parts.g.updateMatrixWorld(true);parts.naniteBodyVolumes=bodyVolumes(parts);}
 for(const [slot,source]of Object.entries(def.abilities||{})){
  const config=naniteConfig(source);if(!config)continue;
  const arm=config.naniteAttachment==='right-forearm'?parts.armL:parts.armR,fore=arm.children[1],S=parts.g.userData.frame.scale,L=arm.userData.foreLength;
  if(!Number.isFinite(S+L)||S<=0||L<=.24*S)throw new Error('Nanite dimensions cannot clear the elbow.');
  const root=new THREE.Group();root.name=`nanite-${slot}`;
  // Dimensions below are body-scaled once. Cancel the driven mesh's nonuniform
  // scale here; its position and orientation still own every attachment vertex.
  root.scale.set(1/fore.scale.x,1/fore.scale.y,1/fore.scale.z);fore.add(root);
  const fit=measure(parts,arm,root);fit.scale=S;fit.foreLength=L;fit.cuffInner=fit.skinRadius+.08*S;
  const [color,metalness,roughness]=PALETTES[config.naniteMaterial],material=new THREE.MeshStandardMaterial({color,metalness,roughness});
  const cuff=new THREE.Mesh(cuffGeometry(fit.cuffInner,.06*S,.32*S),material);cuff.name=`nanite-${slot}-cuff`;cuff.castShadow=true;root.add(cuff);
  const layout=[],proximal=L/2-.12*S,offset=config.naniteOffset*L;let socket=null,saddle=null,vents=null;
  if(config.naniteForm==='cannon'){
   const half=.38*S*config.naniteWidth,length=1.45*L*config.naniteLength,side=config.naniteAttachment==='right-forearm'?-1:1;
   const x=side*(Math.max(fit.skinRadius,fit.wristRadius)+half+.08*S);
   // Reserve the complete allowed axial adjustment before positioning: both
   // extremes keep their literal length, elbow gap and actual closed-hand gap.
   const end=Math.min(fit.handFront-.10*S-.15*L,proximal-length-.15*L)+offset,y=end+length/2;
   for(let i=0;i<6;i++){const a=i*Math.PI/3;layout.push(box(i,new THREE.Vector3(x+Math.cos(a)*half*.78,y,Math.sin(a)*half*.78),new THREE.Vector3(half*.99,length,half*.16),Math.PI/2-a));}
   socket=new THREE.Object3D();socket.name='weapon-muzzle';socket.position.set(x,end,0);root.add(socket);
   // A solid, non-protecting fitting joins the cuff to the inner stave. It has
   // no cell/armor proxy and never crosses the measured sleeve or hand lane.
   const from=new THREE.Vector3(side*(fit.cuffInner/Math.cos(Math.PI/24)+.035*S),0,0),to=new THREE.Vector3(x-side*half*.80,clamp(0,end+.06*S,end+length-.06*S),0);
   const direction=to.clone().sub(from),saddleGeometry=new THREE.BoxGeometry(direction.length(),.12*S,.12*S);
   saddleGeometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1,0,0),direction.normalize()));saddleGeometry.translate((from.x+to.x)/2,(from.y+to.y)/2,0);
   saddle=new THREE.Mesh(saddleGeometry,material);saddle.name=`nanite-${slot}-saddle`;saddle.castShadow=true;root.add(saddle);
   fit.barrelLength=length;fit.barrelHalfWidth=half;
   const bands=[];for(const t of [.28,.65]){
    const band=new THREE.TorusGeometry(half*.97,half*.05,4,24);band.rotateX(Math.PI/2);band.translate(x,end+length*t,0);bands.push(band);
   }
   const ventGeometry=mergeGeometries(bands);bands.forEach(g=>g.dispose());
   vents=new THREE.Mesh(ventGeometry,new THREE.MeshBasicMaterial({color:source.color2||source.color||'#ffd97a',transparent:true,opacity:0,depthWrite:false}));vents.name=`nanite-${slot}-vents`;vents.visible=false;root.add(vents);
  }else{
   const width=2.6*S*config.naniteWidth,length=2.5*S*config.naniteLength,thickness=.12*S;
   const top=proximal-.15*L+offset,z=fit.skinFront+.08*S+thickness/2;
   for(let row=0;row<3;row++)for(let col=0;col<3;col++)layout.push(box(row*3+col,new THREE.Vector3((col-1)*width/3,top-(row+.5)*length/3,z),new THREE.Vector3(width/3,length/3,thickness)));
  }
  const maxDimension=Math.max(...layout.flatMap(c=>c.size.toArray()));
  const hullGeometry=config.naniteContour==='beveled'?new RoundedBoxGeometry(1,1,1,2,Math.min(.05,.03*S/maxDimension)):new THREE.BoxGeometry(1,1,1);
  const hull=ownedInstances(`nanite-${slot}-hull`,hullGeometry,material,layout.length),capacity=config.naniteForm==='cannon'?64:96;
  const fragments=ownedInstances(`nanite-${slot}-fragments`,new THREE.BoxGeometry(1,1,1),material,capacity);root.add(hull,fragments);root.visible=false;
  (parts.nanites||=new Map()).set(slot,{slot,config,root,arm,fit,layout,hull,fragments,cuff,saddle,socket,vents,chargeStage:0,capacity,epoch:null});
 }
 return parts.nanites;
}
const noise=(seed,i)=>{const v=Math.sin(seed*17.13+i*113.71)*43758.5453;return v-Math.floor(v);};
function seedFor(slot,epoch){let seed=epoch;for(const c of slot)seed=seed*31+c.charCodeAt(0);return seed;}
export function presentNanites(fighter){
 const state=fighter._nanites,views=fighter.parts.nanites;if(!views)return;
 fighter.obj.updateMatrixWorld(true);
 for(const [slot,v]of views){
  const m=state?.modules.get(slot),active=m&&!state.disposed&&!m.retired&&m.unlocked&&m.deployed&&fighter.state!=='ko'&&!fighter._formDisposed;
  v.epoch=m?.epoch??null;v.root.visible=!!active;v.hull.count=0;v.fragments.count=0;v.chargeStage=0;if(v.vents)v.vents.visible=false;if(!active)continue;
  const cfg=m.config,p=clamp(m.assemblyT/cfg.naniteAssemblyTime,0,1),close=clamp((p-.75)*4,0,1),seed=seedFor(slot,m.epoch);
  const s=fighter.slots?.[slot];if(v.vents&&m.ready&&s?.charging){
   const charge=clamp(s.chargeT/(s.def.maxCharge||2.2),0,1);v.chargeStage=charge>=cfg.naniteStage2?2:charge>=cfg.naniteStage1?1:0;
   v.vents.visible=v.chargeStage>0;v.vents.material.opacity=clamp((charge-cfg.naniteStage1)/(cfg.naniteStage2-cfg.naniteStage1),0,1)*Math.min(1,fighter.def.effects?.charge?.intensity??1);
  }
  // Close along the forearm, never radially through the measured skin.
  v.cuff.visible=close>0;v.cuff.scale.set(1,close,1);
  if(v.saddle){v.saddle.visible=close>0;v.saddle.scale.set(1,close,1);}
  for(const c of v.layout)if(!m.cells[c.cell].broken&&close>0){size.copy(c.size).multiplyScalar(close);matrix.compose(c.center,c.quaternion,size);v.hull.setMatrixAt(v.hull.count++,matrix);}
  const count=Math.floor(v.capacity*cfg.naniteDensity),perCell=Math.floor(count/m.cells.length),inverse=v.root.matrixWorld.clone().invert();
  for(let i=0;i<count;i++){
   const cellIndex=i%m.cells.length,c=m.cells[cellIndex],target=v.layout[cellIndex].center;
   if(p<1){
    const t=clamp((p-noise(seed,i)*.16)/.84,0,1),smooth=t*t*(3-2*t);
    // Each fragment has its final cell's exterior lane. Sliding down that
    // lane cannot take the old straight-line shortcut through the forearm.
    const outward=v.fit.scale*(.12+noise(seed,i+81)*.12);
    vec.copy(target);vec.y=v.fit.foreLength*.5-.18*v.fit.scale;
    if(cfg.naniteForm==='cannon')vec.x+=(cfg.naniteAttachment==='right-forearm'?-1:1)*outward;
    else vec.z+=outward;
    vec.lerp(target,smooth);
   }else{
    if(!c.hitPoint||Math.floor(i/m.cells.length)>=perCell)continue;
    const elapsed=c.quietT+c.reformT,kick=Math.min(.12,elapsed)*cfg.naniteBreakSpeed;
    vec.set(c.hitPoint.x,c.hitPoint.y,c.hitPoint.z).addScaledVector(size.set(c.hitNormal.x,c.hitNormal.y,c.hitNormal.z).normalize(),kick);
    vec.x+=(noise(seed+cellIndex,i)-.5)*kick*.6;vec.y+=(noise(seed+cellIndex,i+16)-.5)*kick*.6;vec.z+=(noise(seed+cellIndex,i+33)-.5)*kick*.6;
    vec.applyMatrix4(inverse);const t=clamp(c.reformT/cfg.naniteReformTime,0,1);vec.lerp(target,t*t*(3-2*t));
   }
   size.setScalar(v.fit.scale*.055*(.7+noise(seed,i+40)));rotation.setFromEuler(new THREE.Euler(noise(seed,i),noise(seed,i+1),noise(seed,i+2)));
   matrix.compose(vec,rotation,size);v.fragments.setMatrixAt(v.fragments.count++,matrix);
  }
  v.hull.instanceMatrix.needsUpdate=true;v.fragments.instanceMatrix.needsUpdate=true;
 }
}
export function snapshotNaniteCells(fighter){
 const cells=[],state=fighter._nanites;if(!state||state.disposed||fighter.state==='ko'||fighter._formDisposed)return cells;
 fighter.obj.updateMatrixWorld(true);
 for(const [slot,v]of fighter.parts.nanites||[]){
  const m=state.modules.get(slot);if(!m||m.retired||!m.unlocked||!m.deployed||m.assemblyT+1e-10<m.config.naniteAssemblyTime||v.epoch!==m.epoch)continue;
  for(const c of v.layout)if(!m.cells[c.cell].broken)cells.push({slot,epoch:m.epoch,cell:c.cell,matrix:v.root.matrixWorld.clone().multiply(c.matrix)});
 }
 return cells;
}
const contactTokens=new WeakSet(),cellBox=new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5));
function activeModule(f,slot){
 const m=f._nanites?.modules.get(slot),v=f.parts?.nanites?.get(slot);
 if(!m||!v||f._nanites.disposed||f._formDisposed||f.alive===false||m.retired||!m.unlocked||!m.deployed||m.assemblyT+1e-10<m.config.naniteAssemblyTime||v.epoch!==m.epoch||!slotUnlocked(f,slot))return null;
 try{if(attackIdentity(f.slots?.[slot]?.def)!==m.sourceKey)return null;}catch{return null;}
 return {m,v};
}
export function hasNaniteCells(f){
 for(const [slot]of f._nanites?.modules||[]){const live=activeModule(f,slot);if(live&&live.m.cells.some(c=>!c.broken))return true;}return false;
}
export function snapshotNaniteContactFrame(f){
 return {cells:snapshotNaniteCells(f).map(c=>({...c,view:f.parts.nanites.get(c.slot)})),
  bodies:(f.parts.naniteBodyVolumes||[]).map(v=>({driver:v.driver,matrix:v.driver.matrixWorld.clone()}))};
}
export function validNaniteContact(f,contact){
 if(!contact||!contactTokens.has(contact)||contact.owner!==f)return false;
 const live=activeModule(f,contact.slot);return !!(live&&live.v===contact.view&&live.m.epoch===contact.epoch&&live.m.cells[contact.cell]&&!live.m.cells[contact.cell].broken);
}
export function canAbsorbNanite(f,contact,opts={}){
 if(!validNaniteContact(f,contact)||f._nanites.modules.get(contact.slot).config.naniteForm!=='shield'||!opts.src||!f.guarding||f.staggerT>0||f.chargingKi||f.invuln>0||f.phase||opts.unblockable||opts.trueDamage)return false;
 const dx=opts.src.pos.x-f.pos.x,dz=opts.src.pos.z-f.pos.z,d=Math.hypot(dx,dz)||1;
 return f.def.guardType==='barrier'||dx/d*f.aim.x+dz/d*f.aim.z>-.15;
}
// Damage admission consumes the query capability even when native immunity
// later rejects the hit. Captured options cannot bill repair or splash again.
export function claimNaniteContact(f,contact,opts){
 const live=validNaniteContact(f,contact),absorb=live&&canAbsorbNanite(f,contact,opts);
 if(contact)contactTokens.delete(contact);return live?{contact,absorb}:null;
}
// Exact sphere vs box distance on piecewise quadratic intervals. Expanding all
// three box axes alone admits false diagonal-corner contacts. Work in physical
// box-axis units, retaining the caller's finite segment parameter and radius.
function sphereBox(from,to,r,box,transform,previous=null){
 const inv=transform.clone().invert(),a=from.clone().applyMatrix4(previous?previous.clone().invert():inv),b=to.clone().applyMatrix4(inv),s=new THREE.Vector3().setFromMatrixScale(transform);
 a.multiply(s);b.multiply(s);const lo=box.min.clone().multiply(s),hi=box.max.clone().multiply(s),d=b.clone().sub(a),cuts=[0,1];
 for(const k of ['x','y','z'])if(Math.abs(d[k])>1e-12)for(const face of [lo[k],hi[k]]){const t=(face-a[k])/d[k];if(t>0&&t<1)cuts.push(t);}
 cuts.sort((x,y)=>x-y);let hit=Infinity;
 for(let i=0;i<cuts.length-1;i++){
  const left=cuts[i],right=cuts[i+1],mid=(left+right)/2;let A=0,B=0,C=-r*r;
  for(const k of ['x','y','z']){const at=a[k]+d[k]*mid,edge=at<lo[k]?lo[k]:at>hi[k]?hi[k]:null;if(edge===null)continue;const v=a[k]-edge;A+=d[k]*d[k];B+=v*d[k];C+=v*v;}
  if(A*left*left+2*B*left+C<=1e-10){hit=left;break;}
  if(A>1e-16){const disc=B*B-A*C;if(disc>=0){const t=(-B-Math.sqrt(disc))/A;if(t>=left-1e-10&&t<=right+1e-10){hit=Math.max(left,t);break;}}}
 }
 if(!Number.isFinite(hit))return null;
 const center=a.clone().addScaledVector(d,hit),surface=center.clone().clamp(lo,hi),normal=center.clone().sub(surface);
 if(normal.lengthSq()<1e-16){let best=Infinity;for(const k of ['x','y','z'])for(const face of [lo[k],hi[k]]){const distance=Math.abs(center[k]-face);if(distance<best){best=distance;surface.copy(center);surface[k]=face;normal.set(0,0,0);normal[k]=face===lo[k]?-1:1;}}}
 let contactFrame=transform;
 if(previous){
  // The endpoint-relative sweep is a bounded approximation of articulated
  // motion, not hidden pose resampling. Feedback uses one consistent rigid
  // frame at its selected time; never an old surface with a final-frame normal.
  const p=new THREE.Vector3(),q=new THREE.Quaternion(),scale=new THREE.Vector3(),p2=new THREE.Vector3(),q2=new THREE.Quaternion(),scale2=new THREE.Vector3();
  previous.decompose(p,q,scale);transform.decompose(p2,q2,scale2);contactFrame=new THREE.Matrix4().compose(p.lerp(p2,hit),q.slerp(q2,hit),scale.lerp(scale2,hit));
 }
 surface.divide(s);normal.multiply(s).applyMatrix3(new THREE.Matrix3().getNormalMatrix(contactFrame)).normalize();
 const point=surface.clone().applyMatrix4(contactFrame);
 return {t:Math.max(0,Math.min(1,hit)),point,normal};
}
// One winner before physical torso/head/pelvis, independent of generous body
// proxies. Previous snapshots belong to the exact same view, never a form alias.
export function naniteContact(f,from,to,radius,out={},previous=null,deferBody=false){
 out.naniteContact=null;out.deferBody=false;out.t=Infinity;if(!hasNaniteCells(f))return false;f.obj.updateMatrixWorld(true);
 const cells=[];for(const [slot,v]of f.parts.nanites){const live=activeModule(f,slot);if(!live)continue;for(const c of v.layout)if(!live.m.cells[c.cell].broken){
  const old=previous?.cells?.find(p=>p.slot===slot&&p.epoch===live.m.epoch&&p.cell===c.cell&&p.view===v);
  cells.push({slot,epoch:live.m.epoch,cell:c.cell,view:v,matrix:v.root.matrixWorld.clone().multiply(c.matrix),previous:old?.matrix});
 }}
 const volumes=(f.parts.naniteBodyVolumes||[]).filter(v=>v.driver!==f.parts.neck);
 const query=end=>{
  let body=Infinity,best=null;
  for(const v of volumes){const old=previous?.bodies?.find(p=>p.driver===v.driver);const h=sphereBox(from,end,radius,v.box,v.driver.matrixWorld,old?.matrix);if(h)body=Math.min(body,h.t);}
  for(const c of cells){const hit=sphereBox(from,end,radius,cellBox,c.matrix,c.previous);if(hit&&hit.t<body-1e-9&&(!best||hit.t<best.t))best={...hit,...c};}
  return best;
 };
 const hit=query(to);
 if(hit){out.t=hit.t;out.naniteContact={owner:f,slot:hit.slot,epoch:hit.epoch,cell:hit.cell,view:hit.view,point:hit.point,normal:hit.normal};contactTokens.add(out.naniteContact);return true;}
 if(deferBody){
  const direction=to.clone().sub(from),length=direction.length();if(length>1e-10){
   // Look ahead ONLY to defer a premature generous-body candidate. The limit is
   // the literal current cell envelope; no event, cap or damage uses this query.
   let limit=length;for(const c of cells){const center=new THREE.Vector3().setFromMatrixPosition(c.matrix),scale=new THREE.Vector3().setFromMatrixScale(c.matrix);limit=Math.max(limit,center.distanceTo(from)+scale.length()/2+radius);}
   out.deferBody=!!query(from.clone().addScaledVector(direction,limit/length));
  }
 }
 return false;
}
// Semantic capability lookup, never a fallback to the sibling hand or an old
// form's socket. Controllers and final launch may run before Fighter.update.
export function naniteEmitter(fighter,slot,epoch){
 const m=fighter._nanites?.modules.get(slot),v=fighter.parts?.nanites?.get(slot),source=fighter.slots?.[slot]?.def;
 if(!m||!v||m.config.naniteForm!=='cannon'||!m.ready||fighter._nanites.disposed||fighter._formDisposed||fighter.alive===false||!slotUnlocked(fighter,slot)||v.epoch!==m.epoch||(epoch!==undefined&&epoch!==m.epoch))return null;
 try{if(attackIdentity(source)!==m.sourceKey)return null;}catch{return null;}
 v.socket.updateWorldMatrix(true,false);
 const out=v.emitter||={socket:v.socket,arm:v.arm,side:m.config.naniteAttachment==='right-forearm'?-1:1,axis:new THREE.Vector3()};
 out.axis.set(0,-1,0).transformDirection(v.socket.matrixWorld);return out;
}
export function snapshotNaniteForearms(root){
 const instances=[];root.traverse(o=>{if(o.isInstancedMesh&&o.userData.naniteOwned)instances.push(o);});
 for(const source of instances){
  let visible=source.visible;for(let p=source.parent;p&&visible;p=p.parent)visible=p.visible;
  if(visible&&source.count){
   const pieces=[];for(let i=0;i<source.count;i++){source.getMatrixAt(i,matrix);pieces.push(source.geometry.clone().applyMatrix4(matrix));}
   const geometry=mergeGeometries(pieces);for(const piece of pieces)piece.dispose();
   const copy=new THREE.Mesh(geometry,source.material);copy.name=source.name;copy.position.copy(source.position);copy.quaternion.copy(source.quaternion);copy.scale.copy(source.scale);
   copy.userData._snapshotGeometry=true;source.parent.add(copy);
  }
  source.removeFromParent();source.dispose();
 }
 return root;
}
