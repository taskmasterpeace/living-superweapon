// Exact antipodal aim must turn the emitter without rewriting energy already in flight.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/flight-review/beam-reversal';await mkdir(out,{recursive:true});
const label=process.argv.includes('--before')?'before':'after';
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const result=await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW;g.update=()=>{};const rows=[],failures=[];
  for(const hz of [30,60,120,240])for(const angle of [90,179.9,180]){
   g.startMode('powerworld',{p1:'kano',p2:'vega'});const f=g.player,foe=g.entities.find(e=>e!==f&&!e.isDummy);
   f.pos.set(0,1000,0);f.vel.set(0,0,0);f.flying=true;f.gait='airborne';f.faceDir(0,1);f._animate(1/60);f.hasAimWorld=false;f.aim3.set(0,0,1);
   foe.pos.set(400,1000,400);foe.invuln=0;foe.hp=foe.maxHp=50000;
   const beam=g.spawnBeamFor(f,{...f.slots.lmb.def,steer:10},1),step=()=>{f.ki=f.maxKi;g.time+=1/hz;beam.update(1/hz,g);};
   for(let i=0;i<hz*.4;i++)step();
   // Literal antipodal vector matters: sin(PI)'s floating residue masks the deadlock.
   const aim=angle===180?new T.Vector3(0,0,-1):new T.Vector3(Math.sin(angle*Math.PI/180),0,Math.cos(angle*Math.PI/180));
   f.aim3.copy(aim);const oldTip=new T.Vector3().fromArray(beam.path,(beam.pn-1)*3),before=beam.dir.clone();step();
   const firstTurn=before.angleTo(beam.dir),firstTip=new T.Vector3().fromArray(beam.path,(beam.pn-1)*3);
   const oldEnergyError=firstTip.distanceTo(oldTip.add(new T.Vector3(0,0,beam.tipSpeed/hz)));
   for(let i=1;i<Math.round(hz*.4);i++)step();
   const error=beam.dir.angleTo(aim);
   foe.pos.copy(f.pos).addScaledVector(aim,65);foe.hp=foe.maxHp;foe.invuln=0;
   for(let i=0;i<hz*1.5;i++)step();
   const damage=foe.maxHp-foe.hp,finite=Array.from(beam.path).every(Number.isFinite)&&beam.dir.toArray().every(Number.isFinite);
   rows.push({hz,angle,error,firstTurn,oldEnergyError,damage,finite});
   if(error>.1||damage<=0)failures.push(`${angle} degrees/${hz} Hz: emitter fails to turn and damage the new target`);
   if(firstTurn<.001||firstTurn>=angle*Math.PI/180*.5)failures.push(`${angle} degrees/${hz} Hz: steering is stuck or snaps instantly`);
   if(oldEnergyError>.002)failures.push(`${angle} degrees/${hz} Hz: old energy was re-aimed`);
   if(!finite)failures.push(`${angle} degrees/${hz} Hz: non-finite stream`);
  }
  for(const angle of [90,179.9,180]){
   const same=rows.filter(r=>r.angle===angle);if(Math.max(...same.map(r=>r.error))-Math.min(...same.map(r=>r.error))>.01)failures.push(`${angle} degrees: turn response changes with frame rate`);
  }
  const edgeCases=[];
  for(const kind of ['zero-start','zero-target','no-steering','vertical-reversal','quantized-reversal']){
   g.startMode('powerworld',{p1:'kano',p2:'vega'});const f=g.player;
   f.pos.set(0,1000,0);f.hasAimWorld=false;f.aim3.set(0,kind==='vertical-reversal'?1:0,kind==='vertical-reversal'?0:1);
   if(kind==='zero-start')f.aim3.set(0,0,0);
   if(kind==='quantized-reversal')f.aim3.set(.58,0,.81);
   const beam=g.spawnBeamFor(f,{...f.slots.lmb.def,steer:kind==='no-steering'?0:10},1),initial=beam.dir.clone();
   f.aim3.set(0,kind==='vertical-reversal'?-1:0,kind==='vertical-reversal'||kind==='zero-target'?0:-1);
   if(kind==='quantized-reversal')f.aim3.set(-.58,0,-.81);
   for(let i=0;i<60;i++){f.ki=f.maxKi;g.time+=1/60;beam.update(1/60,g);}
   const expected=kind==='no-steering'||kind==='zero-target'?initial:f.aim3.clone().normalize();
   const error=beam.dir.distanceTo(expected),finite=Array.from(beam.path).every(Number.isFinite);
   edgeCases.push({kind,error,finite});if(error>.001||!finite)failures.push(`${kind}: invalid aim recovery or steering`);
  }
  return {rows,edgeCases,failures};
 });
 await writeFile(`${out}/${label}.json`,JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,errors},null,2));if(result.failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
