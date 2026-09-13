import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir,writeFile,copyFile} from 'node:fs/promises';
const out='artifacts/marketing/selection-landscape-2026-09-12';await mkdir(out,{recursive:true});const b=await chromium.launch({headless:false}),c=await b.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,recordVideo:{dir:out}}),p=await c.newPage(),errors=[],results=[];p.on('pageerror',e=>errors.push(e.message));
try{
 for(const [hero,label] of [['volt','Momentum glide'],['rage','Charged leap'],['sarge','Soldier']]){
  await p.goto('http://127.0.0.1:5184/powerworld.html?hero='+hero);await p.locator('#hSelect.on .selidentity').waitFor();await p.waitForTimeout(1600);
  const identity=await p.locator('#hSelect .selidentity').innerText();assert.ok(identity.includes(label));
  assert.equal(await p.locator('#hSelect .scard .sidentity').count(),await p.locator('#hSelect .scard').count());
  const info=await p.locator('#selInfo').innerText();assert.ok(info.includes('STARTING ATTACKS'));results.push({hero,identity});await p.screenshot({path:out+'/'+hero+'.png'});
 }
 const cdp=await c.newCDPSession(p);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:680,y:210}]});
 for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:680,y:210-i*18}]});await p.waitForTimeout(25);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(300);
 const layout=await p.evaluate(()=>{const info=document.querySelector('#selInfo'),button=[...document.querySelectorAll('#selBar button')].find(b=>b.textContent==='Select character'),r=button.getBoundingClientRect();return {scrollTop:info.scrollTop,select:{top:r.top,bottom:r.bottom,width:r.width,height:r.height},height:innerHeight};});
 assert.ok(layout.scrollTop>0);assert.ok(layout.select.bottom<=layout.height);assert.ok(layout.select.height>=44);await p.screenshot({path:out+'/details-scrolled.png'});
 await p.getByRole('button',{name:'Select character',exact:true}).tap();await p.getByRole('button',{name:'Enter with squad',exact:true}).tap();await p.waitForFunction(()=>window.PW?.game?._threatRoom?.active,{},{timeout:90000});
 const entered=await p.evaluate(()=>({hero:PW.game.player.def.id,touch:!!PW.game.touch,room:PW.game._threatRoom.active}));assert.equal(entered.hero,'sarge');assert.ok(entered.touch&&entered.room);
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({results,layout,entered,errors},null,2));console.log({results,layout,entered});
}finally{const video=await p.video().path();await c.close();await copyFile(video,out+'/selection.webm');await b.close();}
