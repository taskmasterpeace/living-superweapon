import {chromium} from 'playwright';import {mkdir,writeFile,copyFile} from 'node:fs/promises';
const out='artifacts/marketing/rage-traversal-2026-09-12';await mkdir(out,{recursive:true});
const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:5184/powerworld.html?hero=rage');await p.waitForTimeout(2500);await p.keyboard.press('Enter');await p.getByRole('button',{name:'Enter with squad',exact:true}).click();await p.waitForFunction(()=>window.PW?.game?.ms?.threatLab?.state==='preparing',{},{timeout:90000});
 await p.evaluate(()=>{const g=window.PW.game,f=g.player;f.pos.set(-600,g.world.heightAt(-600,-400),-400);f.vel.set(0,0,0);g.world._lookYaw=0;g.world._lookPitch=0;});await p.waitForTimeout(1000);
 const start=await p.evaluate(()=>window.PW.game.player.pos.toArray());await p.keyboard.down('w');await p.keyboard.down('Space');await p.waitForTimeout(750);await p.screenshot({path:out+'/rage-charge-preview.png'});await p.keyboard.up('Space');
 await p.waitForFunction(()=>window.PW.game.player._traversalLeap?.active,{},{timeout:10000});
 const launch=await p.evaluate(()=>{const f=window.PW.game.player;return {velocity:f.vel.toArray(),ki:f.ki,flying:f.flying,charge:f._traversalLeap.charge};});
 await p.waitForTimeout(1100);await p.screenshot({path:out+'/rage-leap.png'});await p.keyboard.up('w');await p.waitForTimeout(2500);
 const end=await p.evaluate(()=>{const f=window.PW.game.player;return {position:f.pos.toArray(),hp:f.hp,flying:f.flying,active:!!f._traversalLeap?.active};});
 const result={setup:'Controlled open-ground placement; native W and held/released Space',start,launch,end,errors};await writeFile(out+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(errors.length||launch.flying||launch.velocity[1]<50)throw Error('Native charged leap not proven');
}finally{const path=await p.video().path();await c.close();await copyFile(path,out+'/rage-space-leap.webm');await b.close();}
