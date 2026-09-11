import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const label=process.argv[2]||'studio';if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid output label');
const out=`artifacts/ground-camera/${label}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 const original=await page.evaluate(()=>JSON.stringify(STUDIO.history.value));
 await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
 await page.getByRole('button',{name:'Game camera',exact:true}).click();
 await page.getByLabel('Target elevation',{exact:true}).fill('75');await page.getByLabel('Target elevation',{exact:true}).press('Tab');
 await page.getByLabel('Target distance',{exact:true}).fill('12');await page.getByLabel('Target distance',{exact:true}).press('Tab');
 for(const motion of ['ground-left','ground-right','ground-forward']){
  await page.getByLabel('Fighter motion',{exact:true}).selectOption(motion);
  const result=await page.evaluate(async()=>{
   const T=await import('/node_modules/three/build/three.module.js'),p=STUDIO.preview;p.seek(2);
   const f=p.fighter,c=p.camera;c.updateMatrixWorld(true);f.obj.updateMatrixWorld(true);
   const projected={};for(const k of ['head','torso'])projected[k]=f.parts[k].getWorldPosition(new T.Vector3()).project(c).toArray();
   const target=p.combat.target.center(new T.Vector3()).project(c).toArray();
   return {motion:p.combat.shooterMotion,view:p.view,near:c.near,pitch:p.chase._lookPitch,position:f.pos.toArray(),camera:c.position.toArray(),projected,target,contacts:p.combat.contacts,profile:JSON.stringify(STUDIO.history.value)};
  });
  results.push(result);await page.screenshot({path:`${out}/${motion}.png`});
  assert.equal(result.profile,original,'Camera rehearsal changed the saved draft');assert.equal(result.view,'game');
  assert.ok(result.position[1]<.1,'Grounded rehearsal became airborne');
  assert.ok(Object.values(result.projected).some(p=>Math.abs(p[0])<1&&Math.abs(p[1])<1&&p[2]<1),'Studio game camera lost the fighter');
  assert.ok(result.camera[1]>result.near,'Studio near plane entered the floor');
  assert.ok(Math.abs(result.target[0])<1&&Math.abs(result.target[1])<1,'Studio lost the high target');
 }
 // The target-follow rehearsal's elevation is relative to its initial stage
 // position. Also inspect near-vertical free look explicitly: no fake claim
 // that a scripted lateral pass remains at its initial 75-degree elevation.
 await page.getByLabel('Motion state',{exact:true}).selectOption('groundSprint');
 const free=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),p=STUDIO.preview;p.seek(2);
  p.chase._lookPitch=79*Math.PI/180;p.step(0);p.camera.updateMatrixWorld(true);
  return {motion:'groundSprint',scope:'Native preview, manually posed 79-degree free-look inspection',near:p.camera.near,pitch:p.chase._lookPitch,
   projected:p.fighter.parts.head.getWorldPosition(new T.Vector3()).project(p.camera).toArray(),profile:JSON.stringify(STUDIO.history.value)};
 });
 results.push(free);await page.screenshot({path:`${out}/free-upward-sprint.png`});
 assert.equal(free.profile,original);assert.ok(Math.abs(free.projected[0])<1&&Math.abs(free.projected[1])<1&&free.projected[2]<1,'Near-vertical Studio camera lost the head');
 assert.deepEqual(errors,[]);
 await writeFile(`${out}/studio-results.json`,JSON.stringify({results,errors,scope:'Native Studio controls and seek; production camera/rig/beam on the flat editor stage, not player-input or gameplay-FPS evidence.'},null,2));
 console.log(JSON.stringify({cases:results.length,errors}));
}finally{await browser.close();}
