import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {bendArm} from '../src/engine/hero-rig.js';
import {snapshotHeroSkins,updateHeroSkin} from '../src/engine/hero-skin.js';
import {Game} from '../src/engine/game.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {possess,releasePossession} from '../src/engine/systems2.js';
import {advanceNanites,damageNanite,toggleNanite} from '../src/engine/nanite-state.js';
const viewApi=await import('../src/engine/nanite-forearms.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const cannon={type:'charge',naniteForm:'cannon',naniteAttachment:'right-forearm',color:'#ffd97a',color2:'#ffffff'};
const shield={type:'naniteShield',naniteForm:'shield',naniteAttachment:'left-forearm',color:'#ffd97a'};
function fighter({body='procedural',scale=1,bulk=1,contour='beveled',swapped=false,density=.75,tuning={}}={}){
 const def=structuredClone(ROSTER.find(d=>d.id==='sol'));def.id='private-nanite-fit';def.model={...def.model,body,costume:'martial'};
 def.frame={scale,bulk,broad:1,head:1,neck:1,stance:1};
 def.abilities={lmb:{...cannon,...tuning,naniteContour:contour,naniteDensity:density,naniteAttachment:swapped?'left-forearm':'right-forearm'},q:{...shield,...tuning,naniteContour:contour,naniteDensity:density,naniteAttachment:swapped?'right-forearm':'left-forearm'}};
 const f=new Fighter(def);f.level=10;return f;
}
function views(f){assert.ok(f.parts.nanites instanceof Map,'figure has no fitted nanite views');return [...f.parts.nanites.values()];}
function ready(f){advanceNanites(f._nanites,.65,new Set(['lmb','q']));viewApi.presentNanites(f);return f;}
function actualPoints(f,arm){
 const fore=arm.children[1],hand=arm.children[2],forePoints=[],handPoints=[];
 f.obj.updateMatrixWorld(true);updateHeroSkin(f.parts);
 if(f.parts.skin){
  const records=f.parts.skin.records,foreIndices=new Set(records.filter(r=>r.driver===fore).map(r=>r.i)),handIndices=new Set(records.filter(r=>r.driver===hand).map(r=>r.i));
  for(const r of records)if(r.hand===hand)handIndices.add(r.i);
  for(const mesh of f.parts.skin.meshes){const {position,skinIndex,skinWeight}=mesh.geometry.attributes;
   for(let i=0;i<position.count;i++){
    let foreWeight=0,handWeight=0;for(let j=0;j<4;j++){const ix=skinIndex.array[i*4+j],w=skinWeight.array[i*4+j];if(foreIndices.has(ix))foreWeight+=w;if(handIndices.has(ix))handWeight+=w;}
    if(foreWeight>=.5)forePoints.push(mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));
    if(handWeight>=.5)handPoints.push(mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));
   }
  }
 }else{
  for(const [mesh,out]of [[fore,forePoints],[hand,handPoints]])for(let i=0;i<mesh.geometry.attributes.position.count;i++)out.push(mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));
 }
 assert.ok(forePoints.length>30&&handPoints.length>30,'actual local skin/hand vertices were not sampled');return {forePoints,handPoints};
}
for(const body of ['procedural','superhero-male','superhero-female'])for(const [scale,bulk]of [[.65,.65],[.65,1.65],[1.5,.65],[1.5,1.65]])for(const contour of ['flat','beveled'])for(const swapped of [false,true])
test(`${body} fit ${scale}/${bulk} ${contour} ${swapped?'mirrored':'normal'} uses actual skin and leaves elbow/hand clear`,()=>{
 const f=fighter({body,scale,bulk,contour,swapped});try{
  for(const v of views(f)){
   const expected=v.config.naniteAttachment==='right-forearm'?f.parts.armL:f.parts.armR;assert.equal(v.arm,expected);assert.equal(v.root.parent,expected.children[1]);
   const points=actualPoints(f,expected),local=points.forePoints.map(p=>v.root.worldToLocal(p.clone())),hand=points.handPoints.map(p=>v.root.worldToLocal(p.clone()));
   const radius=Math.max(...local.map(p=>Math.hypot(p.x,p.z)));
   assert.ok(v.fit.skinRadius>=radius-1e-5);assert.ok(v.fit.cuffInner>=radius+.08*scale-1e-5,'cuff intersects source vertices');
   assert.equal(v.fit.sampleKind,body==='procedural'?'procedural':'skinned');
   const hull=new THREE.Box3().setFromObject(v.hull);assert.ok(!hull.isEmpty()||v.hull.count===0);
   for(const c of v.layout){assert.ok(c.center.y+c.size.y/2<=expected.userData.foreLength/2-.12*scale+1e-6,'module crowds elbow');}
   if(v.config.naniteForm==='cannon'){
    assert.equal(v.socket.name,'weapon-muzzle');assert.ok(v.socket.position.y<=Math.min(...hand.map(p=>p.y))-.10*scale+1e-5,'muzzle is behind actual closed hand');
    for(const c of v.layout){const bounds=new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5)).applyMatrix4(c.matrix);assert.ok(Math.min(Math.abs(bounds.min.x),Math.abs(bounds.max.x))>=radius+.08*scale-1e-5,'rotated barrel stave intersects actual forearm');}
   }else for(const c of v.layout)assert.ok(c.center.z-c.size.z/2>=Math.max(...local.map(p=>p.z))+.08*scale-1e-5,'shield rear clips actual skin');
   assert.equal(v.hull.material.opacity,1);assert.equal(v.hull.material.depthWrite,true);assert.equal(v.hull.layers.isEnabled(0),true);
  }
 }finally{f.dispose();}
});
test('figure-driven assembly is bounded, opaque, density-independent and settled fragments disappear',()=>{
 for(const density of [0,.75,1]){const f=fighter({density});try{
  const list=views(f);assert.equal(f._nanites.modules.size,2);viewApi.presentNanites(f);assert.ok(list.every(v=>v.hull.count===0&&v.fragments.count===0));
  advanceNanites(f._nanites,.3,new Set(['lmb','q']));viewApi.presentNanites(f);
  for(const v of list){assert.ok(v.fragments.count<=(v.config.naniteForm==='cannon'?64:96));assert.equal(v.hull.count,0);if(density)assert.ok(v.fragments.count>0);}
  advanceNanites(f._nanites,.35,new Set(['lmb','q']));viewApi.presentNanites(f);
  for(const v of list){assert.equal(v.fragments.count,0);assert.equal(v.hull.count,v.layout.length);}
  assert.equal(viewApi.snapshotNaniteCells(f).length,15);
 }finally{f.dispose();}}
});
for(const body of ['procedural','superhero-male','superhero-female'])for(const scale of [.65,1.5])for(const offset of [-.15,.15])
test(`${body} authored size/offset extremes ${scale}/${offset} keep actual vertices inside cells, outside hand and below elbow`,()=>{
 const f=fighter({body,scale,bulk:1.65,swapped:offset<0,tuning:{naniteLength:offset<0?.8:1.2,naniteWidth:offset<0?1.3:.8,naniteOffset:offset}});try{
  ready(f);for(const v of views(f)){
   const {handPoints}=actualPoints(f,v.arm),hand=handPoints.map(p=>v.root.worldToLocal(p));
   for(const c of v.layout){
    const inverse=c.matrix.clone().invert();
    if(v.config.naniteForm==='cannon')for(const p of hand){const q=p.clone().applyMatrix4(inverse);assert.ok(Math.abs(q.x)>.5||Math.abs(q.y)>.5||Math.abs(q.z)>.5,'solid barrel occupies the closed hand');}
    const geometry=v.hull.geometry.attributes.position;
    for(let i=0;i<geometry.count;i++){
     const p=new THREE.Vector3().fromBufferAttribute(geometry,i);assert.ok(Math.max(Math.abs(p.x),Math.abs(p.y),Math.abs(p.z))<=.500001,'visible contour exceeds declared contact box');
     p.applyMatrix4(c.matrix);assert.ok(p.y<=v.arm.userData.foreLength/2-.12*scale+1e-6);
    }
   }
  }
 }finally{f.dispose();}
});
for(const body of ['procedural','superhero-male','superhero-female'])test(`${body} assembly cuff and traveling fragments remain outside the measured skin at every closure fraction`,()=>{
 const f=fighter({body,scale:.65,bulk:1.65});try{
  const bounds=new Map();for(const v of views(f)){const local=actualPoints(f,v.arm).forePoints.map(p=>v.root.worldToLocal(p)),b=new THREE.Box3().setFromPoints(local);bounds.set(v,b);}
  for(const fraction of [.02,.2,.5,.74,.76,.8,.9,.99,1]){
   for(const m of f._nanites.modules.values()){m.unlocked=true;m.assemblyT=.65*fraction;}
   viewApi.presentNanites(f);
   for(const v of views(f)){
    const b=bounds.get(v),S=.65,position=v.cuff.geometry.attributes.position;v.cuff.updateMatrix();
    if(v.cuff.visible)for(let i=0;i<position.count;i++){const p=new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(v.cuff.matrix);assert.ok(Math.hypot(p.x,p.z)>=v.fit.skinRadius+.08*S-1e-6,'closing cuff sweeps through the skin');}
    const corner=new THREE.Vector3(),matrix=new THREE.Matrix4();
    for(let i=0;i<v.fragments.count;i++){v.fragments.getMatrixAt(i,matrix);for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5]){
     corner.set(x,y,z).applyMatrix4(matrix);
     if(corner.y>=b.min.y&&corner.y<=b.max.y)assert.ok(corner.x<b.min.x-.005||corner.x>b.max.x+.005||corner.z<b.min.z-.005||corner.z>b.max.z+.005,'assembly fragment travels through the forearm envelope');
    }}
   }
  }
 }finally{f.dispose();}
});
test('cuff closure alone preserves measured radial clearance before it reaches full axial depth',()=>{
 const f=fighter({body:'superhero-female',density:0,scale:.65,bulk:1.65});try{
  advanceNanites(f._nanites,.52,new Set(['lmb','q']));viewApi.presentNanites(f);
  for(const v of views(f)){v.cuff.updateMatrix();for(let i=0;i<v.cuff.geometry.attributes.position.count;i++){
   const p=new THREE.Vector3().fromBufferAttribute(v.cuff.geometry.attributes.position,i).applyMatrix4(v.cuff.matrix);
   assert.ok(Math.hypot(p.x,p.z)>=v.fit.skinRadius+.08*.65-1e-6,'cuff closure reduces the measured inner clearance');
  }}
 }finally{f.dispose();}
});
test('polygonal cuff inner faces, not just their corner vertices, keep the promised skin clearance',()=>{
 const f=fighter({body:'superhero-male',scale:.65,bulk:1.65});try{
  for(const v of views(f)){const geometry=v.cuff.geometry,index=geometry.index,p=geometry.attributes.position,n=index?.count??p.count;
   for(let i=0;i<n;i+=3)for(const [a,b]of [[0,1],[1,2],[2,0]]){
    const pa=new THREE.Vector3().fromBufferAttribute(p,index?index.getX(i+a):i+a),pb=new THREE.Vector3().fromBufferAttribute(p,index?index.getX(i+b):i+b),mid=pa.add(pb).multiplyScalar(.5);
    assert.ok(Math.hypot(mid.x,mid.z)>=v.fit.cuffInner-1e-6,'polygon cuff face violates nominal radial clearance');
   }
  }
 }finally{f.dispose();}
});
for(const body of ['procedural','superhero-male','superhero-female'])for(const swapped of [false,true])test(`${body} ${swapped?'mirrored':'normal'} barrel has an opaque cuff saddle without new contact cells or skin intrusion`,()=>{
 const f=fighter({body,scale:.65,bulk:1.65,swapped,tuning:{naniteLength:.8,naniteWidth:1.3,naniteOffset:-.15}});try{
  ready(f);const v=f.parts.nanites.get('lmb');assert.ok(v.saddle?.isMesh,'barrel has no solid connection to fitted cuff');assert.equal(v.saddle.material.opacity,1);
  assert.equal(viewApi.snapshotNaniteCells(f).filter(c=>c.slot==='lmb').length,6);
  const p=v.saddle.geometry.attributes.position,point=new THREE.Vector3();let touchesBarrel=false,touchesCuff=false;
  for(let i=0;i<p.count;i++){
   point.fromBufferAttribute(p,i).applyMatrix4(v.saddle.matrix);
   const radius=Math.hypot(point.x,point.z);if(radius<=v.fit.cuffInner/Math.cos(Math.PI/24)+.06*.65+1e-5&&Math.abs(point.y)<.16*.65)touchesCuff=true;
   for(const c of v.layout){const q=point.clone().applyMatrix4(c.matrix.clone().invert());if(Math.max(Math.abs(q.x),Math.abs(q.y),Math.abs(q.z))<=.5001)touchesBarrel=true;}
  }
  assert.ok(touchesCuff&&touchesBarrel,'saddle must overlap the actual cuff and a real barrel stave');
  for(const fraction of [.76,.9,1]){f._nanites.modules.get('lmb').assemblyT=.65*fraction;viewApi.presentNanites(f);v.saddle.updateMatrix();
   for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(v.saddle.matrix);assert.ok(Math.hypot(point.x,point.z)>=v.fit.skinRadius+.08*.65-1e-5,'saddle assembly crosses forearm skin');}
  }
 }finally{f.dispose();}
});
for(const body of ['procedural','superhero-male','superhero-female'])for(const swapped of [false,true])
test(`${body} ${swapped?'left':'right'} cannon leaves actual open hand and bounded wrist rotation free`,()=>{
 const f=fighter({body,scale:.65,bulk:1.65,swapped,tuning:{naniteLength:.8,naniteWidth:1.3,naniteOffset:.15}});try{
  const v=f.parts.nanites.get('lmb'),hand=v.arm.children[2];bendArm(v.arm,.8);
  for(const open of [0,1])for(const wrist of [-.35,0,.35]){
   hand.morphTargetInfluences[0]=open;hand.rotation.z=wrist;const points=actualPoints(f,v.arm).handPoints.map(p=>v.root.worldToLocal(p));
   for(const c of v.layout){const inverse=c.matrix.clone().invert();for(const p of points){const q=p.clone().applyMatrix4(inverse);assert.ok(Math.abs(q.x)>.5||Math.abs(q.y)>.5||Math.abs(q.z)>.5,`fitted cannon occupies hand open=${open}, wrist=${wrist}, local=${p.toArray()}`);}}
  }
 }finally{f.dispose();}
});
test('one local break leaves neighboring opaque cells, follows moving forearm and copies snapshot matrices',()=>{
 const f=fighter();try{
  views(f);ready(f);const m=f._nanites.modules.get('q'),v=f.parts.nanites.get('q'),point=v.root.localToWorld(v.layout[4].center.clone());
  damageNanite(f._nanites,{slot:'q',epoch:m.epoch,cell:4,point,normal:{x:0,y:0,z:1}},20,true);viewApi.presentNanites(f);
  assert.equal(v.hull.count,8);assert.ok(v.fragments.count>0);const before=viewApi.snapshotNaniteCells(f),saved=before[0].matrix.clone();
  f.parts.armR.rotation.z=.6;bendArm(f.parts.armR,1.1);f.obj.position.set(40,20,10);viewApi.presentNanites(f);
  assert.deepEqual(before[0].matrix.elements,saved.elements);assert.ok(!viewApi.snapshotNaniteCells(f)[0].matrix.equals(saved));
  assert.ok(viewApi.snapshotNaniteCells(f).every(c=>c.slot!=='q'||c.cell!==4));
  toggleNanite(f._nanites,'q');viewApi.presentNanites(f);assert.equal(v.hull.count,0);assert.equal(v.fragments.count,0);
 }finally{f.dispose();}
});
test('form rebind preserves damaged state/epoch and disposes owned instance buffers once',()=>{
 const f=fighter();try{
  views(f);ready(f);const state=f._nanites,m=state.modules.get('q'),epoch=m.epoch;damageNanite(state,{slot:'q',epoch,cell:4,point:{x:0,y:0,z:0},normal:{x:0,y:0,z:1}},20,true);
  const owned=[];f.obj.traverse(o=>{if(o.userData.naniteOwned)owned.push(o);});assert.equal(owned.length,4);const disposed=new Map();for(const o of owned)o.addEventListener('dispose',()=>disposed.set(o,(disposed.get(o)||0)+1));
  assert.equal(f.applyForm({model:{body:'superhero-female'},frame:{scale:1.5,bulk:1.65}}),true);viewApi.presentNanites(f);
  assert.equal(f._nanites,state);assert.equal(m.epoch,epoch);assert.equal(m.cells[4].hp,0);assert.equal(f.parts.nanites.get('q').hull.count,8);
  for(const o of owned)assert.equal(disposed.get(o),1);f.dispose();f.dispose();for(const o of owned)assert.equal(disposed.get(o),1);
 }finally{f.dispose();}
});
test('native spectral snapshot bakes only shown instances into independent geometry and survives source retirement',()=>{
 const f=fighter();try{
  views(f);ready(f);const copy=snapshotHeroSkins(f.obj.clone(true)),baked=[];copy.traverse(o=>{assert.ok(!o.userData.naniteOwned);if(o.name.startsWith('nanite-')&&o.isMesh)baked.push(o);});
  assert.ok(baked.some(o=>o.userData._snapshotGeometry));const snapshots=baked.filter(o=>o.userData._snapshotGeometry);let disposed=0;for(const o of snapshots)o.geometry.addEventListener('dispose',()=>disposed++);
  const saved=snapshots.map(o=>o.geometry.attributes.position.array.slice());f.applyForm({frame:{scale:1.5}});f.dispose();assert.equal(disposed,0);
  snapshots.forEach((o,i)=>assert.deepEqual(o.geometry.attributes.position.array,saved[i]));for(const o of snapshots)o.geometry.dispose();assert.equal(disposed,snapshots.length);
 }finally{f.dispose();}
});
function nativeFixture(){
 const f=fighter(),scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const stage=new StudioCombat(scene,world),game=stage.game;scene.add(f.obj);game.entities.push(f);f._game=game;f._openSky=true;
 return {f,game,close(){stage.dispose();f.dispose();}};
}
test('native update alone advances once; pose, zero-dt, hitstop and locked slots cannot advance assembly',()=>{
 const x=nativeFixture();try{const {f,game}=x;f.def.progression={unlocks:{q:10}};f.level=1;
  for(let i=0;i<10;i++)f._animate(.1);assert.equal(f._nanites.modules.get('lmb').assemblyT,0);
  f.update(.2,game);assert.equal(f._nanites.modules.get('lmb').assemblyT,.2);assert.equal(f._nanites.modules.get('q').assemblyT,0);
  const before=f._nanites.modules.get('lmb').assemblyT;f.hitstop=.01;f.update(.1,game);assert.equal(f._nanites.modules.get('lmb').assemblyT,before,'partial hitstop frame advanced assembly');
  f.update(0,game);assert.equal(f._nanites.modules.get('lmb').assemblyT,before);f.level=10;f.update(.65,game);assert.equal(f._nanites.modules.get('q').ready,true);
 }finally{x.close();}
});
test('KO clears visuals/contacts immediately and native respawn starts a fresh damaged-free epoch',()=>{
 const x=nativeFixture();try{const {f,game}=x;ready(f);const m=f._nanites.modules.get('q'),epoch=m.epoch;
  damageNanite(f._nanites,{slot:'q',epoch,cell:4,point:{x:0,y:0,z:0},normal:{x:0,y:0,z:1}},20,true);f._ko();
  for(const v of views(f)){assert.equal(v.hull.count,0);assert.equal(v.fragments.count,0);}assert.equal(viewApi.snapshotNaniteCells(f).length,0);
  f._updateKO(10,game);assert.equal(f.state,'idle');assert.ok(m.epoch>epoch);assert.equal(m.cells[4].hp,12);assert.equal(m.assemblyT,0);assert.equal(m.ready,false);
 }finally{x.close();}
});
test('native source removal and source replacement retire only the matching capability before presentation',()=>{
 const x=nativeFixture();try{const {f,game}=x;ready(f);const m=f._nanites.modules.get('q'),other=f._nanites.modules.get('lmb'),epoch=m.epoch;
  delete f.slots.q;f.update(0,game);assert.equal(m.retired,true);assert.ok(m.epoch>epoch);assert.equal(f.parts.nanites.get('q').hull.count,0);assert.equal(other.ready,true);
  f.slots.lmb.def={...f.slots.lmb.def,naniteWidth:1.2};f.update(0,game);assert.equal(other.retired,true);assert.equal(viewApi.snapshotNaniteCells(f).length,0);
 }finally{x.close();}
});
test('an equivalent source reconstruction preserves live integrity and epoch independent of object key order',()=>{
 const x=nativeFixture();try{const {f,game}=x;ready(f);const m=f._nanites.modules.get('q'),epoch=m.epoch;
  damageNanite(f._nanites,{slot:'q',epoch,cell:4,point:{x:0,y:0,z:0},normal:{x:0,y:0,z:1}},2,true);
  f.slots.q.def=Object.fromEntries(Object.entries(f.slots.q.def).reverse());f.update(0,game);
  assert.equal(m.retired,false);assert.equal(m.epoch,epoch);assert.equal(m.cells[4].hp,10);
 }finally{x.close();}
});
for(const consumer of ['decoy','possession'])test(`native ${consumer} cleanup independently frees baked nanite geometry after actor form retirement`,()=>{
 const f=fighter({body:'superhero-female'}),victim=new Fighter(structuredClone(ROSTER[0])),scene=new THREE.Scene();scene.add(f.obj,victim.obj);
 const game={scene,time:0,entities:[f,victim],humans:[],isHuman:()=>false,vfx:{ring(){},flash(){}},audio:{teleport(){}}};f._game=game;
 try{ready(f);let copy;if(consumer==='decoy')copy=Game.prototype.spawnDecoy.call(game,f,.5).grp;else {assert.equal(possess(f,victim,1,game),true);copy=f._possessing.spectral;}
  const baked=[];copy.traverse(o=>{assert.ok(!o.userData.naniteOwned);if(o.name.startsWith('nanite-')&&o.userData._snapshotGeometry)baked.push(o.geometry);});assert.equal(baked.length,2);
  const counts=new Map();for(const g of baked)g.addEventListener('dispose',()=>counts.set(g,(counts.get(g)||0)+1));
  f.applyForm({model:{body:'superhero-male'},frame:{scale:1.5}});f.dispose();for(const g of baked)assert.equal(counts.get(g),undefined);
  if(consumer==='decoy')Game.prototype.updateDecoys.call(game,1);else releasePossession(f,game);
  for(const g of baked)assert.equal(counts.get(g),1);
 }finally{f.dispose();victim.dispose();}
});
