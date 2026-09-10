// Eight seconds of production camera + input + beam simulation at a fixed
// 24fps render clock. The sparring partner's path is scripted, not AI play.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/flight-review/vertical-combat';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(()=>{
  const g=LSW.game,w=g.world;window.reelUpdate=g.update.bind(g);g.update=()=>{};
  window.reelRender=w.render.bind(w);w.render=()=>{};g.controlBot=()=>{};
  window.reelEnd=g.input.endFrame.bind(g.input);g.input.endFrame=()=>{};
  window.reelKey=(code,down)=>dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true}));
  const label=document.createElement('div');label.id='vertical-reel-label';label.style.cssText='position:fixed;top:88px;left:24px;background:#201c16dd;color:#fff3d6;padding:10px 14px;font:600 15px system-ui;pointer-events:none';document.body.append(label);
  window.reelStart=stage=>{
   reelKey('KeyD',false);g.input.mouse.left=false;
   g.startMode('powerworld',{p1:'sol',p2:'kano'});g.fov=false;w.setFogEnabled(false);
   const a=g.player,b=g.entities.find(e=>e!==a&&!e.isDummy);window.reelFoe=b;
   for(const f of g.entities){f.ai=null;if(f!==a&&f!==b)f.obj.visible=false;}
   a.pos.set(0,210,0);a.vel.set(0,0,0);a.faceDir(0,1);a.ki=a.maxKi;
   for(const f of [a,b]){f.flying=true;f.gait='airborne';f.invuln=0;f.animT=0;}
   b.hp=b.maxHp=5000;b.faceDir(0,-1);g.hardLock=b;
   const pitch=(stage===0?-70:stage===1?70:-45)*Math.PI/180,gap=stage<2?14:20;
   b.pos.set(0,210+Math.sin(pitch)*gap,Math.cos(pitch)*gap);b.vel.set(0,0,0);
   w.clearFrameClaims();w._shake=0;w.snapChase();
   for(let i=0;i<120;i++){a._animate(1/120);b._animate(1/120);w.chase(a,b,1/120);}
   b.center(g._aim3pt);g.hud.update();reelEnd();
   document.querySelector('#vertical-reel-label').textContent=['TRACK BELOW · fire through the vertical crossing','TRACK ABOVE · opponent stays on the attack line','STRAFE + FIRE · travel and orbit handled separately'][stage];
  };
  window.reelFrame=(stage,frame)=>{
   const a=g.player,b=reelFoe;
   if(frame===4){g.input.mouse.left=true;g.input.mouse.leftEdge=true;}
   if(frame===57){g.input.mouse.left=false;g.input.mouse.leftUp=true;}
   if(stage===2&&frame===4)reelKey('KeyD',true);
   if(stage===2&&frame===57)reelKey('KeyD',false);
   for(let step=0;step<5;step++){
    const pitch=(stage<2?(stage===0?-1:1)*(70+40*(frame+step/5)/64):-45)*Math.PI/180,gap=stage<2?14:20;
    b.pos.set(a.pos.x,a.pos.y+Math.sin(pitch)*gap,a.pos.z+Math.cos(pitch)*gap);b.vel.set(0,0,0);
    reelUpdate(1/120);reelEnd();
   }
   reelRender();
   return {damage:5000-b.hp,player:a.pos.toArray(),target:b.pos.toArray()};
  };
 });
 for(let stage=0;stage<3;stage++){
  await page.evaluate(stage=>reelStart(stage),stage);let last;
  for(let frame=0;frame<64;frame++){
   last=await page.evaluate(([stage,frame])=>reelFrame(stage,frame),[stage,frame]);
   await page.screenshot({path:`${out}/frame-${String(stage*64+frame).padStart(4,'0')}.png`});
  }
  rows.push({stage,...last});console.log(`Captured stage ${stage+1}/3: ${last.damage.toFixed(1)} real beam damage`);
 }
 const failures=rows.filter(r=>r.damage<=0).map(r=>`stage ${r.stage}: beam never damaged opponent`);
 const result={fps:24,frames:192,seconds:8,audio:false,scriptedPartner:true,rows,failures,errors};
 await writeFile(`${out}/reel.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
