// Measure the complete held-beam contact, not just the beam tube over an
// already-glowing baseline. Production damage, animation, HDR and camera.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {PNG}=createRequire(import.meta.url)('../node_modules/playwright-core/lib/utilsBundle.js');
const out='artifacts/flight-review/beam-contact',tag=process.argv.includes('--before')?'before':'after';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 for(const cfg of [{hero:'sol',gap:14,pitch:-90},{hero:'sol',gap:14,pitch:0},{hero:'sol',gap:14,pitch:90},{hero:'kano',gap:50,pitch:15,charge:2.4}]){
  const row=await page.evaluate(cfg=>{
   const {game:g,THREE:T}=LSW;g.update=()=>{};g.startMode('powerworld',{p1:cfg.hero,p2:'vega'});
   g.vfx.update(10);g.particles.update(10);g.fov=false;g.world.setFogEnabled(false);
   const a=g.player,b=g.entities.find(e=>e!==a&&!e.isDummy),w=g.world,r=cfg.pitch*Math.PI/180;
   for(const f of g.entities)f.obj.visible=f===a||f===b;
   for(const f of [a,b]){f.vel.set(0,0,0);f.flying=true;f.gait='airborne';f.invuln=0;f.animT=0;}
   a.pos.set(0,210,0);b.pos.set(0,210+Math.sin(r)*cfg.gap,Math.cos(r)*cfg.gap);a.faceDir(0,1);b.faceDir(0,-1);
   b.hp=b.maxHp=50000;a.hasAimWorld=true;b.center(a.aimWorld);a.aim3.copy(a.aimWorld).sub(a.center(new T.Vector3())).normalize();
   w.snapChase();for(let i=0;i<120;i++){a._animate(1/120);b._animate(1/120);w.chase(a,b,1/120);}
   const suit=b.parts.mats.suit,neutral={color:suit.emissive.clone(),intensity:suit.emissiveIntensity};
   const existing=new Set(w.scene.children),beam=g.spawnBeamFor(a,a.slots.lmb.def,cfg.charge||1);a.slots.lmb.active=beam;
   let flashes=0;const flash=g.vfx.flash;
   g.vfx.flash=function(pos,...args){if(pos.distanceTo(b.center(new T.Vector3()))<3)flashes++;return flash.call(this,pos,...args);};
   try {
    for(let i=0;i<180;i++){
     const dt=1/120;g.time+=dt;a.ki=a.maxKi;a.update(dt,g);b.vel.set(0,0,0);b.update(dt,g);
     b.center(a.aimWorld);a.aim3.copy(a.aimWorld).sub(a.center(new T.Vector3())).normalize();
     g.projectiles.update(dt,g);g.vfx.update(dt);g.particles.update(dt);w.chase(a,b,dt);
    }
   }finally{g.vfx.flash=flash;}
   const cosmetics=w.scene.children.filter(o=>!existing.has(o)),lights=w.scene.children.filter(o=>o.isPointLight).map(o=>[o,o.intensity]);
   const full={color:suit.emissive.clone(),intensity:suit.emissiveIntensity};
   document.querySelector('#hud').style.display='none';w.render();
   window.beamContactCapture=(visible,effect)=>{
    b.parts.body.visible=visible;for(const o of cosmetics)o.visible=effect;
    for(const [o,intensity] of lights)o.intensity=effect?intensity:0;
    g.particles.points.visible=effect;suit.emissive.copy((effect?full:neutral).color);suit.emissiveIntensity=(effect?full:neutral).intensity;w.composer.render();
   };
   return {...cfg,flashes,damage:50000-b.hp};
  },cfg);
  const images=[];
  for(const [visible,effect] of [[true,false],[false,false],[true,true],[false,true]]){
   await page.evaluate(([visible,effect])=>beamContactCapture(visible,effect),[visible,effect]);
   images.push(PNG.sync.read(await page.screenshot({clip:{x:520,y:240,width:240,height:240}})).data);
  }
  const [on,off,fxOn,fxOff]=images;let base=0,actual=0,pixels=0,white=0;
  for(let i=0;i<on.length;i+=4){
   const diff=(a,b)=>Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
   const d=diff(on,off);if(d>25){pixels++;base+=d;actual+=diff(fxOn,fxOff);if(Math.min(...fxOn.subarray(i,i+3))>210&&Math.max(...fxOn.subarray(i,i+3))-Math.min(...fxOn.subarray(i,i+3))<30)white++;}
  }
  Object.assign(row,{pixels,retention:actual/Math.max(1,base),whiteFraction:white/Math.max(1,pixels)});rows.push(row);
  await page.evaluate(()=>beamContactCapture(true,true));await page.screenshot({path:`${out}/${tag}-${cfg.hero}-${cfg.pitch}.png`});
 }
 const failures=[];
 for(const row of rows){
  if(row.damage<=0||row.pixels<150)failures.push(`${row.hero}/${row.pitch}: fixture lacks damaged, visible opponent`);
  if(row.flashes)failures.push(`${row.hero}/${row.pitch}: ${row.flashes} redundant body flashes during held beam`);
  if(row.retention<.5||row.whiteFraction>.25)failures.push(`${row.hero}/${row.pitch}: contact washes out opponent (${row.retention.toFixed(2)} retention, ${row.whiteFraction.toFixed(2)} white)`);
 }
 const result={rows,failures,errors};await writeFile(`${out}/${tag}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
