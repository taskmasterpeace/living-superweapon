import test from 'node:test';
import assert from 'node:assert/strict';
import { ROSTER } from '../src/data/characters.js';
import { CAMERA_DEFAULTS } from '../src/data/flight-tuning.js';
const studio = await import('../src/tool/studio-profile.js').catch(()=>({}));
const available=typeof studio.profileFromDef==='function';
const base=()=>structuredClone(ROSTER.find(d=>d.id==='sol'));
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};};
test('untrusted profiles reject unsupported keys before labels can reach the inspector DOM',()=>{
 for(const mutate of [p=>p.colors['<img src=x onerror=alert(1)>']='#ff0000',p=>p.model.url='https://example.com/model.glb',p=>p.camera.extra=1,p=>p.poses.hover.extra=1]){
  const p=studio.profileFromDef(base());mutate(p);assert.throws(()=>studio.validateProfile(p),/unsupported/i);
 }
});
test('strafe targets roundtrip through saved profiles and production definitions',()=>{
  const p=studio.profileFromDef(base());
  assert.ok(p.poses.strafeLeft&&p.poses.strafeRight,'Directional strafe authoring is missing');
  p.poses.strafeLeft.kneeL=1.1;p.poses.strafeRight.armRx=-.9;
  const s=storage();studio.saveProfile(p,s);
  const loaded=studio.loadProfile('sol',s),def=studio.applyProfile(base(),loaded);
  assert.equal(def.model.poses.strafeLeft.kneeL,1.1);assert.equal(def.model.poses.strafeRight.armRx,-.9);
});
test('legacy five-pose profiles acquire new strafe defaults without altering authored joints or storage',()=>{
  const p=studio.profileFromDef(base());delete p.poses.strafeLeft;delete p.poses.strafeRight;
  p.poses.backward.kneeL=1.23;const s=storage(),raw=JSON.stringify({sol:p});s.setItem(studio.STORAGE_KEY,raw);
  const loaded=studio.loadProfile('sol',s);
  assert.ok(loaded.poses.strafeLeft&&loaded.poses.strafeRight,'Legacy profile was not completed for the editor');
  assert.equal(loaded.poses.backward.kneeL,1.23);assert.equal(s.getItem(studio.STORAGE_KEY),raw);
  assert.ok(studio.applyProfile(base(),p).model.poses.strafeLeft);
  assert.equal(p.poses.strafeLeft,undefined);
});
test('presentation authoring module exists',()=>assert.equal(available,true));

test('combat camera preset changes only camera and remains undoable',()=>{
  const p=studio.profileFromDef(base());p.camera.height=3.8;p.camera.range=42;p.frame.bulk=1.25;p.poses.hover.armLx=-.8;
  const original=structuredClone(p),h=new studio.DraftHistory(p),next=studio.resetCamera(p);
  assert.deepEqual(next.camera,CAMERA_DEFAULTS);
  assert.deepEqual({...next,camera:original.camera},original);assert.deepEqual(p,original);
  h.push(next);h.undo();assert.deepEqual(h.value,original);h.redo();assert.deepEqual(h.value,next);
});
test('an edited profile affects geometry data without mutating powers or source definition',{skip:!available},()=>{
  const def=base(), p=studio.profileFromDef(def);p.frame.bulk=1.12;p.model.costume='martial';p.camera.range=30;
  const result=studio.applyProfile(def,p);
  assert.equal(result.frame.bulk,1.12);assert.equal(result.model.costume,'martial');assert.equal(result.model.camera.range,30);
  assert.deepEqual(result.abilities,def.abilities);assert.notDeepEqual(result.frame,def.frame);assert.equal(def.model,undefined);
});
test('saved profiles roundtrip and remain isolated per fighter',{skip:!available},()=>{
  const s=storage(),p=studio.profileFromDef(base());p.camera.shoulder=2;
  studio.saveProfile(p,s);assert.deepEqual(studio.loadProfile('sol',s),p);assert.equal(studio.loadProfile('kano',s),null);
  studio.removeProfile('sol',s);assert.equal(studio.loadProfile('sol',s),null);
});
test('malformed import cannot poison geometry or exceed safe camera ranges',{skip:!available},()=>{
  for(const bad of [p=>p.frame.bulk=NaN,p=>p.camera.fov=179,p=>p.poses.hover.kneeL=-1,p=>p.version=99,p=>p.model.costume='script']){
    const p=studio.profileFromDef(base());bad(p);assert.throws(()=>studio.validateProfile(p));
  }
  assert.throws(()=>studio.validateProfile(JSON.parse('{"version":1,"__proto__":{"admin":true}}')));
});
test('purple is reserved for KIVULI, including hidden colour fields',{skip:!available},()=>{
  const p=studio.profileFromDef(base());p.colors.primary='#9900ff';assert.throws(()=>studio.validateProfile(p),/purple/i);
  p.colors.primary='#ff9900';p.model.hairColor='#9900ff';assert.throws(()=>studio.validateProfile(p),/purple/i);
  p.heroId='kivuli';assert.doesNotThrow(()=>studio.validateProfile(p));
});
test('corrupt saved data is not overwritten by a later save',{skip:!available},()=>{
  const s=storage();s.setItem(studio.STORAGE_KEY,'not json');
  assert.throws(()=>studio.saveProfile(studio.profileFromDef(base()),s),/storage/i);
  assert.equal(s.getItem(studio.STORAGE_KEY),'not json');
});
test('storage write failures are reported to the caller',{skip:!available},()=>{
  const s=storage();s.setItem=()=>{throw new Error('Quota full');};
  assert.throws(()=>studio.saveProfile(studio.profileFromDef(base()),s),/Quota/);
});
test('undo redo save and new edits preserve expected draft history',{skip:!available},()=>{
  const p=studio.profileFromDef(base()),h=new studio.DraftHistory(p);assert.equal(h.dirty,false);
  const a=h.value;a.camera.range=40;h.push(a);assert.equal(h.dirty,true);
  h.undo();assert.equal(h.value.camera.range,p.camera.range);h.redo();assert.equal(h.value.camera.range,40);
  h.markSaved();assert.equal(h.dirty,false);h.undo();assert.equal(h.dirty,true);
  const b=h.value;b.camera.range=35;h.push(b);assert.equal(h.canRedo,false);h.redo();assert.equal(h.value.camera.range,35);
});
test('unknown saved hero IDs do not add roster citizens',{skip:!available},()=>{
  const s=storage(),p=studio.profileFromDef(base());p.heroId='not-in-roster';studio.saveProfile(p,s);
  const roster=[base()];const result=studio.installProfiles(roster,s);
  assert.equal(roster.length,1);assert.equal(result.applied,0);
});
test('installer applies valid profile and reports corrupt entries without blocking game boot',{skip:!available},()=>{
  const s=storage(),p=studio.profileFromDef(base());p.camera.range=39;studio.saveProfile(p,s);
  const roster=[base()];assert.equal(studio.installProfiles(roster,s).applied,1);assert.equal(roster[0].model.camera.range,39);
  s.setItem(studio.STORAGE_KEY,'{broken');assert.match(studio.installProfiles(roster,s).errors[0],/storage/i);
});

test('portable authored body, motion families, and equipment references roundtrip exactly',()=>{
  const p=studio.profileFromDef(base());
  p.model.assets={body:'body.hero-standard@1',motion:{locomotion:'motion.hero-ual@1',reload:'motion.hero-ual@1',grenade:'motion.hero-ual2@1'},equipment:{rifle:'equipment.carbine@1',pistol:'equipment.sidearm@1'}};
  const s=storage();studio.saveProfile(p,s);const loaded=studio.loadProfile('sol',s),def=studio.applyProfile(base(),loaded);
  assert.deepEqual(loaded.model.assets,p.model.assets);assert.deepEqual(def.model.assets,p.model.assets);assert.deepEqual(studio.profileFromDef(def).model.assets,p.model.assets);
});

test('authored asset maps reject malformed structure but retain unknown portable references',()=>{
  const good=studio.profileFromDef(base());good.model.assets={body:'future.hero@9',motion:{locomotion:'future.motion@2'},equipment:{rifle:'future.rifle@3'}};
  assert.deepEqual(studio.validateProfile(good).model.assets,good.model.assets);
  for(const mutate of [p=>p.model.assets.body='../outside@1',p=>p.model.assets.motion.bad='motion.hero-ual@1',p=>p.model.assets.equipment.rifle='no version',p=>p.model.assets.extra={}]){
    const p=structuredClone(good);mutate(p);assert.throws(()=>studio.validateProfile(p));
  }
});

test('untouched SOL profiles preserve its shipped lead fist, including partial authored overrides',()=>{
  const p=studio.profileFromDef(base());
  assert.equal(p.poses.forward.armRx,-2.94);
  assert.equal(p.poses.boost.elbowR,.1);
  const def=base();def.model={poses:{forward:{kneeL:.8}}};
  const edited=studio.profileFromDef(def);
  assert.equal(edited.poses.forward.kneeL,.8);assert.equal(edited.poses.forward.armRx,-2.94);
});

test('all shipped frame and color defaults can be saved without normalization',()=>{
  const bad=[];
  for(const def of ROSTER) {
    try {const p=studio.profileFromDef(def);studio.validateProfile(p);assert.deepEqual(studio.applyProfile(def,p).colors,p.colors);}
    catch(e){bad.push(`${def.id}: ${e.message}`);}
  }
  assert.deepEqual(bad,[]);
});

test('deliberate flight style reset replaces pose targets without mutating the draft or source defaults',()=>{
  assert.equal(typeof studio.resetFlightStyle,'function');
  const p=studio.profileFromDef(base());p.poses.hover.armLx=-1;p.poses.forward.armRx=-1.2;
  const before=structuredClone(p),reset=studio.resetFlightStyle(p,'hero');
  assert.deepEqual(p,before);assert.equal(reset.model.flightStyle,'hero');
  assert.equal(reset.poses.forward.armRx,-2.94);assert.equal(reset.poses.hover.armLx,-.08);
  const martial=studio.resetFlightStyle(reset,'martial');
  assert.equal(martial.poses.forward.armRx,.28);assert.deepEqual(martial.camera,p.camera);
  reset.poses.forward.armRx=0;
  assert.equal(studio.resetFlightStyle(p,'hero').poses.forward.armRx,-2.94);
  assert.throws(()=>studio.resetFlightStyle(p,'unsupported'),/style/i);
});

test('saving an untouched profile preserves production flight joints for every shipped hero',async()=>{
  const {chromium}=await import('playwright'),browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage();await page.goto('http://127.0.0.1:5180/powerworld.html');
    await page.waitForFunction(()=>window.LSW?.game);
    const bad=await page.evaluate(async()=>{
      const {Fighter}=await import('/src/engine/entity.js');
      const {profileFromDef,applyProfile}=await import('/src/tool/studio-profile.js');
      const bad=[];
      for(const def of LSW.ROSTER) {
        const pair=[new Fighter(def),new Fighter(applyProfile(def,profileFromDef(def)))];
        for(const f of pair){f._openSky=true;f.flying=true;f.gait='airborne';f._flyPose=1;f.animT=0;f.pos.set(0,140,0);f.faceDir(0,1);f._game=LSW.game;}
        for(const state of ['hover','forward','backward','brake','boost','strafeLeft','strafeRight']) {
          const samples=[];
          for(const f of pair){
            const strafe=state==='strafeLeft'?1:state==='strafeRight'?-1:0;
            f.vel.set(strafe*65,0,strafe||state==='hover'?0:state==='backward'?-65:65);f._flightBrake=state==='brake'?1:0;f.cruiseHeld=state==='boost';
            for(let i=0;i<90;i++){f.animT+=1/120;f._animate(1/120);}
            const p=f.parts;
            samples.push([p.g.rotation.x,p.g.rotation.z,p.armL.rotation.x,p.armR.rotation.x,p.armL.rotation.z,p.armR.rotation.z,p.armL.children[1].rotation.x,p.armR.children[1].rotation.x,p.legL.rotation.x,p.legR.rotation.x,p.legL.userData.knee.rotation.x,p.legR.userData.knee.rotation.x,p.head.rotation.x]);
          }
          if(samples[0].some((value,i)=>Math.abs(value-samples[1][i])>1e-6))bad.push(`${def.id}/${state}`);
        }
        for(const f of pair)f.dispose();
      }
      return bad;
    });
    assert.deepEqual(bad,[]);
  }finally{await browser.close();}
});
test('environment response survives profile export and rejects invalid mass',()=>{
 const hero=ROSTER.find(d=>d.id==='sarge'),p=studio.profileFromDef(hero);
 p.environment={massKg:105,windResistance:1.3,fallSafeSpeed:58,fallDamageScale:.8};
 const applied=studio.applyProfile(hero,studio.validateProfile(JSON.parse(JSON.stringify(p))));
 assert.deepEqual(applied.environment,p.environment);
 p.environment.massKg=0;assert.throws(()=>studio.validateProfile(p),/massKg/);
});
