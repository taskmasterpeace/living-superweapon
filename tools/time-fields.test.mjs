import test from 'node:test';import assert from 'node:assert/strict';import {Scene,Vector3} from 'three';import {TimeFields} from '../src/engine/systems.js';import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';import {activatePowerUp} from '../src/engine/power-up.js';
const world=()=>({scene:new Scene(),audio:{zap(){}},particles:{spawn(){}},time:0});
test('following fields apply bounded local time, follow caster, expire and clear without stacking',()=>{
 const g=world(),t=new TimeFields(g),a={alive:true,pos:new Vector3()},b={alive:true,pos:new Vector3(12,0,0)};
 const field=t.add(a.pos,28,5,.4,a,{follow:true});assert.equal(t.scaleFor(a),1);assert.equal(t.scaleFor(b),.4);assert.equal(field.mesh.scale.x,1);
 b.pos.y=40;assert.equal(t.scaleFor(b),1);b.pos.y=0;a.pos.x=100;assert.equal(t.scaleFor(b),1);b.pos.x=110;assert.equal(t.scaleFor(b),.4);
 t.add(a.pos,28,5,.5,a,{follow:true});assert.equal(t.scaleFor(b),.5);t.update(.1);assert.equal(t.list.length,1);assert.equal(t.list[0].mesh.position.x,100);
 a.alive=false;assert.equal(t.scaleFor(b),1);t.update(.1);assert.equal(t.list.length,0);assert.equal(g.scene.children.length,0);
 a.alive=true;t.add(a.pos,28,.1,.4,a,{follow:true});t.update(.2);assert.equal(t.scaleFor(b),1);t.clear();assert.equal(g.scene.children.length,0);
});
for(const hz of [30,60,120])test(`native Overclock pays once and slows fighter simulation at ${hz}Hz`,()=>{
 const {g,p,foe,dispose}=mainCombatFixture({hero:'volt'});const t=g.timeFields=new TimeFields(g),f=foe({z:12});
 try{g.heroYell=()=>{};const ki=p.ki;assert.ok(activatePowerUp(p,g));assert.equal(p.ki,ki-p.powerUp.def.cost);assert.equal(t.list.length,1);assert.equal(activatePowerUp(p,g),false);
 const before=f.animT;for(let i=0;i<hz;i++)f.update(t.scaleFor(f)/hz,g);assert.ok(Math.abs(f.animT-before-.4)<.001);
 f.pos.set(0,0,100);const outside=f.animT;for(let i=0;i<hz;i++)f.update(t.scaleFor(f)/hz,g);assert.ok(Math.abs(f.animT-outside-1)<.001);
 }finally{t.clear();p.dispose();f.dispose();}
});



