// A quality transition must resize BEFORE drawing, never erase the presented frame.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/flight-review/quality-frame';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const rows=await page.evaluate(()=>{
  const g=LSW.game,w=g.world;g.update=()=>{};g.startMode('powerworld',{p1:'kano',p2:'vega'});
  const p=g.player;p.pos.set(0,140,0);p.flying=true;w.snapChase();w.chase(p,null,1/60);
  const draw=w.composer.render.bind(w.composer),quality=w._applyQuality.bind(w),events=[];
  w.composer.render=(...args)=>{events.push('draw');return draw(...args);};
  w._applyQuality=()=>{events.push('resize');return quality();};
  const rows=[];
  for(const [from,to,ema] of [[2,1,90],[1,0,90],[0,1,8],[1,2,8]]){
   w._qTier=from;quality();w.qualityOverride=null;w._qCool=0;w._ema=ema;w._refreshMs=16.67;w._lastRender=performance.now()-16.67;events.length=0;
   w.render();
   const gl=w.renderer.getContext(),pixel=new Uint8Array(4);gl.readPixels(10,gl.drawingBufferHeight-10,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
   rows.push({from,to,actual:w._qTier,events:[...events],pixel:[...pixel]});
  }
  return rows;
 });
 console.log(JSON.stringify({rows,errors},null,2));await writeFile(`${out}/result.json`,JSON.stringify({rows,errors},null,2));
 assert.deepEqual(errors,[]);
 for(const r of rows){assert.equal(r.actual,r.to);assert.deepEqual(r.events,['resize','draw'],'quality change erased a completed frame');assert.ok(r.pixel.slice(0,3).some(v=>v>20),'transition frame has no scene pixels');}
}finally{await browser.close();}
