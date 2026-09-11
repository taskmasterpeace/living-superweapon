import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareFrontline,warmFrontlinePrograms} from '../src/engine/frontline-preparation.js';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {DoubleSide,FrontSide,NormalBlending,Scene,Group} from 'three';

function fixture(){
 const calls=[],programs=[],scene={},camera={},newsCamera={},target={name:'original'},main={name:'composer'};
 let current=target,ready=false;
 const sun={castShadow:false},renderer={info:{programs},getRenderTarget:()=>current,getActiveCubeFace:()=>2,getActiveMipmapLevel:()=>1,
  setRenderTarget:(t,c,m)=>{current=t;calls.push(['target',t,c,m]);},
  compile:(s,c)=>{calls.push(['compile',s,c,current,sun.castShadow]);programs.push({isReady:()=>ready,getUniforms:()=>{assert.ok(ready);calls.push(['uniforms']);},getAttributes:()=>{},});}};
 const world={renderer,scene,camera,sun,composer:{renderTarget1:main}};
 const game={world,news:{cam:newsCamera},reportError:e=>calls.push(['error',e.message])};
 const group={},stage={g:game,group,frontlineLoading:Promise.resolve(),aircraft:{loading:Promise.resolve()},convoy:{loading:Promise.resolve()}};
 return{world,game,stage,calls,renderer,scene,camera,newsCamera,target,main,get current(){return current;},ready(){ready=true;}};
}
const ui=()=>({update(){},destroy(){}});

test('first-use combat effects are prepared without spawning attacks and remain leased until stage cleanup',async()=>{
 const x=fixture();x.world.scene=new Scene();x.stage.group=new Group();x.world.scene.add(x.stage.group);
 const compiled=[],materials=new Set(),geometries=new Set();
 x.renderer.compile=scene=>{
  scene.traverse(o=>{if(o.material){compiled.push(o);materials.add(o.material);}if(o.geometry)geometries.add(o.geometry);});x.ready();
 };
 const task=prepareFrontline(x.stage,{ui,wait:async()=>x.ready()});assert.equal(await task.promise,true);
 assert.ok(compiled.some(o=>o.material.customProgramCacheKey()==='beam-surface-v6'),'Beam surface must compile before combat');
 assert.ok(compiled.some(o=>o.material.customProgramCacheKey()==='beam-sheath-v1'),'Beam sheath must compile before combat');
 assert.ok(compiled.some(o=>o.isLineSegments&&o.material.vertexColors),'Charge strands need their actual color-attribute variant');
 assert.ok(compiled.some(o=>o.isInstancedMesh),'Instanced beam details need their own shader variant');
 assert.equal(x.game.projectiles,undefined,'Preparation must not spawn attacks');
 assert.equal(x.stage.combatWarmup.group.visible,false,'Preparation meshes never render in gameplay');
 let matDisposed=0,geoDisposed=0;
 for(const m of materials)m.addEventListener('dispose',()=>matDisposed++);
 for(const g of geometries)g.addEventListener('dispose',()=>geoDisposed++);
 assert.equal(matDisposed,0,'Programs must stay referenced after preparation');
 x.stage.combatWarmup.dispose();x.stage.combatWarmup.dispose();
 assert.equal(matDisposed,materials.size);assert.equal(geoDisposed,geometries.size);assert.equal(x.stage.group.children.length,0);
});

test('preparation compiles the actual chase guard variants without advancing poses or combat',async()=>{
 const x=fixture(),fighters=['vega','aurum'].map(id=>new Fighter(structuredClone(ROSTER.find(f=>f.id===id))));
 try{
  x.game.entities=fighters;for(const f of fighters)f._openSky=true;
  const before=fighters.map(f=>({time:f.animT,hp:f.hp,position:f.pos.toArray(),pose:f.parts.g.quaternion.toArray()}));
  const compile=x.renderer.compile;x.renderer.compile=(...args)=>{
   for(const [i,f]of fighters.entries()){
    const m=f.parts.guardArc.material;
    assert.equal(m.forceSinglePass,true,'Compile must use the same guard pass count as native animation');
    assert.equal(m.side,i===0?DoubleSide:FrontSide);assert.equal(m.blending,NormalBlending);
   }
   compile(...args);
  };
  const task=prepareFrontline(x.stage,{ui,wait:async()=>x.ready()});
  assert.equal(await task.promise,true,task.error);
  assert.deepEqual(fighters.map(f=>({time:f.animT,hp:f.hp,position:f.pos.toArray(),pose:f.parts.g.quaternion.toArray()})),before);
 }finally{for(const f of fighters)f.dispose();}
});

test('military compound and vehicle placement complete before graphics-ready publication',async()=>{
 const x=fixture();let release;x.stage.outpostLoading=new Promise(r=>release=r);
 const task=prepareFrontline(x.stage,{ui,wait:async()=>x.ready()});
 for(let i=0;i<12;i++)await Promise.resolve();
 assert.equal(x.calls.filter(c=>c[0]==='compile').length,0);
 x.stage.outpostError='Missing command building';release();
 assert.equal(await task.promise,false);assert.match(task.error,/command building/);task.cancel();
});

test('player soldier equipment failure prevents graphics-ready publication',async()=>{
 const x=fixture();let release;const soldier={obj:{traverse(){}},_soldierEquipmentLoading:new Promise(r=>release=r)};x.game.entities=[soldier];
 const task=prepareFrontline(x.stage,{ui,wait:async()=>x.ready()});
 await Promise.resolve();await Promise.resolve();
 soldier._soldierEquipmentError='Soldier kit unavailable';release();
 assert.equal(await task.promise,false);assert.match(task.error,/Soldier kit/);task.cancel();
});

test('clone equipment is loaded before shader warmup and its failure holds the gate',async()=>{
 const x=fixture();let release;x.game.ms={frontline:{equipmentLoading:new Promise(r=>release=r)}};
 const task=prepareFrontline(x.stage,{ui,wait:async()=>x.ready()});await Promise.resolve();await Promise.resolve();assert.equal(x.calls.length,0);
 x.game.ms.frontline.equipmentError='Missing clone kit';release();assert.equal(await task.promise,false);assert.match(task.error,/Missing clone kit/);assert.equal(x.stage.frontlineReady,false);assert.equal(x.calls.filter(c=>c[0]==='compile').length,0);task.cancel();
});

test('preparation blocks immediately, waits for assets then both render destinations and shadow variants',async()=>{
 const x=fixture();let release; x.stage.frontlineLoading=new Promise(r=>release=r);
 const task=prepareFrontline(x.stage,{ui,wait:async()=>x.ready()});
 assert.equal(x.game._frontlinePreparing,task);assert.equal(x.stage.frontlineReady,false);
 await Promise.resolve();assert.equal(x.calls.length,0);release();
 assert.equal(await task.promise,true);assert.equal(x.stage.frontlineReady,true);assert.equal(x.game._frontlinePreparing,null);
 const compiled=x.calls.filter(c=>c[0]==='compile');assert.equal(compiled.length,4);
 assert.deepEqual(compiled.map(c=>[c[2]===x.newsCamera,c[3]===x.main,c[4]]),[[false,true,true],[true,false,true],[false,true,false],[true,false,false]]);
 assert.equal(x.current,x.target);assert.equal(x.world.sun.castShadow,false);
});
test('cancellation never queries disposed programs or releases a newer preparation',async()=>{
 const x=fixture();let waitRelease;
 const task=prepareFrontline(x.stage,{ui,wait:()=>new Promise(r=>waitRelease=r)});
 for(let i=0;i<12&&!waitRelease;i++)await Promise.resolve();assert.ok(waitRelease);
 task.cancel();x.renderer.info.programs[0].isReady=()=>{throw Error('Disposed shader queried');};
 const newer={};x.game._frontlinePreparing=newer;waitRelease();
 assert.equal(await task.promise,false);assert.equal(x.game._frontlinePreparing,newer);assert.equal(x.stage.frontlineReady,false);
 assert.equal(x.current,x.target);assert.equal(x.world.sun.castShadow,false);
});
test('asset errors leave gameplay gated with an actionable failure instead of a silent fallback',async()=>{
 const x=fixture();x.stage.frontlineError='Missing terrain';
 const task=prepareFrontline(x.stage,{ui});assert.equal(await task.promise,false);
 assert.equal(task.status,'error');assert.match(task.error,/Missing terrain/);assert.equal(x.game._frontlinePreparing,task);
 task.cancel();assert.equal(x.game._frontlinePreparing,null);
});
test('compile failure restores render target and light state',async()=>{
 const x=fixture();x.renderer.compile=()=>{throw Error('Shader fixture');};
 await assert.rejects(warmFrontlinePrograms(x.world,x.newsCamera),/Shader fixture/);
 assert.equal(x.current,x.target);assert.equal(x.world.sun.castShadow,false);
});
test('program readiness timeout remains cancellable and does not start the match',async()=>{
 const x=fixture();let time=0;
 const task=prepareFrontline(x.stage,{ui,now:()=>time,wait:async()=>{time+=1000;},timeout:2000});
 assert.equal(await task.promise,false);assert.match(task.error,/timed out/i);assert.equal(x.stage.frontlineReady,false);
 task.cancel();
});
test('renderer-less CPU stages preserve existing synchronous fixture behavior',()=>{
 const stage={g:{world:{}}};assert.equal(prepareFrontline(stage),null);assert.equal(stage.preparation,undefined);
});

test('first main and reporter draws run behind the gate without advancing the simulation',async()=>{
 const x=fixture(),draws=[];x.game.time=0;
 x.world.composer.render=()=>{assert.equal(x.stage.frontlineReady,false);assert.ok(x.game._frontlinePreparing);draws.push('main');};
 x.game.news._renderPOV=()=>{assert.equal(x.stage.frontlineReady,false);draws.push('news');};
 const task=prepareFrontline(x.stage,{ui,wait:async()=>x.ready()});
 assert.equal(await task.promise,true);assert.deepEqual(draws,['main','news','main']);
 assert.equal(x.game.time,0);assert.equal(x.game.news._warmed,true);
});

test('cancel between first-use draws never touches a retired scene',async()=>{
 const x=fixture();x.ready();let draws=0;
 x.world.composer.render=()=>{draws++;x.stage.preparation.cancel();};
 x.game.news._renderPOV=()=>assert.fail('Canceled news draw');
 const task=prepareFrontline(x.stage,{ui,wait:async()=>{}});
 assert.equal(await task.promise,false);assert.equal(draws,1);assert.equal(x.stage.frontlineReady,false);
});
