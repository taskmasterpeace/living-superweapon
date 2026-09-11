// Close-range anatomy visibility, independent of impact-effect retention.
// --probe supplies explicitly diagnostic fixed-view counterfactuals, never a
// production camera replacement. The default checks real production lock-on.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {PNG}=createRequire(import.meta.url)('../node_modules/playwright-core/lib/utilsBundle.js');
const matrix=process.argv.includes('--matrix'),off=process.argv.includes('--off'),probe=process.argv.includes('--probe'),tag=off?'without-cutaway':process.argv.includes('--before')?'before':matrix?'matrix':'after';
const out=`artifacts/close-melee-camera/${probe?'probe':tag}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(off=>{
  const {game:g,THREE:T}=LSW;g.update=()=>{};g.startMode('powerworld',{p1:'sol',p2:'kano'});g.fov=false;g.world.setFogEnabled(false);
  window.closeFixture=(gap,pose,body='procedural',stage='air')=>{
   g.startMode('powerworld',{p1:'sol',p2:'kano'});g.fov=false;g.world.setFogEnabled(false);g.vfx.update(10);g.particles.update(10);
   const a=g.player,b=g.entities.find(e=>e!==a&&!e.isDummy);window.closeFoe=b;
   if(body!=='procedural')for(const f of [a,b])f.applyForm({model:{body}});
   if(off)a.def={...a.def,model:{...a.def.model,camera:{...a.def.model?.camera,cutaway:0}}};
   for(const f of g.entities){f.ai=null;f.obj.visible=f===a||f===b;}
   for(const f of [a,b]){f.pos.set(0,stage==='air'?140:g.world.heightAt(0,f===a?0:gap),f===a?0:gap);f.vel.set(0,0,0);f.flying=stage==='air';f.gait=stage==='air'?'airborne':'grounded';f.invuln=0;f.hp=f.maxHp=1000;}
   a.faceDir(0,1);b.faceDir(0,-1);a.hasAimWorld=true;b.center(a.aimWorld);a.aim3.copy(a.aimWorld).sub(a.center(new T.Vector3())).normalize();
   for(let i=0;i<120;i++){a._animate(1/120);b._animate(1/120);}
   if(pose==='guard'){g.melee.guard(a,true);g.melee.guard(b,true);for(let i=0;i<60;i++){a._animate(1/120);b._animate(1/120);}}
   if(pose==='heavy'||pose==='light'){
    if(pose==='heavy')g.melee._beginHeavy(a,'power',1,true);else g.melee.strike(a);let after=-1;
    for(let i=0;i<180;i++){
     a.move(new T.Vector3(),1/120);a.update(1/120,g);b.move(new T.Vector3(),1/120);b.update(1/120,g);g.resolveBodies();
     g.time+=1/120;g.vfx.update(1/120);g.particles.update(1/120);
     if(b.hp<1000&&after<0)after=i;
     if(after>=0&&i-after>=10)break;
    }
   }
   g.world._lookActive=true;g.world._lookYaw=0;g.world._lookPitch=0;g.world._shake=0;g.world.clearFrameClaims();
   document.querySelector('#hud').style.display='none';return {damage:1000-b.hp};
  };
  const opaque=hit=>{let o=hit.object;while(o){if(!o.visible)return false;o=o.parent;}const m=Array.isArray(hit.object.material)?hit.object.material[hit.face.materialIndex]:hit.object.material;return m&&!m.transparent;};
  window.closeMeasure=(pitch=null)=>{
   const a=g.player,b=closeFoe,w=g.world,c=w.camera;
   w._lookYaw=0;w._lookPitch=pitch===null?0:pitch*Math.PI/180;w.snapChase();
   for(let i=0;i<180;i++)w.chase(a,pitch===null?b:null,1/120);
   c.updateMatrixWorld(true);a.obj.updateMatrixWorld(true);b.obj.updateMatrixWorld(true);
   const box=new T.Box3().setFromObject(b.parts.body),corners=[];
   for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
    const p=new T.Vector3(x,y,z).project(c);corners.push([(p.x+1)*640,(1-p.y)*360]);
   }
   const minX=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[0])))),maxX=Math.min(1280,Math.ceil(Math.max(...corners.map(p=>p[0]))));
   const minY=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[1])))),maxY=Math.min(720,Math.ceil(Math.max(...corners.map(p=>p[1]))));
   const ray=new T.Raycaster(),v=new T.Vector2();let anatomy=0,clear=0;
   for(let y=minY+3;y<maxY;y+=6)for(let x=minX+3;x<maxX;x+=6){
    ray.setFromCamera(v.set(x/640-1,1-y/360),c);
    const target=ray.intersectObject(b.parts.body,true).find(opaque);if(!target)continue;anatomy++;
    const player=ray.intersectObject(a.parts.body,true).find(opaque);if(!player||player.distance>=target.distance-.01)clear++;
   }
   const direction=c.getWorldDirection(new T.Vector3()),up=new T.Vector3(0,1,0).applyQuaternion(c.quaternion),right=new T.Vector3(1,0,0).applyQuaternion(c.quaternion),offset=c.position.clone().sub(a.pos).sub(new T.Vector3(0,5.4,0));
   const head=b.parts.head.getWorldPosition(new T.Vector3()).project(c),focus=b.center(new T.Vector3()).project(c);
   w.render();g.update=()=>w.composer.render();
   // Toggle target anatomy only. Its transparent guard field/aura stays in all
   // captures; counting the area of that field as "body" falsely penalizes a
   // readable guard pose. Player visibility still removes the entire foreground.
   const anatomyMeshes=[];b.parts.body.traverse(o=>{if(o.isMesh&&o.visible&&[].concat(o.material).every(m=>!m.transparent))anatomyMeshes.push(o);});
   window.closeVisibility=(player,target)=>{a.parts.body.visible=player;for(const o of anatomyMeshes)o.visible=target;w.composer.render();};
   return {anatomy,clear,geometryRetention:clear/Math.max(1,anatomy),pitch:Math.asin(direction.y)*180/Math.PI,side:offset.dot(right),lift:offset.dot(up),range:-offset.dot(direction),fov:c.fov,head:head.toArray(),focus:focus.toArray(),gap:a.pos.distanceTo(b.pos),phase:a.mstate,damage:1000-b.hp,crop:{x:minX,y:minY,width:maxX-minX,height:maxY-minY}};
  };
 },off);
 const cases=[];
 if(matrix){for(const body of ['procedural','superhero-male','superhero-female'])for(const stage of ['air','ground'])for(const pose of ['light','heavy','guard'])cases.push({body,stage,pose,gap:5});}
 else for(const pose of ['hover','heavy'])for(const gap of [5,8,14])cases.push({body:'procedural',stage:'air',pose,gap});
 for(const {pose,gap,body,stage} of cases){
  await page.evaluate(args=>closeFixture(...args),[gap,pose,body,stage]);
  for(const pitch of probe?[null,-25,-35,-45,-55]:[null]){
   const row={pose,gap,body,stage,variant:pitch===null?'production':`fixed-${pitch}`,...await page.evaluate(pitch=>closeMeasure(pitch),pitch)};rows.push(row);
   if(!probe){
    const pictures=[];
    for(const [player,target] of [[false,true],[false,false],[true,true],[true,false]]){
     await page.evaluate(([a,b])=>closeVisibility(a,b),[player,target]);pictures.push(PNG.sync.read(await page.screenshot({clip:row.crop})).data);
    }
    const [targetOnly,empty,both,playerOnly]=pictures;let base=0,actual=0,pixels=0;
    for(let i=0;i<targetOnly.length;i+=4){
     const d=Math.abs(targetOnly[i]-empty[i])+Math.abs(targetOnly[i+1]-empty[i+1])+Math.abs(targetOnly[i+2]-empty[i+2]);
     if(d>25){base+=d;actual+=Math.abs(both[i]-playerOnly[i])+Math.abs(both[i+1]-playerOnly[i+1])+Math.abs(both[i+2]-playerOnly[i+2]);pixels++;}
    }
    Object.assign(row,{retention:actual/Math.max(1,base),pixels});await page.evaluate(()=>closeVisibility(true,true));
   }
   console.log(JSON.stringify(row));await page.screenshot({path:`${out}/${matrix?`${body}-${stage}-`:''}${pose}-${gap}-${row.variant}.png`});
  }
 }
 const failures=[];
 for(const r of rows.filter(r=>r.variant==='production')){
  if(!probe&&(r.pixels<100||r.retention<.65))failures.push(`${r.pose}/${r.gap}: rendered opponent contribution ${(100*r.retention).toFixed(1)}%`);
  if(r.stage==='air'&&r.gap<10&&r.pitch< -45)failures.push(`${r.pose}/${r.gap}: same-altitude close lock pitches ${r.pitch.toFixed(1)} degrees`);
  if(['heavy','light'].includes(r.pose)&&r.damage<=0)failures.push(`${r.gap}: no real ${r.pose} contact`);
  if(Math.abs(r.head[0])>=.95||Math.abs(r.head[1])>=.95||r.head[2]>=1)failures.push(`${r.body}/${r.stage}/${r.pose}: target head clipped`);
 }
 await writeFile(`${out}/results.json`,JSON.stringify({probe,rows,failures,errors},null,2));console.log({failures,errors});
 if(!probe&&(failures.length||errors.length))process.exitCode=1;
}finally{await browser.close();}
