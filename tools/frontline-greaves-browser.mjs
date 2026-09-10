// Actual menu/flight input with a material-independent asset visibility A/B.
// Baseline hides only the new greave module through a routed source response.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/frontline-greaves-native';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),results={},errors=[];
const watch=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};
try{
 for(const variant of ['baseline','candidate']){
  const page=await browser.newPage({viewport:{width:1671,height:941}});watch(page);
  if(variant==='baseline'){
   const source=await(await page.request.get('http://127.0.0.1:5180/src/engine/field-greaves.js')).text();assert.ok(source.includes('return root;'));
   await page.route('**/src/engine/field-greaves.js*',route=>route.fulfill({contentType:'application/javascript',body:source.replace('return root;','root.visible=false;return root;')}));
  }
  await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',two:false,ai:.1,cameraPreset:'frontline',encounter:'frontline'})));
  await page.goto('http://127.0.0.1:5180/powerworld.html');await page.locator('[data-camera="frontline"]').click();await page.locator('[data-encounter="frontline"]').click();await page.locator('#pwGo').click();
  await page.waitForFunction(()=>LSW.game.pwStage?.frontlineReady,null,{timeout:90000});
  await page.mouse.click(835,470,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
  await page.keyboard.down('Space');await page.waitForFunction(()=>LSW.game.player.pos.y>145,null,{timeout:20000});await page.keyboard.up('Space');
  await page.mouse.move(835,535,{steps:5});await page.keyboard.down('w');await page.keyboard.down('d');await page.waitForTimeout(900);await page.screenshot({path:out+'/'+variant+'-flight.png'});await page.keyboard.up('w');await page.keyboard.up('d');
  results[variant]=await page.evaluate(()=>{const f=LSW.game.player,roots=['L','R'].map(s=>f.parts['leg'+s].userData.shin.getObjectByName('field-greave_'+s));return{alive:f.alive,flying:f.flying,pos:f.pos.toArray(),roots:roots.map(r=>({visible:r.visible,gear:r.userData.heroGear,parent:r.parent===f.parts.legL.userData.shin?'shinL':'shinR',finite:r.matrixWorld.elements.every(Number.isFinite),palette:r.material===f.parts.mats.armor})),preparation:LSW.game.pwStage.preparation.status};});
  assert.ok(results[variant].alive&&results[variant].flying);assert.ok(results[variant].roots.every(r=>r.finite&&r.palette&&r.visible===(variant==='candidate')));
  if(variant==='candidate'){
   await page.waitForTimeout(600);await page.keyboard.down('c');await page.waitForTimeout(350);await page.screenshot({path:out+'/candidate-guard.png'});await page.keyboard.up('c');
   await page.mouse.down({button:'left'});await page.waitForTimeout(350);await page.screenshot({path:out+'/candidate-volley.png'});await page.mouse.up({button:'left'});
   await page.evaluate(()=>{document.exitPointerLock?.();LSW.hud.onRematch();});await page.waitForFunction(()=>LSW.game.pwStage?.frontlineReady&&!document.getElementById('frontlinePreparing'),null,{timeout:90000});
   results.rematch=await page.evaluate(()=>{const roots=[];LSW.game.player.obj.traverse(o=>{if(/^field-greave_[LR]$/.test(o.name))roots.push(o);});return{count:roots.length,visible:roots.every(o=>o.visible&&o.layers.isEnabled(0)),palette:roots.every(o=>o.material===LSW.game.player.parts.mats.armor)};});assert.deepEqual(results.rematch,{count:2,visible:true,palette:true});
  }
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:960}});watch(page);await page.goto('http://127.0.0.1:5180/studio.html?hero=vega');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByLabel('Motion state',{exact:true}).selectOption('hover');await page.getByRole('button',{name:'Rear view',exact:true}).click();await page.waitForTimeout(500);await page.screenshot({path:out+'/studio-rear-hover.png'});
 for(const [name,scale,bulk]of [['tall-thin','1.5','.65'],['short-wide','.65','1.65']]){
  for(const [label,value]of [['Scale value',scale],['Bulk value',bulk]]){await page.getByLabel(label,{exact:true}).fill(value);await page.getByLabel(label,{exact:true}).press('Tab');}
  await page.waitForTimeout(250);await page.screenshot({path:out+'/studio-'+name+'.png'});
  await page.getByRole('tab',{name:'Pose',exact:true}).click();for(const label of ['Left knee value','Right knee value']){await page.getByLabel(label,{exact:true}).fill('120');await page.getByLabel(label,{exact:true}).press('Tab');}
  await page.getByRole('button',{name:'Side view',exact:true}).click();await page.waitForTimeout(500);await page.screenshot({path:out+'/studio-'+name+'-deep-knee-side.png'});
  await page.getByRole('button',{name:'Rear view',exact:true}).click();await page.waitForTimeout(250);await page.screenshot({path:out+'/studio-'+name+'-deep-knee-rear.png'});
  await page.getByRole('tab',{name:'Model',exact:true}).click();
 }
 await page.getByLabel('secondary color',{exact:true}).fill('#ba9758');await page.getByRole('button',{name:'Save local',exact:true}).click();await page.reload();await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 results.studio=await page.evaluate(()=>({color:STUDIO.preview.fighter.parts.mats.armor.color.getHexString(),greaves:['L','R'].map(s=>STUDIO.preview.fighter.parts['leg'+s].userData.shin.getObjectByName('field-greave_'+s).material.color.getHexString())}));assert.deepEqual(results.studio,{color:'ba9758',greaves:['ba9758','ba9758']});
 await page.getByLabel('Material surface',{exact:true}).selectOption('standard');assert.equal(await page.evaluate(()=>!!STUDIO.preview.fighter.parts.legL.userData.shin.getObjectByName('field-greave_L')),false);
 await page.close();assert.deepEqual(errors,[]);results.success=true;
}catch(error){results.success=false;results.failure=error.message;process.exitCode=1;for(const c of browser.contexts())for(const page of c.pages())await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{results.errors=errors;await writeFile(out+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));await browser.close();}
