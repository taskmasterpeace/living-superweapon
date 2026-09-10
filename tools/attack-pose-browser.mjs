import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {freshPicks,buildDef} from '../src/data/creator.js';
import {profileFromDef} from '../src/tool/studio-profile.js';
import {exportCharacter} from '../src/tool/character-package.js';

const base=process.env.LSW_BASE_URL||'http://127.0.0.1:5180',out='artifacts/attack-pose-authoring';
const browser=await chromium.launch({headless:true}),errors=[];
await mkdir(out,{recursive:true});
let page;
async function open(context,hero='vega'){
 const p=await context.newPage();p.on('pageerror',error=>errors.push(error.message));
 p.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 await p.goto(`${base}/studio.html?hero=${hero}`);await ready(p);return p;
}
async function ready(p){
 await p.waitForFunction(()=>window.STUDIO?.preview?.fighter,{timeout:20000});
 if(await p.getByRole('button',{name:'Pause preview',exact:true}).isVisible())await p.getByRole('button',{name:'Pause preview',exact:true}).click();
 await p.getByRole('tab',{name:'Attacks',exact:true}).click();
}
async function selected(p,slot,state){
 assert.deepEqual(await p.evaluate(()=>({inspector:document.querySelector('#attack-slot').value,preview:document.querySelector('#combat-slot').value,slot:STUDIO.preview.combat.slot,state:STUDIO.preview.state})),
  {inspector:slot,preview:slot,slot,state},'Inspector, preview selector and production slot must describe the same attack');
}
async function cast(p,slot,style,{time=1.2,source='hand'}={}){
 const result=await p.evaluate(({slot,time})=>{
  const p=STUDIO.preview;p.seek(time);const f=p.fighter,s=f.slots[slot];
  return {slot:p.combat.slot,style:f._combatAim?.style,source:f._combatAim?.source,running:!!(s.charging||s.active),authored:s.def.castStyle};
 },{slot,time});
 assert.deepEqual(result,{slot,style,source,running:true,authored:style},'The selected authored pose must reach the real charging/firing animation');
}
async function importPackage(p,pack){
 await p.getByRole('button',{name:'Import JSON',exact:true}).click();await p.locator('#profile-json').fill(JSON.stringify(pack));
 await p.getByRole('button',{name:'Import profile',exact:true}).click();
 await p.waitForFunction(name=>STUDIO.preview.fighter.def.name===name,pack.picks.name);
}
async function downloadPackage(p,path){
 const pending=p.waitForEvent('download');await p.getByRole('button',{name:'Export JSON',exact:true}).click();
 await (await pending).saveAs(path);return JSON.parse(await readFile(path,'utf8'));
}
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 page=await open(context);
 await page.getByLabel('Attack slot',{exact:true}).selectOption('rmb');
 await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
 await selected(page,'rmb','beam');
 // RED gate: legacy Beam mode previously left the live slot on RMB while the
 // inspector silently authored R. This checks the actual UI/production boundary.
 await page.getByLabel('Attack slot',{exact:true}).selectOption('r');
 await selected(page,'r','beam');
 await page.getByLabel('Beam pose',{exact:true}).selectOption('two-hand');
 assert.equal(await page.locator('#attack-castStyle').evaluate(el=>el===document.activeElement),true,'Rebuilt pose select retains keyboard focus');
 await cast(page,'r','two-hand');
 assert.equal(await page.evaluate(()=>STUDIO.history.value.attacks.rmb),undefined,'Editing R cannot author the old RMB preview');
 await page.getByLabel('Beam pose',{exact:true}).selectOption('palm');
 await page.getByRole('button',{name:'Undo',exact:true}).click();await selected(page,'r','beam');await cast(page,'r','two-hand');
 await page.getByRole('button',{name:'Redo',exact:true}).click();await cast(page,'r','palm');
 await page.getByLabel('Preview beam',{exact:true}).selectOption('rmb');await selected(page,'rmb','beam');
 assert.equal(await page.getByLabel('Beam pose',{exact:true}).inputValue(),'auto');
 await page.getByLabel('Beam pose',{exact:true}).selectOption('two-hand');await cast(page,'rmb','two-hand');
 await page.getByRole('button',{name:'Save local',exact:true}).click();await page.reload();await ready(page);
 await page.getByLabel('Attack slot',{exact:true}).selectOption('r');await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
 await selected(page,'r','beam');await cast(page,'r','palm');
 await page.getByLabel('Preview beam',{exact:true}).selectOption('rmb');await selected(page,'rmb','beam');await cast(page,'rmb','two-hand');

 await page.locator('[data-hero="titan"]').click();
 await page.getByLabel('Attack slot',{exact:true}).selectOption('r');await selected(page,'r','beam');
 await page.getByLabel('Preview beam',{exact:true}).selectOption('lmb');await selected(page,'lmb','beam');
 await page.getByLabel('Beam pose',{exact:true}).selectOption('two-hand');await cast(page,'lmb','two-hand');
 // A supported nonbeam must change the preview mode, not leave the last beam
 // running beside a charge inspector. An unsupported slot must stop that preview.
 await page.getByLabel('Attack slot',{exact:true}).selectOption('q');await selected(page,'q','attack');
 assert.match(await page.locator('#status').innerText(),/Attack sequence/i);
 assert.deepEqual(await page.getByLabel('Attack pose',{exact:true}).locator('option').evaluateAll(options=>options.map(o=>o.value)),['auto','chest-brace']);
 await page.getByLabel('Attack pose',{exact:true}).selectOption('chest-brace');await cast(page,'q','chest-brace',{source:'chest'});
 const profile=await page.evaluate(()=>STUDIO.history.value);
 await page.getByLabel('Fighter motion',{exact:true}).selectOption('ground-left');
 assert.deepEqual(await page.evaluate(()=>STUDIO.history.value),profile,'Preview motion must not dirty the authored package');
 await cast(page,'q','chest-brace',{source:'chest'});assert.equal(await page.evaluate(()=>STUDIO.preview.fighter.grounded),true);
 await page.getByLabel('Chest emitter',{exact:true}).uncheck();
 assert.equal(await page.getByLabel('Attack pose',{exact:true}).inputValue(),'auto');
 assert.deepEqual(await page.getByLabel('Attack pose',{exact:true}).locator('option').evaluateAll(options=>options.map(o=>o.value)),['auto','palm','two-hand']);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await selected(page,'q','attack');await cast(page,'q','chest-brace',{source:'chest'});
 await page.getByLabel('Attack slot',{exact:true}).selectOption('rmb');
 assert.equal(await page.getByLabel('Motion state',{exact:true}).inputValue(),'hover');
 assert.match(await page.locator('#status').innerText(),/not supported.*preview|preview.*not supported/i);
 assert.equal(await page.evaluate(()=>STUDIO.preview.combat.game.projectiles.list.length),0,'Unsupported slot selection stops the previous attack');
 await page.getByLabel('Attack slot',{exact:true}).selectOption('q');await page.getByLabel('Motion state',{exact:true}).selectOption('beam');
 await selected(page,'lmb','beam');
 await page.getByLabel('Attack slot',{exact:true}).selectOption('q');await selected(page,'q','attack');
 await page.getByRole('button',{name:'Save local',exact:true}).click();
 await page.screenshot({path:`${out}/titan-chest-pose.png`,fullPage:true});
 await page.reload();await ready(page);await page.locator('[data-hero="titan"]').click();
 await page.getByLabel('Attack slot',{exact:true}).selectOption('q');await page.getByLabel('Motion state',{exact:true}).selectOption('attack');
 await selected(page,'q','attack');await cast(page,'q','chest-brace',{source:'chest'});
 const titanProfile=await downloadPackage(page,`${out}/titan-profile.json`);assert.equal(titanProfile.attacks.q.values.castStyle,'chest-brace');

 // Import a genuine ORIGIN recipe, author both emitter families through the UI,
 // then use the UI exporter and importer in a fresh isolated storage context.
 const picks={...freshPicks(),name:'POSE RELAY',budget:'unbound',slots:{lmb:'heatray',rmb:'kibolt',q:'unibeam',e:null,f:null,r:null}};
 const def=buildDef(picks,'cx_pose_relay');await importPackage(page,exportCharacter({picks,def},profileFromDef(def)));
 await page.getByLabel('Attack slot',{exact:true}).selectOption('q');await page.getByLabel('Attack pose',{exact:true}).selectOption('chest-brace');
 await page.getByLabel('Preview attack',{exact:true}).selectOption('lmb');await selected(page,'lmb','attack');
 await page.getByLabel('Beam pose',{exact:true}).selectOption('palm');await cast(page,'lmb','palm');
 await page.getByRole('button',{name:'Save local',exact:true}).click();
 const pack=await downloadPackage(page,`${out}/pose-relay.json`);
 assert.equal(pack.format,'lsw-character');assert.equal(pack.profile.attacks.q.values.castStyle,'chest-brace');assert.equal(pack.profile.attacks.lmb.values.castStyle,'palm');
 const fresh=await browser.newContext({viewport:{width:1440,height:1000}}),second=await open(fresh,'sol');
 await importPackage(second,pack);const id=await second.evaluate(()=>STUDIO.history.value.heroId);assert.notEqual(id,pack.sourceId);
 await second.reload();await ready(second);await second.locator(`[data-hero="${id}"]`).click();
 await second.getByLabel('Attack slot',{exact:true}).selectOption('q');await second.getByLabel('Motion state',{exact:true}).selectOption('attack');
 await selected(second,'q','attack');await cast(second,'q','chest-brace',{source:'chest'});
 await second.getByLabel('Preview attack',{exact:true}).selectOption('lmb');await selected(second,'lmb','attack');await cast(second,'lmb','palm');
 await second.setViewportSize({width:390,height:844});
 assert.equal(await second.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Pose controls must fit the existing narrow inspector');
 await second.screenshot({path:`${out}/imported-pose-mobile.png`,fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS attack pose UI: VEGA/TITAN slot sync, active cast, charge transition, emitter reset, Undo/Redo, Save/reload, exported package → fresh import, narrow layout; 0 page errors');
}catch(error){
 if(page)await page.screenshot({path:`${out}/failure.png`,fullPage:true}).catch(()=>{});
 throw error;
}finally{await browser.close();}
