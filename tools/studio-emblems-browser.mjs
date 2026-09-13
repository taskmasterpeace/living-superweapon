import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,copyFile,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/studio-emblems-2026-09-12';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:1440,height:960},recordVideo:{dir:out}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:5184/studio.html?hero=vega');await p.waitForFunction(()=>window.STUDIO?.preview?.fighter);assert.equal(await p.getByLabel('Emblem',{exact:true}).inputValue(),'V');
 await p.getByLabel('Emblem',{exact:true}).selectOption('none');await p.waitForFunction(()=>!STUDIO.preview.fighter.parts.insigniaFront&&!STUDIO.preview.fighter.parts.emblem.visible);
 await p.getByRole('button',{name:'Undo',exact:true}).click();await p.waitForFunction(()=>!!STUDIO.preview.fighter.parts.insigniaFront);
 await p.getByLabel('Emblem',{exact:true}).selectOption('hex');await p.waitForFunction(()=>STUDIO.preview.fighter.parts.emblem.visible);await p.getByRole('button',{name:'Front view',exact:true}).click();await p.screenshot({path:out+'/hex-front.png'});
 await p.getByLabel('Emblem',{exact:true}).selectOption('V');await p.getByRole('button',{name:'Rear view',exact:true}).click();await p.waitForTimeout(400);await p.screenshot({path:out+'/v-back.png'});
 await p.getByLabel('Emblem',{exact:true}).selectOption('none');await p.getByRole('button',{name:'Save local',exact:true}).click();await p.goto('http://127.0.0.1:5184/powerworld.html?hero=vega');await p.waitForTimeout(2500);await p.keyboard.press('Enter');await p.getByRole('button',{name:'Enter with squad',exact:true}).click();await p.waitForFunction(()=>window.PW?.game?._threatRoom?.active,{},{timeout:90000});
 const result=await p.evaluate(()=>{const f=PW.game.player;return {id:f.def.id,insignia:f.def.model.insignia,front:!!f.parts.insigniaFront,back:!!f.parts.insigniaBack,hex:f.parts.emblem.visible};});assert.equal(result.id,'vega');assert.equal(result.insignia,'none');assert.equal(result.front||result.back||result.hex,false);await p.screenshot({path:out+'/saved-in-game.png'});assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({result,errors},null,2));console.log(result);
}finally{const path=await p.video().path();await c.close();await copyFile(path,out+'/studio-emblems.webm');await b.close();}
