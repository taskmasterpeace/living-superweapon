import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/engine/game.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {VFX} from '../src/engine/vfx.js';

test('ordinary close-camera level-up preserves the fighter silhouette instead of a blast shell',()=>{
 const x=mainCombatFixture({hero:'kano'});const vfx=new VFX(x.w,x.g.particles);
 try{
  x.control(0);x.g.vfx=vfx;const before=new Set(x.g.scene.children),hp=x.p.maxHp;
  Game.prototype.levelUp.call(x.g,x.p);
  for(let i=0;i<12;i++)vfx.update(1/60);
  const added=x.g.scene.children.filter(m=>!before.has(m)&&m.isMesh);
  assert.ok(added.length>0,'Progression still needs a visible pulse');
  assert.equal(added.some(m=>m.geometry.type==='SphereGeometry'),false,'Routine level-up puts a luminous explosion around the body');
  assert.equal(x.p.level,2);assert.ok(x.p.maxHp>hp);assert.equal(x.p.tier,1);
 }finally{for(const effect of vfx.fx)effect.dispose();vfx.fx.length=0;x.close();}
});

for(const infinite of [false,true])test(`quiet level-up selects authored form with infinite core ${infinite}`,()=>{
 const ascended={name:'Ascended',frame:{bulk:1.3}},solar={name:'Solar',colors:{accent:'#ffbb32'}},calls=[];
 const f={level:3,xpNext:100,levelMult:1,powerBuff:1,buffT:0,maxHp:100,hp:60,maxKi:100,tier:1,energyInfinite:infinite,
  def:{progression:{forms:{4:ascended,7:solar}}},applyForm:form=>calls.push(form)};
 for(let i=0;i<4;i++)Game.prototype.levelUp.call({},f,true);
 assert.equal(f.level,7);assert.equal(calls[0],ascended);assert.equal(calls.at(-1),infinite?ascended:solar);
 assert.equal(f.tier,infinite?2:3);assert.equal(f.formName,infinite?'Ascended':'Solar');
});
