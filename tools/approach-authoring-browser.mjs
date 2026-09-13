import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/approach-authoring-2026-09-13';await mkdir(out,{recursive:true});const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:1440,height:960}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));try{
 await p.goto('http://127.0.0.1:5184/studio.html');await p.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 const hero=await p.evaluate(()=>STUDIO.preview.fighter.def.id);
 await p.getByLabel('Melee approach',{exact:true}).selectOption('tackle');await p.waitForFunction(()=>STUDIO.preview.fighter.def.combat?.groundApproach==='tackle');
 assert.match(await p.locator('#approach-summary').innerText(),/60u.*225u/);
 await p.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await p.getByLabel('Melee approach',{exact:true}).inputValue(),'auto');await p.getByRole('button',{name:'Redo',exact:true}).click();
 await p.getByRole('button',{name:'Save local',exact:true}).click();await p.screenshot({path:out+'/studio.png'});
 await p.reload();await p.waitForFunction(()=>window.STUDIO?.preview?.fighter);assert.equal(await p.getByLabel('Melee approach',{exact:true}).inputValue(),'tackle');
 await p.goto('http://127.0.0.1:5184/powerworld.html?hero='+hero);await p.waitForTimeout(2500);await p.keyboard.press('Enter');await p.getByRole('button',{name:'Enter with squad',exact:true}).click();await p.waitForFunction(()=>PW.game._threatRoom?.active,null,{timeout:90000});const result=await p.evaluate(async()=>{const {meleeApproach}=await import('/src/data/melee-approaches.js');const d=PW.game.player.def;return {id:d.id,ground:meleeApproach(d).family,air:meleeApproach(d,true).family,flight:d.flightTier};});assert.equal(result.id,hero);assert.equal(result.ground,'tackle');assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,result,errors},null,2));
}finally{await b.close();}
