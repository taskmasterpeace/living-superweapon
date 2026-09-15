import test from 'node:test';
import assert from 'node:assert/strict';
import {FORTIFICATION_MODULES,fortificationRecipe,fortificationPlacement,fortificationSocketsConnect} from '../src/data/fortification-kit.js';
import {buildFortificationKit,fortificationSurfaceBuffers} from '../src/engine/fortification-kit.js';

test('every module has physical data and skins contained in their own source solid',()=>{
 assert.equal(Object.keys(FORTIFICATION_MODULES).length,28);
 for(const id of Object.keys(FORTIFICATION_MODULES)){
  const r=fortificationRecipe(id);assert.ok(r.solids.length,id);assert.ok(r.definition.sockets.length,id);
  for(const v of r.visuals){const p=r.solids.find(p=>p.id===v.solid);assert.ok(p,`${id}: missing solid`);for(const [axis,size]of[['x','width'],['y','height'],['z','depth']])assert.ok(Math.abs(v[axis]-p[axis])+v[size]/2<=p[size]/2+.00001,`${id}: ${v.material} skin outside ${axis}`);}
 }
});
test('full and half panels share exact sockets under quarter-turn transforms',()=>{
 const a=fortificationPlacement({id:'a',moduleId:'tall-wall'}),b=fortificationPlacement({id:'b',moduleId:'tall-half-wall',x:24});
 assert.ok(fortificationSocketsConnect(a.sockets[1],b.sockets[0]));
 const c=fortificationPlacement({id:'c',moduleId:'tall-half-wall',x:40});assert.ok(fortificationSocketsConnect(b.sockets[1],c.sockets[0]));
 const r=fortificationPlacement({id:'r',moduleId:'tall-wall',rotation:90});assert.deepEqual(r.sockets[1].position,[0,0,-16]);
 assert.throws(()=>fortificationPlacement({id:'bad',moduleId:'tall-wall',rotation:45}),/quarter-turn/);
});
test('gate and frame physically block when closed and clear forty-unit opening when open',()=>{
 const frame=fortificationPlacement({id:'f',moduleId:'tall-open-gate'}),leaf=fortificationPlacement({id:'g',moduleId:'tall-closed-gate'});
 const at=(p,x,y,z)=>Math.abs(x-p.x)<=p.hx&&Math.abs(z-p.z)<=p.hz&&y>=p.bottom&&y<=p.top;
 assert.equal(frame.solids.some(p=>at(p,0,10,0)),false);assert.equal(leaf.solids.some(p=>at(p,0,10,0)),true);
 assert.equal(frame.solids.some(p=>at(p,25,10,0)),true);assert.equal(frame.solids.some(p=>at(p,0,49,0)),true);
});
test('stairs and stepped ramp physically terminate on the advertised platform height',()=>{
 for(const moduleId of ['stairs','ramp','ground-platform-transition']){
  const r=fortificationPlacement({id:moduleId,moduleId,x:100,y:2,z:40,rotation:90});
  assert.equal(Math.max(...r.solids.map(s=>s.top)),26);assert.ok(r.solids.every(s=>s.standable&&s.kind==='step'));
  const heights=r.solids.map(s=>s.top).sort((a,b)=>a-b);assert.ok(heights.every((v,i)=>i===0||v-heights[i-1]<=1.50001));assert.equal(r.traversalLinks[0].to[1],26);
 }
});
test('bunker entrance and roof are real openings and supported surfaces',()=>{
 const r=fortificationPlacement({id:'b',moduleId:'bunker'});
 assert.equal(r.solids.some(p=>p.bottom<10&&p.top>10&&Math.abs(p.x)<p.hx&&Math.abs(20-p.z)<p.hz),false);
 assert.ok(r.solids.some(p=>p.standable&&p.top===26));assert.ok(r.mounts.some(m=>m.id==='terminal'));
});
test('renderer exposes the exact solids used by the placement recipe',()=>{
 const p={id:'tower',moduleId:'tall-tower',x:30,z:20,rotation:90};const g=buildFortificationKit([p]);
 assert.deepEqual(g.userData.solids,fortificationPlacement(p).solids);assert.ok(g.children.length<9);g.userData.dispose();
});
test('dimension overrides preserve compound openings, support height and declared bounds',()=>{
 for(const [moduleId,def]of Object.entries(FORTIFICATION_MODULES)){
  const dimensions={span:def.dimensions.width*.75,height:def.dimensions.height*.5,depth:def.dimensions.depth*.75};
  const p=fortificationPlacement({id:moduleId,moduleId,...dimensions});
  for(const b of p.solids){assert.ok(b.bottom>=-.0001&&b.top<=dimensions.height+.0001,`${moduleId} height`);assert.ok(Math.abs(b.x)+b.hx<=dimensions.span/2+.0001,`${moduleId} width`);assert.ok(Math.abs(b.z)+b.hz<=dimensions.depth/2+.0001,`${moduleId} depth`);}
 }
 const thin=fortificationPlacement({id:'thin',moduleId:'raised-platform',height:2});assert.equal(Math.max(...thin.solids.map(b=>b.top)),2);assert.equal(Math.min(...thin.solids.map(b=>b.bottom)),0);
 const tower=fortificationPlacement({id:'tower',moduleId:'tall-tower',height:60});const access=tower.sockets.find(s=>s.id==='access');assert.ok(tower.solids.some(s=>s.standable&&Math.abs(s.top-access.position[1])<.0001));
});
test('native tower and bunker integration does not introduce a coplanar floor blocker or threshold lip',()=>{
 const tower=fortificationPlacement({id:'tower',moduleId:'tall-tower'});assert.ok(tower.solids.filter(p=>Math.abs(p.top-48)<.0001).every(p=>p.standable));
 const bunker=fortificationPlacement({id:'bunker',moduleId:'bunker',height:28,y:10});assert.equal(Math.min(...bunker.solids.filter(p=>p.standable).map(p=>p.top)),12);assert.equal(bunker.mounts.find(p=>p.id==='terminal').position[1],12);assert.equal(bunker.sockets.find(p=>p.id==='entry').position[1],12);
 const gate=fortificationPlacement({id:'gate',moduleId:'tall-gate-frame',span:94});assert.equal(gate.navigation.openings[0].width,70);
 const steps=fortificationPlacement({id:'stairs',moduleId:'stairs',height:48,depth:96});const heights=steps.solids.map(p=>p.top);assert.ok(heights.every((v,i)=>v-(heights[i-1]??0)<=1.50001));
});
test('surface renderer removes coincident faces and paints accent without parallel skin geometry',()=>{
 const a=fortificationPlacement({id:'a',moduleId:'tall-wall'}),b=fortificationPlacement({id:'b',moduleId:'tall-wall'});
 const one=fortificationSurfaceBuffers([a]),two=fortificationSurfaceBuffers([a,b]);
 const count=buffers=>[...buffers.values()].reduce((n,b)=>n+b.positions.length,0);assert.equal(count(one),count(two),'Coincident placements must not double the visible surface');
 const accent=one.get('accent');assert.ok(accent.positions.length>0);
 // Every stripe lies on the same exact physical surface as its armor region,
 // without a backing face at a fractionally different depth.
 for(let i=0;i<accent.positions.length;i+=3)assert.ok(Math.abs(Math.abs(accent.positions[i+2])-12*.76/2)<.00001);
 const faces=new Set();for(const batch of one.values())for(let i=0;i<batch.positions.length;i+=9){const vertices=[0,3,6].map(o=>batch.positions.slice(i+o,i+o+3).map(v=>v.toFixed(5)).join(',')).sort().join('|');assert.equal(faces.has(vertices),false,'No duplicate exterior triangles across materials');faces.add(vertices);}
});
