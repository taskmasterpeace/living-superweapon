import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5180/studio.html?hero=kano');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.getByRole('tab',{name:'Pose',exact:true}).click();
 for(const state of ['strafeLeft','strafeRight']) {
  await page.getByLabel('Motion state',{exact:true}).selectOption(state);
  const motion=await page.evaluate(()=>({state:STUDIO.preview.fighter._flightPoseState,vx:STUDIO.preview.fighter.vel.x}));
  assert.equal(motion.state,state);assert.ok(state==='strafeLeft'?motion.vx>20:motion.vx < -20);
  await page.getByLabel('Left knee value',{exact:true}).fill('60');await page.getByLabel('Left knee value',{exact:true}).press('Tab');
  const knee=await page.evaluate(()=>{const p=STUDIO.preview;for(let i=0;i<120;i++)p.step(1/60);return p.fighter.parts.legL.userData.knee.rotation.x;});
  assert.ok(Math.abs(knee-Math.PI/3)<.03,'Editor edit never reached production knee');
 }
 await page.getByRole('button',{name:'Save local',exact:true}).click();await page.reload();await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 assert.ok(await page.evaluate(()=>['strafeLeft','strafeRight'].every(k=>Math.abs(STUDIO.history.value.poses[k].kneeL-Math.PI/3)<.001)));
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();await page.getByLabel('Motion state',{exact:true}).selectOption('cycle');
 const phases=await page.evaluate(()=>{
  const p=STUDIO.preview,rows=[];for(const t of [5.9,6.9,5.9]){p.seek(t);rows.push({state:p.fighter._flightPoseState,v:p.fighter.vel.toArray(),j:{...p.fighter._flightJointPose}});}return rows;
 });
 assert.equal(phases[0].state,'strafeLeft');assert.equal(phases[1].state,'strafeRight');assert.deepEqual(phases[0],phases[2]);
 assert.deepEqual(errors,[]);console.log('PASS strafe editor selection, real joint edits, save/reload and deterministic directional cycle');
} finally {await browser.close();}
