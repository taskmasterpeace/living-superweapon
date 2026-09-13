import {chromium} from 'playwright';import {mkdir,writeFile,copyFile} from 'node:fs/promises';
const out='artifacts/marketing/touch-guard-2026-09-12';await mkdir(out,{recursive:true});const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,recordVideo:{dir:out}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
try{await p.goto('http://127.0.0.1:5184/powerworld.html?hero=sol');await p.waitForTimeout(2500);await p.getByRole('button',{name:'Select character',exact:true}).tap();await p.getByRole('button',{name:'Enter with squad',exact:true}).tap();await p.waitForFunction(()=>window.PW?.game?._threatRoom?.active,{},{timeout:90000});
const open=async()=>{await p.evaluate(()=>{const g=window.PW.game,h=g.ms.threatLab.threatPickHandle;g.player.pos.copy(h.pos);g.player.pos.y=0;g.player.pos.x+=3;g.player.vel.set(0,0,0);g.world._lookYaw=-Math.PI/2;g.world._lookPitch=0;});await p.waitForTimeout(300);await p.locator('#touch [data-b=grab]').tap();await p.getByRole('dialog',{name:'Choose a Threat Room opponent'}).waitFor();};


await open();
await p.getByRole('button',{name:'MERC',exact:true}).tap();
await p.locator('[data-drill]').selectOption('defend');
await p.getByRole('button',{name:'Start teaching drill',exact:true}).tap();
await p.evaluate(()=>{const g=PW.game,t=g.ms.threatLab.meleeTrial.target;t.pos.set(80,0,-50);g.player.pos.set(80,0,-56);g.player.vel.set(0,0,0);g.world._lookYaw=0;g.world._lookPitch=0;g.world._chaseSnap=true;});
const client=await c.newCDPSession(p),box=await p.locator('#touch [data-b=guard]').boundingBox();
await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
await p.waitForFunction(()=>PW.game.ms.threatLab.meleeTrial.records.some(r=>r.incoming&&r.result==='BLOCK'),{},{timeout:12000});
const held=await p.evaluate(()=>({guarding:PW.game.player.guarding,hits:PW.game.ms.threatLab.meleeTrial.records.filter(r=>r.incoming)}));
await p.screenshot({path:out+'/block.png'});
await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await p.waitForFunction(()=>!PW.game.player.guarding,{},{timeout:3000});
const released=await p.evaluate(()=>({guarding:PW.game.player.guarding,touchGuard:PW.game.touch.cur.guard}));
await writeFile(out+'/result.json',JSON.stringify({held,released,errors},null,2));console.log({held,released,errors});
if(!held.guarding||!held.hits.some(r=>r.result==='BLOCK'&&r.healthLost===0&&r.guardEnergySpent>0)||released.guarding||released.touchGuard||errors.length)throw Error('Touch guard acceptance failed');
}finally{const v=await p.video().path();await c.close();await copyFile(v,out+'/guard.webm');await b.close();}
