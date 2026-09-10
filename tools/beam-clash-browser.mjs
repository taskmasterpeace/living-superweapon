// Exercise the actual Three.js stream manager and capture airborne contact.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/beam-clash';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
  await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
  const result=await page.evaluate(()=>{
    const g=LSW.game;g.update=()=>{};g.startMode('powerworld',{p1:'kano',p2:'vega'});
    const a=g.player,b=g.entities.find(e=>e!==a&&!e.isDummy);
    for(const f of g.entities){f.ai=null;if(f!==a&&f!==b)f.pos.set(800,140,800);}
    for(const [f,z,dir] of [[a,0,1],[b,80,-1]]){
      f.pos.set(0,140,z);f.vel.set(0,0,0);f.flying=true;f.gait='airborne';f.faceDir(0,dir);
      f.hasAimWorld=false;f.aim3.set(0,0,dir);f.hp=f.maxHp=50000;f.ki=f.maxKi=5000;f.invuln=0;f._animate(1/60);
    }
    // Equal authored streams isolate the contact gate from roster balance.
    const def={...a.slots.lmb.def,radius:1,maxLen:150,might:1,kiPerSec:0};
    const x=g.spawnBeamFor(a,def,1),y=g.spawnBeamFor(b,def,1);x.might=y.might=1;
    a.slots.lmb.def=def;b.slots.lmb.def=def;a.slots.lmb.active=x;b.slots.lmb.active=y;g.hud?.setPlayer(a.def);
    let first=0,ticks=0;
    g.projectiles._beamClash(1/60,g);const fresh=x.clashing||y.clashing;
    for(let i=1;i<=60;i++){
      g.time+=1/60;a._animate(1/60);b._animate(1/60);g.projectiles.update(1/60,g);g.vfx.update(1/60);g.particles.update(1/60);
      if(x.clashing){first ||= i/60;ticks++;}
    }
    g.world.setFogEnabled(false);g.fov=false;
    const camera=g.world.camera;camera.position.set(95,170,-25);camera.lookAt(0,145,40);camera.updateMatrixWorld(true);
    g.world.render();window.clashFixture={g,x,y,a,b};
    return {fresh,first,ticks,heights:[x.tip.position.y,y.tip.position.y],distance:x.tip.position.distanceTo(y.tip.position)};
  });
  assert.equal(result.fresh,false);assert.ok(result.first>.1&&result.first<.7,JSON.stringify(result));assert.ok(result.ticks>20);
  assert.ok(result.heights.every(y=>y>140));assert.ok(result.distance<10,`contact tips separated ${result.distance}`);
  await page.screenshot({path:`${out}/airborne-contact.png`});
  const defeat=await page.evaluate(()=>{
    const {g,x,y,b}=clashFixture,explode=g.vfx.explode.bind(g.vfx);let height=null;
    g.vfx.explode=(p,o)=>{height=p.y;return explode(p,o);};
    const hp=b.hp;g.projectiles._overpower(y,x,g);g.world.render();return {height,damage:hp-b.hp,sustaining:y.sustaining};
  });
  assert.equal(defeat.height,145);assert.ok(defeat.damage>0);assert.equal(defeat.sustaining,false);
  await page.screenshot({path:`${out}/airborne-defeat.png`});assert.deepEqual(errors,[]);
  await writeFile(`${out}/results.json`,JSON.stringify({result,defeat,errors},null,2));
  console.log('PASS actual traveling contact, sustained airborne clash and airborne defeat; 0 page/console errors');
}finally{await browser.close();}
