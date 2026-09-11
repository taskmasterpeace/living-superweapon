import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

const out='artifacts/vega-camera-2026-09-11';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=vega');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 for(const view of ['front','rear']){
  const state=await page.evaluate(async view=>{
   const T=await import('/node_modules/three/build/three.module.js'),p=STUDIO.preview,f=p.fighter;
   p.setState('hover');p.seek(0);p.setView('orbit');p.controls.enabled=false;f.obj.updateMatrixWorld(true);
   const center=f.parts.torso.getWorldPosition(new T.Vector3()),offset=view==='front'?new T.Vector3(0,.3,18):new T.Vector3(0,.3,-18);
   p.camera.position.copy(center).add(offset);p.camera.lookAt(center);p.camera.updateMatrixWorld(true);p.renderer.render(p.scene,p.camera);
   document.querySelector('.view-tag').textContent=`VEGA / ${view.toUpperCase()}`;
   document.querySelector('.measurements').textContent='BALD · BLACK · FRONT + BACK V';
   return {hair:f.parts.cowl.visible,front:!!f.parts.insigniaFront,back:!!f.parts.insigniaBack,skin:`#${f.parts.mats.skin.color.getHexString()}`};
  },view);
  assert.deepEqual(state,{hair:false,front:true,back:true,skin:'#5b3829'});await page.locator('.viewport canvas').first().screenshot({path:`${out}/vega-${view}.png`});
 }
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.waitForFunction(()=>LSW.game.pwStage?.frontlineReady&&!LSW.game._frontlinePreparing,null,{timeout:90000});
 await page.evaluate(()=>LSW.game.startMode('powerworld',{p1:'vega',p2:'kano'}));
 await page.waitForFunction(()=>LSW.game.player?.def?.id==='vega'&&LSW.game.pwStage?.frontlineReady&&!LSW.game._frontlinePreparing,null,{timeout:90000});
 const camera=await page.evaluate(async()=>{
  const {game:g,THREE:T}=LSW;g.update=()=>{};
  const a=g.player,b=g.entities.find(e=>e!==a&&!e.isDummy),w=g.world;for(const f of g.entities)f.obj.visible=f===a||f===b;
  a.pos.set(0,50,0);b.pos.set(7,50,58);for(const f of[a,b]){f.vel.set(0,0,0);f.flying=true;f.gait='airborne';f._vis=1;f._animate(1/60);f.obj.position.copy(f.pos);f.obj.updateMatrixWorld(true);}
  a.faceDir(0,1);b.faceDir(0,-1);g.hardLock=b;g.fov=false;w.setFogEnabled(false);w._lookActive=true;w._lookYaw=0;w._lookPitch=0;w.clearFreeLook();w.snapChase();w.chase(a,b,1/60,'bfp');
  const baseEye=w.camera.position.clone(),combat=a.aim3.clone();w._freeLook.yaw=-.95;w._freeLook.pitch=.04;w._freeLook.held=true;w.chase(a,b,1/60,'bfp');w.render();
  const player=a.center(new T.Vector3()).project(w.camera),target=b.center(new T.Vector3()).project(w.camera),eye=w.camera.position.clone();
  return {player:player.toArray(),target:target.toArray(),eyeShift:eye.distanceTo(baseEye),yawLimit:w._freeLook.yaw,combatDelta:a.aim3.angleTo(combat)};
 });
 assert.ok(camera.eyeShift>5,'Alt did not move the camera to the side');assert.ok(Math.abs(camera.player[0])<.9&&Math.abs(camera.target[0])<.9,'Player and target do not share the frame');assert.ok(camera.combatDelta<1e-7,'Camera composition changed combat aim');
 await page.locator('canvas').first().screenshot({path:`${out}/alt-rear-side-composition.png`});
 await writeFile(`${out}/evidence.json`,JSON.stringify({camera,errors},null,2));assert.deepEqual(errors,[]);
 console.log('PASS VEGA identity and rear-side Alt camera',camera);
}finally{await browser.close();}
