import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'artifacts/beam-contact-native';
const hero=process.argv.find(a=>a.startsWith('--hero='))?.slice(7)||'kano';
const held=process.argv.includes('--held');
const portrait=process.argv.includes('--portrait'),width=portrait?900:1600,height=portrait?1600:900;
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const context=await browser.newContext({viewport:{width,height},recordVideo:{dir:out,size:{width,height}}});
const page=await context.newPage(),video=page.video(),result={scope:'Native Practice, Shift+N training range, pointer-locked aiming and actual beam input. Passive range, not hostile guard proof.',held,errors:[],samples:[]};
page.on('pageerror',e=>result.errors.push(String(e)));let mouse={x:width/2,y:height/2};
try{
 await page.goto(`http://127.0.0.1:5180/powerworld.html?hero=${hero}`);await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();
 await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&!PW.game._frontlinePreparing,null,{timeout:90000});await page.bringToFront();await page.waitForTimeout(800);
 await page.mouse.click(mouse.x,mouse.y);await page.waitForFunction(()=>!!document.pointerLockElement);await page.keyboard.down('KeyC');await page.waitForTimeout(150);await page.keyboard.up('KeyC');await page.waitForTimeout(650);
 await page.keyboard.down('ShiftLeft');await page.keyboard.press('KeyN');await page.keyboard.up('ShiftLeft');await page.waitForTimeout(350);
 await page.evaluate(()=>{window.contactWitness=[];const g=PW.game,hit=g.onHit;g.onHit=function(t,amount,opt,blocked){if(opt.beamDelta!=null)contactWitness.push({time:g.time,amount,blocked:!!blocked,target:t.name,hp:t.hp,pos:t.pos.toArray(),velocity:t.vel.toArray(),surface:opt.contactPoint?.toArray(),caster:opt.src?.name});return hit.call(this,t,amount,opt,blocked);};});
 await page.evaluate(()=>{
  window.beamLifecycle=[];const g=PW.game,spawn=g.spawnBeamFor;
  for(const event of ['blur','focus','pointerlockchange','visibilitychange','keydown','keyup'])window.addEventListener(event,e=>beamLifecycle.push({event,key:e.code,time:g.time,locked:!!document.pointerLockElement,focused:document.hasFocus(),visibility:document.visibilityState}),true);
  const exit=document.exitPointerLock.bind(document);document.exitPointerLock=function(){beamLifecycle.push({event:'exit-request',time:g.time,stack:new Error().stack});return exit();};
  g.spawnBeamFor=function(...args){const b=spawn.apply(this,args);if(!b)return b;
   const record=event=>{const f=b.caster;beamLifecycle.push({event,time:g.time,stack:new Error().stack,ki:f.ki,hp:f.hp,alive:f.alive,state:f.state,guard:f.guarding,stun:f.stunT,level:f.level,pending:b.pendingLaunch,emissionAge:b.emissionAge,contact:b._bodyContact?.fighter?.name,contactAlive:b._bodyContact?.fighter?.alive,input:{...g.input?.mouse},locked:!!document.pointerLockElement});};
   record('spawn');let sustaining=b.sustaining;
   Object.defineProperty(b,'sustaining',{configurable:true,get:()=>sustaining,set:value=>{if(value!==sustaining)record(`sustaining:${value}`);sustaining=value;}});
   const dispose=b._dispose;b._dispose=function(...a){record('dispose');return dispose.apply(this,a);};return b;
  };
 });
 const aim=async()=>{
  for(let i=0;i<18;i++){
   const d=await page.evaluate(()=>{const g=PW.game,w=g.world,targets=g.entities.filter(f=>f.isDummy&&!f._patrol&&f.alive),t=targets[2]||targets[0];if(!t)return null;
    const delta=t.center(g.player.pos.clone()).sub(w.camera.position).normalize();const yaw=Math.atan2(delta.x,delta.z),pitch=Math.asin(delta.y),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
    return{dx:-wrap(yaw-w._lookYaw)/w._lookSens,dy:-(pitch-w._lookPitch)/w._lookSens};});
   if(!d)break;mouse.x+=Math.max(-250,Math.min(250,d.dx));mouse.y+=Math.max(-150,Math.min(150,d.dy));await page.mouse.move(mouse.x,mouse.y);await page.waitForTimeout(90);
   if(Math.abs(d.dx)+Math.abs(d.dy)<1)break;
  }
 };
 if(process.argv.includes('--flank')){await page.keyboard.down('KeyW');await page.waitForTimeout(3000);await page.keyboard.up('KeyW');await page.waitForTimeout(400);}
 if(process.argv.includes('--offset')){await page.keyboard.down('KeyD');await page.waitForTimeout(900);await page.keyboard.up('KeyD');await page.waitForTimeout(250);}
 await aim();
 if(process.argv.includes('--close')){await page.keyboard.down('KeyW');await page.waitForTimeout(500);await page.keyboard.up('KeyW');await page.waitForTimeout(250);await aim();}
 await page.screenshot({path:`${out}/01-before.png`});
 const handHeights=()=>page.evaluate(()=>PW.game.entities.filter(f=>f.isDummy).map(f=>f.parts.armL.children[2].getWorldPosition(f.pos.clone()).y-f.parts.torso.getWorldPosition(f.pos.clone()).y));
 const posture=()=>page.evaluate(()=>PW.game.entities.filter(f=>f.isDummy).map(f=>({state:f.state,guard:f.guarding,poseGuard:f.poseGuard,mstate:f.mstate,stun:f.stunT,stagger:f.staggerT,dir:f._hitReaction?.beam?.direction.toArray(),yaw:f.parts.g.rotation.y,torso:f.parts.torso.rotation.toArray(),grip:f.parts.armL.children[2].userData.gripOccupied})));
 result.handsBefore=await handHeights();
 await page.mouse.down();await page.waitForTimeout(700);if(!held)await page.mouse.up();
 let reachedFrames=0,koFrame=-1;
 for(let i=0;i<24;i++){
await page.waitForTimeout(100);const s=await page.evaluate(()=>({time:PW.game.time,hits:contactWitness.length,beams:PW.game.projectiles.list.filter(b=>b.sustaining).map(b=>({tip:b.tip.position.toArray(),radius:b.radius,source:b.muzzle.toArray()})),targets:PW.game.entities.filter(f=>f.isDummy).map(f=>({hp:f.hp,alive:f.alive,pos:f.pos.toArray(),openSky:!!f._openSky,brace:f._hitReaction?.beam?.weight||0}))}));s.hands=await handHeights();result.samples.push(s);
  if(s.hits){
   if(i<2){const meshes=await page.evaluate(()=>{const g=PW.game,p=g.player,rows=[];g.scene.traverseVisible(m=>{if(!m.isMesh||!m.geometry?.type?.match(/Sphere|Circle|Ring/))return;const at=m.getWorldPosition(p.pos.clone()),scale=m.getWorldScale(p.pos.clone());if(at.distanceTo(p.pos)>30||Math.max(...scale.toArray())<2)return;const b=g.projectiles.list.find(b=>b.grp?.children?.includes(m));rows.push({name:m.name,geometry:m.geometry.type,at:at.toArray(),scale:scale.toArray(),opacity:m.material.opacity,color:m.material.color?.getHexString(),tag:b?(m===b.tip?'beam-tip':m===b.source?'beam-source':'beam-part'):'other',parent:m.parent?.name,body:b?._bodyContact?.fighter?.name,contact:b?._bodyContact?.point?.toArray(),surface:b?._bodyContact?.surface?.toArray()});});return rows;});(result.meshes??=[]).push({i,meshes});}
   s.posture=await posture();await page.screenshot({path:`${out}/02-contact-${i}.png`});reachedFrames++;
   if(process.argv.includes('--through-ko')){if(koFrame<0&&await page.evaluate(()=>contactWitness.some(h=>h.hp<=0)))koFrame=i;if(koFrame>=0&&i>=koFrame+2)break;}
   else if(reachedFrames>=(held?3:8))break;
  }
 }
 result.launch=await page.evaluate(()=>{const g=PW.game,f=g.player,b=f.slots.lmb.active;if(!b)return null;const ray=(b._launchTarget?.clone().sub(b.muzzle)||f.aim3.clone()).normalize();return{pending:b.pendingLaunch,source:f._combatAim?.source,gather:f._combatAim?.gather,ray:ray.toArray(),point:b._launchTarget?.toArray(),aim:f.aim3.toArray(),facing:f.facing,body:f.parts.g.rotation.toArray(),hands:[f.parts.armL,f.parts.armR].map(arm=>{const h=arm.children[2],at=h.getWorldPosition(f.pos.clone()),shoulder=arm.getWorldPosition(f.pos.clone()),q=h.getWorldQuaternion(h.quaternion.clone());return{at:at.toArray(),shoulder:shoulder.toArray(),reach:at.sub(shoulder).normalize().dot(ray),palm:f.pos.clone().set(0,-1,0).applyQuaternion(q).dot(ray),open:h.morphTargetInfluences?.[0]};})};});
 if(held){await page.mouse.up();await page.keyboard.press('KeyC');await page.waitForTimeout(1500);await page.screenshot({path:`${out}/03-recovery.png`});}
 await page.keyboard.down('KeyW');await page.waitForTimeout(700);await page.keyboard.up('KeyW');await page.screenshot({path:`${out}/03-advance.png`});
 await page.mouse.up();await page.keyboard.press('KeyC');await page.waitForTimeout(350);await page.keyboard.press('Escape');
 result.hits=await page.evaluate(()=>contactWitness);result.faults=await page.evaluate(()=>[...(PW.game._errSeen||[])]);
 assert.ok(result.hits.some(h=>h.amount>0),'Reached actual training body with positive damage');
 if(process.argv.includes('--through-ko'))assert.ok(koFrame>=0,'The native recording must actually include a knockout');
 if(held){const first=result.samples.findIndex(s=>s.hits>0);assert.ok(first>=0&&result.samples.slice(first).every(s=>s.beams.length),'After contact the held stream must remain live until release');assert.ok(result.samples.some(s=>s.targets.some(t=>!t.openSky&&t.brace>.8)),'Grounded receiver must respond to sustained contact');}
 if(held&&process.argv.includes('--flank'))assert.ok(result.samples.some(s=>s.hands.some((h,i)=>h-result.handsBefore[i]>1)),'Frontal contact must visibly raise a real receiving hand');
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.faults,[]);result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});result.hits=await page.evaluate(()=>window.contactWitness).catch(()=>[]);}
finally{result.lifecycle=await page.evaluate(()=>window.beamLifecycle).catch(()=>[]);await page.mouse.up().catch(()=>{});await page.keyboard.up('KeyW').catch(()=>{});await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));await context.close();await video.saveAs(`${out}/native-beam-contact.webm`);await browser.close();console.log(JSON.stringify({passed:result.passed,failure:result.failure,hits:result.hits?.length,errors:result.errors,lifecycle:result.lifecycle}));}
