// Inspect the actual production rig; only camera and scripted inputs belong to
// this review. No artwork is composited over the game and no maps are changed.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const viewsOnly=process.argv.includes('--views-only'),out='artifacts/hero-sculpt/motion';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}}),page=await context.newPage(),errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),{ROSTER}=await import('/src/data/characters.js'),{profileFromDef}=await import('/src/tool/studio-profile.js');
  const p=STUDIO.preview;cancelAnimationFrame(p.raf);
  window.sculptSetup=({hero,state,sequence='combo',stage='airborne',definition})=>{
   const def=ROSTER.find(d=>d.id===hero),profile=profileFromDef(def);if(definition!==undefined)profile.model.definition=definition;
   p.setProfile(def,profile);p.combat.meleeSequence=sequence;p.combat.meleeStage=stage;p.setState(state);p.setView('front');p.controls.enabled=false;
  };
  window.sculptCamera=(angle='threequarter',solo=false)=>{
   const f=p.fighter,center=f.parts.torso.getWorldPosition(new T.Vector3());center.y-=1.2;
   const combat=p.isCombat,offsets={front:[0,1,combat?30:21],left:[-25,1,0],right:[25,1,0],rear:[0,1,combat?-30:-21],threequarter:[16,2,23]};
   if(combat&&!solo)center.lerp(p.combat.target.parts.torso.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,-1.2,0)),.5);
   p.camera.fov=38;p.camera.position.copy(center).add(new T.Vector3(...offsets[angle]));p.camera.lookAt(center);p.camera.updateProjectionMatrix();p.camera.updateMatrixWorld(true);p.renderer.render(p.scene,p.camera);
   document.querySelector('.view-tag').textContent=`${f.def.name} / ${p.isCombat?p.combat.meleeSequence:p.state} / ${angle}`;
   document.querySelector('.viewport-note').textContent=solo?'Isolated production rig · opponent hidden for surface inspection · custom camera':'Original procedural body sculpt · production animation / contact · custom inspection camera';
  };
 });
 const fixtures=[
  {hero:'sol',state:'hover'}, {hero:'kano',state:'forward'}, {hero:'titan',state:'boost'},
  {hero:'sol',state:'melee',sequence:'combo',stage:'grounded'},
  {hero:'sarge',state:'melee',sequence:'block'}, {hero:'sol',state:'melee',sequence:'heavy'},
  {hero:'kano',state:'groundSprint'},
 ];
 for(const fixture of fixtures){
  await page.evaluate(f=>sculptSetup(f),fixture);
  const key=`${fixture.hero}-${fixture.sequence||fixture.state}`;
  const duration=fixture.state==='melee'?2.5:2;
  if(!viewsOnly)for(const fraction of [0,.25,.5,.75,1]){
   rows.push(await page.evaluate(({fraction,duration})=>{
    const p=STUDIO.preview;p.seek(fraction*duration);sculptCamera();
    const f=p.fighter,coordinates=f.parts.torso.geometry.attributes.position.array;
    return {hero:f.def.id,state:p.state,sequence:p.combat.meleeSequence,time:p.time,definition:f.parts.torso.geometry.userData.definition,finite:Array.from(coordinates).every(Number.isFinite),damage:p.combat.damage,contacts:p.combat.contacts,source:f._authoredStrike?.take||f._groundMotion?.take||'Procedural',calls:p.renderer.info.render.calls};
   },{fraction,duration}));
   await page.locator('.viewport').screenshot({path:`${out}/${key}-${fraction}.png`});
  }
  for(const angle of ['front','left','right','rear']){
   await page.evaluate(({angle,time})=>{const p=STUDIO.preview;p.seek(time);if(p.isCombat)p.combat.target.obj.visible=false;sculptCamera(angle,true);},{angle,time:fixture.sequence==='block'?.55:fixture.sequence==='combo'?.45:fixture.sequence==='heavy'?.95:1});
   await page.locator('.viewport').screenshot({path:`${out}/${key}-${angle}.png`});
  }
  if(!viewsOnly)await page.evaluate(async({duration})=>{
   const p=STUDIO.preview;p.seek(0);if(p.isCombat)p.combat.target.obj.visible=true;
   for(let i=1;i<=Math.round(duration*120);i++){
    p.time=i/60;p.step(1/60,false,false);sculptCamera(i<=duration*60?'threequarter':'right');await new Promise(requestAnimationFrame);
   }
  },{duration});
 }
 assert.ok(rows.every(r=>r.finite));if(!viewsOnly)assert.ok(rows.some(r=>r.state==='melee'&&r.contacts>0));assert.deepEqual(errors,[]);
 await writeFile(`${out}/${viewsOnly?'views-results':'results'}.json`,JSON.stringify({rows,errors},null,2));console.log(JSON.stringify({fixtures:fixtures.length,phases:rows.length,viewsOnly,errors},null,2));
}finally{await context.close();await page.video()?.saveAs(`${out}/${viewsOnly?'views':'motion'}.webm`);await browser.close();}
