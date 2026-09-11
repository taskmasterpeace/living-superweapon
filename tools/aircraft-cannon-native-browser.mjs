import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

// Real Free practice menu, movement, boarding, Shift+N range, and LMB cannon.
// Read-only telemetry: never write gameplay actors, aim, health, AI, or time.
const out = process.argv.find(a=>a.startsWith('--output='))?.slice(9)||'artifacts/aircraft-cannon-native';
const checkAim=process.argv.includes('--check-aim');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chromium', headless: false });
const context=await browser.newContext({viewport:{width:1672,height:941},recordVideo:checkAim?{dir:out,size:{width:1672,height:941}}:undefined});
const page = await context.newPage(),video=page.video();
const result = { scope: 'Native-input helicopter cannon against user-deployed training dummies, not hostile combat proof', samples: [], errors: [] };
page.on('pageerror', error => result.errors.push(error.stack));
page.on('console', message => { if(message.type()==='error') result.errors.push(message.text()); });
let held = new Set();
async function keys(next = []) {
  const wanted = new Set(next);
  for (const k of held) if (!wanted.has(k)) await page.keyboard.up(k);
  for (const k of wanted) if (!held.has(k)) await page.keyboard.down(k);
  held = wanted;
}
async function read() {
  return page.evaluate(() => {
    const g = PW.game, p = g.player;
    const a = g.pwStage.aircraft.actors.find(a => a.pilotable && a.kind === 'helicopter');
    let cannonAim=null;
    if(p._aircraftVehicle&&a.combat?.pilotAim){
      const aim=a.combat.pilotAim(),el=document.getElementById('hCross'),rect=el.getBoundingClientRect(),screen={};
      if(aim){g.world.screenPosOf(aim.point.x,aim.point.y,aim.point.z,screen);cannonAim={kind:aim.kind,point:aim.point.toArray(),origin:aim.origin.toArray(),velocity:aim.velocity.toArray(),screen,
       drawn:[rect.x,rect.y],mode:el.dataset.aimMode,visible:getComputedStyle(el).visibility!=='hidden',pixelError:Math.hypot(rect.x-screen.x,rect.y-screen.y)};}
    }
    return { pos: p.pos.toArray(), alive: p.alive, hp: p.hp, aim: [p.aim3.x,p.aim3.z], flatAim: [p.aim.x,p.aim.z],
      cannonAim,faults:[...(g._errSeen||[])],
      seated: p._aircraftVehicle?.kind, helicopter: { pos: a.wrapper.position.toArray(), yaw:a.yaw, pitch:a.wrapper.rotation.x, radius:a.bodyRadius, shots:a.combat?.shots, parked:a.parked },
      dummies: g.entities.filter(f => f.isDummy).map((f,i) => ({ i, hp:f.hp, maxHp:f.maxHp, alive:f.alive, pos:f.pos.toArray(), cannonAttributed:f.lastHitBy===a.combat?.source })) };
  });
}
async function sample(label) { const s = await read(); result.samples.push({ label, ...s }); return s; }
async function screenshot(name) { await page.screenshot({ path: `${out}/${name}.png` }); }
async function walkTo(x,z) {
  const start=Date.now(); let best=Infinity, progress=Date.now();
  while(Date.now()-start<25000) {
    const s=await read(); assert.ok(s.alive,'Survived normal practice navigation');
    const dx=x-s.pos[0],dz=z-s.pos[2],distance=Math.hypot(dx,dz);
    if(distance<4.5){await keys();await page.waitForTimeout(250);return;}
    if(distance<best-1){best=distance;progress=Date.now();}
    assert.ok(Date.now()-progress<4500,`Navigation blocked at ${s.pos}`);
    const n=Math.hypot(...s.aim)||1,fx=s.aim[0]/n,fz=s.aim[1]/n;
    const forward=dx*fx+dz*fz,right=-dx*fz+dz*fx,next=[];
    if(Math.abs(forward)>2.5)next.push(forward>0?'KeyW':'KeyS');
    if(Math.abs(right)>2.5)next.push(right>0?'KeyD':'KeyA');
    await keys(next);await page.waitForTimeout(120);
  }
  throw Error('Native navigation timeout');
}
async function burst(label, ms, movement=[]) {
  await keys(movement); await page.mouse.down({button:'left'});
  const end=Date.now()+ms;
  while(Date.now()<end) { await page.waitForTimeout(100); const s=await sample(label); if(s.dummies.some(d=>d.cannonAttributed))break; }
  await page.mouse.up({button:'left'}); await keys();
  await screenshot(label);
}
try {
  await page.goto('http://127.0.0.1:5180/powerworld.html?hero=sarge');
  await page.locator('[data-encounter="practice"]').click(); await page.locator('#pwGo').click();
  await page.waitForFunction(()=>PW.game.pwStage?.frontlineReady&&PW.game.pwStage.aircraft?.ready,null,{timeout:60000});
  result.practice=await page.evaluate(()=>({practice:PW.game.ms.practice,hostiles:PW.game.entities.filter(f=>f.alive&&f.team!==PW.game.player.team).length}));
  assert.equal(result.practice.practice,true);assert.equal(result.practice.hostiles,0);
  const start=await sample('spawn'),h=start.helicopter;
  await walkTo(h.pos[0]+h.radius+7,h.pos[2]-65);
  await walkTo(h.pos[0]+h.radius+4,h.pos[2]);
  await page.keyboard.press('KeyJ');await page.waitForFunction(()=>PW.game.player._aircraftVehicle?.kind==='helicopter',null,{timeout:4000});
  await page.keyboard.down('ShiftLeft');await page.keyboard.press('KeyN');await page.keyboard.up('ShiftLeft');
  await page.waitForTimeout(350);const before=await sample('range-before');
  assert.ok(before.dummies.length>=7,'Native Shift+N deployed actual range fighters');
  await screenshot('01-range-before');
  await page.mouse.move(836,470);
  await burst('02-level-cannon',1800);
  if(!result.samples.some(s=>s.dummies.some(d=>d.cannonAttributed))) {
    await keys(['Space']);await page.waitForTimeout(850);await keys();await page.waitForTimeout(650);
    await sample('hover-before-nose-down');
    await burst('03-nose-down-cannon',1600,['KeyW']);
  }
  const hits=result.samples.flatMap(s=>s.dummies.filter(d=>d.cannonAttributed).map(d=>({label:s.label,...d})));
  result.attributedHits=hits;
  assert.ok(hits.some(d=>d.hp<d.maxHp),'A real training dummy lost HP attributed to manual helicopter cannon');
  if(checkAim){
    await keys(['Space']);await page.waitForTimeout(800);await keys();await page.waitForTimeout(500);
    await sample('hover-aim');await screenshot('03-hover-aim');
    await keys(['KeyW','KeyD']);await page.waitForTimeout(450);await sample('turning-aim');await screenshot('04-turning-aim');await keys();
    const rows=result.samples.filter(s=>s.cannonAim?.visible);
    assert.ok(rows.length>=3,'Cannon marker was not visible during the actual aircraft states');
    assert.ok(rows.every(s=>s.cannonAim.mode==='aircraft'&&s.cannonAim.pixelError<=1.5),'Drawn cannon marker disagrees with projected ballistic path');
    assert.ok(result.samples.some(s=>s.label==='hover-aim'&&!s.helicopter.parked),'Native lift must leave the ground');
    assert.ok(result.samples.every(s=>!s.faults.length));
  }
  assert.deepEqual(result.errors,[]); result.ok=true;
} catch(error) {
  result.error=error.stack;result.last=await read().catch(()=>null);await screenshot('failure').catch(()=>{});process.exitCode=1;
} finally {
  await page.mouse.up({button:'left'}).catch(()=>{});await keys().catch(()=>{});
  await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));
  await context.close();if(video)await video.saveAs(`${out}/cannon-aim-native.webm`);
  console.log(JSON.stringify(result));await browser.close();
}
