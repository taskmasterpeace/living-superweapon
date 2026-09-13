import {chromium} from 'playwright';import {mkdir,writeFile,copyFile} from 'node:fs/promises';
const out='artifacts/marketing/touch-throw-2026-09-12';await mkdir(out,{recursive:true});const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,recordVideo:{dir:out}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
try{await p.goto('http://127.0.0.1:5184/powerworld.html?hero=sol');await p.waitForTimeout(2500);await p.getByRole('button',{name:'Select character',exact:true}).tap();await p.getByRole('button',{name:'Enter with squad',exact:true}).tap();await p.waitForFunction(()=>window.PW?.game?._threatRoom?.active,{},{timeout:90000});
const open=async()=>{await p.evaluate(()=>{const g=window.PW.game,h=g.ms.threatLab.threatPickHandle;g.player.pos.copy(h.pos);g.player.pos.y=0;g.player.pos.x+=3;g.player.vel.set(0,0,0);g.world._lookYaw=-Math.PI/2;g.world._lookPitch=0;});await p.waitForTimeout(300);await p.locator('#touch [data-b=grab]').tap();await p.getByRole('dialog',{name:'Choose a Threat Room opponent'}).waitFor();};



await open();await p.getByRole('button',{name:'MERC',exact:true}).tap();await p.getByRole('button',{name:'Start teaching drill',exact:true}).tap();
await p.evaluate(()=>{const g=PW.game,t=g.ms.threatLab.meleeTrial.target;t.pos.set(80,0,-50);g.player.pos.set(80,0,-56);g.player.vel.set(0,0,0);g.world._lookYaw=0;g.world._lookPitch=0;g.world._chaseSnap=true;});await p.waitForTimeout(500);
await p.locator('#touch [data-b=grab]').tap();await p.waitForFunction(()=>!!PW.game.player.grabbing,null,{timeout:5000});
const client=await c.newCDPSession(p);
const hold=async(id,ms)=>{const box=await p.locator('#touch [data-b='+id+']').boundingBox();await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});await p.waitForTimeout(ms);};
const release=()=>client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await hold('fly',500);await release();await p.evaluate(()=>{PW.game.world._lookPitch=-.65;window.throwVictim=PW.game.player.grabbing;});
const label=await p.locator('#touch [data-b=grab]').getAttribute('aria-label');await hold('grab',500);await p.screenshot({path:out+'/aim.png'});await release();
await p.waitForFunction(()=>!PW.game.player.grabbing,null,{timeout:3000});await p.waitForFunction(()=>PW.game.ms.threatLab.meleeTrial.records.some(r=>r.result==='TERRAIN IMPACT'),null,{timeout:8000});
const result=await p.evaluate(()=>({records:PW.game.ms.threatLab.meleeTrial.records,grabbing:!!PW.game.player.grabbing,touchGrab:PW.game.touch.cur.grab,victimHp:throwVictim.hp}));await p.screenshot({path:out+'/impact.png'});await writeFile(out+'/result.json',JSON.stringify({label,result,errors},null,2));console.log({label,result,errors});
if(label!=='Throw'||result.grabbing||result.touchGrab||errors.length||!result.records.some(r=>r.move==='throw'&&r.healthLost>0))throw Error('Touch throw failed');
}finally{const v=await p.video().path();await c.close();await copyFile(v,out+'/throw.webm');await b.close();}
