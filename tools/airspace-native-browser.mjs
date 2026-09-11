import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv.find(a=>a.startsWith('--output='))?.slice(9)||'artifacts/airspace-native';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const context=await browser.newContext({viewport:{width:1672,height:941},recordVideo:{dir:out+'/video',size:{width:1672,height:941}}});
const page=await context.newPage();
const result={scope:'Native PowerWorld practice spawn, rise, outward flight past the old boundary, exterior landing and return. No actor relocation or input replacement.',actions:[],errors:[]};
page.on('pageerror',e=>result.errors.push(String(e)));
const state=()=>page.evaluate(()=>{const g=PW.game,p=g.player,w=g.world;return {pos:p.pos.toArray(),alive:p.alive,flying:p.flying,speed:p.vel.length(),floor:w.heightAt(p.pos.x,p.pos.z),arena:w.ARENA,ready:g.pwStage?.frontlineReady,farColliders:w.cover.filter(c=>c.frontlineDistant).length};});
async function capture(label){const s=await state();result.actions.push({label,...s});await page.screenshot({path:`${out}/${label}.png`});console.log(label,JSON.stringify(s));return s;}
async function holdUntil(key,predicate,limit=45000){
 await page.keyboard.down(key);const start=Date.now();
 try{while(Date.now()-start<limit){await page.waitForTimeout(300);const s=await state();assert.ok(s.alive,'Player died during flight-space route');if(predicate(s))return s;}}
 finally{await page.keyboard.up(key);}
 throw new Error(`Native ${key} route timed out: ${JSON.stringify(await state())}`);
}
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=vega');
 await page.locator('[data-encounter="practice"]').click();const start=Date.now();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});
 result.readyMs=Date.now()-start;await page.bringToFront();
 const spawn=await capture('01-spawn');assert.equal(spawn.arena,32000);assert.ok(spawn.farColliders>0);
 await holdUntil('Space',s=>s.pos[1]>210,15000);
 await page.keyboard.press('ShiftLeft');await holdUntil('KeyW',s=>s.pos[2]>1500);
 const outward=await capture('02-outside-old-boundary');assert.ok(outward.pos[2]>900&&outward.flying);
 await holdUntil('ControlLeft',s=>!s.flying,15000);await page.waitForTimeout(400);
 const landed=await capture('03-exterior-landing');assert.ok(Math.abs(landed.pos[1]-landed.floor)<.5);
 result.renderedLanding=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),g=PW.game,p=g.player,far=g.pwStage.group.getObjectByName('frontline-distant-ground');
  const ray=new T.Raycaster(new T.Vector3(p.pos.x,p.pos.y+200,p.pos.z),new T.Vector3(0,-1,0));far.updateWorldMatrix(true,true);
  const hit=ray.intersectObject(far,false)[0];return {rendered:hit?.point.y,feet:p.pos.y,error:hit?Math.abs(hit.point.y-p.pos.y):null};
 });
 assert.ok(result.renderedLanding.error!==null&&result.renderedLanding.error<.5,'Native feet must land on the visible exterior');
 await holdUntil('Space',s=>s.pos[1]>210,15000);
 await holdUntil('KeyS',s=>s.pos[2]<-20,60000);
 await holdUntil('ControlLeft',s=>!s.flying,15000);await page.waitForTimeout(400);
 const returned=await capture('04-returned-to-compound');assert.ok(Math.abs(returned.pos[0])<130&&Math.abs(returned.pos[2])<130);
 result.index=await page.evaluate(()=>{
  const w=PW.game.world,index=w._outerTerrain.index;let nodes=0,references=0;
  const visit=n=>{nodes++;references+=n.triangles.length;for(const child of n.subTrees)visit(child);};visit(index);
  const begin=performance.now();for(let i=0;i<4000;i++)w.heightAt(12000+i*.017,9000+i*.011);
  return {nodes,references,sourceTriangles:PW.game.pwStage.group.getObjectByName('frontline-distant-ground').geometry.index.count/3,uncachedHeightMs:(performance.now()-begin)/4000,cacheSize:w._outerTerrain.cacheSize};
 });
 assert.equal(result.index.references,result.index.sourceTriangles);assert.ok(result.index.cacheSize<=512);
 assert.deepEqual(result.errors,[]);result.ok=true;
}catch(e){result.failure=String(e);process.exitCode=1;try{await capture('failure');}catch{}}
finally{await context.close();await page.video()?.saveAs(out+'/native-outward-land-return.webm');await browser.close();await writeFile(out+'/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));}
