import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

const base=process.env.LSW_TEST_URL||'http://127.0.0.1:5182';
const out='artifacts/alt-head-look-2026-09-11';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(String(error)));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});

try{
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.LSW?.hud?._selOpen);
 await page.locator('#hSelect .scard').filter({hasText:'VEGA'}).first().evaluate(card=>card.click());
 await page.keyboard.press('Enter');
 await page.waitForFunction(()=>LSW.game.running&&LSW.game.pwStage?.frontlineReady&&!LSW.game._frontlinePreparing,null,{timeout:90000});
 const setup=await page.evaluate(async()=>{
  const {game:g,THREE:T}=LSW,p=g.player,w=g.world;
  g.update=()=>{};for(const f of g.entities)f.obj.visible=f===p;
  p.pos.set(0,28,0);p.vel.set(0,0,0);p.flying=true;p.gait='airborne';p._openSky=true;p._vis=1;p.faceDir(0,1);
  p.obj.position.copy(p.pos);w.setFogEnabled(false);w._lookActive=true;w._lookYaw=0;w._lookPitch=0;w.clearFreeLook();
  const head=()=>new T.Vector3(0,0,1).applyQuaternion(p.parts.head.getWorldQuaternion(new T.Quaternion())).normalize().toArray();
  p._animate(1/60);p.obj.updateMatrixWorld(true);w.snapChase();w.chase(p,null,1/60,'bfp');w.render();
  return {neutral:head()};
 });
 await page.locator('canvas').first().screenshot({path:`${out}/neutral.png`});
 const rightUp=await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW,p=g.player,w=g.world;
  w._freeLook.yaw=-1.25;w._freeLook.pitch=.55;w._freeLook.held=true;p._animate(1/60);p.obj.updateMatrixWorld(true);w.chase(p,null,1/60,'bfp');w.render();
  return new T.Vector3(0,0,1).applyQuaternion(p.parts.head.getWorldQuaternion(new T.Quaternion())).normalize().toArray();
 });
 await page.locator('canvas').first().screenshot({path:`${out}/right-up.png`});
 const leftDown=await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW,p=g.player,w=g.world;
  w._freeLook.yaw=1.25;w._freeLook.pitch=-.55;w._freeLook.held=true;p._animate(1/60);p.obj.updateMatrixWorld(true);w.chase(p,null,1/60,'bfp');w.render();
  return new T.Vector3(0,0,1).applyQuaternion(p.parts.head.getWorldQuaternion(new T.Quaternion())).normalize().toArray();
 });
 await page.locator('canvas').first().screenshot({path:`${out}/left-down.png`});
 const angle=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.reduce((sum,v,i)=>sum+v*b[i],0))));
 assert.ok(angle(setup.neutral,rightUp)>.2,'Right/up head turn is not visible');
 assert.ok(angle(setup.neutral,leftDown)>.2,'Left/down head turn is not visible');
 assert.ok(rightUp[1]>setup.neutral[1]&&leftDown[1]<setup.neutral[1],'Head pitch does not follow the view vertically');
 assert.deepEqual(errors,[]);
 const evidence={base,neutral:setup.neutral,rightUp,leftDown,errors};
 await writeFile(`${out}/evidence.json`,JSON.stringify(evidence,null,2));
 console.log('PASS Alt free-look visibly turns the player head in both axes',evidence);
}finally{await browser.close();}
