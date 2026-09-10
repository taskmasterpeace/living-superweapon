// Plays the built motion packages on the production rig across four proportions and records
// the evidence the brief asks for: no root drift, feet on the floor, skin following, front/side/
// rear stills and a motion strip. Usage: node authoring/test/browser/motion.check.mjs
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=process.env.PW_AUTHORING_URL||'http://127.0.0.1:5181';
const out='authoring/artifacts';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1500,height:980}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const rows=[];let baseScale=null;
async function selectPackage(id){
 await page.evaluate(id=>AUTHORING.select(AUTHORING.state.catalog.packages.find(p=>p.id===id)),id);
 await page.waitForFunction(id=>AUTHORING.state.selected?.id===id&&AUTHORING.stage.pkg?.manifest?.id===id&&!!AUTHORING.stage.playback,id);
 await page.evaluate(()=>{AUTHORING.stage.playing=false;});
}
async function pose(body,clip,frac){
 await page.evaluate(({body,clip,frac})=>{const s=AUTHORING.stage;s.setBody(body);s.setClip(clip);s.seek(frac);},{body,clip,frac});
 await page.waitForTimeout(80);
 return page.evaluate(({clip,frac})=>({...AUTHORING.stage.playback.measure(),clip,frac,time:AUTHORING.stage.time}),{clip,frac});
}
async function shot(name,view){
 await page.evaluate(v=>{AUTHORING.stage.setView(v);},view);
 await page.waitForTimeout(120);
 await page.locator('#viewport').screenshot({path:`${out}/${name}.jpg`,type:'jpeg',quality:82});
}
try{
 await page.goto(`${base}/authoring/viewer/index.html`);
 await page.waitForFunction(()=>window.AUTHORING?.state?.catalog?.packages?.length>0,null,{timeout:30000});
 await selectPackage('motion.hero-ual');
 for(const body of ['superhero-male','superhero-female','lean','heavy','procedural']){
  for(const [clip,frac] of [['walk',.35],['crouch-idle',.5],['reload',.55],['aim-up',1]]){
   const r=await pose(body,clip,frac);rows.push(r);
   assert.equal(r.rootDrift,0,`${body}/${clip}: the physics root must never move`);
   assert.ok(r.lowestFoot>-.35&&r.lowestFoot<1.2,`${body}/${clip}: lowest sole ${r.lowestFoot.toFixed(3)} must sit on the floor`);
   for(const side of ['armL','armR'])assert.ok(r[side].reach<=r[side].max+1e-6&&r[side].reach>=r[side].min-1e-6,`${body}/${clip}: ${side} reach ${r[side].reach.toFixed(3)} inside fixed segment lengths [${r[side].min.toFixed(3)}, ${r[side].max.toFixed(3)}]`);
   assert.equal(r.armL.max,r.armR.max,`${body}/${clip}: both arms keep the same rig lengths`);
   if(body!=='procedural')assert.equal(r.skinned,true,`${body}: skinned body must be bound`);
   // Prove the body actually changed: the bound skin id and the rig's pivot height follow the spec.
   const expectSkin={'superhero-male':'superhero-male','superhero-female':'superhero-female',lean:'superhero-female',heavy:'superhero-male',procedural:null}[body];
   assert.equal(r.skinId,expectSkin,`${body}: bound skin`);
   // SOL's own derived frame (frameOf) is the baseline; lean/heavy override it explicitly.
   baseScale??=r.frameScale;
   const expectScale={lean:.8,heavy:1.3}[body]??baseScale;
   assert.ok(Math.abs(r.frameScale-expectScale)<1e-9&&Math.abs(r.pivotHeight-4.6*expectScale)<1e-6,`${body}: frame scale ${r.frameScale} pivot ${r.pivotHeight} (expected ${expectScale})`);
   assert.equal(r.body,body);
  }
 }
 // Stills: the male body at walk, three canonical views.
 await pose('superhero-male','walk',.35);
 for(const view of ['front','side','rear'])await shot(`m2-walk-male-${view}`,view);
 // Motion strip: reload on the female body, four phases from the side.
 for(const [i,frac] of [0,.3,.6,.95].entries()){await pose('superhero-female','reload',frac);await shot(`m2-reload-female-${i}`,'side');}
 // Proportions: the same walk phase on lean and heavy frames.
 await pose('lean','walk',.6);await shot('m2-walk-lean-front','front');
 await pose('heavy','walk',.6);await shot('m2-walk-heavy-front','front');
 await selectPackage('motion.hero-ual2');
 const grenade=await page.evaluate(()=>AUTHORING.stage.playback.clips.find(c=>c.id==='grenade-throw'));
 const release=grenade.events.find(e=>e.type==='grenade-release');
 const r=await pose('superhero-male','grenade-throw',release.t/grenade.duration);rows.push(r);
 assert.equal(r.rootDrift,0);
 await shot('m2-grenade-release-male-side','side');
 const rise=await pose('superhero-male','supine-rise',0);rows.push(rise);
 assert.equal(await page.evaluate(()=>AUTHORING.stage.clip?.id),'supine-rise','the get-up clip must resolve (it starts supine, not prone)');
 await shot('m2-supine-rise-male-side','side');await pose('superhero-male','supine-rise',1);await shot('m2-supine-rise-male-side-end','side');
 await writeFile(`${out}/m2-motion-results.json`,JSON.stringify({rows,errors},null,1));
 assert.deepEqual(errors,[],'viewer must stay free of page and console errors');
 console.log(`PASS ${rows.length} poses across 5 bodies, 0 root drift, stills + strip written to ${out}/m2-*.jpg`);
}finally{await browser.close();}
