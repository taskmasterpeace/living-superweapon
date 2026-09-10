import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/flight-review/encounter';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:900}});
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(()=>{
  const g=LSW.game;window.encStep=g.update.bind(g);g.update=()=>{};g.startMode('powerworld',{p1:'kano',p2:'vega'});
  window.encRender=g.world.render.bind(g.world);g.world.render=()=>{};
  const p=g.player,f=g.entities.find(e=>e!==p&&!e.isDummy);window.encFoe=f;
  p.pos.set(0,140,0);f.pos.set(0,140,40);p.flying=f.flying=true;p.vel.set(0,0,0);f.vel.set(0,0,0);p.faceDir(0,1);f.faceDir(0,-1);
  g.hardLock=f;g.world.snapChase();p.hp=p.maxHp=10000;f.hp=f.maxHp=10000;
 });
 const rows=[];
 for(let i=0;i<240;i++){
  const row=await page.evaluate(i=>{
   const g=LSW.game,p=g.player,f=encFoe,w=g.world,T=LSW.THREE;
   if(i===20)dispatchEvent(new KeyboardEvent('keydown',{code:'KeyD',bubbles:true}));
   if(i===60)dispatchEvent(new KeyboardEvent('keyup',{code:'KeyD',bubbles:true}));
   if(i===70){g.input.mouse.left=true;g.input.mouse.leftEdge=true;}
   if(i===150){g.input.mouse.left=false;g.input.mouse.leftUp=true;}
   for(let j=0;j<3;j++)encStep(1/60);
   w.camera.updateMatrixWorld(true);const v=f.center(new T.Vector3()).project(w.camera),pV=p.center(new T.Vector3()).project(w.camera);
   encRender();return {i,target:v.toArray(),player:pV.toArray(),gap:p.pos.distanceTo(f.pos),lock:g.hardLock===f,hp:f.hp};
  },i);rows.push(row);
  if(i%20===0)await page.screenshot({path:`${out}/before-${i}.png`});
 }
 await writeFile(`${out}/before.json`,JSON.stringify(rows,null,2));console.log(rows.filter((_,i)=>i%20===0));
}finally{await browser.close();}
