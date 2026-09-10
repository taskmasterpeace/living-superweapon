import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Projectiles} from '../src/engine/projectiles.js';
import {Game} from '../src/engine/game.js';

function fixture(){
  const returned=[],explosions=[],rings=[],damage=[],noop=()=>{};
  const game={scene:new THREE.Scene(),entities:[],world:{cover:[],interiors:[],shake:noop,punch:noop},
    audio:{boom:noop,zap:noop,hit:noop},particles:{burst:noop,spawn:noop},isHuman:()=>false,
    vfx:{borrowLight:()=>new THREE.PointLight(),returnLight:l=>returned.push(l),flash:noop,impactStar:noop,
      ring:(p,o)=>rings.push([p.clone(),o]),explode:(p,o)=>explosions.push([p.clone(),o])},
    areaDamage:(...args)=>damage.push(args),noise:noop,nearestFoe:()=>null,
    isFoe:(a,b)=>b.alive!==false&&a!==b&&a.team!==b.team,overlapFoe:Game.prototype.overlapFoe,hitFlung:Game.prototype.hitFlung};
  const manager=game.projectiles=new Projectiles(game);
  const owner=team=>({team,alive:true,powerBuff:1,pos:new THREE.Vector3(0,45,team===1?-100:100),aim3:new THREE.Vector3(0,0,1)});
  const owners=[owner(1),owner(2)];
  function shot(team,z,v,priority,extra={}){return manager.spawnProjectile(owners[team-1],{pos:new THREE.Vector3(0,50,z),vel:new THREE.Vector3(0,0,v),radius:1,damage:12,collisionPriority:priority,...extra});}
  return {game,manager,shot,owners,returned,explosions,rings,damage,close(){for(const p of manager.list)p._dispose(game);}};
}

test('deflect is finite guard pressure, braces on contact, and cannot reflect from an empty meter',()=>{
 for(const meter of [.03,.04]){
  const f=fixture();try{
   let hits=0;const guard={team:2,alive:true,powerBuff:1,pos:new THREE.Vector3(0,45,4),radius:.5,def:{guardType:'deflect'},guarding:true,staggerT:0,guardMeter:meter,aim:new THREE.Vector3(0,0,-1),takeDamage:()=>hits++};
   f.game.entities=[guard];const shot=f.shot(1,0,600,1);f.manager.update(1/60,f.game);
   if(meter<.04){assert.equal(!!shot._defl,false);assert.equal(hits,1);}
   else{assert.equal(shot.caster,guard);assert.equal(guard.guardMeter,0);assert.equal(guard.guarding,false);assert.ok(guard.staggerT>0);assert.ok(guard._blocked>0);}
  }finally{f.close();}
 }
});

test('a fast rear shot that crosses the guard center is never a frontal deflection',()=>{
 const f=fixture();try{
  let hits=0;const guard={team:2,alive:true,powerBuff:1,pos:new THREE.Vector3(0,45,9),radius:2.2,def:{guardType:'deflect'},guarding:true,staggerT:0,guardMeter:1,aim:new THREE.Vector3(0,0,1),takeDamage:()=>hits++};
  f.game.entities=[guard];const shot=f.shot(1,0,600,undefined);f.manager.update(1/60,f.game);
  assert.equal(!!shot._defl,false);assert.equal(hits,1);assert.equal(guard.guardMeter,1);
 }finally{f.close();}
});

for(const [aPriority,bPriority,want] of [[2,1,[false,true]],[1,1,[true,true]],[0,0,[true,true]],[undefined,1,[false,false]],[-1,1,[false,false]]]){
  test(`real manager opposing fast shots priorities ${aPriority}/${bPriority}`,()=>{
    const f=fixture();try{const a=f.shot(1,0,600,aPriority),b=f.shot(2,10,-600,bPriority);f.manager.update(1/60,f.game);
      assert.deepEqual([a.dead,b.dead],want);assert.equal(f.explosions.length,0);assert.equal(f.damage.length,0);
      if(b.dead)assert.ok(b.pos.z>0&&b.pos.z<10,'retirement happens at contact, before endpoints');
    }finally{f.close();}
  });
}
test('allies are exempt even when both opt in',()=>{const f=fixture();try{const a=f.shot(1,0,600,1),b=f.shot(1,10,-600,1);f.manager.update(1/60,f.game);assert.equal(a.dead||b.dead,false);}finally{f.close();}});

for(const hz of [30,60,120])for(const speed of [600,2000])for(const reverse of [false,true])test(`swept priority is invariant at ${hz}Hz/${speed} speed/list reverse ${reverse}`,()=>{
  const f=fixture();try{const a=f.shot(1,0,speed,2),b=f.shot(2,10,-speed,1);if(reverse)f.manager.list.reverse();
    for(let i=0;i<4;i++)f.manager.update(1/hz,f.game);assert.deepEqual([a.dead,b.dead],[false,true]);
    assert.equal(f.returned.length,1);
  }finally{f.close();}
});
for(const kind of ['altitude','different-time'])test(`${kind} crossing is not a contact`,()=>{
  const f=fixture();try{const a=f.shot(1,0,600,1),b=f.shot(2,10,-600,1);
    if(kind==='altitude')b.pos.y+=3;
    else{a.pos.set(-10,50,0);a.vel.set(1200,0,0);b.pos.set(0,50,-3);b.vel.set(0,0,1200);}
    f.manager.update(1/60,f.game);assert.equal(a.dead||b.dead,false);
  }finally{f.close();}
});
test('earliest pair wins independent of list order',()=>{
  for(const reverse of [false,true]){const f=fixture();try{const a=f.shot(1,0,600,2),b=f.shot(2,5,0,2),c=f.shot(2,10,0,1);
    if(reverse)f.manager.list.reverse();f.manager.update(1/60,f.game);assert.deepEqual([a.dead,b.dead,c.dead],[true,true,false]);
  }finally{f.close();}}
});

for(const kind of ['cover','interior','ground','dome','prop','fighter'])test(`earlier ${kind} contact blocks a later projectile interaction`,()=>{
  const f=fixture();try{
    const a=f.shot(1,0,1200,2),b=f.shot(2,14,0,1);let foe=null,prop=null,dome=null;
    if(kind==='cover')f.game.world.cover=[{x:0,z:3,r:.05,h:100}];
    if(kind==='interior')f.game.world.interiors=[{x:0,z:3,hx:10,hz:.05,top:100,walls:[{x:0,z:3,hx:10,hz:.05}]}];
    if(kind==='ground'){a.pos.y=2;a.vel.y=-1200;b.pos.y=-12;b.ground=false;}
    if(kind==='dome'){dome={x:0,y:50,z:4,r:1,hp:100,owner:{team:2,def:{colors:{accent:'#ffd24a'}}}};f.game._domes=[dome];}
    if(kind==='prop'){prop={x:0,y:50,z:5,r:.5,hp:10,by:f.owners[1],dead:false};f.game._flung=[prop];}
    if(kind==='fighter'){foe={team:2,alive:true,pos:new THREE.Vector3(0,45,5),radius:.5,def:{},takeDamage:()=>foe.hits++ ,hits:0};f.game.entities=[foe];}
    f.manager.update(1/60,f.game);assert.equal(a.dead,true);assert.equal(b.dead,false,'later opposing shot remains alive');
    if(dome)assert.equal(dome.hp,88,'real dome damage happens once');
    if(prop){assert.equal(prop.hp,-2);assert.equal(prop.dead,true);assert.equal(prop.shot,true);}
    if(foe)assert.equal(foe.hits,1);
    if(kind!=='ground')assert.ok(a.pos.z<5,'impact is at swept contact, not frame endpoint');
  }finally{f.close();}
});
test('neutralization precedes fighter damage and retires remote references without splitting',()=>{
  const f=fixture();try{
    const a=f.shot(1,0,600,1,{splitCount:4}),b=f.shot(2,10,-600,1);
    const foe={team:2,alive:true,pos:new THREE.Vector3(0,45,13),radius:.5,def:{},takeDamage:()=>assert.fail('neutralized projectile damaged fighter')};f.game.entities=[foe];
    f.owners[0].remote=a;f.manager.update(1/60,f.game);assert.equal(a.dead,true);assert.equal(b.dead,true);assert.equal(f.manager.list.length,0);
    a.detonate(f.game);a._dispose(f.game);f.manager.update(1/60,f.game);
    assert.equal(f.returned.length,2);assert.equal(f.explosions.length,0);assert.equal(f.damage.length,0);assert.equal(f.rings.length,1);
  }finally{f.close();}
});
test('split children cannot inherit priority from a participating parent',()=>{const f=fixture();try{
  const a=f.shot(1,0,60,8,{splitCount:4});a.detonate(f.game);const children=f.manager.list.filter(p=>!p.dead);
  assert.equal(children.length,4);for(const child of children)assert.equal(child.collisionPriority,-1);
}finally{f.close();}});

for(const kind of ['cover','interior'])test(`airborne ${kind} impact stays at actual contact altitude`,()=>{
  const f=fixture();try{const a=f.shot(1,0,2000,1);
    if(kind==='cover')f.game.world.cover=[{x:0,z:3,r:.05,h:100}];
    else f.game.world.interiors=[{x:0,z:3,hx:10,hz:.05,top:100,walls:[{x:0,z:3,hx:10,hz:.05}]}];
    f.manager.update(1/60,f.game);assert.equal(a.dead,true);assert.equal(f.explosions[0][0].y,50);
    assert.ok(Math.abs(f.explosions[0][0].z-1.95)<1e-8);
  }finally{f.close();}
});
test('exact simultaneous ordinary fighter contact precedes a pair event',()=>{
  for(const reverse of [false,true]){const f=fixture();try{
    const a=f.shot(1,0,600,1),b=f.shot(2,10,-600,1);
    const foe={team:2,alive:true,pos:new THREE.Vector3(0,45,7),radius:.5,def:{},hits:0,takeDamage(){this.hits++;}};
    f.game.entities=[foe];if(reverse)f.manager.list.reverse();f.manager.update(1/60,f.game);
    assert.equal(foe.hits,1);assert.equal(a.dead,true);assert.equal(b.dead,false);
  }finally{f.close();}}
});
test('actual deflection changes the owner and eligibility before the next contact',()=>{
  const f=fixture();try{
    const a=f.shot(1,0,600,1),b=f.shot(1,-3,0,1);
    const guard={team:2,alive:true,powerBuff:1,pos:new THREE.Vector3(0,45,4),radius:.5,def:{guardType:'deflect'},
      guarding:true,staggerT:0,guardMeter:1,aim:new THREE.Vector3(0,0,-1),takeDamage:()=>assert.fail('deflect must protect guard')};
    f.game.entities=[guard];f.manager.update(1/60,f.game);
    assert.equal(a.caster,guard);assert.equal(a.team,2);assert.equal(guard.guardMeter,.96);
    assert.deepEqual([a.dead,b.dead],[true,true]);
  }finally{f.close();}
});
test('a shield later than neutralization is queried without spending shield HP',()=>{
  const f=fixture();try{const a=f.shot(1,0,600,1),b=f.shot(2,10,-600,1);
    const d={x:0,y:50,z:8,r:1,hp:100,owner:{team:2,def:{colors:{accent:'#ffd24a'}}}};f.game._domes=[d];
    f.manager.update(1/60,f.game);assert.equal(d.hp,100);assert.equal(a.dead&&b.dead,true);assert.equal(f.rings.length,1);
  }finally{f.close();}
});
test('destroying a prop immediately invalidates its later contact candidates',()=>{
  for(const reverse of [false,true]){const f=fixture();try{
    const a=f.shot(1,0,1200,2),b=f.shot(1,-3,1200,2),c=f.shot(2,10,0,1);
    const prop={x:0,y:50,z:5,r:.1,hp:10,by:f.owners[1],dead:false};f.game._flung=[prop];
    if(reverse)f.manager.list.reverse();f.manager.update(1/60,f.game);
    assert.equal(prop.hp,-2);assert.deepEqual([a.dead,b.dead,c.dead],[true,false,true]);
  }finally{f.close();}}
});
test('contact splits do not double-apply gravity or wind during prepared movement',()=>{
  const f=fixture();try{
    const p=f.shot(1,0,60,1,{pos:new THREE.Vector3(200,50,0),grav:12,ballistic:true});
    f.shot(1,0,600,1);f.shot(2,10,-600,1);
    f.game.weather={windSpeed:1,force:(kind,out)=>out.set(24,0,0)};
    f.manager.update(1/60,f.game);
    assert.ok(Math.abs(p.vel.x-.4)<1e-10);assert.ok(Math.abs(p.vel.y+.2)<1e-10);assert.equal(p.vel.z,60);
  }finally{f.close();}
});
test('participating homing uses the same bounded steering as two ordinary 120Hz updates',()=>{
  const f=fixture(),reference=fixture();try{
    const target={pos:new THREE.Vector3(40,45,80)};f.game.nearestFoe=reference.game.nearestFoe=()=>target;
    const a=f.shot(1,0,60,1,{homing:3}),b=reference.shot(1,0,60,-1,{homing:3});
    f.manager.update(1/60,f.game);reference.manager.update(1/120,reference.game);reference.manager.update(1/120,reference.game);
    assert.ok(a.pos.distanceTo(b.pos)<1e-9);assert.ok(a.vel.distanceTo(b.vel)<1e-9);
  }finally{f.close();reference.close();}
});
for(const priority of [-2,.5,17,NaN,Infinity,'1'])test(`malformed runtime priority ${priority} normalizes off`,()=>{
  const f=fixture();try{const a=f.shot(1,0,600,priority),b=f.shot(2,10,-600,1);f.manager.update(1/60,f.game);
    assert.equal(a.collisionPriority,-1);assert.equal(a.dead||b.dead,false);
  }finally{f.close();}
});
for(const stuck of [false,true])test(`${stuck?'stuck':'armed'} participating payload can be neutralized before its fuse fires`,()=>{
  const f=fixture();try{
    const a=f.shot(1,5,0,1,{armDelay:.006}),b=f.shot(2,0,600,1);
    if(stuck){a.stick={fuse:.006};a._stuckTo={alive:true,pos:new THREE.Vector3(0,45,5)};a._stickOff=new THREE.Vector3(0,5,0);a._fuse=.006;}
    else{a._armed=true;a._armT=.006;}
    f.manager.update(1/60,f.game);assert.deepEqual([a.dead,b.dead],[true,true]);assert.equal(f.explosions.length,0);
  }finally{f.close();}
});
test('overlapping depleted domes cannot steal the selected live shield contact',()=>{
  const f=fixture();try{
    const owner={team:2,def:{colors:{accent:'#ffd24a'}}};
    const spent={x:0,y:50,z:4,r:2,hp:0,owner},live={x:0,y:50,z:5,r:2,hp:100,owner};
    f.game._domes=[spent,live];const a=f.shot(1,0,1200,1);f.manager.update(1/60,f.game);
    assert.equal(a.dead,true);assert.equal(spent.hp,0);assert.equal(live.hp,88);
  }finally{f.close();}
});
