import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv.find(a=>a.startsWith('--output='))?.slice(9)||'artifacts/outer-terrain-native';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const context=await browser.newContext({viewport:{width:1672,height:941},recordVideo:{dir:out+'/video',size:{width:1672,height:941}}});
const page=await context.newPage();
const result={scope:'Native practice startup, keyboard travel/flight and mouse firing. Separate read-only exterior geometry diagnostics: no actor relocation and no claim of playable extended bounds.',errors:[],actions:[]};
page.on('pageerror',e=>result.errors.push(String(e)));
async function sample(action){result.actions.push({action,...await page.evaluate(()=>{const g=PW.game,p=g.player,up=p.vel.clone().set(0,1,0).transformDirection(p.parts.pelvis.matrixWorld);return {pos:p.pos.toArray(),alive:p.alive,flying:p.flying,speed:p.vel.length(),pelvisTravelAlignment:up.dot(p.vel.clone().normalize()),projectiles:g.projectiles.list.length,arena:g.world.ARENA};})});}
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=vega');
 await page.locator('[data-encounter="practice"]').click();const start=Date.now();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});
 result.readyMs=Date.now()-start;await page.bringToFront();
 await page.evaluate(()=>{const g=PW.game,report=g.reportError.bind(g);window.terrainWitness={faults:[],beams:0,shots:0};g.reportError=(e,c)=>{terrainWitness.faults.push(String(e));return report(e,c);};for(const [name,key]of [['spawnBeam','beams'],['spawnProjectile','shots']]){const old=g.projectiles[name].bind(g.projectiles);g.projectiles[name]=(...args)=>{terrainWitness[key]++;return old(...args);};}});
 await sample('spawn');await page.screenshot({path:out+'/01-spawn.png'});
 await page.keyboard.down('KeyW');await page.waitForTimeout(900);await page.keyboard.up('KeyW');
 await page.keyboard.down('Space');await page.waitForTimeout(1600);await page.keyboard.up('Space');
 await page.keyboard.down('KeyW');await page.keyboard.down('ShiftLeft');await page.waitForTimeout(1200);await page.keyboard.up('ShiftLeft');
 await sample('forward flight');await page.screenshot({path:out+'/02-flight.png'});
 await page.mouse.move(836,400);await page.mouse.down();
 for(let phase=1;phase<=4;phase++){
  await page.waitForTimeout(325);await sample(`fire phase ${phase}/4`);
  await page.screenshot({path:out+`/03-fire-phase-${phase}.png`});
 }
 await sample('fire while travelling');await page.screenshot({path:out+'/03-fire.png'});await page.mouse.up();await page.keyboard.up('KeyW');
 await page.waitForTimeout(900);await sample('release');
 result.diagnostics=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),{terrainEntry}=await import('/src/engine/projectile-contact.js');
  const w=PW.game.world,far=PW.game.pwStage.group.getObjectByName('frontline-distant-ground'),surface=w._outerTerrain,ray=new T.Raycaster();far.updateWorldMatrix(true,true);
  const heights=[];
  for(const [x,z]of [[1600,50],[-2100,390],[3000,-1200],[-4800,1800],[1100,-1100]]){
   ray.set(new T.Vector3(x,2000,z),new T.Vector3(0,-1,0));const rendered=ray.intersectObject(far,false)[0]?.point.y;
   heights.push({x,z,rendered,collision:w.heightAt(x,z),error:Math.abs(rendered-w.heightAt(x,z))});
  }
  const a=new T.Vector3(1800,130,1800),b=new T.Vector3(5700,130,1800),delta=b.clone().sub(a),distance=delta.length();
  ray.set(a,delta.normalize());ray.far=distance;const hit=ray.intersectObject(far,false)[0];
  const sweep={actual:terrainEntry(w,a,b),expected:hit?hit.distance/distance:Infinity};
  const time=(fn,n)=>{const begin=performance.now();for(let i=0;i<n;i++)fn(i);return (performance.now()-begin)/n;};
  const uncachedHeightMs=time(i=>w.heightAt(1500+i*.017,500+i*.019),2000);
  const repeatedHeightMs=time(()=>w.heightAt(1600,50),2000);
  const longSweepMs=time(()=>terrainEntry(w,a,b),300);
  return {heights,sweep,uncachedHeightMs,repeatedHeightMs,longSweepMs,cacheSize:surface.cacheSize,triangles:far.geometry.index.count/3,witness:terrainWitness};
 });
 assert.ok(result.actions.every(a=>a.alive));assert.ok(result.actions[1].flying);
 if(process.argv.includes('--assert-carrier'))assert.ok(result.actions.filter(a=>a.action.startsWith('fire phase')).every(a=>a.speed>34&&a.pelvisTravelAlignment>.85),'Actual travelling pelvis must remain head-first through the native firing sequence');
 assert.ok(result.diagnostics.witness.beams+result.diagnostics.witness.shots>0,'Native attack input must actually emit');
 assert.ok(result.diagnostics.heights.every(h=>h.error<1e-5));
 assert.ok(Math.abs(result.diagnostics.sweep.actual-result.diagnostics.sweep.expected)<1e-6);
 assert.ok(result.diagnostics.cacheSize<=512);assert.deepEqual(result.errors,[]);assert.deepEqual(result.diagnostics.witness.faults,[]);
 result.ok=true;
}catch(e){result.failure=String(e);process.exitCode=1;}
finally{
 await context.close();await page.video()?.saveAs(out+'/native-start-flight-fire.webm');await browser.close();
 await writeFile(out+'/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}
