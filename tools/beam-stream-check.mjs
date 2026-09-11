// A traveling hose must reach the same distance at every simulation frequency.
import {chromium} from 'playwright';
const browser=await chromium.launch(),page=await browser.newPage();
try {
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const result=await page.evaluate(()=>{
  const {game:g}=LSW;g.update=()=>{};const rows=[],failures=[];
  for(const fps of [30,60,120,240]){
   g.startMode('powerworld',{p1:'kano',p2:'vega'});
   const f=g.player,foe=g.entities.find(e=>e!==f&&!e.isDummy);
   f.pos.set(0,1000,0);f.vel.set(0,0,0);f.flying=true;f.gait='airborne';f.faceDir(0,1);f._animate(1/60);
   foe.pos.set(0,1000,90);foe.invuln=0;foe.hp=foe.maxHp=50000;
   f.hasAimWorld=false;f.aim3.set(0,0,1);
   const beam=g.spawnBeamFor(f,f.slots.lmb.def,1);let launch=0;
   for(let i=0;i<fps*1.5;i++){f.ki=f.maxKi;g.time+=1/fps;beam.update(1/fps,g);if(i===Math.round(fps*.1)-1)launch=beam._arcLen();}
   const reach=beam._arcLen(),damage=foe.maxHp-foe.hp;
   if(reach<beam.maxLen-5||reach>beam.maxLen+.01||damage<=0)failures.push(`${fps}Hz beam falls short of its authored range`);
   if(launch>beam.tipSpeed*.15||launch<beam.tipSpeed*.05)failures.push(`${fps}Hz launch is instant or too short`);
   // Turn at the hand; the far end must keep its old heading while new energy bends.
   f.aim3.set(1,0,0);
   for(let i=0;i<Math.round(fps*.12);i++){f.ki=f.maxKi;g.time+=1/fps;beam.update(1/fps,g);}
   const tip=(beam.pn-1)*3,bend=beam.path[tip];
   if(Math.abs(bend)>2)failures.push(`${fps}Hz old energy re-aimed with the caster`);
   if(Array.from(beam.path).some(v=>!Number.isFinite(v)))failures.push(`${fps}Hz invalid stream`);
   const savedCover=g.world.cover,wall={x:0,z:50,r:2,h:1010,hp:10000,maxHp:10000};
   g.world.cover=[wall];f.aim3.set(0,0,1);const wallBeam=g.spawnBeamFor(f,f.slots.lmb.def,1),foeHp=foe.hp;
   let lostContact=0,contactStarted=false;
   for(let i=0;i<fps*2;i++){
    f.ki=f.maxKi;g.time+=1/fps;wallBeam.update(1/fps,g);
    if(wallBeam.blocked)contactStarted=true;else if(contactStarted)lostContact++;
   }
   const coverDamage=wall.maxHp-wall.hp;
   if(lostContact||!contactStarted||foe.hp!==foeHp)failures.push(`${fps}Hz wall contact flickers or damages through cover`);
   g.world.cover=[];
   for(let i=0;i<fps*1.5;i++){f.ki=f.maxKi;g.time+=1/fps;wallBeam.update(1/fps,g);}
   if(wallBeam._arcLen()<wallBeam.maxLen-5)failures.push(`${fps}Hz stream stays pinned after cover removal`);
   const savedInteriors=g.world.interiors;
   g.world.interiors=[{x:0,z:50,hx:10,hz:10,top:1010,walls:[{x:0,z:50,hx:10,hz:.5}]}];
   const interiorBeam=g.spawnBeamFor(f,f.slots.lmb.def,1),interiorHp=foe.hp;
   let interiorContact=false,interiorGaps=0;
   for(let i=0;i<fps*2;i++){
    f.ki=f.maxKi;g.time+=1/fps;interiorBeam.update(1/fps,g);
    if(interiorBeam.blocked)interiorContact=true;else if(interiorContact)interiorGaps++;
   }
   if(!interiorContact||interiorGaps||foe.hp!==interiorHp)failures.push(`${fps}Hz interior contact flickers or lets damage through`);
   g.world.interiors=savedInteriors;
   g.world.cover=savedCover;
   rows.push({fps,launch,reach,max:beam.maxLen,damage,tipXAfterTurn:bend,coverDamage,lostContact,interiorGaps});
  }
  if(Math.max(...rows.map(r=>r.coverDamage))-Math.min(...rows.map(r=>r.coverDamage))>10)failures.push('cover damage changes materially with update rate');
  return {rows,failures};
 });console.log(JSON.stringify(result,null,2));if(result.failures.length)process.exitCode=1;
}finally{await browser.close();}
