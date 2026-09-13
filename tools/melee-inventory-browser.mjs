import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/marketing/melee-inventory-review';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:true}),c=await b.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out}}),p=await c.newPage(),errors=[];
p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(45000);
try{
 await p.goto('http://127.0.0.1:5184/powerworld.html?hero=sarge');await p.waitForFunction(()=>window.PW?.game);
 await p.keyboard.press('Enter');
 const squad=p.getByRole('button',{name:'Enter with squad',exact:true});await squad.click();
 await p.waitForFunction(()=>PW.game.running&&PW.game.player?.def.id==='sarge');
 await p.evaluate(()=>{for(const e of PW.game.entities)if(e!==PW.game.player)e.ai=null;});
 await p.keyboard.press('KeyI');await p.getByRole('button',{name:'Open armory',exact:true}).click();await p.locator('#hArm').waitFor({state:'visible'});
 await p.locator('[data-cat="blade"]').click();await p.locator('[data-eq="bat"][data-slot="lmb"]').click();
 await p.locator('#amIssue').click();assert.match(await p.locator('#amIssueStatus').textContent(),/EQUIPPED/);
 assert.equal(await p.evaluate(()=>PW.game.player._gearHeld.rowId),'bat');await p.screenshot({path:out+'/equipped.png'});
 await p.keyboard.press('Escape');await p.locator('#hArm').waitFor({state:'detached'});
 await p.evaluate(()=>{window.swingSeen=false;const f=PW.game.player,advance=f.advanceActionPose.bind(f);f.advanceActionPose=dt=>{if(f._abilityMeleePose?.weapon?.userData.weaponKind==='bat')window.swingSeen=true;advance(dt);};});
 await p.mouse.click(720,420);await p.waitForTimeout(100);await p.mouse.click(720,420);
 await p.waitForFunction(()=>window.swingSeen);await p.waitForTimeout(500);await p.screenshot({path:out+'/ready.png'});
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({equipped:'bat',nativeMouseSwing:true,errors},null,2));
}finally{const v=p.video();await c.close();await v.saveAs(out+'/inventory-and-swing.webm');await b.close();}
