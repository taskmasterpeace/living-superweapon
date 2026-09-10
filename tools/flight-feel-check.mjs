// Real-engine regression checks. Run with Vite on 5180; --capture also writes review frames.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const out = new URL('../artifacts/flight-review/', import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto('http://127.0.0.1:5180/powerworld.html');
  await page.waitForFunction(() => window.LSW?.game);
  await page.locator('#pwGo').click();
  await page.evaluate(() => {
    const g = LSW.game;
    g.startMode('powerworld', { p1: 'sol', p2: 'kano', twoPlayer: false });
    g._reviewUpdate = g.update.bind(g); g.update = () => {};
    g.controlBot = () => {};
    for (const f of g.entities) if (f !== g.player) { f.pos.set(250, 60, 250); f.ai = null; }
  });
  const results = await page.evaluate(async () => {
    const {game:g, THREE:T} = LSW, f = g.player, w = g.world;
    const checks = []; const check = (name, pass, measured) => checks.push({name, pass, measured});
    const settle = (dir, seconds) => {
      for (let i=0;i<Math.round(seconds*120);i++) {
        f.moveDir=dir; f.move(dir, 1/120); f._physics(1/120,g); f.animT+=1/120; f._animate(1/120);
      }
    };
    const reset = () => { f.pos.set(0,140,0); f.vel.set(0,0,0); f.flying=true; f.gait='airborne'; f.flyHeld=false; f.descendHeld=false; f.launchT=0; f._flightBrake=0; f.groundY=0; f.faceDir(0,1); f.aim3.set(0,0,1); };
    reset(); settle({x:0,y:0,z:1}, .4); const v04=f.vel.z;
    settle({x:0,y:0,z:1},2); const vmax=f.vel.z;
    check('flight responds within 400ms (at least 85% of steady speed)',v04/vmax>.85,{v04,vmax,ratio:v04/vmax});
    const start=f.pos.clone(); settle({x:0,y:0,z:0},.65);
    check('release settles into deliberate hover within 650ms',f.vel.length()<3,{speed:f.vel.length(),coast:f.pos.distanceTo(start)});
    reset(); settle({x:0,y:0,z:1},1); f.vel.set(50,0,0); f.faceDir(0,1);
    for(let i=0;i<120;i++)f._animate(1/120);
    const head=f.parts.head.getWorldPosition(new T.Vector3()), hip=f.parts.pelvis.getWorldPosition(new T.Vector3());
    const axis=head.sub(hip).normalize();
    check('lateral flight banks toward travel while retaining an upright combat stance',axis.x>.12&&axis.x<.45&&axis.y>.8&&Math.abs(axis.z)<.2,{axis:axis.toArray()});
    reset(); for(let i=0;i<120;i++)f._animate(1/120);
    const arm=f.parts.armL, upper=arm.children[0],fore=arm.children[1];
    const bend=upper.quaternion.angleTo(fore.quaternion);
    const {poseDefaultsForStyle}=await import('/src/data/flight-tuning.js');
    const expected=f.def.model?.poses?.hover?.elbowL??poseDefaultsForStyle(f.parts.rig.flightStyle).hover.elbowL;
    const {upperLength:u,foreLength:v}=arm.userData;
    const expectedHand=new T.Vector3(0,-u-Math.cos(bend)*v,Math.sin(bend)*v);
    const wristError=arm.children[2].position.distanceTo(expectedHand);
    check('hover follows its authored elbow bend and articulated hand socket',expected>.05&&Math.abs(bend-expected)<.001&&wristError<1e-6,{bend,expected,wristError});
    f.obj.updateMatrixWorld(true);
    const hand=f.parts.armR.children[2].getWorldPosition(new T.Vector3());
    check('projectile origin follows the articulated hand',f.muzzle(new T.Vector3()).distanceTo(hand)<.25,{distance:f.muzzle(new T.Vector3()).distanceTo(hand)});
    const eyes=f.parts.eyeR.getWorldPosition(new T.Vector3()).add(f.parts.eyeL.getWorldPosition(new T.Vector3())).multiplyScalar(.5);
    check('optic beam origin follows the eyes',f.muzzle(new T.Vector3(),1.1,8.3).distanceTo(eyes)<.25,{distance:f.muzzle(new T.Vector3(),1.1,8.3).distanceTo(eyes)});
    const hp=f.parts.head.getWorldPosition(new T.Vector3());
    check('frame height is retained by animation',hp.y-f.pos.y>8.6,{headHeight:hp.y-f.pos.y});
    w._lookActive=true; w._lookYaw=0; w._lookPitch=Math.PI/3; w.snapChase(); w.chase(f,null,1/60);
    const view=w.camera.getWorldDirection(new T.Vector3());
    check('free camera preserves deliberate 60 degree look pitch',Math.abs(Math.asin(view.y)-Math.PI/3)<.1,{pitch:Math.asin(view.y)});
    w._lookActive=false; f.faceDir(0,1); f.vel.set(0,0,0); w.snapChase();w.chase(f,null,1/60);
    const startView=w.camera.getWorldDirection(new T.Vector3());
    f.vel.set(55,0,0);for(let i=0;i<60;i++)w.chase(f,null,1/60);
    const strafeView=w.camera.getWorldDirection(new T.Vector3());
    check('strafing before the first mouse move does not steer the camera',startView.angleTo(strafeView)<.02,{angle:startView.angleTo(strafeView)});
    w._lookActive=true;w._lookYaw=0;w._lookPitch=0;f.vel.set(0,0,0);w.snapChase();w.chase(f,null,1/60);
    const cameraRight=new T.Vector3(1,0,0).applyQuaternion(w.camera.quaternion);
    w.mouseLook(100,0);w.snapChase();w.chase(f,null,1/60);
    const rightward=w.camera.getWorldDirection(new T.Vector3()).dot(cameraRight);
    check('rightward mouse input turns toward camera-right',rightward>.05,{rightward});
    return checks;
  });
  if (process.argv.includes('--capture')) {
    for (const state of ['hover','cruise','bank','brake','cast']) {
      await page.evaluate(state => {
        const {game:g}=LSW,f=g.player,w=g.world;
        f.pos.set(0,70,0);f.flying=true;f.gait='airborne';f.faceDir(0,1);
        f.vel.set(state==='bank'?45:0,0,state==='hover'?0:65);
        f.moveDir={x:0,y:0,z:state==='brake'?0:1}; f._flightBrake=state==='brake'?1:0;
        f.castPose=state==='cast'?1:0;
        for(let i=0;i<120;i++){f.animT+=1/120;f._animate(1/120);}
        w.setCameraMode('chase');w.camera.position.set(19,80,25);w.camera.lookAt(0,75,0);w.camera.updateMatrixWorld(true);
        w.render();
      },state);
      await page.screenshot({path:new URL(`${state}.png`,out).pathname.replace(/^\/(\w:)/,'$1')});
    }
  }
  console.log(JSON.stringify({results,errors},null,2));
  await writeFile(new URL('checks.json',out),JSON.stringify({results,errors},null,2));
  if(results.some(r=>!r.pass)||errors.length)process.exitCode=1;
} finally { await browser.close(); }
