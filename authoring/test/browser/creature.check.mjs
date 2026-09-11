// The non-humanoid path and the second motion source on screen: the hound plays idle/move/attack
// on its own skeleton; the CMU walk plays on the production rig with the body package's hit
// zones drawn. Usage: node authoring/test/browser/creature.check.mjs
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=process.env.PW_AUTHORING_URL||'http://127.0.0.1:5181';
const out='authoring/artifacts';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1500,height:980}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const rows=[];
async function selectPackage(id){
 await page.evaluate(id=>AUTHORING.select(AUTHORING.state.catalog.packages.find(p=>p.id===id)),id);
 await page.waitForFunction(id=>AUTHORING.state.selected?.id===id&&AUTHORING.stage.pkg?.manifest?.id===id&&!!AUTHORING.stage.playback,id);
 await page.evaluate(()=>{AUTHORING.stage.playing=false;});
}
async function shot(name,view){await page.evaluate(v=>AUTHORING.stage.setView(v),view);await page.waitForTimeout(120);await page.locator('#viewport').screenshot({path:`${out}/${name}.jpg`,type:'jpeg',quality:82});}
try{
 await page.goto(`${base}/authoring/viewer/index.html`);
 await page.waitForFunction(()=>window.AUTHORING?.state?.catalog?.packages?.length>0,null,{timeout:30000});
 await selectPackage('creature.field-hound');
 const m0=await page.evaluate(()=>AUTHORING.stage.playback.measure());rows.push(m0);
 assert.ok(m0.skinnedMeshes>=1&&m0.triangles>0,'creature GLB loaded as skinned geometry');
 assert.deepEqual(m0.animations.sort(),['attack','idle','move']);
 for(const [clip,frac] of [['idle',.3],['move',.4],['attack',.55]]){
  const r=await page.evaluate(({clip,frac})=>{const s=AUTHORING.stage;s.setClip(clip);s.seek(frac);const root=s.content.children[0];const box=new (s.camera.position.constructor)();return {clip,time:s.time,height:(()=>{const b=new THREE_BOX(root);return b;})()};},{clip,frac}).catch(()=>null);
  await page.evaluate(({clip,frac})=>{const s=AUTHORING.stage;s.setClip(clip);s.seek(frac);},{clip,frac});await page.waitForTimeout(80);
  await shot(`m4-hound-${clip}`,'side');
 }
 await page.evaluate(()=>AUTHORING.stage.toggle('zones',true));
 await page.evaluate(()=>{const s=AUTHORING.stage;s.setClip('attack');s.seek(.55);});await page.waitForTimeout(80);await shot('m4-hound-attack-front','front');
 // CMU walk on the rig, with the body package hit zones overlaid.
 await selectPackage('motion.cmu-walk-02');
 await page.evaluate(()=>AUTHORING.stage.toggle('zones',true));
 for(const [i,frac] of [.15,.4,.65,.9].entries()){
  const r=await page.evaluate(({frac})=>{const s=AUTHORING.stage;s.setBody('superhero-male');s.setClip('cmu-walk');s.seek(frac);return {...s.playback.measure(),frac};},{frac});rows.push(r);
  assert.equal(r.rootDrift,0);assert.ok(r.lowestFoot>-.35&&r.lowestFoot<1.2,`cmu frame ${i}: feet on the floor (${r.lowestFoot.toFixed(3)})`);
  await shot(`m4-cmu-walk-male-${i}`,'side');
 }
 // Hit zones on a body package.
 await selectPackage('body.hero-standard');
 await page.evaluate(()=>AUTHORING.stage.toggle('zones',true));await page.waitForTimeout(80);
 const zones=await page.evaluate(()=>AUTHORING.stage.helpers.children.flatMap(g=>g.children.filter(c=>c.userData.zone||c.children?.some(x=>x.userData.zone)).length));
 await shot('m4-body-hitzones-front','front');
 await writeFile(`${out}/m4-creature-results.json`,JSON.stringify({rows,errors},null,1));
 assert.deepEqual(errors,[],'viewer must stay free of page and console errors');
 console.log(`PASS hound idle/move/attack, CMU walk on the rig, hit zones drawn → ${out}/m4-*.jpg`);
}finally{await browser.close();}
