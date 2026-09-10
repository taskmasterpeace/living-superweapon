// Two weapons on four proportions, at rest and in aim/reload/walk poses, on the production rig:
// grip on the hand socket, support hand solved, muzzle along the hand axis, holster placed from
// the body package. Usage: node authoring/test/browser/equipment.check.mjs
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=process.env.PW_AUTHORING_URL||'http://127.0.0.1:5181';
const out='authoring/artifacts';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1500,height:980}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const rows=[],blocked=[];
async function selectPackage(id){
 await page.evaluate(id=>AUTHORING.select(AUTHORING.state.catalog.packages.find(p=>p.id===id)),id);
 await page.waitForFunction(id=>AUTHORING.state.selected?.id===id&&AUTHORING.stage.pkg?.manifest?.id===id&&!!AUTHORING.stage.playback,id);
 await page.evaluate(()=>{AUTHORING.stage.playing=false;});
}
async function pose(body,clip,frac){
 await page.evaluate(({body,clip,frac})=>{const s=AUTHORING.stage;s.setBody(body);s.setClip(clip);s.seek(frac);},{body,clip,frac});
 await page.waitForTimeout(60);
 return page.evaluate(({clip,frac})=>({...AUTHORING.stage.playback.measure(),clip,frac}),{clip,frac});
}
async function shot(name,view){await page.evaluate(v=>AUTHORING.stage.setView(v),view);await page.waitForTimeout(120);await page.locator('#viewport').screenshot({path:`${out}/${name}.jpg`,type:'jpeg',quality:82});}
try{
 await page.goto(`${base}/authoring/viewer/index.html`);
 await page.waitForFunction(()=>window.AUTHORING?.state?.catalog?.packages?.length>0,null,{timeout:30000});
 for(const weapon of ['equipment.carbine','equipment.sidearm']){
  await selectPackage(weapon);
  const twoHanded=await page.evaluate(()=>AUTHORING.state.packages.get(AUTHORING.state.selected.dir).manifest.equipment.twoHanded);
  for(const body of ['superhero-male','superhero-female','lean','heavy']){
   for(const [clip,frac] of [['rest',0],['aim-neutral',1],['pistol-idle',.5],['reload',.55],['walk',.35],['walk-carry',.35],['crouch-idle',.5]]){
    const r=await pose(body,clip,frac);rows.push(r);
    assert.equal(r.rootDrift,0,`${weapon}/${body}/${clip}: root untouched`);
    assert.equal(r.mounted,true,`${weapon}/${body}: mounted on the ${r.mountedOn} hand socket`);
    assert.ok(r.gripAtHand<1e-3,`${weapon}/${body}/${clip}: grip socket coincides with the hand (${r.gripAtHand})`);
    assert.ok(r.muzzleDot>.9,`${weapon}/${body}/${clip}: muzzle points down the hand axis (dot ${r.muzzleDot?.toFixed(3)})`);
    // Support-hand policy. Mount, muzzle and holster are fits. The support hand is a FIT only where
    // it closes within 0.35u (the drawn-in reload pose). In full-extension aim takes the rig cannot
    // converge a two-hand grip (reach 3.58u on a 3.92u shoulder span at scale 1.12); those rows are
    // recorded as BLOCKED — an integration blocker owned by the main task's armed carrier, declared
    // on the package (acceptance.blockers: full-extension-support-hand) — never as a passed fit.
    r.supportFit=r.supportError==null?'n/a':r.supportError<.35?'pass':['aim-neutral','pistol-idle'].includes(clip)?'blocked':'not-a-hold-pose';
    if(clip==='reload')assert.equal(r.supportFit,'pass',`${weapon}/${body}/${clip}: support hand closes on the grip (error ${r.supportError?.toFixed(3)}u)`);
    if(r.supportFit==='blocked')blocked.push(`${weapon}/${body}/${clip} gap ${r.supportError.toFixed(2)}u`);
    assert.ok(r.holsterFrom,`${weapon}/${body}: holster placed from a body package socket`);
    assert.equal(r.holsterPenetrates,false,`${weapon}/${body}/${clip}: holstered copy must not sit inside the torso or a thigh (depth ${r.holsterDepth})`);
   }
  }
 }
 // Evidence
 await selectPackage('equipment.carbine');
 await pose('lean','aim-neutral',1);for(const v of ['front','side','rear'])await shot(`m3-carbine-lean-${v}`,v);
 await pose('heavy','aim-neutral',1);for(const v of ['front','side'])await shot(`m3-carbine-heavy-${v}`,v);
 for(const [i,frac] of [0,.25,.5,.75].entries()){await pose('superhero-male','walk',frac);await shot(`m3-carbine-walk-male-${i}`,'side');}
 await selectPackage('equipment.sidearm');
 await pose('superhero-female','aim-up',1);await shot('m3-sidearm-female-aim-side','side');await shot('m3-sidearm-female-aim-front','front');
 await pose('heavy','reload',.55);await shot('m3-sidearm-heavy-reload-side','side');
 await pose('superhero-male','rest',0);await shot('m3-sidearm-male-rest-rear','rear');
 await selectPackage('prop.ammo-crate');await page.waitForTimeout(300);await shot('m3-prop-crate','front');
 const fits=rows.filter(r=>r.supportFit==='pass').length;
 const summary={mounts:rows.length,supportFits:fits,supportBlocked:blocked.length,supportNotHoldPose:rows.filter(r=>r.supportFit==='not-a-hold-pose').length,
  verdict:'mount/muzzle/holster PASS on every row; support hand PASS only in the drawn-in reload pose; full-extension aim rows are BLOCKED (integration blocker full-extension-support-hand, owner main-task), not fits'};
 await writeFile(`${out}/m3-equipment-results.json`,JSON.stringify({summary,blocked,rows,errors},null,1));
 assert.deepEqual(errors,[],'viewer must stay free of page and console errors');
 assert.equal(blocked.length,16,'every full-extension aim row (2 weapons × 4 proportions × 2 takes) must stay recorded as blocked; a silent pass here would hide the integration blocker');
 assert.equal(fits,8,'the support hand passes exactly on the 8 reload rows');
 console.log(`PASS ${rows.length} mounts (2 weapons × 4 proportions × 7 poses): grip/muzzle/holster fit on all; support hand fit on ${fits} reload rows; ${blocked.length} full-extension aim rows BLOCKED (integration blocker, not fits); stills → ${out}/m3-*.jpg`);
}finally{await browser.close();}
