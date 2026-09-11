// Regression: a readable target is insufficient when the HUD masks your own flight/combat pose.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/flight-review/safe-area';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 await page.evaluate(()=>{LSW.game.update=()=>{};});
 const rows=[];
 for(const [width,height] of [[1280,720],[1024,768],[900,600],[800,600],[1920,1080]]){
  await page.setViewportSize({width,height});
  for(const hero of ['sol','kano','sarge']){
   const row=await page.evaluate(({hero,width,height})=>{
    const {game:g,THREE:T}=LSW;g.startMode('powerworld',{p1:hero,p2:'vega'});const p=g.player,w=g.world;
    p.pos.set(0,140,0);p.vel.set(0,0,0);p.flying=true;p.gait='airborne';p._flyPose=1;p.faceDir(0,1);
    w._lookActive=true;w._lookYaw=0;w._lookPitch=0;w._shake=0;w.snapChase();g.hardLock=null;
    for(let i=0;i<120;i++){p._animate(1/120);w.chase(p,null,1/120);}
    g.hud.setPlayer(p.def);g.hud.update();w.render();p.obj.updateMatrixWorld(true);w.camera.updateMatrixWorld(true);
    const points=[];
    for(const mesh of [p.parts.head,p.parts.torso,p.parts.armL.children[2],p.parts.armR.children[2],p.parts.legL.userData.boot,p.parts.legR.userData.boot]){
     mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox;
     for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){
      const v=new T.Vector3(x,y,z).applyMatrix4(mesh.matrixWorld).project(w.camera);points.push({x:(v.x+1)*width/2,y:(1-v.y)*height/2});
     }
    }
    const body={left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
    const readouts=['#hSlots','#hHands','#hCharge'];
    // Real charge state drives the real HUD meter, not a forced CSS display.
    const charge=Object.values(p.slots).find(s=>s.def.type==='beam'||s.def.type==='charge');
    if(charge){charge.charging=true;charge.chargeT=.5;g.hud.update();}
    const panels=readouts.map(selector=>{const el=document.querySelector(selector),r=el.getBoundingClientRect();return {selector,visible:!!r.width&&!!r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom};});
    const overlaps=panels.filter(r=>r.visible&&r.left<body.right&&r.right>body.left&&r.top<body.bottom&&r.bottom>body.top).map(r=>r.selector);
    const slots=[...document.querySelectorAll('#hSlots .slot')].map(el=>{
     const r=el.getBoundingClientRect(),key=el.querySelector('.key').getBoundingClientRect(),cost=el.querySelector('.cost').getBoundingClientRect(),name=el.querySelector('.an');
     const nr=name.getBoundingClientRect();
     return {width:r.width,height:r.height,left:r.left,right:r.right,bottom:r.bottom,keyCostOverlap:cost.width>0&&key.right>cost.left&&key.bottom>cost.top,nameClipped:nr.top<key.bottom+2||nr.bottom>r.bottom-4||name.scrollWidth>name.clientWidth+1};
    });
    const fill=document.querySelector('#hCharge > i').getBoundingClientRect();
    return {hero,width,height,body,panels,overlaps,slots,charge:!!charge,fill:{width:fill.width,height:fill.height}};
   },{hero,width,height});rows.push(row);
   if(hero==='kano')await page.screenshot({path:`${out}/${process.argv.includes('--before')?'before':'after'}-${width}.png`});
  }
 }
 const failures=[];
 for(const r of rows){
  if(r.body.bottom>r.height*.94)failures.push(`${r.hero}/${r.width}: boots crowd/cross bottom edge (${(r.body.bottom/r.height).toFixed(3)})`);
  if(r.body.top<r.height*.54)failures.push(`${r.hero}/${r.width}: body enters central aiming region`);
  if(r.overlaps.length)failures.push(`${r.hero}/${r.width}: body hidden by ${r.overlaps.join(', ')}`);
  if(r.charge&&(r.fill.width<1||r.fill.height<1))failures.push(`${r.hero}/${r.width}: charging meter has no visible fill`);
  if(r.slots.length!==7||r.slots.some(s=>s.width<44||s.height<44||s.left<0||s.right>r.width||s.bottom>r.height))failures.push(`${r.hero}/${r.width}: power readouts missing, too small or offscreen`);
  if(r.slots.some(s=>s.keyCostOverlap||s.nameClipped))failures.push(`${r.hero}/${r.width}: power text overlaps or clips`);
 }
 const help=[];
 for(const [width,height] of [[1280,720],[900,600],[800,600]]){
  await page.setViewportSize({width,height});
  help.push(await page.evaluate(()=>{
   const {game:g,hud:h}=LSW,p=g.player;
   const rifle=Object.values(p.slots).find(s=>s.def.type==='rifle');
   if(rifle&&!p._gearHeld){g.spawnGearDrop(rifle.def,p.pos.x,p.pos.z);g.pickupGear(p);}
   const charge=Object.values(p.slots).find(s=>s.def.type==='charge'||s.def.type==='beam');
   if(charge){charge.charging=true;charge.chargeT=.5;}
   h.update();h.buildHintBody();h.setHintVisible(true);h.hintFull(true);
   const hint=h.el.hint.getBoundingClientRect(),slots=h.el.slots.getBoundingClientRect();
   h.el.hint.scrollTop=h.el.hint.scrollHeight;
   const scrollEnd=Math.abs(h.el.hint.scrollHeight-h.el.hint.clientHeight-h.el.hint.scrollTop)<2;
   const hands=h.el.hands.getBoundingClientRect();
   return {height:innerHeight,top:hint.top,bottom:hint.bottom,slotsTop:slots.top,slotsBottom:slots.bottom,handsVisible:hands.height>0,scrollEnd,overlap:hint.bottom>slots.top&&hint.right>slots.left&&hint.left<slots.right};
  }));
  await page.screenshot({path:`${out}/help-${width}.png`});
 }
 if(help.some(h=>h.overlap||h.top<0||h.bottom>h.height||h.slotsBottom>h.height||!h.scrollEnd))failures.push('Expanded controls help overlaps powers, leaves the viewport, or cannot scroll to the end');
 // Real F1 must expose help even with onboarding disabled, and release the captured
 // mouse so scrolling cannot silently change the selected combat power instead.
 await page.evaluate(()=>{LSW.hud.setHintVisible(false);LSW.hud.hintFull(false);LSW.game.input.pointerLock=true;});
 await page.locator('canvas').first().click({position:{x:400,y:100}});
 await page.waitForFunction(()=>!!document.pointerLockElement);
 await page.keyboard.press('F1');
 await page.waitForTimeout(100);
 const helpInput=await page.evaluate(()=>({unlocked:!document.pointerLockElement,focused:document.activeElement===LSW.hud.el.hint,visible:LSW.hud.el.hint.getBoundingClientRect().height>0}));
 await page.keyboard.press('PageDown');
 await page.waitForFunction(()=>LSW.hud.el.hint.scrollTop>0,{},{timeout:2000});
 helpInput.scrolled=await page.evaluate(()=>LSW.hud.el.hint.scrollTop>0);
 await page.keyboard.press('F1');
 helpInput.closed=await page.evaluate(()=>LSW.hud.el.hint.classList.contains('mini')&&document.activeElement!==LSW.hud.el.hint);
 if(!helpInput.unlocked||!helpInput.focused||!helpInput.visible||!helpInput.scrolled||!helpInput.closed)failures.push('F1 help cannot be opened, scrolled and closed from captured gameplay');
 console.log('Help input',helpInput);
 console.log(JSON.stringify({rows,help,failures,errors},null,2));await writeFile(`${out}/checks.json`,JSON.stringify({rows,help,failures,errors},null,2));if(failures.length||errors.length)process.exitCode=1;
}finally{await browser.close();}
