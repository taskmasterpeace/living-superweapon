import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

const out='artifacts/transformations';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
  await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);
  await page.locator('#pwGo').click();
  const result=await page.evaluate(()=>{
    const g=LSW.game,w=g.world;g.update=()=>{};g.startMode('powerworld',{p1:'kano',p2:'vega'});
    const p=g.player,foe=g.entities.find(f=>f!==p&&!f.isDummy);
    g.fov=false;w.setFogEnabled(false);
    for(const f of g.entities){f.ai=null;f.obj.visible=f===p||f===foe;}
    p.pos.set(0,140,0);foe.pos.set(0,140,40);
    for(const f of [p,foe]){f.flying=true;f.gait='airborne';f.vel.set(0,0,0);f._vis=1;f.faceDir(0,f===p?1:-1);}
    g.hardLock=foe;w._lookYaw=0;w._lookPitch=0;w._shake=0;w.snapChase();
    for(let i=0;i<120;i++){p._animate(1/120);foe._animate(1/120);w.chase(p,foe,1/120);}
    g.levelUp(p,true);g.levelUp(p,true);g.hud.setPlayer(p.def);
    const events=[];
    for(const key of ['explode','shockwave','lightning','ring']){
      const original=g.vfx[key].bind(g.vfx);
      g.vfx[key]=(pos,opt)=>{events.push({key,pos:pos.toArray(),y:opt?.y});return original(pos,opt);};
    }
    g.levelUp(p);g.hud.update();w.render();
    return {level:p.level,tier:p.tier,events};
  });
  assert.equal(result.level,4);assert.equal(result.tier,2);
  assert.ok(result.events.every(e=>e.pos[1]>=140&&e.key!=='shockwave'),'real ascension effects must remain airborne');
  let previous=0;
  for(const age of [0,.1,.25,.5]){
    await page.evaluate(dt=>{
      const g=LSW.game;for(let t=0;t<dt-1e-8;t+=1/120){const step=Math.min(1/120,dt-t);g.vfx.update(step);g.particles.update(step);}
      g.world.render();
    },age-previous);
    await page.screenshot({path:`${out}/airborne-${Math.round(age*1000)}ms.png`});previous=age;
  }
  assert.deepEqual(errors,[]);await writeFile(`${out}/altitude-results.json`,JSON.stringify({result,errors},null,2));
  console.log('PASS actual airborne tier ceremony, four rendered ages, zero page/console errors');
}finally{await browser.close();}
