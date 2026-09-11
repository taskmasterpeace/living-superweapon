import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as news from '../src/engine/newscrew.js';
import {outpostReserved} from '../src/engine/frontline-outpost-layout.js';

function crew() {
  const n = Object.create(news.NewsCrew.prototype);
  Object.assign(n, {
    enabled: true, clips: [], rec: null, t: 2, _preroll: [], _capT: 0,
    operatorName: 'CAMERA', reporterName: 'REPORTER', _onAirT: 0,
    _lastEventT: 0, standupT: 0, _standupClips: 0, _pool: [],
    g: { world: { _qTier: 2, _ema: 16, ARENA: 240 }, matchT: 12, matchOver: false,
      humans: [], entities: [] },
    grp: new THREE.Group(), van: new THREE.Group(), op: new THREE.Group(), rp: new THREE.Group(),
    opPos: new THREE.Vector3(), rpPos: new THREE.Vector3(), goal: new THREE.Vector3(),
    focusSm: new THREE.Vector3(), lookSm: new THREE.Vector3(),
  });
  return n;
}

test('PowerWorld press van stays outside the military driving and aircraft surfaces',()=>{
 const n=crew();n.reset('duel');const original=n.van.position.clone();
 n.reset('powerworld');
 assert.equal(outpostReserved(n.van.position.x,n.van.position.z,18),false,'Press van blocks a military lane');
 n.reset('duel');assert.deepEqual(n.van.position.toArray(),original.toArray(),'City parking changed');
});

test('highlight transfers the rolling frame array so pending encodes land in the clip', () => {
  const n = crew(), frames = ['#enc1', '#enc2']; n._preroll = frames;
  n.highlight('bighit', 'Impact');
  assert.equal(n.rec.frames, frames);
  assert.notEqual(n._preroll, frames);
  assert.deepEqual(n._preroll, []);
  frames[0] = 'data:image/jpeg;base64,ready';
  assert.equal(n.rec.frames[0], 'data:image/jpeg;base64,ready');
});

test('reset clears active recording slots so late callbacks cannot leak images', () => {
  const n = crew(), frames = ['#enc9']; n.rec = { frames };
  n.reset('powerworld');
  assert.deepEqual(frames, [null]);
  assert.equal(n.enabled, true, 'PowerWorld receives its requested field coverage');
});

test('a discarded short clip releases its frames', () => {
  const n = crew(), frames = ['#enc1']; n.rec = { frames };
  n._finalize();
  assert.deepEqual(frames, [null]);
  assert.equal(n.clips.length, 0);
});

test('repeated impacts cannot extend one recording indefinitely', () => {
  const n = crew(); n.highlight('bighit', 'Impact');
  const initial = n.t;
  for (let i = 0; i < 30; i++) { n.t += 0.4; n.highlight('bighit', 'Impact'); }
  assert.ok(n.rec.until <= initial + 6, 'capture must close even under a sustained beam');
});

test('taking footage finalizes active frames without revoking the transferred owner', () => {
  const n = crew(); n.highlight('ko', 'Winner');
  n.rec.frames.push(...Array(8).fill('data:image/jpeg;base64,frame'));
  assert.equal(typeof n.takeClips, 'function');
  const clips = n.takeClips();
  assert.equal(clips.length, 1);
  n.reset('ascendance');
  assert.equal(n.enabled, true);
  assert.equal(clips[0].frames[0], 'data:image/jpeg;base64,frame');
  assert.notEqual(n.clips, clips);
});

function rendererFixture() {
  const state = {
    target: { name: 'composer-target' }, viewport: new THREE.Vector4(4, 7, 801, 451),
    scissor: new THREE.Vector4(9, 13, 300, 200), scissorTest: true,
  };
  const r = {
    domElement: { width: 1024, height: 768 }, shadowMap: { autoUpdate: true },
    getPixelRatio: () => 1.5, getRenderTarget: () => state.target,
    getActiveCubeFace: () => 2, getActiveMipmapLevel: () => 1,
    getViewport: v => v.copy(state.viewport), getScissor: v => v.copy(state.scissor),
    getScissorTest: () => state.scissorTest,
    setRenderTarget: t => { state.target = t; },
    setViewport: (...a) => a[0]?.isVector4 ? state.viewport.copy(a[0]) : state.viewport.set(...a),
    setScissor: (...a) => a[0]?.isVector4 ? state.scissor.copy(a[0]) : state.scissor.set(...a),
    setScissorTest: s => { state.scissorTest = s; }, render: () => {},
  };
  return { r, state };
}

for (const shouldThrow of [false, true]) test(`news render restores scene and renderer state ${shouldThrow ? 'on failure' : 'on success'}`, () => {
  const n = crew(), { r, state } = rendererFixture();
  const originalTarget = state.target;
  n.g.world.renderer = r; n.g.world.fog = new THREE.Group();
  n.g.world.skyMesh = new THREE.Group(); n.g.world.skyMesh.position.set(41, 17, 39);
  n.g.reticle = new THREE.Group(); n.g.scene = new THREE.Scene();
  n.op.visible = true;
  const hiddenFighter = new THREE.Group(); hiddenFighter.visible = false;
  n.g.entities = [{ obj: hiddenFighter }];
  n.cam = new THREE.PerspectiveCamera(); n.cam.position.set(2, 8, 11);
  n.ctx = { drawImage() {} }; n._overlay = () => {};
  globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
  r.render = () => {
    assert.equal(n.op.visible, false, 'operator must not occlude his own shoulder lens');
    if (shouldThrow) throw Error('lost context');
  };
  if (shouldThrow) assert.throws(() => n._renderPOV(null), /lost context/);
  else n._renderPOV(null);
  assert.equal(state.target, originalTarget);
  assert.deepEqual(state.viewport.toArray(), [4, 7, 801, 451]);
  assert.deepEqual(state.scissor.toArray(), [9, 13, 300, 200]);
  assert.equal(state.scissorTest, true);
  assert.equal(r.shadowMap.autoUpdate, true);
  assert.equal(n.g.world.fog.visible, true); assert.equal(hiddenFighter.visible, false);
  assert.equal(n.op.visible, true);
  assert.deepEqual(n.g.world.skyMesh.position.toArray(), [41, 17, 39]);
});

test('crash zoom settles and retains both combatants in an action frame', () => {
  assert.equal(typeof news.sampleNewsShot, 'function');
  const input = { time: 1, event: { time: 0.9, tag: 'bighit', focus: { x: 0, y: 4, z: 0 } },
    actor: { x: -12, y: 0, z: 0 }, target: { x: 12, y: 0, z: 0 },
    focus: { x: 0, y: 5, z: 0 }, spread: 30, eye: { x: 0, y: 8, z: 45 } };
  const crash = news.sampleNewsShot(input), settled = news.sampleNewsShot({ ...input, time: 3 });
  assert.equal(crash.kind, 'impact'); assert.equal(settled.kind, 'action');
  assert.ok(crash.fov < settled.fov);
  const camera = new THREE.PerspectiveCamera(settled.fov, 16/9, 0.5, 1100);
  camera.position.set(0, 8, 45); camera.lookAt(settled.look.x, settled.look.y, settled.look.z); camera.updateMatrixWorld();
  for (const x of [-12, 12]) {
    const p = new THREE.Vector3(x, 5, 0).project(camera);
    assert.ok(Math.abs(p.x) < 0.85 && Math.abs(p.y) < 0.85, 'fighters stay clear of frame edges');
  }
});

test('reporter frame includes head and microphone, and danger interrupts a stand-up', () => {
  assert.equal(typeof news.sampleNewsShot, 'function');
  const input = { time: 2, standup: true, reporter: { x: 0, y: 0, z: 12 },
    eye: { x: 0, y: 7.5, z: 0 }, focus: { x: 0, y: 5, z: 50 }, spread: 30 };
  const shot = news.sampleNewsShot(input);
  assert.equal(shot.kind, 'reporter');
  const camera = new THREE.PerspectiveCamera(shot.fov, 16/9, 0.5, 1100);
  camera.position.set(0, 7.5, 0); camera.lookAt(shot.look.x, shot.look.y, shot.look.z); camera.updateMatrixWorld();
  for (const y of [5.2, 9.5]) assert.ok(Math.abs(new THREE.Vector3(0, y, 12).project(camera).y) < 0.85);
  const n = crew(); n.standupT = 2; n.highlight('bighit', 'Incoming');
  assert.equal(n.standupT, 0);
});

test('pending JPEG capacity bounds copies and flush waits for admitted work', async () => {
  assert.equal(typeof news.NewsFrameEncoder, 'function');
  const callbacks = [], made = [];
  const encoder = new news.NewsFrameEncoder({ maxPending: 2, makeCanvas: () => ({
    getContext: () => ({ drawImage() {} }), toBlob: cb => callbacks.push(cb),
  }), createURL: b => { const u = 'blob:test-' + b.size; made.push(u); return u; } });
  const frames = [], source = { width: 640, height: 360 };
  assert.equal(encoder.capture(source, frames), true);
  assert.equal(encoder.capture(source, frames), true);
  assert.equal(encoder.capture(source, frames), false);
  assert.equal(callbacks.length, 2);
  let flushed = false; const flush = encoder.flush().then(() => { flushed = true; });
  callbacks[0]({ size: 100 }); await Promise.resolve(); assert.equal(flushed, false);
  frames[1] = null; callbacks[1]({ size: 200 }); await flush;
  assert.equal(flushed, true); assert.deepEqual(made, ['blob:test-100']);
  assert.equal(frames[0], 'blob:test-100');
});

test('a loss films the opposing winner even if the human survived a score decision', () => {
  const n = crew();
  const player = { alive: true, team: 0, def: {}, name: 'PLAYER', pos: new THREE.Vector3() };
  const rival = { alive: true, team: 1, def: {}, name: 'RIVAL', pos: new THREE.Vector3(20, 0, 0) };
  n.g.humans = [{ fighter: player }]; n.g.entities = [player, rival];
  n.g.matchOver = true;
  n.endMatch({ win: false });
  assert.equal(n._ending.winner, rival);
});

test('closing footage includes a reporter sign-off and ends after a bounded tail', () => {
  const n = crew(); n.g.matchOver = true;
  n.endMatch({ win: true });
  n.rec.frames.push(...Array(8).fill('data:image/jpeg;base64,winner'));
  n.t += 2.7; n._updateEnding();
  assert.equal(n.clips.length, 1);
  assert.equal(n.rec.tag, 'standup');
  assert.ok(n.standupT > 0);
  n.rec.frames.push(...Array(8).fill('data:image/jpeg;base64,reporter'));
  n.t += 2.7; n._updateEnding();
  assert.equal(n.rec, null);
  assert.equal(n.clips.length, 2);
  assert.equal(n._finished, true);
  n.highlight('bighit', 'Too late', { closing: true });
  assert.equal(n.rec, null);
});

test('late encoded bytes cannot exceed the recording budget in one large clip', async () => {
  const n = crew(); n.highlight('ko', 'Huge compressed frames');
  const callbacks = [];
  const encoder = new news.NewsFrameEncoder({ maxPending: 8,
    makeCanvas: () => ({ getContext: () => ({ drawImage() {} }), toBlob: cb => callbacks.push(cb) }),
    onReady: () => n._trimClips(),
  });
  for (let i = 0; i < 8; i++) encoder.capture({ width: 640, height: 360 }, n.rec.frames);
  n._finalize();
  for (const cb of callbacks) cb(new Blob([new Uint8Array(4 * 1024 * 1024)]));
  await encoder.flush();
  assert.ok(n.clips[0].frames.filter(Boolean).length <= 6, 'one retained KO cannot breach the 24 MiB cap');
  news.revokeFrames(n.clips[0].frames);
});

test('a frame rejected by the JPEG budget does not render the scene', () => {
  const n = crew(); n._encoder = { available: false };
  n._renderPOV = () => { throw Error('must not render while encoders are backed up'); };
  assert.equal(n._captureFrame([], null), false);
});

test('straight overhead combat retains horizontal spread in the field lens', () => {
  const shot = news.sampleNewsShot({ time: 3, eye: { x: 0, y: 8, z: 0 }, focus: { x: 0, y: 105, z: 0 },
    actor: { x: -55, y: 100, z: 0 }, target: { x: 55, y: 100, z: 0 } });
  const camera = new THREE.PerspectiveCamera(shot.fov, 16/9, 0.5, 1100);
  camera.position.set(0, 8, 0); camera.lookAt(shot.look.x, shot.look.y, shot.look.z); camera.updateMatrixWorld();
  for (const x of [-55, 55]) assert.ok(Math.abs(new THREE.Vector3(x, 105, 0).project(camera).x) < 0.85);
});

test('PowerWorld crew movement ignores the previous city coastline', () => {
  const n = crew(); n.g.modeId = 'powerworld';
  n.g.world.ARENA = 900; n.g.world.waterX = 120; n.g.world.cover = [];
  const position = new THREE.Vector3(500, 0, 0);
  n._pushOut(position);
  assert.equal(position.x, 500);
});

test('field lens includes the active enlarged sky dome', () => {
  const n = crew();
  n.cam = new THREE.PerspectiveCamera(34, 16/9, 0.5, 1100); n.fov = 34;
  n._downK = 0; n.duckT = 0; n._kick = 0; n._np = [0, 1, 2];
  n.g.world.skyMesh = new THREE.Mesh(new THREE.SphereGeometry(900, 8, 6));
  n.g.world.skyMesh.scale.setScalar(3.4);
  n._poseCamera(1/60);
  assert.ok(n.cam.far > 3060, 'sky must not disappear behind the observer far plane');
  n.g.world.skyMesh.geometry.dispose(); n.g.world.skyMesh.material.dispose();
});

test('venue captions use PowerWorld instead of an inherited city district', () => {
  const n = crew(); n.g.modeId = 'powerworld'; n.g.world.districtAt = () => 'MIDTOWN PLAZA';
  assert.equal(typeof n._venueLabel, 'function');
  assert.equal(n._venueLabel(), 'POWERWORLD');
  n.g.modeId = 'ascendance'; assert.equal(n._venueLabel(), 'ASCENDANCE ARENA');
  n.g.modeId = 'duel'; assert.equal(n._venueLabel(), 'MIDTOWN PLAZA');
});

test('crew bodies have connected necks and leg silhouettes standing on the ground', () => {
  assert.equal(typeof news.createNewsPerson, 'function');
  const person = news.createNewsPerson('reporter');
  news.poseNewsPerson(person, { time: 0, speed: 0 }); person.updateMatrixWorld(true);
  const bounds = name => new THREE.Box3().setFromObject(person.getObjectByName(name));
  const neck = bounds('neck'), head = bounds('head'), torso = bounds('torso');
  assert.ok(neck.max.y >= head.min.y && neck.min.y <= torso.max.y, 'neck bridges torso and head');
  const left = bounds('bootL'), right = bounds('bootR');
  assert.ok(left.max.x < right.min.x, 'separate trouser legs and shoes read clearly');
  assert.ok(Math.abs(left.min.y) < 0.08 && Math.abs(right.min.y) < 0.08);
  assert.ok(person.getObjectByName('press-badge'));
  let meshes = 0; person.traverse(o => { if (o.isMesh) meshes++; });
  assert.ok(meshes < 65, 'the two field characters remain a small procedural draw budget');
});

test('reporter hand meets microphone throughout walk and crouch poses', () => {
  assert.equal(typeof news.createNewsPerson, 'function');
  const person = news.createNewsPerson('reporter');
  const mic = new THREE.Group(); mic.position.set(0.85, 6.9, 1); mic.rotation.x = -0.1; person.add(mic);
  person.position.set(12, 0, -20); person.rotation.y = 0.7;
  const lastKnee = new THREE.Vector3();
  for (const [time, speed, duck] of [[0, 0, 0], [0.4, 24, 0], [0.8, 13, 1]]) {
    news.poseNewsPerson(person, { time, speed, duck, microphone: mic }); person.updateMatrixWorld(true);
    const hand = person.getObjectByName('handR').getWorldPosition(new THREE.Vector3());
    const grip = mic.localToWorld(new THREE.Vector3(0, -0.24, 0));
    assert.ok(hand.distanceTo(grip) < 0.02, 'microphone must be held, not float beside the body');
    const knee = person.getObjectByName('kneeL').getWorldPosition(new THREE.Vector3());
    if (time) assert.ok(knee.distanceTo(lastKnee) > 0.05, 'knees participate in gait/crouch');
    lastKnee.copy(knee);
  }
});

test('operator hands support both the camera side grip and lens barrel', () => {
  assert.equal(typeof news.createNewsPerson, 'function');
  const person = news.createNewsPerson('operator'), camera = new THREE.Group();
  camera.position.set(1.28, 7.4, 0.25); camera.rotation.x = -0.5; person.add(camera);
  news.poseNewsPerson(person, { time: 0.2, speed: 13, camera }); person.updateMatrixWorld(true);
  for (const [side, local] of [['R', [0.65, -0.2, 0.4]], ['L', [0, -0.63, 1.05]]]) {
    const hand = person.getObjectByName('hand' + side).getWorldPosition(new THREE.Vector3());
    assert.ok(hand.distanceTo(camera.localToWorld(new THREE.Vector3(...local))) < 0.02);
  }
});

function activeCrew() {
  const n = crew();
  Object.assign(n, { _warmed: true, _evalT: Infinity, _losBadT: 0, _kick: 0, _downK: 0,
    spreadSm: 20,
    downT: 0, duckT: 0, _punchT: 0, _np: [0, 1, 2], fov: 34, _standupCd: 9, standupT: 2,
    _encoder: { available: false }, tally: {}, _dishGlow: {},
    cam: new THREE.PerspectiveCamera(34, 16/9, 0.5, 1100),
  });
  n.op = news.createNewsPerson('operator'); n.rp = news.createNewsPerson('reporter');
  n.camGrp = new THREE.Group(); n.camGrp.position.set(1.28, 7.4, 0.25); n.op.add(n.camGrp);
  n.micG = new THREE.Group(); n.micG.position.set(0.85, 6.9, 1); n.rp.add(n.micG);
  n.g.modeId = 'duel'; n.g.canSee = () => true; n.g.nearestFoe = () => null;
  n.g.world.cover = []; n.g.world._ema = Infinity;
  n.opPos.set(-20, 0, 40); n.rpPos.set(20, 0, 40); n.goal.copy(n.opPos);
  n.grp.add(n.op, n.rp);
  return n;
}

test('crew roots and recording lens follow relief and fresh craters while stationary', () => {
  const n = activeCrew(); let westHeight = 24;
  n.g.world.heightAt = x => x < 0 ? westHeight : -4;
  n.update(1/60);
  assert.equal(n.opPos.y, 24); assert.equal(n.rpPos.y, -4);
  assert.ok(n.op.position.y >= 24 && n.op.position.y <= 24.05);
  assert.ok(n.rp.position.y >= -4 && n.rp.position.y <= -3.6);
  assert.ok(Math.abs(n.cam.position.y - 31.5) < 0.01);
  westHeight = -3;
  n.update(1/60);
  assert.equal(n.opPos.y, -3);
  assert.ok(n.op.position.y >= -3 && n.op.position.y <= -2.95);
  assert.ok(Math.abs(n.cam.position.y - 4.5) < 0.01);
  n._downK = 1; n.duckT = 1; n._poseCamera(1/60);
  assert.ok(n.cam.position.y >= -2, 'fallen lens stays at least one unit above the local ground');
});

test('field LOS originates above local terrain rather than sea level', () => {
  const n = crew(); let from;
  n.g.world.heightAt = () => 24; n.g.canSee = a => { from = a; return true; };
  n._losClear(12, 30);
  assert.equal(from.pos.y, 31.5);
});

test('only the currently active PowerWorld stage supplies its visible flat floor', () => {
  const n = crew(); n.g.scene = new THREE.Scene(); n.g.modeId = 'powerworld';
  n.g.world.heightAt = () => 24;
  const stage = new THREE.Group(), floor = new THREE.Mesh(new THREE.CircleGeometry(900, 16));
  floor.position.y = 0.025; floor.rotation.x = -Math.PI/2; stage.add(floor); n.g.scene.add(stage);
  n.g._pwStage = { group: stage };
  assert.equal(typeof n._groundAt, 'function');
  assert.equal(n._groundAt(12, 30), 0.025);
  n.g.modeId = 'duel'; assert.equal(n._groundAt(12, 30), 24, 'cached venue must not override a city');
  n.g.modeId = 'powerworld'; n.g.scene.remove(stage);
  assert.equal(n._groundAt(12, 30), 24, 'detached stage must not override the active terrain');
  floor.geometry.dispose(); floor.material.dispose();
});

test('visible shoulder camera tracks the recorded reporter lens with attached grips', () => {
  const n = activeCrew(); n.g.world.heightAt = () => 12;
  n.op.rotation.y = -1.2; n.op.rotation.x = 0.1; n.op.position.set(-20, 12, 40);
  n.opPos.y = 12; n.rpPos.set(10, 18, 46);
  n.cameraProfile = { handheld: 0 };
  for (let i = 0; i < 90; i++) n._poseCamera(1/60);
  n.op.updateMatrixWorld(true); n.cam.updateMatrixWorld(true);
  const virtualForward = n.cam.getWorldDirection(new THREE.Vector3());
  const physicalForward = new THREE.Vector3(0, 0, 1).applyQuaternion(n.camGrp.getWorldQuaternion(new THREE.Quaternion()));
  assert.ok(physicalForward.dot(virtualForward) > 0.999, 'held lens and recorded lens must aim together');
  news.poseNewsPerson(n.op, { camera: n.camGrp, speed: 0 }); n.op.updateMatrixWorld(true);
  const hand = n.op.getObjectByName('handR').getWorldPosition(new THREE.Vector3());
  assert.ok(hand.distanceTo(n.camGrp.localToWorld(new THREE.Vector3(0.65, -0.2, 0.4))) < 0.02);
  const reporter = new THREE.Vector3(10, 25.1, 46).project(n.cam);
  assert.ok(Math.abs(reporter.x) < 0.1 && Math.abs(reporter.y) < 0.1);
});

for (const hz of [30, 60, 120]) for (const spread of [0, 24, 48]) {
  test(`stand-up leaves the impact sightlines clear at ${hz} Hz / spread ${spread}`, () => {
    const n = activeCrew(); n.standupT = 10; n.cameraProfile = { handheld: 0 };
    n.opPos.set(0, 0, 0); n.goal.copy(n.opPos); n.rpPos.set(0, 0, 13);
    n.focusSm.set(0, 5, 55); n.lookSm.set(0, 7, 13); n.g.world.heightAt = () => 0;
    const a = { alive: true, def: {}, pos: new THREE.Vector3(-spread / 2, 0, 55) };
    const b = { alive: true, def: {}, pos: new THREE.Vector3(spread / 2, 0, 55) };
    n.g.humans = [{ fighter: a }]; n.g.entities = [a, b]; n.g.hardLock = b;
    for (let i = 0; i < 2 * hz; i++) n.update(1 / hz);
    n.grp.updateMatrixWorld(true); n.cam.updateMatrixWorld(true);
    const head = n.rp.getObjectByName('head').getWorldPosition(new THREE.Vector3()).project(n.cam);
    assert.ok(Math.abs(head.x) < 0.7 && Math.abs(head.y) < 0.8, 'stand-up still shows the real reporter');
    n.highlight('bighit', 'Contact', { focus: b.pos, actor: a, target: b });
    for (let i = 0; i < Math.round(0.2 * hz); i++) n.update(1 / hz);
    n.grp.updateMatrixWorld(true); n.cam.updateMatrixWorld(true);
    const reporter = new THREE.Box3().setFromObject(n.rp);
    for (const subject of [a, b]) {
      const body = subject.pos.clone().add(new THREE.Vector3(0, 5, 0));
      const ray = new THREE.Ray(n.cam.position.clone(), body.clone().sub(n.cam.position).normalize());
      const hit = ray.intersectBox(reporter, new THREE.Vector3());
      assert.ok(!hit || hit.distanceTo(n.cam.position) > body.distanceTo(n.cam.position),
        'the physical reporter must not mask a principal during the short impact insert');
    }
    assert.equal(n.rp.visible, true, 'clearance is physical staging, not hiding the reporter');
  });
}

for (const hz of [30, 60, 120]) test(`cold field arrival leaves the whole impact insert clear at ${hz} Hz`, () => {
  const n = activeCrew(); n.reset('powerworld'); n.g.modeId = 'powerworld';
  n.g.world.heightAt = () => 0; n.cameraProfile = { handheld: 0 };
  const a = { alive: true, def: {}, pos: new THREE.Vector3(-12, 0, 55) };
  const b = { alive: true, def: {}, pos: new THREE.Vector3(12, 0, 55) };
  n.g.humans = [{ fighter: a }]; n.g.entities = [a, b]; n.g.hardLock = b;
  for (let i = 0; i < Math.round(0.4 * hz); i++) n.update(1 / hz);
  n.highlight('bighit', 'Contact', { focus: b.pos, actor: a, target: b });
  for (let i = 0; i < Math.round(0.3 * hz); i++) {
    n.update(1 / hz); n.grp.updateMatrixWorld(true); n.cam.updateMatrixWorld(true);
    const reporter = new THREE.Box3().setFromObject(n.rp);
    for (const subject of [a, b]) {
      const body = subject.pos.clone().add(new THREE.Vector3(0, 5, 0));
      const ray = new THREE.Ray(n.cam.position.clone(), body.clone().sub(n.cam.position).normalize());
      const hit = ray.intersectBox(reporter, new THREE.Vector3());
      assert.ok(!hit || hit.distanceTo(n.cam.position) > body.distanceTo(n.cam.position),
        `cold opening hides a subject during impact frame ${i}`);
    }
  }
});
