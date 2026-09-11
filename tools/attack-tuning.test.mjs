import assert from 'node:assert/strict';
import test from 'node:test';

import { ROSTER } from '../src/data/characters.js';
import { POWERS, buildDef, freshPicks, saveCustom } from '../src/data/creator.js';
import {
  ATTACK_TUNING_FIELDS,
  applyAttackOverrides,
  attackFields,
  attackIdentity,
  attackOverridesFromDef,
  attackSource,
  carryAttackOverrides,
  reconcileAttackOverrides,
  resetAttackOverride,
  setAttackOverride,
  validateAttackOverrides,
} from '../src/data/attack-tuning.js';
import {
  applyProfile,
  installProfiles,
  loadProfile,
  profileFromDef,
  saveProfile,
  validateProfile,
} from '../src/tool/studio-profile.js';
import { exportCharacter, importCharacter } from '../src/tool/character-package.js';

const copy = value => JSON.parse(JSON.stringify(value));
const store = () => {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
};
const ability = (type, extra = {}) => ({
  type,
  name: `${type} fixture`,
  color: '#ff8a3d',
  nested: { keep: { arrays: [1, 2, 3] } },
  ...extra,
});
const fighter = (attack, slot = 'lmb') => ({
  id: 'cx_fixture',
  abilities: { shift: { type: 'dash', power: 100 }, [slot]: attack },
});

// Private configuration fixtures remain independent of the staged catalog gates.
const naniteCannon={type:'charge',name:'Private forearm cannon',naniteForm:'cannon',naniteAttachment:'right-forearm',castStyle:'palm',castHand:'right',cost:6,cd:1.2,kiPerSec:12,maxCharge:1.8,minR:.55,maxR:1.8,dmgMin:20,dmgMax:64,maxBlast:18,speedMin:65,speedMax:105,chargePower:2.2};
const naniteShield={type:'naniteShield',name:'Private forearm shield',naniteForm:'shield',naniteAttachment:'left-forearm',cost:0,cd:.2};
test('private nanite source metadata exposes fitted controls without publishing inert catalog powers',()=>{
 const def={abilities:{lmb:naniteCannon,q:naniteShield}},fields=attackFields(def,'lmb');
 assert.ok(fields.some(f=>f.key==='naniteLength'),'nanite source has no fitted controls');
 for(const key of ['emissionOrigin','faceOrigin','chest','castStyle','castHand'])assert.ok(!fields.some(f=>f.key===key),key);
 assert.ok(attackFields(def,'q').every(f=>f.key.startsWith('nanite')));
 assert.equal(POWERS.find(p=>p.id==='nanite-cannon')?.ab.naniteForm,'cannon');
 assert.equal(POWERS.find(p=>p.id==='nanite-shield')?.ab.naniteForm,'shield');
});
test('nanite patches remain sparse, source-bound, and derive anatomical hand without origin injection',()=>{
 const def=fighter(naniteCannon),patch=setAttackOverride({},def,'lmb',{naniteAttachment:'left-forearm',naniteWidth:1.2});
 const applied=applyAttackOverrides(def,patch);assert.equal(applied.abilities.lmb.castHand,'left');
 assert.deepEqual(patch.lmb.values,{naniteAttachment:'left-forearm',naniteWidth:1.2});assert.equal(applied.abilities.lmb.naniteCellHp,undefined);
 for(const bad of [{naniteForm:'shield'},{castHand:'left'},{castStyle:'palm'},{emissionOrigin:'eyes'},{chest:true},{faceOrigin:true},{naniteDensity:NaN},{naniteWidth:2},{naniteMaterial:'plastic'},{naniteStage1:.65,naniteStage2:.7}])assert.throws(()=>setAttackOverride({},def,'lmb',bad));
 assert.throws(()=>setAttackOverride({},fighter(ability('charge')),'lmb',{naniteLength:1.1}));
});
test('effective duplicate forearms and malformed raw sources fail atomically',()=>{
 const def={abilities:{lmb:naniteCannon,q:naniteShield}},original=copy(def);
 assert.throws(()=>setAttackOverride({},def,'q',{naniteAttachment:'right-forearm'}));assert.deepEqual(def,original);
 assert.throws(()=>applyAttackOverrides({abilities:{lmb:naniteCannon,q:{...naniteShield,naniteAttachment:'right-forearm'}}}));
 for(const bad of [{naniteCellHp:0},{naniteStage1:.7},{naniteForm:'other'},{type:'projectile'},{naniteMaterial:'plastic'}])assert.throws(()=>applyAttackOverrides(fighter({...naniteCannon,...bad})));
});
test('profile-level effective validation rejects a valid sparse patch conflicting with another source forearm',()=>{
 const def={abilities:{lmb:naniteCannon,q:naniteShield}},patch={q:{identity:attackIdentity(naniteShield),source:copy(naniteShield),values:{naniteAttachment:'right-forearm'}}};
 assert.throws(()=>validateAttackOverrides(patch,def));
});

test('metadata exposes production fields and truthy-fallback bounds', () => {
  assert.deepEqual(Object.keys(ATTACK_TUNING_FIELDS).sort(), ['beam', 'charge', 'construct', 'projectile', 'rifle', 'volley']);
  const beam = fighter(ability('beam', { charge: true, chargeWidth: true }));
  const byKey = Object.fromEntries(attackFields(beam, 'lmb', {}).map(field => [field.key, field]));
  assert.equal(byKey.cost.min, 0, 'beam entry cost is genuinely allowed to be free');
  assert.equal(byKey.steer.min, 0, 'BeamHose honors zero steering');
  assert.ok(byKey.radius.min > 0, 'beam radius uses a truthy runtime default');
  assert.ok(byKey.maxCharge.min > 0, 'charge duration uses a truthy runtime default');
  assert.equal(byKey.tipSpeed.unit, 'u/s');
  assert.equal(byKey.dps.unit, 'hp/s');
  assert.equal(byKey.charge.kind, 'boolean');

  const plain = fighter(ability('beam'));
  assert.equal(attackFields(plain, 'lmb', {}).some(field => field.key === 'charge'), false,
    'an absent mechanic boolean is not offered as a new mechanic');
  const volley = fighter(ability('volley'));
  assert.ok(attackFields(volley, 'lmb', {}).find(field => field.key === 'cost').min > 0,
    'volley zero cost would be ignored by its truthy fallback');
});

test('metadata defaults mirror truthy runtime fallbacks while preserving real zero controls', () => {
  const projectile = fighter(ability('projectile', {
    cost: 0, damage: 0, speed: 0, radius: 0, blast: 0, homing: 0, grav: 0,
  }));
  const projectileFields = Object.fromEntries(attackFields(projectile, 'lmb', {}).map(field => [field.key, field]));
  assert.equal(projectileFields.cost.default, 0);
  assert.equal(projectileFields.damage.default, 14);
  assert.equal(projectileFields.speed.default, 70);
  assert.equal(projectileFields.radius.default, 1.4);
  assert.equal(projectileFields.blast.default, 5);
  assert.equal(projectileFields.homing.default, 0);
  assert.equal(projectileFields.grav.default, 0);

  const beam = fighter(ability('beam', { cost: 0, dps: 0, steer: 0 }));
  const beamFields = Object.fromEntries(attackFields(beam, 'lmb', {}).map(field => [field.key, field]));
  assert.equal(beamFields.cost.default, 0);
  assert.equal(beamFields.dps.default, 60);
  assert.equal(beamFields.steer.default, 0);
});

test('beam, projectile, volley and charge overrides apply sparsely without mutating sources', () => {
  const fixtures = [
    [ability('beam', { radius: 1.2, dps: 50, charge: true, chargeWidth: true }), { radius: 2.4, dps: 75, chargeWidth: false }],
    [ability('projectile', { damage: 14, speed: 70, radius: 1.4, blast: 5, homing: 0 }), { damage: 31, speed: 120, homing: 4 }],
    [ability('volley', { cost: 3, interval: .08, damage: 6, speed: 105, radius: .8, blast: 3.4, spread: .09 }), { interval: .16, damage: 9, spread: .2 }],
    [ability('charge', { cost: 6, maxCharge: 2.2, minR: 1.3, maxR: 5, dmgMin: 20, dmgMax: 70, maxBlast: 26, speedMin: 42, speedMax: 70 }), { maxCharge: 3, minR: 2, maxR: 7, dmgMin: 30, dmgMax: 99 }],
  ];
  for (const [source, patch] of fixtures) {
    const def = fighter(source); const before = copy(def);
    const attacks = setAttackOverride({}, def, 'lmb', patch);
    const applied = applyAttackOverrides(def, attacks);
    for (const [key, value] of Object.entries(patch)) assert.equal(applied.abilities.lmb[key], value, `${source.type}.${key}`);
    assert.deepEqual(applied.abilities.lmb.nested, source.nested, `${source.type} lost an untuned nested field`);
    assert.deepEqual(def, before, `${source.type} source was mutated`);
    assert.deepEqual(Object.keys(attacks.lmb.values).sort(), Object.keys(patch).sort());
    assert.equal(attacks.lmb.identity, attackIdentity(source));
  }
});

test('validation rejects unsupported, nonfinite, out-of-bounds and incompatible values', () => {
  const charge = fighter(ability('charge', {
    maxCharge: 2.2, minR: 1.3, maxR: 5, dmgMin: 20, dmgMax: 70,
    maxBlast: 26, speedMin: 42, speedMax: 70,
  }));
  assert.throws(() => setAttackOverride({}, charge, 'lmb', { invented: 1 }), /unsupported/i);
  assert.throws(() => setAttackOverride({}, charge, 'lmb', { invented: undefined }), /unsupported|JSON/i);
  assert.throws(() => setAttackOverride({}, charge, 'lmb', { dmgMax: () => 12 }), /JSON|number/i);
  assert.throws(() => setAttackOverride({}, charge, 'lmb', { dmgMax: Number.NaN }), /finite|number/i);
  assert.throws(() => setAttackOverride({}, charge, 'lmb', { maxCharge: 0 }), /between|greater/i);
  assert.throws(() => setAttackOverride({}, charge, 'lmb', { minR: 6 }), /minR.*maxR|radius/i);
  assert.throws(() => setAttackOverride({}, charge, 'lmb', { minR: 5 }), /minR.*maxR|radius/i);
  assert.throws(() => setAttackOverride({}, charge, 'lmb', { dmgMin: 71 }), /dmgMin.*dmgMax|damage/i);
  assert.throws(() => setAttackOverride({}, charge, 'lmb', { dmgMin: 70 }), /dmgMin.*dmgMax|damage/i);
  assert.throws(() => setAttackOverride({}, charge, 'lmb', { speedMin: 71 }), /speedMin.*speedMax|speed/i);
  assert.doesNotThrow(() => setAttackOverride({}, charge, 'lmb', { speedMin: 70 }));
  assert.throws(() => setAttackOverride({}, charge, 'lmb', { maxBlast: 8 }), /between|blast/i);
  const beam = fighter(ability('beam', { radius: 1.2, chargeWidth: true }));
  assert.throws(() => setAttackOverride({}, beam, 'lmb', { chargeWidth: 1 }), /true or false|boolean/i);
  assert.throws(() => setAttackOverride({}, fighter(ability('beam')), 'lmb', { chargeWidth: true }), /unsupported|source/i);
});

test('application uses the immutable genuine basis for repeated apply and reset', () => {
  const source = fighter(ability('projectile', { damage: 10, speed: 70, radius: 1.2, blast: 4 }));
  const attacks = setAttackOverride({}, source, 'lmb', { damage: 25 });
  const once = applyAttackOverrides(source, attacks);
  const twice = applyAttackOverrides(once, setAttackOverride(attacks, once, 'lmb', { damage: 40 }));
  assert.equal(twice.abilities.lmb.damage, 40);
  assert.equal(attackFields(twice, 'lmb', attackOverridesFromDef(twice)).find(f => f.key === 'damage').default, 10);
  const reset = applyAttackOverrides(twice, resetAttackOverride(attackOverridesFromDef(twice), 'lmb'));
  assert.equal(reset.abilities.lmb.damage, 10);
  assert.deepEqual(reset.abilities.lmb.nested, source.abilities.lmb.nested);
});

test('identity reconciliation retains the same source and drops same-type replacement tuning', () => {
  const original = fighter(ability('projectile', { name: 'Bolt A', damage: 10, speed: 70, radius: 1, blast: 4 }));
  const attacks = setAttackOverride({}, original, 'lmb', { damage: 30 });
  assert.ok(reconcileAttackOverrides(copy(original), attacks).lmb);
  const replacement = fighter(ability('projectile', { name: 'Bolt B', damage: 10, speed: 70, radius: 1, blast: 4 }));
  assert.deepEqual(reconcileAttackOverrides(replacement, attacks), {});
  assert.equal(applyAttackOverrides(replacement, attacks).abilities.lmb.damage, 10);
  assert.deepEqual(carryAttackOverrides(applyAttackOverrides(original, attacks), replacement).abilities.lmb, replacement.abilities.lmb);
});

test('an imported source snapshot cannot smuggle runtime fields into a genuine definition', () => {
  const genuine = fighter(ability('projectile', { damage: 10, speed: 70, radius: 1, blast: 4 }));
  const maliciousSource = { ...genuine.abilities.lmb, damage: 999, executableFlag: true };
  const attacks = {
    lmb: { identity: attackIdentity(maliciousSource), source: maliciousSource, values: { damage: 50 } },
  };
  assert.deepEqual(reconcileAttackOverrides(genuine, validateAttackOverrides(attacks)), {});
  const applied = applyAttackOverrides(genuine, attacks);
  assert.equal(applied.abilities.lmb.damage, 10);
  assert.equal(Object.hasOwn(applied.abilities.lmb, 'executableFlag'), false);
});

test('legacy profiles remain valid and optional attack overrides round-trip into actual abilities', () => {
  const def = ROSTER.find(hero => hero.id === 'sol');
  const legacy = profileFromDef(def); delete legacy.attacks;
  assert.deepEqual(validateProfile(legacy).attacks, {});

  let profile = profileFromDef(def);
  profile.attacks = setAttackOverride(profile.attacks, def, 'lmb', { dps: 91, steer: 0 });
  const storage = store(); saveProfile(profile, storage);
  const loaded = loadProfile(def.id, storage);
  assert.equal(loaded.attacks.lmb.values.dps, 91);
  const applied = applyProfile(def, loaded);
  assert.equal(applied.abilities.lmb.dps, 91);
  assert.equal(applied.abilities.lmb.steer, 0);
  assert.equal(def.abilities.lmb.dps, 60);
});

test('profile persistence rejects attack overrides outside actual production slots before writing', () => {
  const def = ROSTER.find(hero => hero.id === 'sol'), profile = profileFromDef(def), storage = store();
  const entry = setAttackOverride({}, def, 'lmb', { dps: 91 }).lmb;
  profile.attacks = { arbitrary_slot: entry };
  assert.throws(() => saveProfile(profile, storage), /slot/i);
  assert.equal(storage.getItem('lsw.studio.profiles.v1'), null);
});

test('installing a reset profile removes stale tuning metadata from a previously authored roster def', () => {
  const def = copy(ROSTER.find(hero => hero.id === 'sol')), storage = store();
  let tuned = profileFromDef(def);
  tuned.attacks = setAttackOverride(tuned.attacks, def, 'lmb', { dps: 91 });
  saveProfile(tuned, storage); installProfiles([def], storage);
  assert.equal(def.abilities.lmb.dps, 91);
  assert.ok(def._attackTuning);

  const reset = profileFromDef(def); reset.attacks = resetAttackOverride(reset.attacks, 'lmb');
  saveProfile(reset, storage); installProfiles([def], storage);
  assert.equal(def.abilities.lmb.dps, 60);
  assert.equal(Object.hasOwn(def, '_attackTuning'), false);
});

test('all shipped and ORIGIN supported sources validate without changing shipped defaults', () => {
  const before = JSON.stringify(ROSTER.map(def => def.abilities));
  let count = 0;
  for (const def of ROSTER) for (const [slot, source] of Object.entries(def.abilities || {})) {
    if (!attackSource(def, slot)) continue;
    const attacks = setAttackOverride({}, def, slot, {});
    validateAttackOverrides(attacks, def); count++;
  }
  for (const power of POWERS) if (attackSource(fighter(power.ab), 'lmb')) {
    const def = fighter(copy(power.ab));
    validateAttackOverrides(setAttackOverride({}, def, 'lmb', {}), def); count++;
  }
  assert.ok(count > 80, 'fixture did not cover the production catalog');
  assert.equal(JSON.stringify(ROSTER.map(def => def.abilities)), before);
});

test('ORIGIN edits retain compatible tuning and discard a changed attack even at the same type', () => {
  const storage = store(), roster = [];
  const picks = freshPicks(); Object.assign(picks, { name: 'Tuner' });
  Object.assign(picks.slots, { lmb: 'heatray', rmb: 'kibolt' });
  const base = buildDef(picks, 'cx_tuner');
  let profile = profileFromDef(base);
  profile.attacks = setAttackOverride(profile.attacks, base, 'lmb', { dps: 99 });
  const tuned = applyProfile(base, profile);
  saveCustom(copy(picks), tuned, roster, storage);

  const retainedPicks = copy(picks); retainedPicks.attrs.vig = 5;
  const retained = saveCustom(retainedPicks, buildDef(retainedPicks, 'cx_tuner'), roster, storage);
  assert.equal(retained.abilities.lmb.dps, 99);
  assert.equal(profileFromDef(retained).attacks.lmb.values.dps, 99);

  const changedPicks = copy(retainedPicks); changedPicks.slots.lmb = 'cryobeam';
  const changed = saveCustom(changedPicks, buildDef(changedPicks, 'cx_tuner'), roster, storage);
  assert.equal(changed.abilities.lmb.dps, 46);
  assert.equal(profileFromDef(changed).attacks.lmb, undefined);
});

test('character packages reconstruct tuned attacks from genuine ORIGIN sources', () => {
  const picks = freshPicks(); Object.assign(picks, { name: 'Portable' });
  Object.assign(picks.slots, { lmb: 'wavecannon', rmb: 'bigbang' });
  const source = buildDef(picks, 'cx_portable');
  let profile = profileFromDef(source);
  profile.attacks = setAttackOverride(profile.attacks, source, 'lmb', { dps: 123, chargeWidth: false });
  profile.attacks = setAttackOverride(profile.attacks, source, 'rmb', { dmgMax: 110, maxR: 7 });
  const pack = exportCharacter({ picks, def: source }, profile);
  const storage = store(), roster = [];
  const imported = importCharacter(pack, roster, storage);
  assert.equal(imported.def.abilities.lmb.dps, 123);
  assert.equal(imported.def.abilities.lmb.chargeWidth, false);
  assert.equal(imported.def.abilities.rmb.dmgMax, 110);
  assert.equal(profileFromDef(imported.def).attacks.rmb.values.maxR, 7);
  assert.equal(attackSource(imported.def, 'lmb').dps, 88);
});
