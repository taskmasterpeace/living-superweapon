// Native game inputs and read-only pose telemetry. No transform, HP, AI or
// simulation overrides. Free practice isolates animation from incoming fire.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/soldier-motion';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const result={kind:'Native third-person SARGE/MERC input, Free practice; continuous video and stills are separate evidence',heroes:[]};
try{
 for(const hero of ['sarge','merc']){
  const context=await browser.newContext({viewport:{width:1672,height:941},recordVideo:{dir:out,size:{width:1672,height:941}}});
  const page=await context.newPage(),video=page.video(),row={hero,errors:[],samples:[]};result.heroes.push(row);
  page.on('pageerror',e=>row.errors.push(e.message));
  try{
   await page.goto(`http://127.0.0.1:5180/powerworld.html?hero=${hero}`);
   await page.locator('[data-encounter="practice"]').click();await page.locator('[data-camera="frontline"]').click();await page.locator('#pwGo').click();
   await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&PW.game.player._soldierEquipment,null,{timeout:60000});
   const sample=async label=>{
    const state=await page.evaluate(()=>{const g=PW.game,f=g.player;return {hero:f.def.id,alive:f.alive,pos:f.pos.toArray(),velocity:f.vel.toArray(),phase:f.animT,
     frame:f.obj.userData.frame,rifleActive:f._riflePose?.active,flight:f.flying,practice:g.ms.practice,
     headband:f.parts.head.getObjectByName('hero-headband')?.visible,kit:f._soldierEquipment,faults:[...(g._errSeen||[])]};});
    row.samples.push({label,...state});await page.screenshot({path:`${out}/${hero}-${label}.png`});
    assert.equal(state.hero,hero);assert.ok(state.alive&&state.practice&&state.kit);assert.ok(!state.flight);assert.deepEqual(state.faults,[]);
    assert.ok(state.frame.bulk>=1);assert.notEqual(state.headband,true);
    if(label!=='guard')assert.equal(state.rifleActive,true,`${hero} ${label}: native two-hand rifle hold dropped out`);
   };
   await sample('idle');await page.mouse.click(800,450,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
   await page.keyboard.down('KeyW');await page.waitForTimeout(2400);await sample('running');await page.keyboard.up('KeyW');
   await page.keyboard.down('KeyD');await page.mouse.down({button:'left'});await page.waitForTimeout(2200);await sample('strafe-fire');
   await page.keyboard.up('KeyD');await page.mouse.move(800,250,{steps:12});await page.waitForTimeout(650);await sample('elevated-fire');
   await page.mouse.move(800,550,{steps:16});await page.waitForTimeout(650);await sample('lowered-fire');await page.mouse.up({button:'left'});
   await page.keyboard.down('KeyC');await page.waitForTimeout(1100);await sample('guard');await page.keyboard.up('KeyC');
   await page.waitForTimeout(800);await sample('recovery');assert.deepEqual(row.errors,[]);
  }finally{
   await context.close();await video.saveAs(`${out}/${hero}-native-motion.webm`);row.video=`${out}/${hero}-native-motion.webm`;
  }
 }
}finally{await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await browser.close();}
console.log(JSON.stringify(result));
