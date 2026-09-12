import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';import {TimeFields} from '../src/engine/systems.js';import {Projectiles} from '../src/engine/projectiles.js';import {Game} from '../src/engine/game.js';
function fixture(){const noop=()=>{},rings=[],g={time:0,scene:new T.Scene(),entities:[],world:{cover:[],interiors:[],shake:noop,punch:noop},audio:{boom:noop,zap:noop,hit:noop},particles:{burst:noop,spawn:noop},isHuman:()=>false,vfx:{borrowLight:()=>new T.PointLight(),returnLight:noop,flash:noop,impactStar:noop,ring:p=>rings.push(p.clone()),explode:noop},areaDamage:noop,noise:noop,nearestFoe:()=>null,isFoe:(a,b)=>a.team!==b.team,overlapFoe:Game.prototype.overlapFoe,hitFlung:Game.prototype.hitFlung};g.projectiles=new Projectiles(g);g.timeFields=new TimeFields(g);const owner=team=>({team,alive:true,powerBuff:1,pos:new T.Vector3(0,50,0),aim3:new T.Vector3(1,0,0)}),caster=owner(1),enemy=owner(2);return {g,caster,enemy,rings,shot:(src,x,v,priority)=>g.projectiles.spawnProjectile(src,{pos:new T.Vector3(x,50,0),vel:new T.Vector3(v,0,0),radius:1,damage:12,collisionPriority:priority}),close(){for(const p of g.projectiles.list)p._dispose(g);g.timeFields.clear();}};}
for(const hz of [30,60,120])for(const priority of [undefined,1])test(`field traversal preserves speed and swept travel ${hz}Hz priority ${priority}`,()=>{const f=fixture();try{const {g,caster,enemy}=f;g.timeFields.add(caster.pos,28,5,.4,caster,{follow:true});const p=f.shot(enemy,-60,1200,priority);for(let i=0;i<hz/5;i++)g.projectiles.update(1/hz,g);assert.ok(Math.abs(p.pos.x-96)<1e-5,`actual ${p.pos.x}`);assert.equal(p.vel.x,1200);assert.equal(p.dead,false);}finally{f.close();}});
for(const hz of [30,60,120])test(`slowed shot still hits thin cover at ${hz}Hz`,()=>{const f=fixture();try{const {g,caster,enemy}=f;g.timeFields.add(caster.pos,28,5,.4,caster,{follow:true});g.world.cover.push({x:0,z:0,hx:.1,hz:10,top:70,bottom:0,projectileShape:'box'});const p=f.shot(enemy,-60,2000,1);for(let i=0;i<hz&&!p.dead;i++)g.projectiles.update(1/hz,g);assert.ok(p.dead);assert.ok(p.pos.x<1&&p.pos.x>-3,`contact ${p.pos.x}`);}finally{f.close();}});
for(const reverse of [false,true])test(`unequal clocks preserve pair interception order reverse ${reverse}`,()=>{const f=fixture();try{const {g,caster,enemy}=f;g.timeFields.add(caster.pos,100,5,.4,caster,{follow:true});const a=f.shot(caster,-20,100,1),b=f.shot(enemy,20,-100,1);if(reverse)g.projectiles.list.reverse();for(let i=0;i<40&&!a.dead;i++)g.projectiles.update(1/60,g);assert.ok(a.dead&&b.dead);assert.ok(Math.abs((a.pos.x+b.pos.x)/2-8.1428571429)<1e-5);assert.equal(a.vel.x,100);assert.equal(b.vel.x,-100);}finally{f.close();}});


for (const hz of [30,60,120]) test(`large VOLT field restores bullet speed after exit at ${hz}Hz`,()=>{
 const f=fixture();try {
  const {g,caster,enemy}=f;g.timeFields.add(caster.pos,112,5,.4,caster,{follow:true});
  const p=f.shot(enemy,-160,600,1), observed={before:[],inside:[],after:[]};
  for(let i=0;i<hz*2&&!p.dead;i++) {
   const x=p.pos.x;g.projectiles.update(1/hz,g);const next=p.pos.x,speed=(next-x)*hz;
   const region=next < -113?'before':x > 113?'after':x > -111&&next <111?'inside':null;
   if(region)observed[region].push(speed);
  }
  for(const [region,expected] of [['before',600],['inside',240],['after',600]]) {
   assert.ok(observed[region].length>0,`${region} observed`);
   for(const speed of observed[region])assert.ok(Math.abs(speed-expected)<1e-5,`${region}: ${speed}`);
  }
  assert.equal(p.vel.x,600);assert.equal(p.dead,false);
 } finally{f.close();}
});
