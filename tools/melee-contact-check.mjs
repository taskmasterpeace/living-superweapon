// Catches cone damage without visible fist contact. Real Fighter.update; no mocked damage.
import {chromium} from 'playwright';
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const result=await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW;g.update=()=>{};const rows=[],failures=[];
  for(const hz of [30,60,120])for(const spec of [
   {name:'jab',gap:5,dy:0},{name:'cross',gap:5,dy:0},
   {name:'power',gap:5,dy:0},{name:'guard',gap:5,dy:0},{name:'crush',gap:5,dy:0},
   {name:'left',gap:5,dy:0},{name:'interrupt',gap:5,dy:0},{name:'freeze',gap:10,dy:0},
   {name:'far',gap:10,dy:0},{name:'below',gap:5,dy:-8},
   {name:'above',gap:5,dy:8},{name:'falling',gap:7,dy:-4,fall:true},
  ]) {
   g.startMode('powerworld',{p1:'sol',p2:spec.fall?'sarge':'kano'});
   const a=g.player,b=g.entities.find(e=>e!==a&&!e.isDummy);
   a.pos.set(0,140,0);b.pos.set(0,140+spec.dy,spec.gap);
   for(const f of [a,b]){f.vel.set(0,0,0);f.flying=true;f.gait='airborne';f.invuln=0;f.hp=f.maxHp=1000;}
   if(spec.fall){b.flying=false;b.gait='fall';b.vel.y=-12;}
   a.faceDir(0,1);b.faceDir(0,-1);a.aim3.copy(b.center(new T.Vector3())).sub(a.center(new T.Vector3())).normalize();
   a.hasAimWorld=true;b.center(a.aimWorld);a._animate(1);b._animate(1);
   b.guarding=spec.name==='guard'||spec.name==='crush';
   if(spec.name==='cross'){a.comboWin=.4;a.strikeIdx=1;}
   if(spec.name==='left'){a.comboWin=.4;a.strikeIdx=0;}
   if(['power','crush'].includes(spec.name))g.melee._beginHeavy(a,'power',1,true);else g.melee.strike(a);
   if(spec.name==='interrupt')a.stunT=.5;
   const arm=['cross','power','crush'].includes(spec.name)?a.parts.armR:(a.strikeIdx%2?a.parts.armL:a.parts.armR);
   let previous=arm.children[2].getWorldPosition(new T.Vector3()),maxGap=0,hits=0;
   for(let i=0;i<hz*1.5;i++) {
    if(spec.name==='freeze'&&a.mstate==='active'&&!a._freezeTest){a._freezeTest=true;a.frozenT=.2;}
    const hp=b.hp;a.move(new T.Vector3(),1/hz);a.update(1/hz,g);
    if(spec.name==='freeze'&&a.frozenT>0&&a.mstate)failures.push(`freeze@${hz}: active swing survived freeze`);
    a.obj.updateMatrixWorld(true);b.obj.updateMatrixWorld(true);
    const current=arm.children[2].getWorldPosition(new T.Vector3());
    if(b.hp<hp) {
     hits++;let distance=Infinity;
     // Independently sample the actual swept fist against world-space rendered bounds.
     for(const part of [b.parts.torso,b.parts.head,b.parts.pelvis]){
      part.geometry.computeBoundingBox();const box=part.geometry.boundingBox.clone().applyMatrix4(part.matrixWorld);
      for(let n=0;n<=100;n++)distance=Math.min(distance,box.distanceToPoint(previous.clone().lerp(current,n/100)));
     }
     maxGap=Math.max(maxGap,distance);
    }
    previous.copy(current);b.update(1/hz,g);g.resolveBodies();
   }
   rows.push({hz,name:spec.name,hits,damage:1000-b.hp,maxGap});
   if(maxGap>.85)failures.push(`${spec.name}@${hz}: damaged with ${maxGap.toFixed(2)}u visible gap`);
   if(['jab','cross','power','guard','crush','left'].includes(spec.name)&&hits!==1)failures.push(`${spec.name}@${hz}: expected one physical connect, got ${hits}`);
   if(spec.name==='guard'&&1000-b.hp>2)failures.push(`guard@${hz}: frontal jab did not block`);
   if(spec.name==='crush'&&(b.guarding||1000-b.hp<5))failures.push(`crush@${hz}: power did not break guard`);
   if(spec.name==='interrupt'&&hits)failures.push(`interrupt@${hz}: interrupted startup still hit`);
   if(a.mstate||a._meleeMotion)failures.push(`${spec.name}@${hz}: committed motion did not release`);
   if(spec.name==='far'&&hits)failures.push(`far@${hz}: hit beyond limb and step-in reach`);
  }
  // Run the public keyboard-to-controller path as well as isolated pose/contact fixtures.
  g.startMode('powerworld',{p1:'sol',p2:'kano'});
  const a=g.player,b=g.entities.find(e=>e!==a&&!e.isDummy);
  for(const f of [a,b]){f.pos.set(0,140,f===a?0:5);f.vel.set(0,0,0);f.flying=true;f.gait='airborne';f.invuln=0;f.hp=f.maxHp=1000;}
  a.faceDir(0,1);b.faceDir(0,-1);g.hardLock=b;a._animate(.2);b._animate(.2);
  const step=()=>{g.controlPlayer(1/120);a.update(1/120,g);b.update(1/120,g);g.resolveBodies();g.input.endFrame();};
  step();dispatchEvent(new KeyboardEvent('keydown',{code:'KeyV',bubbles:true}));
  for(let i=0;i<4;i++)step();dispatchEvent(new KeyboardEvent('keyup',{code:'KeyV',bubbles:true}));
  for(let i=0;i<180;i++)step();
  const keyboardDamage=1000-b.hp;
  if(keyboardDamage<=0||keyboardDamage>20)failures.push(`Keyboard tap V did not produce one locked jab (${keyboardDamage})`);
  return {rows,keyboardDamage,failures};
 });console.log(JSON.stringify({...result,errors},null,2));if(result.failures.length||errors.length)process.exitCode=1;
} finally {await browser.close();}
