// Production input, beam, body animation and camera. Partner path and optional dialogue are scripted.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const baseline=process.argv.includes('--baseline'),label=baseline?'baseline':'after';
const out=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||`artifacts/flight-review/camera-crossing/${label}-reel`;await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(({armed,mirror})=>{
  const g=LSW.game,w=g.world;window.crossUpdate=g.update.bind(g);g.update=()=>{};g.startMode('powerworld',{p1:'kano',p2:'vega'});g.hud.setPlayer(g.player.def);
  window.crossRender=w.render.bind(w);w.render=()=>{};g.controlBot=()=>{};
  window.crossEnd=g.input.endFrame.bind(g.input);g.input.endFrame=()=>{};
  const f=g.entities.find(e=>e!==g.player&&!e.isDummy);
  if(armed){const previous=g.player;g.player=g.addFighter({...previous.def,build:{weaponR:'rifle'}},{isPlayer:true,team:previous.team});g.humans[0].fighter=g.player;previous.isPlayer=false;previous.pos.set(800,140,800);g.player._openSky=true;}
  const p=g.player;window.crossFoe=f;
  for(const e of g.entities){e.ai=null;e.vel.set(0,0,0);if(e!==p&&e!==f)e.pos.set(800,140,800);}
  window.crossSide=mirror?-1:1;
  p.pos.set(0,160,0);p.faceDir(0,1);f.pos.set(3*crossSide,160,45);f.faceDir(0,-1);
  for(const e of [p,f]){e.flying=true;e.gait='airborne';e.invuln=0;}
  p.ki=p.maxKi;f.hp=f.maxHp=10000;g.hardLock=f;g.fov=false;w.setFogEnabled(false);w.clearFrameClaims();w._shake=0;w.snapChase();
  for(let i=0;i<90;i++){p._animate(1/60);f._animate(1/60);w.chase(p,f,1/60);}crossEnd();
 },{armed:process.argv.includes('--armed'),mirror:process.argv.includes('--mirror')});
 const rows=[];
 for(let frame=0;frame<120;frame++){
  if(process.argv.includes('--moving')){
   if(frame===10)await page.keyboard.down('d');if(frame===45)await page.keyboard.up('d');
   if(frame===55)await page.keyboard.down('a');if(frame===85)await page.keyboard.up('a');
  }
  const row=await page.evaluate(({frame,baseline,dialogue})=>{
   const g=LSW.game,p=g.player,f=crossFoe,w=g.world;
   if(dialogue&&frame===20){g.comic.say(p,'You cannot outrun this!',{life:5});g.comic.say(f,'Then keep up!',{life:5,tone:'yell'});}
   if(frame===4){g.input.mouse.left=true;g.input.mouse.leftEdge=true;}
   if(frame===88){g.input.mouse.left=false;g.input.mouse.leftUp=true;}
   for(let i=0;i<3;i++){
    const t=(frame*3+i)/60,z=45-70*Math.min(1.5,Math.max(0,t-1.5));f.pos.set(3*crossSide,160,z);f.vel.set(0,0,0);
    // Counterfactual matches the previous unlimited ordinary-yaw branch here;
    // this fixture never reaches a vertical pole. No production source mutation.
    if(baseline)w._combatOrbitYaw=null;
    crossUpdate(1/60);crossEnd();
   }
   g.hud.update();crossRender();
   const beam=g.projectiles.list.find(b=>b.caster===p&&b.sustaining&&b.dir),T=LSW.THREE;
   let alignment=null;
   if(beam){
    p.obj.updateMatrixWorld(true);const q=new T.Quaternion(),hand=p.parts.armR.children[2];
    const palm=new T.Vector3(0,-1,0).applyQuaternion(hand.getWorldQuaternion(q));
    const root=new T.Vector3().fromArray(beam.path,3).sub(new T.Vector3().fromArray(beam.path,0));
    alignment={palmEmission:palm.angleTo(beam.dir)*180/Math.PI,rootEmission:root.angleTo(beam.dir)*180/Math.PI,palmRoot:palm.angleTo(root)*180/Math.PI,
     rootLength:root.length(),clock:beam._streamClock,step:beam._streamStep,dir:beam.dir.toArray(),path:Array.from(beam.path.slice(0,12)),velocities:Array.from(beam.pvel.slice(0,12))};
   }
   return {frame,hp:f.hp,player:p.pos.toArray(),foe:f.pos.toArray(),alignment};
  },{frame,baseline,dialogue:process.argv.includes('--dialogue')});rows.push(row);
  if(!process.argv.includes('--metrics-only'))await page.screenshot({path:`${out}/${String(frame).padStart(4,'0')}.png`});
 }
 const playerTravel=Math.max(...rows.map(r=>Math.hypot(...r.player.map((v,i)=>v-rows[0].player[i]))));
 if(process.argv.includes('--moving')&&playerTravel<5)errors.push('Movement inputs failed to move the reviewed fighter');
 await writeFile(`${out}/evidence.json`,JSON.stringify({fps:20,frames:120,scriptedPartner:true,scriptedSpeech:process.argv.includes('--dialogue'),armed:process.argv.includes('--armed'),moving:process.argv.includes('--moving'),playerTravel,mirror:process.argv.includes('--mirror'),baseline,damage:10000-rows.at(-1).hp,rows,errors},null,2));console.log({label,playerTravel,damage:10000-rows.at(-1).hp,errors});if(errors.length)process.exitCode=1;
}finally{await browser.close();}
