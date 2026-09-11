// Real HUD layout: inactive alerts must not consume combat space, and mood must
// never cover the kit. Active warnings remain readable instead of being clipped.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/flight-review/hud-density',tag=process.argv.includes('--before')?'before':'after';
await mkdir(out,{recursive:true});const browser=await chromium.launch(),page=await browser.newPage(),errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(()=>{LSW.game.update=()=>{};});
 for(const width of [800,1280,1920])for(const hero of ['sol','stefanos','sandra']){
  await page.setViewportSize({width,height:720});
  rows.push(await page.evaluate(({hero})=>{
   const {game:g,hud:h}=LSW;g.startMode('powerworld',{p1:hero,p2:'kano'});const p=g.player;
   p.pos.set(0,140,0);p.flying=true;p.gait='airborne';p.faceDir(0,1);g.world.snapChase();g.world.chase(p,null,1/60);
   p._psyche={main:'trust',shade:'trusting',colour:'#ffd24a',mood:{id:'test',text:'READY TO HELP'}};
   h.setPlayer(p.def);h.update();h.updateMood(g);p._animate(1/60);g.world.render();
   const box=el=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
   const overlap=(a,b)=>a.width&&b.width&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
   const normal=box(h.el.plPanel),mood=box(h._moodEl),kit=box(h.el.kit);
   const inactiveSpace=h.el.kiOver.getClientRects().length+h.el.kiState.getClientRects().length;
   const taken=[];g.comic._combatOccupancy(taken);
   const lettering=g.comic._clearPlacement({node:document.createElement('div')},mood.left+4,mood.top+4,80,20,{x0:0,y0:0,x1:innerWidth,y1:innerHeight},taken);
   const comicOverlap=lettering&&overlap(mood,{left:lettering.x,top:lettering.y,right:lettering.x+lettering.w,bottom:lettering.y+lettering.h,width:lettering.w,height:lettering.h});
   h.el.kiState.classList.add('on');h.el.kiOver.classList.add('on');
   const warnings=[h.el.kiState,h.el.kiOver].map(el=>({box:box(el),text:el.textContent,font:parseFloat(getComputedStyle(el).fontSize),opacity:getComputedStyle(el).opacity,display:getComputedStyle(el).display}));
   const alertPanel=box(h.el.plPanel),alertContained=warnings.every(w=>w.box.left>=alertPanel.left&&w.box.right<=alertPanel.right&&w.box.top>=alertPanel.top&&w.box.bottom<=alertPanel.bottom&&w.box.width>0&&w.font>=10&&w.display!=='none');
   h.el.kiState.classList.remove('on');h.el.kiOver.classList.remove('on');
   // Same mood after menu / resume must reappear despite the content dirty key.
   g.running=false;h.updateMood(g);g.running=true;h.updateMood(g);
   const resumeVisible=getComputedStyle(h._moodEl).display!=='none';
   p._openSky=false;h.update();h.updateMood(g);
   const cityRestored=h._moodEl.parentNode===document.body&&getComputedStyle(h._moodEl).position==='fixed';
   p._openSky=true;h.update();h.updateMood(g);
   document.body.classList.add('tablet');h.updateMood(g);
   const touchRestored=h._moodEl.parentNode===document.body&&getComputedStyle(h._moodEl).position==='fixed';
   document.body.classList.remove('tablet');h.updateMood(g);
   return {hero,width:innerWidth,normal,mood,kit,inactiveSpace,moodOverlaps:!!(overlap(mood,kit)||overlap(mood,normal)),comicOverlap,alertContained,resumeVisible,cityRestored,touchRestored};
  },{hero}));
  if(hero==='sol')await page.screenshot({path:`${out}/${tag}-${width}.png`});
 }
 const failures=[];for(const r of rows){if(r.normal.height>150)failures.push(`${r.hero}/${r.width}: meters consume ${r.normal.height}px vertically`);if(r.inactiveSpace)failures.push(`${r.hero}/${r.width}: inactive warnings reserve space`);if(r.moodOverlaps)failures.push(`${r.hero}/${r.width}: mood overlaps status`);if(!r.alertContained)failures.push(`${r.hero}/${r.width}: active warning is clipped or unreadable`);if(!r.resumeVisible)failures.push(`${r.hero}/${r.width}: unchanged mood stays hidden after resume`);}
 for(const r of rows){if(r.comicOverlap)failures.push(`${r.hero}/${r.width}: comic lettering covers the docked mood`);if(!r.cityRestored||!r.touchRestored)failures.push(`${r.hero}/${r.width}: mood did not return to city/touch ownership`);}
 const energy=await page.evaluate(()=>{
  const {game:g,hud:h}=LSW,rows=[];
  for(const state of ['drained','overdrive','infinite']){
   g.startMode('powerworld',{p1:state==='infinite'?'titan':'sol',p2:'kano'});h.setPlayer(g.player.def);
   g.player.ki=state==='overdrive'?g.player.maxKi*.2:0;g.player.drainedT=state==='drained'?1:0;
   for(let i=0;i<3;i++)h.update();
   const el=state==='overdrive'?h.el.kiOver:h.el.kiState;
   rows.push({state,text:el.textContent,on:el.classList.contains('on'),display:getComputedStyle(el).display,width:el.getBoundingClientRect().width});
  }return rows;
 });
 for(const r of energy)if(!r.on||r.display==='none'||!r.width)failures.push(`${r.state}: real repeated HUD updates hide energy state`);
 const result={rows,energy,failures,errors};await writeFile(`${out}/${tag}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
