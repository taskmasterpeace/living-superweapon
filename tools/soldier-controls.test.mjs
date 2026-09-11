import test from 'node:test';
import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';

function setup(hero='sarge'){
 const x=mainCombatFixture({hero,mode:'powerworld'});x.g.ms.chaseCam=true;x.p._openSky=true;x.p.onFoot=true;x.control(0);return x;
}
test('held soldier sprint is sustained movement, not a dash slot or energy burst',()=>{
 const x=setup(),f=x.p;
 try{
  const run=(sprint)=>{f.pos.set(0,0,0);f.vel.set(0,0,0);x.g.input.keys=new Set(['KeyW',...(sprint?['ShiftLeft']:[])]);x.g.input.justPressed=new Set(sprint?['ShiftLeft']:[]);
   for(let i=0;i<120;i++){x.control();f._physics(1/60,x.g);x.g.input.endFrame();}return f.pos.z;};
  const walk=run(false),ki=f.ki,sprint=run(true);
  assert.ok(sprint>walk*1.35,`walk ${walk}, sprint ${sprint}`);assert.equal(f.slots.shift.cd,0);assert.equal(f.ki,ki);
  x.g.input.keys.delete('ShiftLeft');x.control();assert.equal(f.sprintHeld,false);
 }finally{x.close();}
});
test('crouch, prone, firing and reload suppress held sprint',()=>{
 const x=setup(),f=x.p;
 try{
  x.g.input.keys=new Set(['KeyW','ShiftLeft']);x.control();assert.equal(f.sprintHeld,true);
  for(const key of ['crouching','prone','_firearmReload']){f[key]=true;x.control();assert.equal(f.sprintHeld,false,key);f[key]=false;}
  x.g.input.mouse.left=true;x.control();assert.equal(f.sprintHeld,false);
 }finally{x.close();}
});
test('soldier E uses the focused world interaction once without firing the E ability',()=>{
 const x=setup(),f=x.p;
 try{
  let used=0;const h=x.g.registerInteractable({pos:f.pos.clone().setZ(3),r:8,onUse:()=>used++});x.g._focus=h;
  x.g.input.keys.add('KeyE');x.g.input.justPressed.add('KeyE');x.control();assert.equal(used,1);assert.equal(f.slots.e.cd,0);
  x.g.input.endFrame();x.control();assert.equal(used,1);
 }finally{x.close();}
});
test('soldier direct slots select attacks without firing or changing character',()=>{
 const x=setup(),f=x.p;
 try{
  for(const [digit,slot]of [['Digit2','rmb'],['Digit3','q'],['Digit4','e'],['Digit5','f'],['Digit6','r'],['Digit1','lmb']]){
   x.g.input.justPressed.add(digit);x.control();assert.equal(f._selSlot,slot);assert.equal(x.g.player,f);assert.equal(f.slots[slot].cd,0);x.g.input.endFrame();
  }
  x.g.input.mouse.left=true;x.g.input.justPressed.add('Digit2');x.control();assert.equal(f._selSlot,'lmb','held trigger cannot become another attack');
 }finally{x.close();}
});
test('a quick click and slot key in the same frame cannot redirect the click into a different weapon',()=>{
 const x=setup();try{x.p._selSlot='lmb';Object.assign(x.g.input.mouse,{left:false,leftEdge:true,leftUp:true});x.g.input.justPressed.add('Digit2');x.control();assert.equal(x.p._selSlot,'lmb');assert.equal(x.p.slots.rmb.cd,0);}finally{x.close();}
});
