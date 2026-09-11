import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});const tag=process.argv.includes('--before')?'before':'after',out='artifacts/flight-review/wake';await mkdir(out,{recursive:true});
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const result=await page.evaluate(()=>{
  const g=LSW.game;g.update=()=>{};const rows=[],failures=[];
  for(const hz of [30,60,120]){
   g.startMode('powerworld',{p1:'sol',p2:'kano'});g.vfx.update(10);g.particles.n=0;
   const f=g.player;f.pos.set(0,160,0);f.flying=true;f.gait='airborne';f.cruiseHeld=true;f.faceDir(0,1);f.invuln=0;f._vis=1;f.def={...f.def,afterburner:{...f.def.afterburner,wake:['#ffd24a','#ff6b24']}};
   const step=(active=true)=>{f.cruiseHeld=active;f.vel.set(0,0,active?110:0);f.update(1/hz,g);g.vfx.update(1/hz);g.particles.update(1/hz);};
   for(let i=0;i<hz*2;i++)step();
   const wakes=()=>g.scene.children.filter(o=>o.name==='flight-wake'),mesh=wakes()[0];
   const large=Array.from(g.particles.size.slice(0,g.particles.n)).filter(s=>s>2).length;
   if(large)failures.push(`${hz}Hz: ${large} large round afterburner sprites remain`);
   if(!mesh){failures.push(`${hz}Hz: no directional wake in production afterburner`);continue;}
   if(wakes().length!==1)failures.push(`${hz}Hz: duplicate wake meshes`);
   const count=mesh.geometry.drawRange.count;
   g.world.render();
   if(count<12)failures.push(`${hz}Hz: wake has no continuous surface`);
   const data=mesh.geometry.attributes.position.array;
   if(Array.from(data).some(v=>!Number.isFinite(v)))failures.push('non-finite wake');
   const cross=[];for(let i=0;i<count/12+1;i++){const j=i*12;cross.push([data[j+3]-data[j],data[j+4]-data[j+1],data[j+5]-data[j+2]]);}
   for(let i=1;i<cross.length;i++)if(cross[i].reduce((s,v,k)=>s+v*cross[i-1][k],0)<0)failures.push('straight wake flips its width at a sample');
   const colors=mesh.geometry.attributes.color.array;
   if(!Array.from(colors).some((c,i)=>i%3===1&&c<.8))failures.push('wake palette collapsed to white');
   // Teleports must not connect old history to the new destination.
   f.pos.x+=500;step();if(mesh.geometry.drawRange.count>6)failures.push('teleport stitched an arena-wide wake');
   for(let i=0;i<hz/2;i++)step();
   f.obj.visible=false;step();if(mesh.visible)failures.push('hidden fighter leaves a visible wake');f.obj.visible=true;
   for(let i=0;i<hz/2;i++)step();let geoDisposed=false,matDisposed=false;
   mesh.geometry.addEventListener('dispose',()=>geoDisposed=true);mesh.material.addEventListener('dispose',()=>matDisposed=true);
   for(let i=0;i<hz;i++)step(false);
   if(wakes().length||!geoDisposed||!matDisposed)failures.push('throttle cut leaks wake resources');
   f._burnT=1;f.cruiseHeld=true;f.vel.set(0,0,0);f.update(1/hz,g);g.vfx.update(1/hz);
   if(wakes().length)failures.push('stationary boost allocates an empty wake');
   rows.push({hz,count,large,disposed:geoDisposed&&matDisposed});
  }
  return {rows,failures};
 });await writeFile(`${out}/${tag}.json`,JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));if(result.failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
