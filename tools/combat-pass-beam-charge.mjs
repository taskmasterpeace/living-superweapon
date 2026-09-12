import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {startGameAudio,finishGameAudio} from './capture-game-audio.mjs';
import {captureProvenance} from './capture-provenance.mjs';
const url=process.env.PW_TEST_URL||'http://127.0.0.1:5182/powerworld.html';
const cleanup=process.argv.includes('--cleanup');const out=(process.env.PW_CAPTURE_ROOT||'artifacts/marketing/combat-pass-2026-09-12')+'/'+(process.env.PW_CAPTURE_NAME||(process.argv.includes('--audio')?'beam-charge-audio':cleanup?'beam-repeated-cleanup':'beam-charge-native-verified'));await mkdir(out,{recursive:true});
const sourceBefore=await captureProvenance();
const browser=await chromium.launch({headless:false}),ctx=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out}}),page=await ctx.newPage(),video=page.video();
const result={kind:'Native VEGAS practice selection; normal right mouse charge/release and second-gesture stop. No simulation overrides. Silent video.',errors:[],shots:[]};page.on('pageerror',e=>result.errors.push(e.message));
result.url=url;result.resourceErrors=[];page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL(url).origin))result.resourceErrors.push({url:r.url(),status:r.status()});});
try{
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await page.locator('#hSelect.on').waitFor();await page.keyboard.press('Escape');await page.locator('#pwRoster [data-id="vega"]').click();await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();await page.waitForFunction(()=>PW.game.running&&PW.game.time>.5,null,{timeout:90000});await page.mouse.click(720,450,{button:'middle'});
 await page.evaluate(()=>{const g=PW.game;window.__blasts=[];const original=g.areaDamage;g.areaDamage=function(src,pos,radius,damage,...rest){window.__blasts.push({time:g.time,src:src?.id,pos:pos.toArray(),radius,damage});return original.call(this,src,pos,radius,damage,...rest);};});
 if(process.argv.includes('--audio'))await startGameAudio(page);
 if(process.argv.includes('--ground')){await page.mouse.move(720,610,{steps:12});await page.waitForTimeout(250);}
 for(const hold of (cleanup?[450,1150,450,1150]:[450,1150])){
  await page.waitForFunction(()=>PW.game.player.ki>=PW.game.player.maxKi-.1&&PW.game.player.slots.rmb.cd<=0,null,{timeout:30000});
  const before=await page.evaluate(()=>({time:PW.game.time,ki:PW.game.player.ki}));await page.mouse.down({button:'right'});await page.waitForTimeout(hold);
  const held=await page.evaluate(()=>({charge:PW.game.player.slots.rmb.chargeT,ki:PW.game.player.ki}));await page.screenshot({path:out+'/charge-'+hold+'.png'});await page.mouse.up({button:'right'});
  await page.waitForFunction(()=>PW.game.player.slots.rmb.active&&!PW.game.player.slots.rmb.active.pendingLaunch);
  await page.waitForTimeout(120);const beam=await page.evaluate(()=>{const b=PW.game.player.slots.rmb.active;return {radius:b.radius,dps:b.dps,range:b.maxLen,tip:b.tip.position.toArray(),muzzle:b.muzzle.toArray(),blocked:b.blocked,groundY:PW.game.world.heightAt(b.tip.position.x,b.tip.position.z)};});await page.screenshot({path:out+'/travel-'+hold+'.png'});
  if(process.argv.includes('--ground'))assert.ok(beam.blocked&&Math.abs(beam.tip[1]-beam.groundY)<4,'Downward beam must meet terrain');
  await page.mouse.down({button:'right'});await page.waitForTimeout(200);await page.mouse.up({button:'right'});await page.waitForTimeout(150);await page.screenshot({path:out+'/blast-'+hold+'.png'});
  assert.equal(await page.evaluate(()=>!!PW.game.player.slots.rmb.active),false,'Second release stops the non-remote beam');
  result.shots.push({hold,before,held,beam,blasts:await page.evaluate(()=>window.__blasts)});
  await page.waitForTimeout(1500);
  if(cleanup){const retired=await page.evaluate(()=>{const g=PW.game;return {beams:g.projectiles.list.filter(b=>b.constructor.name==='BeamHose').length,freeLights:g.vfx.lightPool.length,sceneLights:g.scene.children.filter(o=>o.isPointLight).length,active:!!g.player.slots.rmb.active,charging:g.player.slots.rmb.charging};});result.shots.at(-1).retired=retired;assert.equal(retired.beams,0);assert.equal(retired.active,false);if(result.shots.length>1){assert.equal(retired.freeLights,result.shots[0].retired.freeLights);assert.equal(retired.sceneLights,result.shots[0].retired.sceneLights);}}
 }
 assert.ok(result.shots[1].held.charge>result.shots[0].held.charge);assert.ok(result.shots[1].beam.radius>result.shots[0].beam.radius);assert.equal(result.shots[1].blasts.length,0,'Violet Lance does not enable remote detonation');assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;}
finally{if(process.argv.includes('--audio'))await finishGameAudio(page,out,writeFile);const sourceAfter=await captureProvenance();result.sourceStable=sourceBefore.sourceDigest===sourceAfter.sourceDigest;if(!result.sourceStable||result.resourceErrors.length){result.passed=false;process.exitCode=1;}await writeFile(out+'/provenance.json',JSON.stringify({sourceBefore,sourceAfter},null,2));await writeFile(out+'/result.json',JSON.stringify(result,null,2));await ctx.close();await video.saveAs(out+'/native-beam-charge.webm');await browser.close();console.log(JSON.stringify(result));}
