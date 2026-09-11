import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {World} from '../src/engine/world.js';
import {Game} from '../src/engine/game.js';
import {PowerWorldStage} from '../src/engine/powerworld.js';
import {FRONTLINE_GROUND_RADIUS} from '../src/engine/frontline-terrain.js';
import {readFile} from 'node:fs/promises';
import {outpostDistance} from '../src/engine/frontline-outpost-layout.js';
import {OUTPOST_PAVING,outpostSurfaceAt,OUTPOST_SURFACE_COLOR} from '../src/engine/frontline-outpost-surface.js';

test('dust classification shares paving boundaries with the rendered ground',()=>{
 for(const p of OUTPOST_PAVING){const [x0,x1,z0,z1]=p.rect;
  assert.notEqual(outpostSurfaceAt((x0+x1)/2,(z0+z1)/2),'sand');
  assert.ok(OUTPOST_SURFACE_COLOR.includes(`float ${p.name}=outpostRect`));
 }
 assert.equal(outpostSurfaceAt(-40,-40),'sand');assert.equal(outpostSurfaceAt(-40,0),'asphalt');
 assert.equal(outpostSurfaceAt(0,200),'concrete');assert.equal(outpostSurfaceAt(40,600),'asphalt');
});

test('native surface classification is restored when leaving PowerWorld',()=>{
 const f=fixture(),previous=()=> 'water';f.w.surfaceAt=previous;
 try{f.open();assert.equal(f.w.surfaceAt(-40,-40),'sand');assert.equal(f.w.surfaceAt(-40,0),'asphalt');
  f.stage.close();assert.equal(f.w.surfaceAt,previous);
 }finally{f.dispose();}
});

// Real native heightfield/crater/reset and stage lifecycle; only renderer and
// cloud canvas drawing are absent. Prior relief/grass must survive the venue.
function fixture(){
 const noop=()=>{},w=Object.create(World.prototype),scene=new THREE.Scene();
 const geo=new THREE.PlaneGeometry(480,480,4,4),ground=new THREE.Mesh(geo,new THREE.MeshStandardMaterial());
 ground.rotation.x=-Math.PI/2;scene.add(ground);
 const pa=geo.attributes.position,gh=new Float32Array(pa.count).fill(23);
 for(let i=0;i<pa.count;i++)pa.setZ(i,23);
 Object.assign(w,{scene,ground,groundGeo:geo,_gh:gh,_ghBase:gh.slice(),_gvx:Float32Array.from({length:pa.count},(_,i)=>pa.getX(i)),
  _gvz:Float32Array.from({length:pa.count},(_,i)=>-pa.getY(i)),_gseg:4,_ghArena:240,_normalsDirty:true,
  grass:new THREE.InstancedMesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial(),1),_canopy:new THREE.InstancedMesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial(),1),
  _gOn:new Uint8Array([1]),_gPos:new Float32Array([0,0]),_gRot:new Float32Array([0]),_gScale:new Float32Array([1]),_gCut:new Float32Array([0]),
  cover:[],coverAll:[],interiors:[],cars:[],planes:[],rocks:[],treeSpots:[],ARENA:240,refreshFogBoxes:noop,setSkyWorld:noop,setSpace:noop});
 const fields=['ground','groundGeo','_gh','_ghBase','_gvx','_gvz','_gseg','_ghArena','_normalsDirty','grass','_canopy','_gOn','_gPos','_gRot','_gScale','_gCut'];
 const before=Object.fromEntries(fields.map(k=>[k,w[k]])),stage=new PowerWorldStage({world:w,scene,entities:[]});
 function open(){const prior=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop:noop}),beginPath:noop,arc:noop,fill:noop})})};try{stage.open();}finally{globalThis.document=prior;}}
 return {w,stage,before,open,dispose(){stage.close();for(const m of [ground,before.grass,before._canopy]){m.geometry.dispose();m.material.dispose();}}};
}
function near(a,b,msg){assert.ok(Math.abs(a-b)<1e-4,`${msg}: ${a} vs ${b}`);}

test('outside military earthworks the native bank retains the reviewed source displacement',async()=>{
 const bytes=await readFile('assets-src/frontline-convoy-bank-study/native-bed.f32');
 const authored=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/4);
 const f=fixture();try{f.open();assert.equal(f.w._ghBase.length,authored.length);
  let witnesses=0;
  for(let i=0;i<authored.length;i++)if(outpostDistance(f.w._gvx[i],f.w._gvz[i])>240){
   near(f.w._ghBase[i],authored[i],'Unaffected native heightfield differs from source data');witnesses++;
  }
  assert.ok(witnesses>authored.length*.7,'Not enough untouched terrain witnesses');
 }finally{f.dispose();}
});

test('stage close retires owned instance buffers once without disposing the hidden original vegetation',()=>{
 const f=fixture();let instances=0,original=0;f.before.grass.addEventListener('dispose',()=>original++);
 try{f.open();const rubble=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial(),4);rubble.setColorAt(0,new THREE.Color('white'));
  rubble.addEventListener('dispose',()=>instances++);f.stage.group.add(rubble);f.stage._mats.push(rubble.material);
  f.stage.close();f.stage.close();assert.equal(instances,1);assert.equal(original,0);
 }finally{f.dispose();}
});

test('PowerWorld off-vertex standing heights agree with both native crater triangles',t=>{
 const f=fixture();try{f.open();const w=f.w;
  // Asymmetric overlapping bowls exercise both sides of PlaneGeometry's
  // bottom-left / top-right diagonal, including the diagonal itself.
  w.crater(2,-3,14,5);w.crater(-9,6,11,2);w.ground.updateWorldMatrix(true,false);
  const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
  let worst=0,witnesses=0;
  for(const [x,z]of [[2,2],[6,6],[2,6],[6,2],[4.015625,4.015625],[-2,2],[-6,6],[-2,-2],[-6,-6],
   [-11,3],[-9,10],[10,-3],[13,-6],[-15,8],[2,10],[10,2],[18,3],[3,-15]]){
   ray.ray.origin.set(x,20,z);const hit=ray.intersectObject(w.ground)[0];assert.ok(hit,'No rendered ground witness');
   worst=Math.max(worst,Math.abs(hit.point.y-w.heightAt(x,z)));witnesses++;
  }
  assert.equal(witnesses,18);assert.ok(worst<1e-5,`Off-vertex terrain/feet discrepancy ${worst}u`);
  t.diagnostic(`Maximum rendered-triangle height error: ${worst}u across ${witnesses} off-vertex samples`);
 }finally{f.dispose();}
});

test('authored native valley connects rock foothills while leaving the entry and objective pad walkable',()=>{
 const f=fixture();try{f.open();const w=f.w;
  for(const [x,z]of [[-40,0],[40,0],[8,48],[31,48],[8,71],[-15,48],[8,25]])near(w.heightAt(x,z),0,'Clear encounter entry pad');
  let raised=0,total=0,peak=0,worstSlope=0;
  for(let x=-850;x<=850;x+=34)for(let z=-850;z<=850;z+=34){
   if(Math.hypot(x,z)>880||Math.hypot(x,z)<150)continue;
   const h=w.heightAt(x,z);peak=Math.max(peak,h);total++;if(h>4)raised++;
   worstSlope=Math.max(worstSlope,Math.abs(w.heightAt(x+8,z)-h)/8,Math.abs(w.heightAt(x,z+8)-h)/8);
  }
  assert.ok(peak>65&&peak<155,`Expected canyon shoulder elevations, got ${peak}`);
  assert.ok(raised/total>.48,'Foothills must connect into broad terrain, not isolated lumps');
  assert.ok(worstSlope<1.5,`Unsafe vertical terrain step ${worstSlope}`);
  for(const c of f.stage._cover.filter(c=>c.mesh.userData.frontlineFormation))assert.ok(w.heightAt(c.x,c.z)<c.top-15,'Relief buries a mesa landing surface');
  for(const c of f.stage._cover.filter(c=>c.mesh.userData.frontlineBoulder)){
   near(c._frontlineGroundLift,w.heightAt(c.x,c.z),'Boulder base follows authored hillside');
   assert.ok(c.top>w.heightAt(c.x,c.z)+3,'Hillside buries a small boulder');
  }
 }finally{f.dispose();}
});

test('authored formation bands frame an unobstructed forward valley instead of a ring of central trunks',()=>{
 const f=fixture();try{f.open();const covers=f.stage._cover,spires=covers.filter(c=>c.mesh.geometry.type==='CylinderGeometry');
  assert.equal(spires.length,15);assert.ok(spires.filter(c=>c.x<0).length>=7);assert.ok(spires.filter(c=>c.x>0).length>=7);
  for(const c of spires){
   assert.ok(c.w>=100&&c.d>=100,'Rock span should read as geological mass');
   assert.ok(c.x+c.hx<-120||c.x-c.hx>120,'Tall formation intrudes into central forward corridor');
  }
  for(const c of covers)assert.ok(Math.hypot(Math.max(0,Math.abs(c.x)-c.hx),Math.max(0,Math.abs(c.z)-c.hz))>=130,'Cover intrudes into entry pad');
  // Reviewed source shelves are now broken polygonal fingers, not the previous
  // uniform outer bank. These witnesses sit on their authored upper benches.
  for(const [x,z]of [[300,-65],[330,370],[-420,180],[-315,-55]])assert.ok(f.w.heightAt(x,z)>60,'Missing connected high canyon shoulder');
  for(const z of [0,80,180,300,500,700])assert.ok(f.w.heightAt(0,z)<15,'Central battle corridor ceased to be a low valley');
 }finally{f.dispose();}
});

test('hill craters remain bounded deltas over authored land and reset restores that exact land',()=>{
 const f=fixture();try{f.open();const w=f.w,base=w._ghBase.slice();
  let at=0;for(let i=0;i<base.length;i++)if(base[i]>base[at]&&Math.hypot(w._gvx[i],w._gvz[i])<850)at=i;
  assert.ok(base[at]>15,'No authored hillside to exercise');
  w.crater(w._gvx[at],w._gvz[at],28,4);near(w._gh[at],base[at]-4,'Crater relative to hillside');
  w.crater(w._gvx[at],w._gvz[at],28,10);near(w._gh[at],base[at]-6.5,'Accumulated hillside crater cap');
  for(let i=0;i<base.length;i++){assert.ok(w._gh[i]>=base[i]-6.50001&&w._gh[i]<=base[i]+1.40001);near(w.groundGeo.attributes.position.getZ(i),w._gh[i],'Rendered terrain tracks physical crater');}
  assert.deepEqual(w._ghBase,base,'Crater mutated authored base');w.resetTerrain();assert.deepEqual(w._gh,base);
  w.ground.updateWorldMatrix(true,false);
  for(const [dx,dz]of [[2,6],[6,2],[-5,3],[-3,-7]]){
   const x=w._gvx[at]+dx,z=w._gvz[at]+dz,hit=new THREE.Raycaster(new THREE.Vector3(x,150,z),new THREE.Vector3(0,-1,0)).intersectObject(w.ground)[0];
   assert.ok(hit);near(hit.point.y,w.heightAt(x,z),'Off-vertex hillside standing witness');
  }
 }finally{f.dispose();}
});

test('native combat explosions crater elevated floors but not airbursts above the same hill',()=>{
 const f=fixture();try{f.open();const w=f.w,base=w._ghBase;let at=0;
  for(let i=0;i<base.length;i++)if(base[i]>base[at]&&Math.hypot(w._gvx[i],w._gvz[i])<800)at=i;
  assert.ok(base[at]>60);const pos=new THREE.Vector3(w._gvx[at],base[at]+1,w._gvz[at]);
  const game={world:w,cityStats:{craters:0},vfx:{scorch(){}},noise(){},damageBlock(){}};
  Game.prototype.worldImpact.call(game,pos.clone().add(new THREE.Vector3(0,30,0)),20,2);assert.equal(w._gh[at],base[at]);
  Game.prototype.worldImpact.call(game,pos,20,2);assert.ok(w._gh[at]<base[at]-2);assert.equal(game.cityStats.craters,1);
  near(w.groundGeo.attributes.position.getZ(at),w._gh[at],'Combat changed visible terrain too');
 }finally{f.dispose();}
});

test('native rock shelves are interrupted by traversable cross-bank drainage cuts',()=>{
 const f=fixture();try{f.open();f.w.ground.updateWorldMatrix(true,false);
  // The old continuous sand terraces had no transverse drainage. These cuts
  // must exist in the actual standing surface, not only a visual overlay.
  for(const [x,z]of [[-320,80],[320,260]]){
   const center=f.w.heightAt(x,z),flank=Math.min(f.w.heightAt(x,z-55),f.w.heightAt(x,z+55));
   assert.ok(flank-center>10,`Missing eroded shelf notch at ${x},${z}: ${flank-center}`);
   const hit=new THREE.Raycaster(new THREE.Vector3(x,180,z),new THREE.Vector3(0,-1,0)).intersectObject(f.w.ground)[0];
   assert.ok(hit);near(hit.point.y,center,'Drainage rendered and native collision agree');
  }
 }finally{f.dispose();}
});

test('composed low talus replaces twelve boulder records without filling the convoy corridor',()=>{
 const f=fixture();try{f.open();const talus=f.stage._cover.filter(c=>c.mesh.userData.frontlineTalus!==undefined);
  assert.equal(talus.length,12);assert.equal(f.stage._cover.length,37);
  for(const c of talus){
   assert.ok(c.w>=35&&c.d>=35,'Talus is a pebble instead of a broad fragment');
   assert.ok(c.top-f.w.heightAt(c.x,c.z)>=14,'Talus has been buried in its support');
   assert.ok(!(c.x>-290&&c.x<-170&&c.z>180&&c.z<500),'Talus occupies reserved convoy corridor');
   c.mesh.updateWorldMatrix(true,false);
   const hit=new THREE.Raycaster(new THREE.Vector3(c.x,c.top+40,c.z),new THREE.Vector3(0,-1,0)).intersectObject(c.mesh)[0];
   assert.ok(hit);near(hit.point.y,c.top,'Native talus landing crown');
  }
 }finally{f.dispose();}
});

test('other worlds keep bilinear terrain and crossing restores absent or prior interpolation flag descriptors',()=>{
 for(const descriptor of [undefined,{value:false,writable:true,enumerable:false,configurable:true}]){
  const f=fixture();try{
   if(descriptor)Object.defineProperty(f.w,'_ghTriangles',descriptor);
   // Only the center vertex changes from23 to19; at quarter-cell coordinates
   // its bilinear weight is9/16, giving20.75 (triangles would give21).
   f.w.crater(0,0,60,4);near(f.w.heightAt(30,30),20.75,'Original bilinear terrain');
   f.open();assert.equal(f.w._ghTriangles,true,'PowerWorld did not select rendered-triangle sampling');
   f.stage.close();assert.deepEqual(Object.getOwnPropertyDescriptor(f.w,'_ghTriangles'),descriptor);
   near(f.w.heightAt(30,30),20.75,'Restored bilinear terrain');
  }finally{f.dispose();}
 }
});

test('opening over prior relief starts with the authored base and native craters displace visible stage vertices',()=>{
 const f=fixture();try{f.open();const {w,stage}=f;
  assert.ok(w.ground.parent===stage.group,'Physics still points at the hidden city ground');
  assert.equal(w.ARENA,900);assert.ok(w._ghArena>=900);assert.equal(w.heightAt(0,0),0);
  const a=w.groundGeo.attributes.position;assert.ok(a.count>=225*225);
  assert.deepEqual(w._gh,w._ghBase);assert.ok(w._ghBase.some(h=>h>15));const authored=w._ghBase.slice();
  w.crater(0,0,30,4);assert.equal(w.heightAt(0,0),-4);assert.equal(w._normalsDirty,true);
  w.ground.updateWorldMatrix(true,false);let changed=0;
  for(let i=0;i<a.count;i++)if(Math.abs(a.getZ(i)-authored[i])>.0001){changed++;const p=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(w.ground.matrixWorld);near(p.y,w.heightAt(p.x,p.z),'Visible crater vertex');}
  assert.ok(changed>20);assert.equal(f.before._gOn[0],1,'Crater flattened hidden city grass');
  assert.ok(f.before._gh.every(h=>h===23),'Prior city relief mutated');
  w.resetTerrain();assert.deepEqual(w._gh,authored);for(let i=0;i<a.count;i++)assert.equal(a.getZ(i),authored[i]);
 }finally{f.dispose();}
});

test('close/reopen restores exact prior heightfield references and disposes each stage floor once',()=>{
 const f=fixture();try{
  for(let pass=0;pass<2;pass++){f.open();const floor=f.w.ground,geo=floor.geometry,mat=floor.material;let gd=0,md=0;
   assert.ok(geo!==f.before.groundGeo,'Stage has no owned physical geometry');
   geo.addEventListener('dispose',()=>gd++);mat.addEventListener('dispose',()=>md++);
   f.w.crater(0,0,24,3);f.stage.close();f.stage.close();
   for(const [k,v]of Object.entries(f.before))assert.equal(f.w[k],v,`restore ${k}`);
   assert.equal(f.w.heightAt(0,0),23);assert.equal(f.w.ground.visible,true);assert.equal(gd,1);assert.equal(md,1);
  }
 }finally{f.dispose();}
});

test('distant floor has no surface over craters and shares seamless world-space sand UVs',()=>{
 const f=fixture();try{f.open();const {w,stage}=f,far=stage.group.getObjectByName('frontline-distant-ground');
  assert.ok(far,'Missing distant filler with playable hole');assert.equal(far.material,w.ground.material);
  stage.group.updateMatrixWorld(true);
  for(const [x,z]of [[0,0],[890,0],[0,-890],[600,600]]){
   const ray=new THREE.Raycaster(new THREE.Vector3(x,150,z),new THREE.Vector3(0,-1,0));
   assert.equal(ray.intersectObject(far).length,0,'Distant floor covers playable ground');assert.ok(ray.intersectObject(w.ground).length>0);
  }
  const A=w._ghArena;
  // A boundary impact must stay inside the deformable apron and leave no crack
  // at the static seam. Ordinary explosion craters cap at 22u; this is larger.
  w.crater(900,0,80,5);
  const groundPositions=w.groundGeo.attributes.position;
  for(let i=0;i<groundPositions.count;i++)if(Math.abs(groundPositions.getX(i))===A||Math.abs(groundPositions.getY(i))===A)assert.equal(groundPositions.getZ(i),w._ghBase[i],'Boundary crater opened the distant seam');
  for(const side of [-1,1])for(const fraction of [-.75,0,.75])for(const axis of ['x','z']){
   const p={x:fraction*A,z:fraction*A};p[axis]=side*(A+.05);
   assert.ok(new THREE.Raycaster(new THREE.Vector3(p.x,200,p.z),new THREE.Vector3(0,-1,0)).intersectObject(far).length>0,'Gap outside patch seam');
  }
  for(const mesh of [far,w.ground]){const a=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;
   for(let i=0;i<a.count;i++){near(uv.getX(i),.5+a.getX(i)/(2*FRONTLINE_GROUND_RADIUS),'World U');near(uv.getY(i),.5+a.getY(i)/(2*FRONTLINE_GROUND_RADIUS),'World V');}
  }
  assert.ok(new THREE.Raycaster(new THREE.Vector3(5100,300,0),new THREE.Vector3(0,-1,0)).intersectObject(far).length>0,'Distant ground missing');
  const seam=new Map();for(let i=0;i<groundPositions.count;i++)if(Math.abs(groundPositions.getX(i))===A||Math.abs(groundPositions.getY(i))===A)seam.set(`${groundPositions.getX(i)},${groundPositions.getY(i)}`,groundPositions.getZ(i));
  const outer=far.geometry.attributes.position;let shared=0;for(let i=0;i<outer.count;i++){const h=seam.get(`${outer.getX(i)},${outer.getY(i)}`);if(h!==undefined){near(outer.getZ(i),h,'Raised native/distant seam');shared++;}}
  assert.equal(shared,w._gseg*4,'Distant surface must share every raised native perimeter vertex');
 }finally{f.dispose();}
});
