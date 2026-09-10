// Positioned production ability fixture, native Fighter physics/hitstop/animation.
// Inspection camera proves articulation, not ordinary gameplay-camera acceptance.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const out='artifacts/aerial-punch-body-stop';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const result={kind:'VEGA E Rush Combo / production procedural overlay / moving physics fixture / inspection camera',frames:[]};
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html?hero=vega');await page.locator('[data-encounter="frontline"]').click();await page.locator('#pwGo').click();await page.waitForFunction(()=>window.LSW?.game?.running&&LSW.game.pwStage?.frontlineReady,null,{timeout:60000});
 await page.evaluate(async()=>{
  const {game:g,THREE:T}=LSW,{TYPES}=await import('/src/engine/abilities.js');g.update=()=>{};
  g.fov=false;g.world.setFogEnabled(false);
  const a=g.player,b=g.spawnRival('kano');for(const f of g.entities)if(f!==a&&f!==b)f.obj.visible=false;
  g.entities=[a,b];for(const f of [a,b]){f.ai=null;f.invuln=0;f.hp=f.maxHp=1000;f.flying=true;f.gait='airborne';f._openSky=true;f.pos.set(0,140,f===a?0:21);f.vel.set(0,0,f===a?65:0);f.groundY=0;}
  a.faceDir(0,1);b.faceDir(0,-1);a.aim3.set(0,0,1);a.hasAimWorld=false;
  for(let i=0;i<120;i++){a._animate(1/120);b._animate(1/120);}a._sync();b._sync();
  window.punchFaults=[];const report=g.reportError.bind(g);g.reportError=(e,c)=>{punchFaults.push(e.stack);report(e,c);};
  document.querySelector('#hud').style.display='none';
  const label=document.createElement('div');label.style.cssText='position:fixed;left:22px;top:22px;color:#ffe2a1;background:#201d18ee;padding:12px 16px;font:600 16px system-ui;white-space:pre-line';document.body.append(label);
  const slot=a.slots.e;let time=0,started=false;
  window.punchFrame=(steps=1)=>{
   for(let i=0;i<steps;i++){
    const dt=1/120;a.move(new T.Vector3(0,0,1),dt);TYPES.melee(a,slot.def,slot,g,{pressed:!started,dt});started=true;
    g.melee.beginContactFrame();a.update(dt,g);b.update(dt,g);g.resolveBodies();g.melee.endContactFrame();g.time+=dt;g.vfx.update(dt);g.particles.update(dt);time+=dt;
   }
   const middle=a.center(new T.Vector3()).lerp(b.center(new T.Vector3()),.5);
   g.world.camera.position.copy(middle).add(new T.Vector3(25,12,-16));g.world.camera.lookAt(middle);g.world.camera.fov=48;g.world.camera.updateProjectionMatrix();
   const m=a._abilityMeleePose,phase=a.hitstop>0?'CONTACT / HITSTOP':m?m.contactPoint?m.elapsed<m.active?'FOLLOW-THROUGH':'RECOVERY':m.elapsed<.12?'WIND-UP':'EXTENSION':'RETURN TO FLIGHT';
   label.textContent=`VEGA · RUSH COMBO · ${phase}\nProduction procedural motion · ${time.toFixed(3)}s · damage ${Math.round(1000-b.hp)}\nMoving physics fixture / inspection camera`;
   const core=f=>{f.obj.updateMatrixWorld(true);const box=new T.Box3();for(const key of ['head','torso','pelvis']){const p=f.parts[key];p.geometry.computeBoundingBox();box.union(p.geometry.boundingBox.clone().applyMatrix4(p.matrixWorld));}return box;};
   const attacker=core(a),victim=core(b);
   g.world.render();return {time,phase,damage:1000-b.hp,elapsed:m?.elapsed??null,pitch:a.parts.g.rotation.x,pos:a.pos.toArray(),victim:b.pos.toArray(),hitstop:a.hitstop,slot:slot.t,bodyOverlap:attacker.intersectsBox(victim)};
  };
 });
 if(process.argv.includes('--motion')){
  await mkdir(`${out}/frames`,{recursive:true});
  // Every encoded frame is an actual native physics/animation render. No
  // interpolation between the six diagnostic stills and no concept imagery.
  for(let frame=0;frame<48;frame++){
   result.frames.push(await page.evaluate(()=>punchFrame(2)));
   await page.screenshot({path:`${out}/frames/frame-${String(frame).padStart(3,'0')}.png`});
  }
  execFileSync('ffmpeg',['-y','-loglevel','error','-framerate','60','-i',`${out}/frames/frame-%03d.png`,'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',`${out}/aerial-punch-motion.mp4`]);
 }else for(const [name,steps] of [['windup',4],['extension',6],['contact',6],['followthrough',18],['recovery',16],['exit',28]]){
   const state=await page.evaluate(steps=>punchFrame(steps),steps);result.frames.push({name,...state});await page.screenshot({path:`${out}/${name}.png`});
  }
 result.faults=await page.evaluate(()=>punchFaults);result.errors=errors;
 assert.ok(result.frames.some(f=>f.damage>0),'production attack did not hit the moving target');assert.ok(result.frames.filter(f=>f.elapsed!==null&&f.elapsed<.4).every(f=>f.pitch>.85),'flight stood up during attack');assert.ok(result.frames.filter(f=>f.damage>0&&f.elapsed!==null).every(f=>!f.bodyOverlap),'body passed through victim in follow-through');assert.deepEqual(errors,[]);assert.deepEqual(result.faults,[]);
 console.log(JSON.stringify({...result,frames:result.frames.length,maxDamage:Math.max(...result.frames.map(f=>f.damage))},null,2));
}catch(error){result.error=error.stack;result.page=await page.evaluate(()=>({text:document.body.innerText.slice(-1800),preparation:window.LSW?.game?._frontlinePreparing?.status,ready:window.LSW?.game?.pwStage?.frontlineReady,running:window.LSW?.game?.running})).catch(()=>null);console.log(result);await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error;}
finally{await writeFile(`${out}/${process.argv.includes('--motion')?'motion-results':'results'}.json`,JSON.stringify(result,null,2));await context.close();await browser.close();}
