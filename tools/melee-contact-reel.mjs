// Scripted production movement/strike/pose, not a claim of AI or performance acceptance.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const readability=process.argv.includes('--readability');
const out=`artifacts/flight-review/${readability?'melee-readability':'melee-contact'}`;await mkdir(`${out}/frames`,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(()=>{LSW.game.update=()=>{};});const rows=[];
 for(const [index,kind] of (readability?['jab','cross','power','guard','parry','crush']:['jab','cross','power','miss']).entries()) {
  if(process.argv.includes('--miss-only')&&kind!=='miss')continue;
  await page.evaluate(({kind,readability})=>{
   const {game:g,THREE:T}=LSW;g.startMode('powerworld',{p1:'sol',p2:kind==='miss'?'sarge':'kano'});g.fov=false;g.world.setFogEnabled(false);
   const a=g.player,b=g.entities.find(e=>e!==a&&!e.isDummy);
   g.vfx.update(10);g.particles.update(10);g.world.print?.tick(10);g._slowT=0;
   for(const f of g.entities)if(f!==a&&f!==b)f.obj.visible=false;
   for(const f of [a,b]){f.pos.set(0,140,f===a?0:5);f.vel.set(0,0,0);f.flying=true;f.gait='airborne';f.invuln=0;f.hp=f.maxHp=1000;}
   if(kind==='miss'){b.pos.set(0,136,7);b.flying=false;b.gait='fall';b.vel.y=-12;}
   a.faceDir(0,1);b.faceDir(0,-1);a.hasAimWorld=true;b.center(a.aimWorld);a.aim3.copy(a.aimWorld).sub(a.center(new T.Vector3())).normalize();
   a._animate(1);b._animate(1);g.world.snapChase();
   if(readability)for(let i=0;i<120;i++)g.world.chase(a,b,1/120);
   document.querySelector('#hud').style.display=readability?'':'none';
   b.guarding=['guard','parry','crush'].includes(kind);b._guardUpT=99;g.hardLock=b;
   let label=document.querySelector('#contact-label');if(!label){label=document.createElement('div');label.id='contact-label';label.style.cssText='position:fixed;left:24px;top:24px;color:#ffe5a0;background:#211d18e8;padding:12px 16px;font:600 16px system-ui';document.body.append(label);}
   window.contactActors={a,b};
   window.contactFrame=frame=>{
    let simDt=0;
    for(let step=0;step<5;step++) {
     let dt=1/120;
     if(readability&&g._slowT>0){g._slowT-=dt;dt*=g._slowMul||1;}simDt+=dt;
     a.move(new T.Vector3(),dt);
     b.center(a.aimWorld);a.aim3.copy(a.aimWorld).sub(a.center(new T.Vector3())).normalize();
     if(frame===8&&step===0) {
      if(kind==='cross'){a.comboWin=.4;a.strikeIdx=1;}
      if(kind==='parry')b._guardUpT=0;
      if(kind==='power'||kind==='crush')g.melee._beginHeavy(a,'power',1,true);else g.melee.strike(a);
     }
     a.update(dt,g);if(kind!=='miss')b.move(new T.Vector3(),dt);b.update(dt,g);
     g.resolveBodies();g.time+=dt;g.particles.update(dt);g.vfx.update(dt);
    }
    const chase=readability||kind==='jab'||kind==='power';
    if(chase)g.world.chase(a,b,readability?simDt:1/24);
    else {
     const mid=a.center(new T.Vector3()).lerp(b.center(new T.Vector3()),.5);
     const offset=new T.Vector3(17,4,-14);
     if(kind==='miss')offset.setLength(Math.max(offset.length(),a.pos.distanceTo(b.pos)*1.4+24));
     g.world.camera.position.copy(mid).add(offset);g.world.camera.lookAt(mid);g.world.camera.fov=48;g.world.camera.updateProjectionMatrix();
    }
    label.textContent=`${kind.toUpperCase()} · ${chase?'production chase camera':'inspection camera'} · damage ${Math.round(1000-b.hp)}`;
    if(readability){g.hud?.update();g.world._lastRender=performance.now()-1000/24;}
    g.world.render();
   };
  },{kind,readability});
  // The miss segment ends after recovery; following a long fall is a different
  // camera test and sends this fixed inspection view behind unrelated cover.
  for(let frame=0;frame<(kind==='miss'?18:48);frame++) {
   await page.evaluate(frame=>contactFrame(frame),frame);
   await page.screenshot({path:`${out}/frames/frame-${String(index*48+frame).padStart(4,'0')}.png`});
  }
  rows.push(await page.evaluate(kind=>({kind,damage:1000-contactActors.b.hp}),kind));
 }
 await writeFile(`${out}/${process.argv.includes('--miss-only')?'miss-checks':'checks'}.json`,JSON.stringify({rows,errors},null,2));console.log({rows,errors});
 if(errors.length||rows.some(r=>r.kind==='miss'?r.damage!==0:r.damage<=0))process.exitCode=1;
}finally {await browser.close();}
