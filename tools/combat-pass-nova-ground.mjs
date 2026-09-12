import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/marketing/combat-pass-2026-09-12/nova-ground-native';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:false}),ctx=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out}}),page=await ctx.newPage(),video=page.video();
const result={kind:'Native VEGAS practice, mouse aim into ground and Digit1 charge/release. Pass-through areaDamage observer, no simulation overrides. Silent.',errors:[],shots:[]};page.on('pageerror',e=>result.errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5182/powerworld.html');await page.locator('#hSelect.on').waitFor();await page.keyboard.press('Escape');await page.locator('#pwRoster [data-id="vega"]').click();await page.locator('[data-encounter="practice"]').click();await page.locator('#pwGo').click();await page.waitForFunction(()=>PW.game.running&&PW.game.time>.5,null,{timeout:90000});await page.mouse.click(720,450,{button:'middle'});
 const look=await page.evaluate(()=>({pitch:PW.game.world._lookPitch,sens:PW.game.world._lookSens}));await page.mouse.move(720,450+(look.pitch+.35)/look.sens);
 await page.evaluate(()=>{const g=PW.game;window.__blasts=[];const old=g.areaDamage;g.areaDamage=function(src,pos,radius,damage,...rest){window.__blasts.push({time:g.time,src:src?.id,pos:pos.toArray(),radius,damage});return old.call(this,src,pos,radius,damage,...rest);};});
 for(const hold of [350,1500]){
  await page.waitForFunction(()=>PW.game.player.ki>=PW.game.player.maxKi-.1&&PW.game.player.slots.q.cd<=0,null,{timeout:30000});
  const before=await page.evaluate(()=>({time:PW.game.time,ki:PW.game.player.ki,blasts:window.__blasts.length}));await page.keyboard.down('1');await page.waitForTimeout(hold);
  const held=await page.evaluate(()=>({charge:PW.game.player.slots.q.chargeT,ki:PW.game.player.ki,aim:PW.game.player.aim3.toArray()}));await page.screenshot({path:out+'/charge-'+hold+'.png'});await page.keyboard.up('1');
  await page.waitForFunction(n=>window.__blasts.length>n,before.blasts,{timeout:12000});await page.screenshot({path:out+'/impact-'+hold+'.png'});await page.waitForTimeout(700);await page.screenshot({path:out+'/ground-'+hold+'.png'});
  const blast=await page.evaluate(()=>window.__blasts.at(-1));result.shots.push({hold,before,held,blast});
 }
 assert.ok(result.shots[1].held.charge>result.shots[0].held.charge);assert.ok(result.shots[1].blast.radius>result.shots[0].blast.radius);assert.ok(result.shots[1].blast.damage>result.shots[0].blast.damage);assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.failure=String(e);process.exitCode=1;}
finally{await writeFile(out+'/result.json',JSON.stringify(result,null,2));await ctx.close();await video.saveAs(out+'/native-nova-ground.webm');await browser.close();console.log(JSON.stringify(result));}
