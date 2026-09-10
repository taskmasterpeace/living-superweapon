import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {cometCharacter} from '../examples/comet-character.mjs';
const out='artifacts/examples';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
  await page.goto('http://127.0.0.1:5180/studio.html');await page.waitForFunction(()=>window.STUDIO);
  await page.locator('#import').click();await page.locator('#profile-json').fill(JSON.stringify(cometCharacter()));
  await page.getByRole('button',{name:'Import profile',exact:true}).click();
  await page.waitForFunction(()=>STUDIO.preview.fighter.def.name==='COMET');
  const id=await page.evaluate(()=>STUDIO.history.value.heroId);
  await page.reload();await page.waitForFunction(()=>window.STUDIO);await page.locator(`[data-hero="${id}"]`).click();
  assert.equal(await page.evaluate(()=>STUDIO.preview.fighter.def.abilities.q.splitCount),4);
  await page.screenshot({path:`${out}/comet-studio.png`});
  await page.locator('#playtest').click();await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
  assert.equal(await page.evaluate(()=>LSW.game.player.def.id),id);
  await page.evaluate(()=>{
    const g=LSW.game,p=g.player,w=g.world,update=g.update.bind(g),endFrame=g.input.endFrame.bind(g.input),render=w.render.bind(w);
    g.update=()=>{};g.input.endFrame=()=>{};w.render=()=>{};g.controlBot=()=>{};
    for(const f of g.entities)if(f!==p){f.ai=null;f.pos.set(800,140,800);}
    p.pos.set(0,140,0);p.vel.set(0,0,0);p.flying=true;p.gait='airborne';p.faceDir(0,1);
    w._lookActive=true;w._lookYaw=0;w._lookPitch=0;w.snapChase();g.fov=false;w.setFogEnabled(false);
    window.cometTick=(n=1)=>{for(let i=0;i<n;i++){update(1/60);endFrame();}};window.cometRender=render;
    endFrame();cometTick(30);
  });
  await page.keyboard.down('q');await page.evaluate(()=>cometTick());await page.keyboard.up('q');await page.evaluate(()=>cometTick(10));
  assert.equal(await page.evaluate(()=>LSW.game.projectiles.list.filter(p=>!p.dead).length),1);
  await page.keyboard.down('q');await page.evaluate(()=>cometTick());await page.keyboard.up('q');
  const children=await page.evaluate(()=>LSW.game.projectiles.list.filter(p=>!p.dead).map(p=>({count:p.splitCount,homing:p.homing,speed:p.vel.length()})));
  assert.equal(children.length,4);assert.ok(children.every(p=>p.count===0&&p.homing===5&&Math.abs(p.speed-105)<1e-6));
  await page.evaluate(()=>{cometTick(9);cometRender();});await page.screenshot({path:`${out}/comet-split-playtest.png`});
  assert.deepEqual(errors,[]);await writeFile(`${out}/comet-results.json`,JSON.stringify({id,children,errors},null,2));
  console.log('PASS COMET UI import → reload → PowerWorld → real Q key split; zero page/console errors');
}finally{await browser.close();}
