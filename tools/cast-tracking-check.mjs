// A sustained palm must track actual emission, not race ahead toward the desired target.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/flight-review/cast-tracking';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const result=await page.evaluate(async()=>{
  const {runSlot}=await import('/src/engine/abilities.js'),{game:g,THREE:T}=LSW;g.update=()=>{};
  const rows=[],failures=[];
  for(const style of ['two-hand','one-hand','armed'])for(const hz of [30,60,120])for(const angle of [0,90,170]){
   g.startMode('powerworld',{p1:'kano',p2:'vega'});
   const f=style==='armed'?g.addFighter({...g.player.def,build:{weaponR:'rifle'}},{team:0}):g.player;
   f._openSky=true;
   f.slots.lmb.def={...f.slots.lmb.def,castStyle:style==='one-hand'?'one-hand':'two-hand'};
   f.pos.set(0,500,0);f.vel.set(0,0,0);f.flying=true;f.gait='airborne';f.faceDir(0,1);
   for(const e of g.entities)if(e!==f)e.pos.set(800,500,800);
   f.hasAimWorld=true;f.aimWorld.set(0,505.2,90);f.aim3.set(0,0,1);
   const step=i=>{f.ki=f.maxKi;g.time+=1/hz;runSlot(f,'lmb',{pressed:i===0,held:true,released:false,dt:1/hz},g);f.update(1/hz,g);g.projectiles.update(1/hz,g);};
   for(let i=0;i<hz*3;i++)step(i);
   const beam=f.slots.lmb.active;if(!beam?.sustaining)throw new Error('No real sustained beam');
   const q=new T.Quaternion(),palm=new T.Vector3(),samples=[];let maxError=0;
   for(let i=0;i<hz;i++){
    const yaw=angle*Math.PI/180*Math.min(1,i/(hz*.35));
    if(angle===0&&i===0)f.pos.x+=30; // portal/impulse relocation between frames
    f.aimWorld.set(Math.sin(yaw)*90,505.2,Math.cos(yaw)*90);f.aim3.copy(f.aimWorld).sub(f.pos).setY(0).normalize();f.faceDir(f.aim3.x,f.aim3.z);
    f.vel.set(12,0,4);step(-1);f.obj.updateMatrixWorld(true);
    const error=palm.set(0,-1,0).applyQuaternion(f.parts.armR.children[2].getWorldQuaternion(q)).angleTo(beam.dir)*180/Math.PI;
    maxError=Math.max(maxError,error);samples.push(error);
   }
   rows.push({style,hz,angle,maxError,samples});
   if(maxError>12)failures.push(`${style}/${hz} Hz/${angle} degrees: palm diverges more than 12 degrees from emission`);
   if(style==='armed'&&(!f.parts.armR.children[2].userData.gripOccupied||f.parts.armR.children[2].morphTargetInfluences[0]!==0))failures.push('Armed cast loses its closed grip');
  }
  return {rows,failures};
 });
 await writeFile(`${out}/${process.argv.includes('--before')?'before-check':'after-check'}.json`,JSON.stringify({...result,errors},null,2));
 console.log(JSON.stringify({...result,rows:result.rows.map(({samples,...r})=>r),errors},null,2));if(result.failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
