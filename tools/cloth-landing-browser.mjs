// Actual procedural SOL flight pose -> production ragdoll/cape -> terminal hold.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const label=process.argv[2]||'work-in-progress';assert.match(label,/^[a-z-]+$/);
const out=`artifacts/cloth-landing/${label}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}}),page=await context.newPage(),errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/studio.html?hero=sol');await page.waitForFunction(()=>window.STUDIO?.preview?.fighter);
 await page.getByRole('button',{name:'Pause preview',exact:true}).click();
 await page.evaluate(async label=>{
  const p=STUDIO.preview,f=p.fighter,T=await import('/node_modules/three/build/three.module.js'),{Ragdoll}=await import('/src/engine/ragdoll.js');
  p.playing=false;p.controls.enabled=false;p.combat.reset(f,true,'idle');p.combat.target.obj.visible=false;
  Object.assign(f,{animT:0,_openSky:true,flying:true,gait:'airborne',facing:.9,hasAimWorld:true});f.pos.set(20,50,-15);f.vel.set(14,0,45);f.aimWorld.set(65,25,90);
  for(let i=0;i<90;i++){f.animT+=1/60;f._animate(1/60);}f.obj.updateMatrixWorld(true);
  const random=Math.random;let rag;try{Math.random=()=>.5;rag=new Ragdoll(f,new T.Vector3(35,25,18));}finally{Math.random=random;}
  window.clothStep=frame=>{
   if(frame>0)for(let i=0;i<2;i++){rag.step(1/60,p.combat.game);rag.apply(f);}else rag.apply(f);
   const c=rag.P.chest.pos;p.camera.position.copy(c).add(new T.Vector3(-16,11,-20));p.camera.fov=38;p.camera.lookAt(c);p.camera.updateProjectionMatrix();
   document.querySelector('.view-tag').textContent=`SOL / CLOTH LANDING / ${label.toUpperCase()}`;
   document.querySelector('.viewport-note').textContent='Production procedural flight → ragdoll → cloth settling. Silent inspection camera, not FPS or gameplay-camera evidence.';
   document.querySelector('.measurements').textContent=`${(frame/30).toFixed(2)}s / body ${rag.asleep?'asleep':'moving'} / cloth ${rag.capePose.asleep?'asleep':'moving'}`;
   p.renderer.render(p.scene,p.camera);
   return {frame,time:frame/30,bodyAsleep:rag.asleep,clothAsleep:rag.capePose.asleep,uploadVersion:f.parts.cape.geometry.attributes.position.version,chest:c.toArray(),hem:rag.capePose.points.slice(-rag.capePose.columns).map(q=>q.pos.toArray())};
  };
 },label);
 for(const [start,end,name]of [[0,1,'handoff'],[1,31,'fall'],[31,91,'contact'],[91,181,'early-hold'],[181,301,'late-hold'],[301,451,'settled'],[451,481,'terminal']]){
  rows.push(...await page.evaluate(async({start,end})=>{const rows=[];for(let frame=start;frame<end;frame++){rows.push(clothStep(frame));await new Promise(requestAnimationFrame);}return rows;},{start,end}));
  await page.locator('.viewport').screenshot({path:`${out}/${name}.png`});
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({label,frames:rows.length,final:rows.at(-1),errors}));
}finally{await writeFile(`${out}/results.json`,JSON.stringify({rows,errors},null,2));await context.close();await page.video()?.saveAs(`${out}/cloth-landing.webm`);await browser.close();}
