// Scripted real melee contact, production Fighter.update and rendering. Not AI/performance proof.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/flight-review/hit-reaction/reel';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(()=>{LSW.game.update=()=>{};});
 const rows=[];
 for(const [index,hero] of ['kano','sarge'].entries()){
  await page.evaluate(hero=>{
   const {game:g,THREE:T}=LSW;g.startMode('powerworld',{p1:'sol',p2:hero});g.fov=false;g.world.setFogEnabled(false);
   const a=g.player,f=g.entities.find(e=>e!==a&&!e.isDummy);window.reactionActors={a,f};
   for(const e of g.entities)if(e!==a&&e!==f)e.obj.visible=false;
   a.pos.set(0,140,0);f.pos.set(0,140,7);a.vel.set(0,0,0);f.vel.set(1.5,0,0);
   a.flying=true;a.gait='airborne';f.flying=hero!=='sarge';f.gait=hero==='sarge'?'fall':'airborne';
   a.invuln=f.invuln=0;a.faceDir(0,1);f.faceDir(0,-1);f.hp=f.maxHp=1000;
   a._animate(1);f._animate(1);g.hud.setPlayer(a.def);g.hud.update();
   document.querySelector('#hud').style.display='none';
   let label=document.querySelector('#reaction-label');if(!label){label=document.createElement('div');label.id='reaction-label';label.style.cssText='position:fixed;left:24px;top:24px;color:#ffe5a0;background:#211d18e8;padding:12px 16px;font:600 16px system-ui';document.body.append(label);}
   window.reactionFrame=(frame)=>{
    if(frame===10)g.melee.strike(a);
    for(let step=0;step<5;step++){
     g.time+=1/120;
     a.aim3.copy(f.center(new T.Vector3())).sub(a.center(new T.Vector3())).normalize();
     a.aimWorld.copy(f.center(new T.Vector3()));a.hasAimWorld=true;a.faceDir(f.pos.x-a.pos.x,f.pos.z-a.pos.z);
     a.update(1/120,g);f.update(1/120,g);g.resolveBodies();g.particles.update(1/120);g.vfx.update(1/120);
    }
    // Falling targets must stay visible through landing. This is an inspection
    // camera, not the production chase-camera acceptance fixture.
    const mid=hero==='sarge'?f.center(new T.Vector3()):a.center(new T.Vector3()).lerp(f.center(new T.Vector3()),.5);
    g.world.camera.position.copy(mid).add(new T.Vector3(22,6,-19));g.world.camera.lookAt(mid);g.world.camera.fov=48;g.world.camera.updateProjectionMatrix();
    label.textContent=`${hero.toUpperCase()} · ${frame<10?'moving entry':frame<20?'melee contact':hero==='sarge'?'fall / landing':'recovery'} · production attack / inspection camera`;
    g.world.render();
   };
  },hero);
  for(let frame=0;frame<(hero==='sarge'?72:48);frame++){
   await page.evaluate(frame=>reactionFrame(frame),frame);
   await page.screenshot({path:`${out}/frame-${String(index*48+frame).padStart(4,'0')}.png`});
  }
  rows.push(await page.evaluate(()=>({hero:reactionActors.f.def.id,damage:1000-reactionActors.f.hp,state:reactionActors.f.state})));
 }
 console.log({rows,errors});await writeFile(`${out}/checks.json`,JSON.stringify({rows,errors},null,2));
 if(errors.length||rows.some(r=>r.damage<=0))process.exitCode=1;
}finally{await browser.close();}
