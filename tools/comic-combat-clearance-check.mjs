// Legacy CITY speech/SFX layout against projected, articulated fighter geometry.
// Catches fixed center-box avoidance pushing lettering onto lower-screen bodies.
// Deliberately starts the real City page and freeroam mode, not a PowerWorld
// scene with modeId overwritten. Field HUD dialogue has its own fixture.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];
const out='artifacts/flight-review/comic-clearance-city',tag=process.argv.includes('--before')?'before':'after';await mkdir(out,{recursive:true});
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/index.html');await page.waitForFunction(()=>window.LSW?.game);
 await page.evaluate(()=>{LSW.game.update=()=>{};LSW.enter({mode:'freeroam',p1:'sol'});});await page.evaluate(()=>document.fonts.ready);
 const rows=[];
 for(const [width,height] of [[1280,720],[800,600],[1920,1080]])for(const state of ['hover','boost','cast','vertical'])for(const locked of [false,true]){
  await page.setViewportSize({width,height});
  rows.push(await page.evaluate(({state,locked})=>{
   const {game:g,THREE:T}=LSW,w=g.world,c=g.comic;g.startMode('freeroam',{p1:'sol'});g.spawnEnemy('kano');w.setCameraMode('chase');g.fov=false;
   if(!g.ms.roam||g.ms.powerworld||w.skyWorld==='powerworld')throw Error('Legacy fixture did not enter the real City world');
   const p=g.player,t=g.entities.find(e=>e!==p&&!e.isDummy);
   for(const e of g.entities){e.vel.set(0,0,0);if(e!==p&&e!==t)e.pos.set(800,140,800);}
   for(const f of [p,t]){f.pos.set(0,160,0);f.flying=true;f.gait='airborne';f._vis=1;f.faceDir(0,1);}
   t.pos.set(8,160+(state==='vertical'?24:0),state==='vertical'?4:32);g.hardLock=locked?t:null;
   p.cruiseHeld=state==='boost';p.vel.set(state==='boost'?35:0,0,state==='boost'?75:0);p.castPose=state==='cast'?1:0;
   w.snapChase();for(let i=0;i<120;i++){p._animate(1/60);t._animate(1/60);w.chase(p,locked?t:null,1/60);}
   g.hud.setPlayer(p.def);g.hud.update();w.render();c.clear();
   c.say(p,"I'M DONE...",{life:10});c.say(t,'COME ON!',{life:10});c.sfx('KRAK',t.pos,{power:.4,life:10});
   c.update(1/60);for(const el of c.el.querySelectorAll('*'))for(const a of el.getAnimations())a.finish();
   const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
   const overlaps=(a,b)=>a.x+a.w>b.x&&b.x+b.w>a.x&&a.y+a.h>b.y&&b.y+b.h>a.y;
   const bodyOf=f=>{
    f.obj.updateMatrixWorld(true);const points=[];
    for(const m of [f.parts.head,f.parts.torso,f.parts.pelvis,...f.parts.armL.children.slice(0,3),...f.parts.armR.children.slice(0,3),f.parts.legL.userData.boot,f.parts.legR.userData.boot]){
     if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();const b=m.geometry.boundingBox;
     for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){
      const v=new T.Vector3(x,y,z).applyMatrix4(m.matrixWorld).project(w.camera);points.push({x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2});
     }
    }
    const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));return {x,y,w:Math.max(...points.map(p=>p.x))-x,h:Math.max(...points.map(p=>p.y))-y};
   };
   window.comicBodyOf=bodyOf;const bodies=[p,t].map(bodyOf);
   const lettering=c.items.map(it=>({kind:it.kind,rect:rect(it.node),visible:getComputedStyle(it.node).visibility!=='hidden'&&getComputedStyle(it.node).opacity!=='0'}));
   const ui=['plPanel','kit','slots','radar','foe'].map(k=>g.hud.el[k]).filter(el=>el&&getComputedStyle(el).display!=='none').map(rect);
   const bad=[];
   for(const l of lettering.filter(l=>l.visible)){
    if(bodies.some(b=>overlaps(l.rect,b)))bad.push(`${l.kind} covers fighter`);
    if(ui.some(b=>overlaps(l.rect,b)))bad.push(`${l.kind} covers HUD`);
    if(l.rect.x<0||l.rect.y<0||l.rect.x+l.rect.w>innerWidth||l.rect.y+l.rect.h>innerHeight)bad.push('lettering outside viewport');
   }
   if(lettering.filter(l=>l.kind==='bub'&&l.visible).length!==2)bad.push('ordinary dialogue unnecessarily hidden');
   const tails=c.items.filter(it=>it.kind==='bub'&&it.tail?.getAttribute('d'));
   if(innerWidth===1280&&state==='hover'&&!locked&&tails.length!==2)bad.push('clear-space dialogue loses speaker attribution');
   const stable=lettering.map(l=>l.rect);c.update(1/60);
   const moved=c.items.filter(i=>i.kind==='bub').some((it,i)=>Math.hypot(rect(it.node).x-stable[i].x,rect(it.node).y-stable[i].y)>1);
   if(moved)bad.push('stationary speech jitters');
   return {width:innerWidth,height:innerHeight,state,locked,mode:g.modeId,city:!!g.ms.roam,bodies,lettering,bad};
  },{state,locked}));
  if(width===1280&&state==='hover')await page.screenshot({path:`${out}/${tag}-${locked?'locked':'free'}.png`});
 }
 await page.setViewportSize({width:1280,height:720});
 const motion=await page.evaluate(()=>{
  const g=LSW.game,w=g.world,c=g.comic;g.startMode('freeroam',{p1:'kano'});g.spawnEnemy('vega');w.setCameraMode('chase');g.fov=false;
  const p=g.player,t=g.entities.find(e=>e!==p&&!e.isDummy);
  for(const f of g.entities){f.vel.set(0,0,0);f.pos.set(800,160,800);}
  for(const f of [p,t]){f.flying=true;f.gait='airborne';f._vis=1;}
  p.pos.set(0,160,0);t.pos.set(3,160,45);g.hardLock=t;w.snapChase();g.hud.setPlayer(p.def);c.clear();
  c.say(p,'You are not getting past me. I can still see exactly where you are going!',{life:10});
  c.say(t,'THEN KEEP UP!',{tone:'yell',life:10});c.sfx('KRAKA-DOOM',t.pos,{power:1,life:10}).node.style.setProperty('--rot','8deg');
  const rows=[];
  const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
  const overlaps=(a,b)=>a.x+a.w>b.x&&b.x+b.w>a.x&&a.y+a.h>b.y&&b.y+b.h>a.y;
  for(let frame=0;frame<120;frame++){
   const time=frame/30;t.pos.z=45-70*Math.min(1.5,Math.max(0,time-1.5));
   p.faceDir(t.pos.x,t.pos.z);t.faceDir(-t.pos.x,-t.pos.z);p._animate(1/30);t._animate(1/30);w.chase(p,t,1/30);
   g.updateReticle(1/30);g.hud.updateCrosshair(g);
   const start=performance.now();c.update(1/30);const ms=performance.now()-start;
   for(const it of c.items)for(const a of it.node.getAnimations()){a.pause();a.currentTime=time*1000;}
   const bodies=[p,t].map(comicBodyOf),bad=[],collisions=[];let visible=0,sfxVisible=0;
   for(const it of c.items){
    const s=getComputedStyle(it.node);if(s.visibility==='hidden'||Number(s.opacity)<.05)continue;
    if(it.kind==='bub')visible++;
    if(it.kind==='sfx')sfxVisible++;
    const painted=[rect(it.node),...Array.from(it.node.querySelectorAll('.burst'),rect)];
    if(painted.some(r=>bodies.some(b=>overlaps(r,b)))){bad.push(`${it.kind} painted over moving body`);collisions.push({kind:it.kind,painted,bodies,placed:it._placed?{x:it._placed.x,y:it._placed.y,w:it._placed.w,h:it._placed.h}:null});}
   }
   rows.push({frame,ms,visible,sfxVisible,bad,collisions});
  }
  return rows;
 });
 const exitChecks=await page.evaluate(()=>{
  const c=LSW.game.comic,t=LSW.game.entities.find(e=>e!==LSW.game.player&&!e.isDummy),rows=[];
  for(const rotation of [-8,8]){
   c.clear();const it=c.sfx('KRAKA-DOOM',t.pos,{power:1,life:.03});it.node.style.setProperty('--rot',`${rotation}deg`);
   let painted=0;const failures=[];
   for(let frame=0;frame<12;frame++){
    c.update(1/60);for(const a of it.node.getAnimations()){a.pause();a.currentTime=Math.max(0,frame-1)*1000/60;}
    if(!it._out||!it._placed||getComputedStyle(it.node).visibility==='hidden')continue;
    painted++;const b=it._placed;
    for(const el of [it.node,...it.node.querySelectorAll('.burst')]){const r=el.getBoundingClientRect();if(r.left<b.x-1||r.right>b.x+b.w+1||r.top<b.y-1||r.bottom>b.y+b.h+1)failures.push(`frame ${frame}: exit exceeds reserved bounds`);}
   }rows.push({rotation,painted,failures});
  }return rows;
 });
 const hidden=await page.evaluate(()=>{
  const g=LSW.game,c=g.comic,f=g.entities.find(e=>e!==g.player&&!e.isDummy);c.clear();g.fov=true;f._vis=0;
  const it=c.say(f,'HIDDEN SPEAKER',{life:10});c.update(1/60);for(const a of it.node.getAnimations())a.finish();
  const s=getComputedStyle(it.node);return s.visibility==='hidden'||s.opacity==='0';
 });
 const failures=rows.flatMap(r=>r.bad.map(b=>`${r.width}/${r.state}/${r.locked}: ${b}`));
 failures.push(...motion.flatMap(r=>r.bad.map(b=>`frame ${r.frame}: ${b}`)));
 if(motion.reduce((sum,r)=>sum+r.visible,0)<210)failures.push('moving dialogue is mostly hidden instead of placed');
 if(motion.reduce((sum,r)=>sum+r.sfxVisible,0)<90)failures.push('impact lettering is mostly hidden instead of placed');
 for(const r of exitChecks){if(!r.painted)failures.push('exit animation never exercised');failures.push(...r.failures);}
 if(!hidden)failures.push('hidden foe leaks speech location');
 const captionOverlap=await page.evaluate(()=>{
  const g=LSW.game,c=g.comic;c.clear();const it=c.caption('NEXT ROUND',{where:'tr',life:10});for(const a of it.node.getAnimations())a.finish();
  const a=it.node.getBoundingClientRect(),b=g.hud.el.radar.getBoundingClientRect();
  return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
 });
 if(captionOverlap)failures.push('caption placement regresses into radar');
 await writeFile(`${out}/${tag}.json`,JSON.stringify({rows,motion,exitChecks,failures,errors},null,2));console.log(JSON.stringify({cases:rows.length,motionFrames:motion.length,exitChecks,p95UpdateMs:motion.map(r=>r.ms).sort((a,b)=>a-b)[114],failures,errors},null,2));if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
