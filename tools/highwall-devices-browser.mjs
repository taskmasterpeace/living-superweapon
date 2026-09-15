// Isolated real renderer/media regression. Native E integration needs the full Highwall walkthrough.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/__device_probe__',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'}));
 await page.goto(`${process.env.HIGHWALL_URL||'http://127.0.0.1:5193'}/__device_probe__`);
 await page.evaluate(async()=>{
  const THREE=await import('/node_modules/.vite/deps/three.js');
  const {HighwallInteractables}=await import('/src/engine/highwall-interactables.js');
  const {AudioBus}=await import('/src/core/audio.js');
  const renderer=new THREE.WebGLRenderer();
  const g={running:true,scene:new THREE.Scene(),world:{renderer,cover:[]},entities:[],audio:new AudioBus(),hud:{feed:console.log},player:{alive:true,hp:100,pos:new THREE.Vector3(-218,0,212)}};
  const devices=new HighwallInteractables(g);window.devicesProbe=devices;
  const button=document.createElement('button');button.textContent='Start media';button.onclick=()=>devices.media.forEach(m=>devices.toggleMedia(m));document.body.append(button);
  const inspect=document.createElement('button');inspect.textContent='Inspect speaker';inspect.onclick=()=>devices.interact(g.player);document.body.append(inspect);
 });
 await page.getByRole('button',{name:'Inspect speaker',exact:true}).click();
 assert.equal(await page.evaluate(()=>devicesProbe.media[0].state),'stopped');
 await page.getByRole('button',{name:'Play / Resume',exact:true}).click();await page.waitForTimeout(250);await page.evaluate(()=>devicesProbe.tick(.016));
 await page.getByRole('button',{name:'Pause',exact:true}).click();
 const paused=await page.evaluate(()=>devicesProbe.media[0].el.currentTime);await page.waitForTimeout(200);
 assert.ok(Math.abs(await page.evaluate(()=>devicesProbe.media[0].el.currentTime)-paused)<.04);
 await page.getByLabel('Media volume').focus();await page.keyboard.press('Home');
 assert.equal(await page.evaluate(()=>devicesProbe.media[0].volume),0);
 await page.getByLabel('Media volume').focus();await page.keyboard.press('End');
 await mkdir('artifacts/highwall',{recursive:true});await page.screenshot({path:'artifacts/highwall/media-inspector.png'});
 await page.getByRole('button',{name:'Stop',exact:true}).click();
 assert.equal(await page.evaluate(()=>devicesProbe.media[0].el.currentTime),0);
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>devicesProbe.isOpen),false);
 await page.getByRole('button',{name:'Start media',exact:true}).click();await page.waitForTimeout(2200);
 const result=await page.evaluate(()=>{
  const d=window.devicesProbe;d.renderFeed();
  const r={media:d.media.map(m=>({id:m.id,state:m.state,time:m.el.currentTime,width:m.el.videoWidth,error:m.el.error?.message})),targetWidth:d.target.width,feeds:d.cameras.length,lensOffsets:d.cameras.map(c=>c.camera.position.distanceTo(c.mesh.position)),inspector:{noAutoplay:true,pause:true,stop:true,volume:true,escape:true}};
  d.dispose();r.disposed=d.media.every(m=>m.el.paused&&!m.el.getAttribute('src'));return r;
 });
 assert.ok(result.media.every(m=>m.state==='playing'&&m.time>0));assert.ok(result.media.find(m=>m.id==='screen').width>0);
 assert.equal(result.feeds,2);assert.equal(result.targetWidth,320);assert.equal(result.disposed,true);assert.deepEqual(errors,[]);
 assert.ok(result.lensOffsets.every(d=>Math.abs(d-4)<.001));
 await mkdir('artifacts/highwall',{recursive:true});await writeFile('artifacts/highwall/devices-probe.json',JSON.stringify({...result,errors,scope:'Isolated render/decoding/playback/cleanup; not native E or audible-output certification'},null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
