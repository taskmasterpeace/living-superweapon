// Real melee contact, production chase camera and HDR renderer. Ablate only
// contact cosmetics to measure whether the opponent survives the impact visually.
// Ages are simulation seconds, not wall time with slow motion. HUD and the single
// inverted impact frame are excluded; this is a post-contact anatomy check.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {PNG}=createRequire(import.meta.url)('../node_modules/playwright-core/lib/utilsBundle.js');
const heavyOnly=process.argv.includes('--heavy-only');
const out=`artifacts/flight-review/melee-visibility${heavyOnly?'/heavy':''}`;await mkdir(out,{recursive:true});
const tag=process.argv.includes('--before')?'before':'after';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const cases=(heavyOnly?['power','crush']:['jab','cross','power','guard','parry','crush']).flatMap(kind=>[1/30,1/12,.15].map(age=>({kind,age,opponent:'kano'})));
 if(!heavyOnly)cases.push(...['rime','vanguard'].map(opponent=>({kind:'guard',age:1/12,opponent})));
 for(const {kind,age,opponent} of cases) {
  const row=await page.evaluate(({kind,age,opponent})=>{
   const {game:g,THREE:T}=LSW;g.update=()=>{};g.startMode('powerworld',{p1:'sol',p2:opponent});g.fov=false;g.world.setFogEnabled(false);
   g.vfx.update(10);g.particles.update(10);g.world.print?.tick(10);
   const a=g.player,b=g.entities.find(e=>e!==a&&!e.isDummy);
   for(const f of g.entities)f.obj.visible=f===a||f===b;
   for(const f of [a,b]){f.pos.set(0,140,f===a?0:5);f.vel.set(0,0,0);f.flying=true;f.gait='airborne';f.invuln=0;f.hp=f.maxHp=1000;}
   a.faceDir(0,1);b.faceDir(0,-1);a.hasAimWorld=true;b.center(a.aimWorld);a.aim3.copy(a.aimWorld).sub(a.center(new T.Vector3())).normalize();
   a._animate(1);b._animate(1);g.world.snapChase();for(let i=0;i<120;i++)g.world.chase(a,b,1/120);
   document.querySelector('#hud').style.display='none';
   const existing=new Set(g.world.scene.children),suit=b.parts.mats.suit;
   const neutral={color:suit.emissive.clone(),intensity:suit.emissiveIntensity};
   b.guarding=['guard','parry','crush'].includes(kind);b._guardUpT=kind==='parry'?0:99;
   if(kind==='cross'){a.comboWin=.4;a.strikeIdx=1;}
   if(['power','crush'].includes(kind))g.melee._beginHeavy(a,'power',1,true);else g.melee.strike(a);
   let hitAt=-1,time=0;
   while(time<1.5) {
    a.move(new T.Vector3(),1/120);a.update(1/120,g);b.move(new T.Vector3(),1/120);b.update(1/120,g);g.resolveBodies();
    g.time+=1/120;g.vfx.update(1/120);g.particles.update(1/120);g.world.chase(a,b,1/120);time+=1/120;
    if(b.hp<1000&&hitAt<0)hitAt=time;
    if(hitAt>=0&&time-hitAt>=age-1e-6)break;
   }
   g.world.render();g.update=()=>g.world.composer.render();
   const cosmetic=g.world.scene.children.filter(o=>!existing.has(o));
   const lights=g.world.scene.children.filter(o=>o.isPointLight).map(o=>[o,o.intensity]);
   const full={color:suit.emissive.clone(),intensity:suit.emissiveIntensity};
   const guardVisible=b.parts.guardArc.visible;
   const anatomy=b.parts.body.children.filter(o=>o!==b.parts.guardArc).map(o=>[o,o.visible]);
   // Identical pose/camera/light topology across all four images; do not advance sim.
   window.contactVisibility=({visible,effect})=>{
    for(const [o,wasVisible] of anatomy)o.visible=visible&&wasVisible;
    // Baseline mask is anatomy, not the shield surface surrounding the anatomy.
    b.parts.guardArc.visible=effect&&guardVisible;
    for(const o of cosmetic)o.visible=effect;
    for(const [o,intensity] of lights)o.intensity=effect?intensity:0;
    g.particles.points.visible=effect;
    suit.emissive.copy((effect?full:neutral).color);suit.emissiveIntensity=(effect?full:neutral).intensity;
    g.world.composer.render();
   };
   const box=new T.Box3().setFromObject(b.parts.body),corners=[];
   for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
    const v=new T.Vector3(x,y,z).project(g.world.camera);corners.push([(v.x+1)*640,(1-v.y)*360]);
   }
   const x=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[0])))-3),y=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[1])))-3);
   return {kind,age,opponent,damage:1000-b.hp,hitFlash:b.hitFlash,crop:{x,y,width:Math.min(1280-x,Math.ceil(Math.max(...corners.map(p=>p[0])))-x+3),height:Math.min(720-y,Math.ceil(Math.max(...corners.map(p=>p[1])))-y+3)}};
  },{kind,age,opponent});
  const images=[];for(const [visible,effect] of [[true,false],[false,false],[true,true],[false,true]]){
   await page.evaluate(args=>contactVisibility(args),{visible,effect});images.push(PNG.sync.read(await page.screenshot({clip:row.crop})).data);
  }
  const [baseOn,baseOff,fxOn,fxOff]=images;let base=0,withEffect=0,pixels=0,white=0,changed=0;
  for(let i=0;i<baseOn.length;i+=4){
   const d=Math.abs(baseOn[i]-baseOff[i])+Math.abs(baseOn[i+1]-baseOff[i+1])+Math.abs(baseOn[i+2]-baseOff[i+2]);
   if(d>25){base+=d;withEffect+=Math.abs(fxOn[i]-fxOff[i])+Math.abs(fxOn[i+1]-fxOff[i+1])+Math.abs(fxOn[i+2]-fxOff[i+2]);pixels++;
    if(Math.min(...fxOn.subarray(i,i+3))>210&&Math.max(...fxOn.subarray(i,i+3))-Math.min(...fxOn.subarray(i,i+3))<30)white++;
   }
   if(Math.abs(baseOn[i]-fxOn[i])+Math.abs(baseOn[i+1]-fxOn[i+1])+Math.abs(baseOn[i+2]-fxOn[i+2])>25)changed++;
  }
  Object.assign(row,{pixels,retention:withEffect/Math.max(1,base),whiteFraction:white/Math.max(1,pixels),changed});rows.push(row);
  console.log(`${opponent}/${kind}@${Math.round(age*1000)} sim-ms: retention=${row.retention.toFixed(3)}, white=${row.whiteFraction.toFixed(3)}, feedbackPixels=${changed}`);
  await page.evaluate(()=>contactVisibility({visible:true,effect:true}));await page.screenshot({path:`${out}/${tag}-${opponent==='kano'?'':opponent+'-'}${kind}-${Math.round(age*1000)}.png`});
 }
 const failures=[];
 for(const r of rows){
  if(r.damage<=0||r.pixels<100)failures.push(`${r.opponent}/${r.kind}: fixture did not show real damaged opponent`);
  if(r.age>=.08&&(r.retention<.65||r.whiteFraction>.25))failures.push(`${r.opponent}/${r.kind}@${Math.round(r.age*1000)}ms: opponent obscured (retention ${r.retention.toFixed(2)}, white ${r.whiteFraction.toFixed(2)})`);
  if(r.age<.04&&r.changed<30)failures.push(`${r.opponent}/${r.kind}: contact feedback missing`);
 }
 const result={rows,failures,errors};await writeFile(`${out}/${tag}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(failures.length||errors.length)process.exitCode=1;
} finally {await browser.close();}
