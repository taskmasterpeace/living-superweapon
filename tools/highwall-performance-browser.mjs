import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import os from 'node:os';
const browser=await chromium.launch({headless:false}),page=await browser.newPage({viewport:{width:1280,height:720}});
const result={hardware:{cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,memoryGB:Math.round(os.totalmem()/2**30)},viewport:[1280,720],method:'Foreground requestAnimationFrame intervals, 8 seconds per preset after warmup. All actors remain native; no decoration substitution.',runs:[],errors:[]};
page.on('pageerror',e=>result.errors.push(e.message));
try{

 await page.goto('http://127.0.0.1:5193/powerworld.html?highwall&scenario=corridor');
 for(const preset of ['corridor','horde','stress32','stress64']){
  await page.waitForFunction(()=>window.PW?.game?._highwall?.ready&&!document.querySelector('#highwall-loading'),{},{timeout:60000});
  if(preset!=='corridor'){await page.getByLabel('Highwall scenario').selectOption(preset);await page.waitForFunction(p=>PW.game?._highwall?.preset===p&&PW.game._highwall.ready&&!document.querySelector('#highwall-loading'),preset,{timeout:60000});}
  await page.getByRole('button',{name:'Start combat',exact:true}).click();await page.waitForTimeout(2500);
  const metrics=await page.evaluate(()=>new Promise(resolve=>{const samples=[],start=performance.now();let last=start;function frame(now){samples.push(now-last);last=now;if(now-start<8000){requestAnimationFrame(frame);return;}samples.sort((a,b)=>a-b);const g=PW.game,r=g.world.renderer,gl=r.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');resolve({preset:g._highwall.preset,frames:samples.length,medianMs:samples[Math.floor(samples.length*.5)],p95Ms:samples[Math.floor(samples.length*.95)],maxMs:samples.at(-1),actors:g.entities.length,alive:g.entities.filter(f=>f.alive).length,vehicles:g._fleetActors?.length||0,heapMB:performance.memory?Math.round(performance.memory.usedJSHeapSize/2**20):null,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),drawCalls:r.info.render.calls,triangles:r.info.render.triangles,activeFeed:!!g._highwall.devices.focus,mediaPlaying:g._highwall.devices.media.filter(m=>m.state==='playing').length});}requestAnimationFrame(frame);}));
  result.runs.push(metrics);console.log(JSON.stringify(metrics));
 }
}finally{await mkdir('artifacts/highwall/resume',{recursive:true});await writeFile('artifacts/highwall/resume/performance.json',JSON.stringify(result,null,2));await browser.close();}
