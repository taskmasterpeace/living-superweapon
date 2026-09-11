// Native SARGE input witness; no actor, camera, health, AI or animation writes.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/soldier-readability';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:false});
const page=await browser.newPage({viewport:{width:1672,height:941}}),errors=[],states=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const sample=()=>page.evaluate(()=>{
 const g=PW.game,p=g.player,clones=g.ms.frontline.soldiers;
 return {hero:p.def.id,body:p.parts.skin?.id,kit:p._soldierEquipment,head:!!p.parts.head.getObjectByName('clone_helmet_head'),
  position:p.pos.toArray(),alive:p.alive,skinColor:p.parts.mats.suit.color.getHexString(),
  shaders:clones.map(f=>({id:f.id,kit:f._cloneEquipment,insignia:!!f.parts.skin?.materials.body.userData.cloneIdentification,color:f.parts.mats.suit.color.getHexString()})),
  labels:g.ms.frontline.labels.labels.map(r=>({visible:r.sprite.visible,name:r.f.name})),
  faults:[...(g._errSeen||[])],vehicle:!!p._vehicle};
});
try{
 await page.addInitScript(()=>localStorage.setItem('powerworld_prefs_v1',JSON.stringify({p1:'sarge',p2:'kano',two:false,cameraPreset:'frontline',ai:.1})));
 await page.goto('http://127.0.0.1:5180/powerworld.html');
 await page.locator('#pwEncounter [data-encounter="frontline"]').click();
 await page.locator('#pwCamera [data-camera="frontline"]').click();
 await page.locator('#pwGo').click();
 await page.waitForFunction(()=>window.PW?.game?.pwStage?.frontlineReady&&PW.game.player._soldierEquipment,null,{timeout:60000});
 states.push(await sample());await page.screenshot({path:out+'/native-ready.png'});await page.screenshot({path:'.dream-loop/soldier-after.png'});
 await page.mouse.click(800,450,{button:'middle'});await page.waitForFunction(()=>!!document.pointerLockElement);
 await page.keyboard.down('w');await page.waitForTimeout(850);
 await page.screenshot({path:out+'/native-walk.png'});states.push(await sample());
 await page.keyboard.up('w');await page.mouse.down({button:'left'});await page.waitForTimeout(600);
 await page.screenshot({path:out+'/native-fire.png'});states.push(await sample());await page.mouse.up({button:'left'});
 for(const s of states){assert.equal(s.body,'superhero-male');assert.ok(s.kit&&s.head&&s.alive);assert.equal(s.skinColor,'525b3d');assert.ok(s.shaders.every(f=>f.kit&&f.insignia));assert.deepEqual(s.faults,[]);}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({states,errors}));
}finally{
 await writeFile(out+'/results.json',JSON.stringify({constraints:'Native UI and keyboard/mouse only. No gameplay or camera writes.',states,errors},null,2));
 await browser.close();
}
