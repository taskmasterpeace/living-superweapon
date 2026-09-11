// Native material A/B and editor preservation. Baseline routes only material
// treatment, never simulation/actor/camera state. Delayed load is a separate
// loading-gate fault injection, not presented as gameplay evidence.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const out='artifacts/frontline-garment-native';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium'}),result=process.env.STUDIO_ONLY?JSON.parse(await readFile(out+'/results.json','utf8')):{},errors=[];
delete result.failure;delete result.success;
const watch=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};
try{
 for(const variant of process.env.STUDIO_ONLY?[]:['baseline','candidate']){
  const page=await browser.newPage({viewport:{width:1671,height:941}});watch(page);
  let release,waiting=new Promise(resolve=>release=resolve),delayed=0;
  if(variant==='baseline'){
   const source=await(await page.request.get('http://127.0.0.1:5180/src/engine/hero-materials.js')).text();
   const body=source.slice(0,source.indexOf('export function applyHeroSurface'))+`export function applyHeroSurface(materials,model){if(model.surface!=='field')return;const {suit,suit2,armor}=materials;const texture=fieldWeave();suit.color.multiplyScalar(.58);suit2.color.copy(suit.color);for(const material of [suit,suit2]){material.map=texture;material.bumpMap=texture;material.bumpScale=.012;material.roughness=.88;material.metalness=0;}armor.roughness=.66;armor.metalness=.14;}`;
   await page.route('**/src/engine/hero-materials.js*',route=>route.fulfill({contentType:'application/javascript',body}));
   await page.route('**/src/engine/field-armor-wear.js*',route=>route.fulfill({contentType:'application/javascript',body:'export function attachFieldArmorWear(){} export function applyFieldArmorWear(){}'}));
  }else await page.route('**/textures/hero/field-garment/*.png',async route=>{delayed++;await waiting;await route.continue();});
  await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'vega',p2:'kano',two:false,ai:.1,cameraPreset:'frontline',encounter:'frontline'})));
  await page.goto('http://127.0.0.1:5180/powerworld.html');await page.locator('[data-camera="frontline"]').click();await page.locator('[data-encounter="frontline"]').click();await page.locator('#pwGo').click();
  if(variant==='candidate'){
   await page.waitForFunction(()=>LSW.game.pwStage?.preparation?.status==='assets',null,{timeout:60000});await page.waitForTimeout(900);
   result.delayedLoading=await page.evaluate(()=>({ready:LSW.game.pwStage.frontlineReady,status:LSW.game.pwStage.preparation.status,overlay:!!document.getElementById('frontlinePreparing'),normalImage:!!LSW.game.player.parts.skin.materials.body.normalMap.image}));
   assert.equal(result.delayedLoading.ready,false);assert.equal(result.delayedLoading.status,'assets');assert.equal(result.delayedLoading.overlay,true);assert.equal(result.delayedLoading.normalImage,false);assert.equal(delayed,3);
   await page.screenshot({path:out+'/loading-fault-injection.png'});release();
  }
  await page.waitForFunction(()=>LSW.game.pwStage?.frontlineReady,null,{timeout:90000});
  result[variant]={textures:await page.evaluate(()=>{const p=LSW.game.player,m=p.parts.skin.materials.body;return{map:m.map?.name,normal:m.normalMap?.name,roughness:m.roughnessMap?.name,decoded:!!m.map?.image?.complete,normalDecoded:!!m.normalMap?.image?.complete,armorRoughness:p.parts.mats.armor.roughness,armorMetalness:p.parts.mats.armor.metalness};})};
  await page.mouse.click(835,470,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
  await page.keyboard.down('Space');await page.waitForFunction(()=>LSW.game.player.pos.y>145,null,{timeout:20000});await page.keyboard.up('Space');
  await page.mouse.move(835,535,{steps:5});await page.keyboard.down('w');await page.keyboard.down('d');await page.waitForTimeout(900);
  await page.screenshot({path:out+'/'+variant+'-flight.png'});await page.keyboard.up('d');await page.keyboard.up('w');
  result[variant].flight=await page.evaluate(()=>({flying:LSW.game.player.flying,alive:LSW.game.player.alive,pos:LSW.game.player.pos.toArray(),normalMap:LSW.game.player.parts.skin.materials.body.normalMap?.name}));
  assert.ok(result[variant].flight.alive&&result[variant].flight.flying);
  if(variant==='candidate'){
   await page.waitForTimeout(600);await page.keyboard.down('c');await page.waitForTimeout(350);await page.screenshot({path:out+'/candidate-guard.png'});
   result.guard=await page.evaluate(()=>({guarding:LSW.game.player.guarding,finite:LSW.game.player.parts.skin.skeleton.bones.every(b=>b.matrixWorld.elements.every(Number.isFinite))}));await page.keyboard.up('c');
   assert.ok(result.guard.guarding&&result.guard.finite);
   await page.mouse.down({button:'left'});await page.waitForTimeout(400);await page.screenshot({path:out+'/candidate-gesture.png'});await page.mouse.up({button:'left'});
   result.gesture=await page.evaluate(()=>({alive:LSW.game.player.alive,finite:LSW.game.player.parts.skin.skeleton.bones.every(b=>b.matrixWorld.elements.every(Number.isFinite)),handMode:LSW.game.player.parts.armR.children[2].userData.handMode}));assert.ok(result.gesture.alive&&result.gesture.finite);
   await page.evaluate(()=>{document.exitPointerLock?.();LSW.hud.onRematch();});
   await page.waitForFunction(()=>LSW.game.pwStage?.frontlineReady&&!document.getElementById('frontlinePreparing'),null,{timeout:90000});
   result.rematch=await page.evaluate(()=>({alive:LSW.game.player.alive,bodyCount:LSW.game.player.parts.skin.meshes.filter(m=>m.name==='hero-skin-body').length,map:LSW.game.player.parts.skin.materials.body.map.name,normalDecoded:LSW.game.player.parts.skin.materials.body.normalMap.image.complete}));
   assert.equal(result.rematch.bodyCount,1);assert.equal(result.rematch.normalDecoded,true);
  }
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:960}});watch(page);
 await page.goto('http://127.0.0.1:5180/studio.html?hero=vega');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByLabel('Material surface',{exact:true}).selectOption('field');await page.getByLabel('Body source',{exact:true}).selectOption('superhero-male');
 await page.getByLabel('primary color',{exact:true}).fill('#78432b');await page.getByLabel('secondary color',{exact:true}).fill('#baa06a');
 await page.getByRole('button',{name:'Save local',exact:true}).click();await page.reload();await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.evaluate(async()=>{const {prepareHeroSurfaces}=await import('/src/engine/hero-materials.js');await prepareHeroSurfaces([STUDIO.preview.fighter.obj]);});
 result.studio=await page.evaluate(()=>({profile:STUDIO.history.value,armor:STUDIO.preview.fighter.parts.mats.armor.color.getHexString(),suit:STUDIO.preview.fighter.parts.skin.materials.body.heroPalette.skinSuit.value.getHexString(),map:STUDIO.preview.fighter.parts.skin.materials.body.map.name}));
 assert.equal(result.studio.profile.colors.primary,'#78432b');assert.equal(result.studio.profile.colors.secondary,'#baa06a');assert.equal(result.studio.armor,'baa06a');
  await page.getByLabel('Motion state',{exact:true}).selectOption('forward');await page.getByRole('button',{name:'Rear view',exact:true}).click();await page.waitForTimeout(600);await page.screenshot({path:out+'/studio-field-palette-flight.png'});
 await page.getByLabel('Motion state',{exact:true}).selectOption('hover');await page.getByRole('button',{name:'Rear view',exact:true}).click();await page.locator('.viewport').hover();await page.mouse.wheel(0,-450);await page.waitForTimeout(500);await page.screenshot({path:out+'/studio-garment-rear-detail.png'});
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON',exact:true}).click();const download=await downloadPromise;await download.saveAs(out+'/vega-test-profile.json');
 const exported=JSON.parse(await readFile(out+'/vega-test-profile.json','utf8'));assert.equal(exported.colors.secondary,'#baa06a');
 await page.getByLabel('Material surface',{exact:true}).selectOption('standard');await page.waitForTimeout(400);
 assert.equal(await page.evaluate(()=>STUDIO.preview.fighter.parts.skin.materials.body.map===null),true);await page.screenshot({path:out+'/studio-standard-override.png'});
 await page.getByRole('button',{name:'Import JSON',exact:true}).click();await page.getByLabel('Profile JSON',{exact:true}).fill(JSON.stringify(exported));await page.getByRole('button',{name:'Import profile',exact:true}).click();
 if(await page.getByRole('button',{name:'Discard draft',exact:true}).isVisible())await page.getByRole('button',{name:'Discard draft',exact:true}).click();
 assert.equal(await page.evaluate(()=>STUDIO.preview.fighter.parts.skin.materials.body.map.name),'garment-neutral-albedo');await page.getByRole('button',{name:'Save local',exact:true}).click();
 await page.getByLabel('Motion state',{exact:true}).selectOption('attack');await page.waitForTimeout(700);await page.screenshot({path:out+'/studio-attack-restored-profile.png'});
 result.studio.roundtrip=true;await page.close();assert.deepEqual(errors,[]);result.success=true;
}catch(error){result.success=false;result.failure={message:error.message,stack:error.stack};process.exitCode=1;for(const c of browser.contexts())for(const page of c.pages())await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{result.errors=errors;await writeFile(out+'/results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();}
