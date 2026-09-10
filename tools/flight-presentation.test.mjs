// Production flight, rig and camera regressions. Start Vite on 5180 before running.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { Vector3 } from 'three';
import { mkdir } from 'node:fs/promises';
import { steerFlight } from '../src/engine/flight-motion.js';

test('per-hero acceleration, boost acceleration and braking change real velocity response', () => {
  const fighter = motion => ({ def:{model:{motion}}, vel:new Vector3(), flyHeld:false, descendHeld:false });
  const slow = fighter({acceleration:2, boostAcceleration:3, braking:2});
  const fast = fighter({acceleration:16, boostAcceleration:20, braking:18});
  steerFlight(slow,{z:1},60,.1); steerFlight(fast,{z:1},60,.1);
  assert.ok(fast.vel.z > slow.vel.z * 2, `acceleration ignored: ${slow.vel.z}, ${fast.vel.z}`);
  slow.vel.set(0,0,0); fast.vel.set(0,0,0); slow.cruiseHeld=fast.cruiseHeld=true;
  steerFlight(slow,{z:1},120,.1); steerFlight(fast,{z:1},120,.1);
  assert.ok(fast.vel.z > slow.vel.z * 2, 'boost acceleration ignored');
  slow.vel.set(0,0,60); fast.vel.set(0,0,60);
  steerFlight(slow,{},60,.1); steerFlight(fast,{},60,.1);
  assert.ok(fast.vel.z < slow.vel.z / 2, 'braking ignored');
});

let browser, page;
before(async () => {
  browser=await chromium.launch({headless:true});
  page=await browser.newPage({viewport:{width:1440,height:900}});
  // Diagnostic comparison only: use the pre-sweep integration in this isolated
  // browser response, without changing the live checkout or serving runtime.
  if(process.argv.includes('--endpoint-baseline'))await page.route('**/src/engine/entity.js*',async route=>{
    const response=await route.fetch(),source=await response.text();
    await route.fulfill({response,body:source.replace('sweepFighterEnvironment(this,game,dt);',
      'this.pos.x+=this.vel.x*dt;this.pos.y+=this.vel.y*dt;this.pos.z+=this.vel.z*dt;')});
  });
  await page.goto('http://127.0.0.1:5180/powerworld.html');
  await page.waitForFunction(()=>window.LSW?.game);
  await page.locator('#pwGo').click();
  await page.evaluate(()=>{
    const g=LSW.game;g.update=()=>{};g.startMode('powerworld',{p1:'sol',p2:'kano',twoPlayer:false});
    const f=g.player;f.pos.set(0,160,0);f.flying=true;f.gait='airborne';f.faceDir(0,1);
    f.flyHeld=false;f.descendHeld=false;f._flightBrake=0;f._flyPose=1;
  });
});
after(async()=>{
  try {
    if (page && process.argv.includes('--capture')) {
      await mkdir('artifacts/studio-flight',{recursive:true});
      await page.addStyleTag({content:'body > :not(canvas) { visibility:hidden !important; }'});
      for(const state of ['hover','forward','backward','brake','boost']) {
        for(const view of ['front','left','right','rear','game']) {
          await page.evaluate(({state,view})=>{
            const {game:g}=LSW,f=g.player,w=g.world;
            f.def={...f.def,model:{}};f.pos.set(0,160,0);f.faceDir(0,1);f._flyPose=1;
            f.cruiseHeld=state==='boost';f._flightBrake=state==='brake'?1:0;
            f.vel.set(0,0,state==='hover'?0:state==='backward'?-65:state==='boost'?110:65);
            for(let i=0;i<180;i++){f.animT+=1/120;f._animate(1/120);}
            w._lookActive=true;w._lookYaw=0;w._lookPitch=0;w._shake=0;w.snapChase();
            for(let i=0;i<180;i++)w.chase(f,null,1/120);
            if(view!=='game') {
              const [x,z]=view==='front'?[0,26]:view==='rear'?[0,-26]:view==='left'?[-26,0]:[26,0];
              w.camera.position.set(x,167,z);w.camera.lookAt(0,165,0);
            }
            w.render();
          },{state,view});
          await page.screenshot({path:`artifacts/studio-flight/${state}-${view}.png`});
        }
      }
      // Procedural motion evidence at start/quarter/half/three-quarter/end, not imported clips.
      await page.evaluate(()=>{const f=LSW.game.player;f.vel.set(0,0,0);f.cruiseHeld=false;for(let i=0;i<180;i++)f._animate(1/120);});
      for(const phase of ['forward','backward','brake','hover']) {
        for(let quarter=0;quarter<=4;quarter++) {
          await page.evaluate(({phase,quarter})=>{
            const {game:g}=LSW,f=g.player,w=g.world;
            f.vel.set(0,0,phase==='backward'?-65:phase==='hover'?0:65);
            f._flightBrake=phase==='brake'?1:0;
            for(let i=0;i<(quarter===0?1:30);i++){f.animT+=1/120;f._animate(1/120);}
            w.camera.position.set(23,167,23);w.camera.lookAt(0,165,0);w.render();
          },{phase,quarter});
          await page.screenshot({path:`artifacts/studio-flight/transition-${phase}-${quarter}.png`});
        }
      }
    }
  } finally {await browser?.close();}
});

test('backward and backward descending flight keep the real body upright and guarded', async()=>{
  const samples=await page.evaluate(()=>{
    const f=LSW.game.player,T=LSW.THREE,out=[];
    for(const vy of [0,-50]) {
      f.vel.set(0,vy,-65);
      for(let i=0;i<180;i++){f.animT+=1/120;f._animate(1/120);}
      f.obj.updateMatrixWorld(true);
      const up=f.parts.head.getWorldPosition(new T.Vector3()).sub(f.parts.pelvis.getWorldPosition(new T.Vector3())).normalize();
      const left=new T.Box3().setFromObject(f.parts.legL.userData.boot),right=new T.Box3().setFromObject(f.parts.legR.userData.boot);
      out.push({vy,up:up.toArray(),elbow:-f.parts.armR.children[1].rotation.x,bootGap:right.min.x-left.max.x});
    }
    return out;
  });
  for(const s of samples){assert.ok(s.up[1]>.8,JSON.stringify(s));assert.ok(s.elbow>.5,JSON.stringify(s));assert.ok(s.bootGap>.1,JSON.stringify(s));}
});

test('per-state pose overrides reach production joints and blend across transitions',async()=>{
  const measured=await page.evaluate(()=>{
    const f=LSW.game.player;f.def={...f.def,model:{...f.def.model,poses:{hover:{armLx:-1.1,kneeL:1.2,headPitch:.3},backward:{armLx:-.2,kneeL:.4}}}};
    f.vel.set(0,0,0);f._flightBrake=0;
    for(let i=0;i<180;i++)f._animate(1/120);
    const hover={arm:f.parts.armL.rotation.x,knee:f.parts.legL.userData.knee.rotation.x,head:f.parts.head.rotation.x};
    f.vel.set(0,0,-65);f._animate(1/120);const first=f.parts.armL.rotation.x;
    for(let i=0;i<180;i++)f._animate(1/120);
    return {hover,first,last:f.parts.armL.rotation.x};
  });
  assert.ok(Math.abs(measured.hover.arm+1.1)<.04,JSON.stringify(measured));
  assert.ok(Math.abs(measured.hover.knee-1.2)<.04,JSON.stringify(measured));
  assert.ok(Math.abs(measured.hover.head-.3)<.04,JSON.stringify(measured));
  assert.ok(measured.first> -1.1 && measured.first<-.8,JSON.stringify(measured));
  assert.ok(Math.abs(measured.last+.2)<.04,JSON.stringify(measured));
});

test('level forward boost keeps the chest raised enough for a readable rear silhouette',async()=>{
  const axis=await page.evaluate(()=>{
    const f=LSW.game.player,T=LSW.THREE;f.def={...f.def,model:{}};
    f.vel.set(0,0,110);f.cruiseHeld=true;f._flightBrake=0;
    for(let i=0;i<180;i++)f._animate(1/120);
    f.obj.updateMatrixWorld(true);
    return f.parts.head.getWorldPosition(new T.Vector3()).sub(f.parts.pelvis.getWorldPosition(new T.Vector3())).normalize().toArray();
  });
  assert.ok(axis[1]>.2 && axis[2]>.8,JSON.stringify(axis));
});

test('free camera centers the body and applies per-hero lens, range, height and shoulder',async()=>{
  const measured=await page.evaluate(()=>{
    const {game:g,THREE:T}=LSW,f=g.player,w=g.world;
    f.def={...f.def,model:{...f.def.model,camera:{fov:62,range:26,height:4,shoulder:0,boostFov:4,boostRange:1}}};
    f.vel.set(0,0,0);w._lookActive=true;w._lookYaw=0;w._lookPitch=0;w._shake=0;
    w.snapChase();for(let i=0;i<180;i++)w.chase(f,null,1/120);
    const centered={x:w.camera.position.x-f.pos.x,y:w.camera.position.y-f.pos.y,z:w.camera.position.z-f.pos.z,fov:w.camera.fov};
    f.def.model.camera.shoulder=5;w.snapChase();w.chase(f,null,1/120);
    const shoulder=w.camera.position.x-f.pos.x;
    w._lookPitch=Math.PI/3;w.snapChase();w.chase(f,null,1/120);
    return {centered,shoulder,pitch:Math.asin(w.camera.getWorldDirection(new T.Vector3()).y)};
  });
  assert.ok(Math.abs(measured.centered.x)<.01,JSON.stringify(measured));
  assert.ok(Math.abs(measured.centered.z+26)<.02,JSON.stringify(measured));
  assert.ok(Math.abs(measured.centered.y-9.4)<.02,JSON.stringify(measured));
  assert.ok(Math.abs(measured.centered.fov-62)<.04,JSON.stringify(measured));
  assert.ok(Math.abs(measured.shoulder)>4.9,JSON.stringify(measured));
  assert.ok(Math.abs(measured.pitch-Math.PI/3)<.01,JSON.stringify(measured));
});

test('boost lens and range increments apply, while collision still stops the free camera before cover',async()=>{
  const measured=await page.evaluate(async()=>{
    const {PW_AIR}=await import('/src/core/util.js');
    const {game:g}=LSW,f=g.player,w=g.world;
    f.def={...f.def,model:{...f.def.model,camera:{fov:60,range:25,height:3,shoulder:0,boostFov:8,boostRange:4}}};
    // The full authored increment is reached at the production top speed, not an obsolete 150 u/s.
    f.vel.set(0,0,PW_AIR.top);w._lookPitch=0;w._lookYaw=0;w._shake=0;w.snapChase();
    for(let i=0;i<300;i++)w.chase(f,null,1/120);
    const boosted={fov:w.camera.fov,range:w._chaseDist};
    const before=w.camera.position.z;
    const wall={x:0,z:-15,hx:30,hz:2,top:220};w.cover.push(wall);
    try {
      f.vel.set(0,0,0);w.snapChase();w.chase(f,null,1/120);
      return {boosted,before,clipped:w.camera.position.z};
    } finally {w.cover.splice(w.cover.indexOf(wall),1);}
  });
  assert.ok(Math.abs(measured.boosted.fov-68)<.03,JSON.stringify(measured));
  assert.ok(Math.abs(measured.boosted.range-29)<.03,JSON.stringify(measured));
  assert.ok(measured.before< -17 && measured.clipped> -13 && measured.clipped< -5,JSON.stringify(measured));
});

test('city clumsy/levitator tiers retain their movement rules outside PowerWorld',async()=>{
  const measured=await page.evaluate(async()=>{
    const {Fighter}=await import('/src/engine/entity.js');
    const g=LSW.game,def=LSW.ROSTER.find(d=>d.id==='sol'),out=[];
    for(const tier of [1,2]) {
      const sample=[];
      for(const acceleration of [1,30]) {
        const f=new Fighter({...def,flightTier:tier,model:{motion:{acceleration,braking:acceleration}}});
        f._openSky=false;f.flying=true;f.pos.set(0,12,0);f._game=g;f.launchT=0;f.animT=0;
        for(let i=0;i<15;i++){f.move({x:0,y:0,z:1},1/60);f._physics(1/60,g);f.animT+=1/60;}
        sample.push(f.vel.toArray());f.dispose();
      }
      out.push({tier,sample});
    }
    return out;
  });
  for(const row of measured)assert.deepEqual(row.sample[0],row.sample[1],JSON.stringify(row));
  assert.ok(measured[0].sample[0][1]<-2,JSON.stringify(measured));
});

test('landing removes the flight-only leg spread',async()=>{
  const rolls=await page.evaluate(()=>{
    const f=LSW.game.player;f.vel.set(0,0,0);f.flying=true;f.gait='airborne';f._flightBrake=0;
    for(let i=0;i<180;i++)f._animate(1/120);
    f.flying=false;f.gait='grounded';
    for(let i=0;i<360;i++)f._animate(1/120);
    const rolls=[f.parts.legL.rotation.z,f.parts.legR.rotation.z];f.flying=true;f.gait='airborne';
    return rolls;
  });
  assert.ok(rolls.every(r=>Math.abs(r)<.005),JSON.stringify(rolls));
});
