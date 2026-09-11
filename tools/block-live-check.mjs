import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch(),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5180/powerworld.html');await page.waitForFunction(()=>window.LSW?.game);await page.locator('#pwGo').click();
 const result=await page.evaluate(()=>{
  const {game:g,THREE:T}=LSW;g.update=()=>{};const rows=[],failures=[];
  const original=g.onHit;
  for(const hz of [30,60,120])for(const kind of ['light','projectile','heavy','rear','fatal-chip','second-wind']) {
   g.startMode('powerworld',{p1:'sol',p2:'sol'});const a=g.player,b=g.entities.find(e=>e!==a&&!e.isDummy),hits=[];
   for(const f of [a,b]){f.pos.set(0,80,f===a?0:kind==='projectile'?100:kind==='rear'?-4.8:4.8);f.vel.set(0,0,0);f.flying=true;f.gait='airborne';f.invuln=0;f.hp=f.maxHp=10000;}
   a.faceDir(0,1);b.faceDir(0,-1);a._animate(1);b._animate(1);g.hardLock=null;
   // Fix a forward mouse ray, not a target lock that would turn toward a rear hit.
   g.input.keys.clear();g.input.endFrame();a.ki=0;g.world._lookYaw=0;g.world._lookPitch=0;
   g.onHit=function(f,n,o,blocked){if(f===a&&!o.dot&&!o.bleed)hits.push({amount:n,blocked:!!blocked,move:o.meleeMove});return original.call(this,f,n,o,blocked);};
   dispatchEvent(new KeyboardEvent('keydown',{code:'KeyC',bubbles:true}));
   for(let i=1;i<=hz*2.5;i++) {
    const t=i/hz;g.time+=1/hz;
    g.controlPlayer(1/hz);a.faceDir(0,1);
    b.center(a.aimWorld);a.center(b.aimWorld);b.hasAimWorld=true;b.faceDir(a.pos.x-b.pos.x,a.pos.z-b.pos.z);b.aim3.copy(b.aimWorld).sub(b.center(new T.Vector3())).normalize();
    if(i===hz) {
     if(kind==='fatal-chip'||kind==='second-wind'){a.hp=.1;a._secondWindUsed=kind==='fatal-chip';}
     if(kind==='projectile'){const pos=b.muzzle(new T.Vector3());g.projectiles.spawnProjectile(b,{pos,vel:a.center(new T.Vector3()).sub(pos).normalize().multiplyScalar(100),damage:20,blast:0,radius:.7,color:'#ffd24a',life:4});}
     else if(kind==='heavy')g.melee.chargeStart(b);
     else g.melee.strike(b);
    }
    if(kind==='heavy'&&i===Math.round(hz*1.7))g.melee.chargeRelease(b);
    a.update(1/hz,g);b.move(new T.Vector3(),1/hz);b.update(1/hz,g);g.projectiles.update(1/hz,g);g.input.endFrame();
   }
   const raised=a.guarding,charging=a.chargingKi;
   dispatchEvent(new KeyboardEvent('keyup',{code:'KeyC',bubbles:true}));g.controlPlayer(1/hz);g.input.endFrame();
   if(!hits.length)failures.push(`${kind}@${hz}: no actual contact`);
   if(['light','projectile'].includes(kind)&&!hits.some(h=>h.blocked))failures.push(`${kind}@${hz}: failed held block`);
   if(kind==='heavy'&&!hits.some(h=>h.move==='crush'))failures.push(`${kind}@${hz}: heavy failed to crush`);
   if(kind==='rear'&&hits.some(h=>h.blocked))failures.push(`${kind}@${hz}: ordinary guard blocked from behind`);
   if(kind==='fatal-chip'&&(a.alive||!a.ragdoll||a.lastHitBy!==b))failures.push(`${kind}@${hz}: missing real KO/credit`);
   if(kind==='second-wind'&&(!a.alive||a.downedT<=0||!a._secondWindUsed))failures.push(`${kind}@${hz}: lost player Second Wind`);
   if(charging||a.guarding)failures.push(`${kind}@${hz}: guard/charge state leak`);
   rows.push({hz,kind,hits,raised,charging,released:!a.guarding,alive:a.alive,downed:a.downedT>0});
  }
  g.onHit=original;return {rows,failures};
 });
 await mkdir('artifacts/blocking',{recursive:true});await writeFile('artifacts/blocking/live-results.json',JSON.stringify({...result,errors},null,2));
 console.log(JSON.stringify({...result,errors},null,2));assert.deepEqual(result.failures,[]);assert.deepEqual(errors,[]);
}finally{await browser.close();}
