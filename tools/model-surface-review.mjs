// Fixed production-figure views under the Studio lights. No changes to the user's tab.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const extreme=process.argv.includes('--extreme'),label=process.argv.includes('--before')?'before':extreme?'after-extreme':'after',out=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||`artifacts/model-surface/${label}`;
await mkdir(out,{recursive:true});const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 const rows=[];
 for(const hero of ['kano','sol','vega','titan'])for(const view of ['front','rear','face']){
  const row=await page.evaluate(async({hero,view,extreme})=>{
   const {ROSTER}=await import('/src/data/characters.js'),{profileFromDef}=await import('/src/tool/studio-profile.js');
   const p=STUDIO.preview,def=ROSTER.find(d=>d.id===hero),profile=profileFromDef(def);
   if(extreme)Object.assign(profile.frame,{scale:.65,bulk:1.65,head:1.4,neck:1.6});
   p.setProfile(def,profile);p.setState('hover');p.seek(2);p.setView('front');
   const center=p.fighter.pos.clone();center.y+=view==='face'?9:5;
   if(extreme){if(view==='face')p.fighter.parts.head.getWorldPosition(center);else center.y-=1.5;}
   p.controls.enabled=false;p.camera.position.copy(center).add({x:view==='face'?2:3,y:1,z:view==='rear'?-20:view==='face'?6:20});p.camera.lookAt(center);p.camera.updateMatrixWorld(true);
   document.querySelector('.view-tag').textContent=`${def.name} / ${view} / surface inspection`;
   document.querySelector('.viewport-note').textContent='Production figure under Studio lighting · custom inspection camera, not BFP framing';
   p.renderer.render(p.scene,p.camera);return {hero,view,calls:p.renderer.info.render.calls,triangles:p.renderer.info.render.triangles};
  },{hero,view,extreme});rows.push(row);await page.locator('.viewport canvas').first().screenshot({path:`${out}/${hero}-${view}.png`});
 }
 await writeFile(`${out}/evidence.json`,JSON.stringify({rows,errors},null,2));console.log({rows,errors});if(errors.length)process.exitCode=1;
}finally{await browser.close();}
