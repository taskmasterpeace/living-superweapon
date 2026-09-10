// Character Studio attack authoring. This module is intentionally data-only:
// it validates the small set of values the supported production ability
// types already consume, and never invents a second combat representation.
//
// Public controller contract:
// - ATTACK_TUNING_FIELDS: static labels, units, bounds, steps and fallbacks.
// - attackFields(def, slot, attacks): available controls with default/current.
// - setAttackOverride / resetAttackOverride: immutable sparse-map edits.
// - validateAttackOverrides: schema, numeric, emitter/preset and paired-range validation.
// - reconcileAttackOverrides: discard valid entries whose source identity changed.
// - applyAttackOverrides: rebuild real abilities from their original basis.
// - attackIdentity / attackSource / attackOverridesFromDef: read-only identity
//   and persisted-basis access for Studio and package integration.
// - carryAttackOverrides: conservative ORIGIN recipe-edit handoff.
import {resolveConstructPolicy} from '../engine/construct-policy.js';
import {tankSettings} from '../engine/construct-tank.js';
import {naniteConfig,naniteFields,validateNaniteLoadout} from './nanite-tuning.js';
import {BEAM_BUILDS,BEAM_TEMPERS,beamBuildOf,beamTemperOf} from './visual.js';

const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const fail = message => { throw new Error(message); };
const POSITIVE = .001;
const ATTACK_SLOTS = Object.freeze(['lmb', 'rmb', 'q', 'e', 'f', 'r', 'shift']);
const UNIT_BY_KEY = Object.freeze({
  cost: 'ki', cd: 's', radius: 'u', tipSpeed: 'u/s', maxLen: 'u', dps: 'hp/s', kiPerSec: 'ki/s',
  steer: 'rate', power: '×', siphon: 'ki/hp', maxCharge: 's', kiChargePerSec: 'ki/s', chargePower: '×',
  damage: 'hp', speed: 'u/s', blast: 'u', homing: 'rate', grav: 'u/s²', range: 'u', bounces: 'count',
  interval: 's', life: 's', scopeZoom: '×', spread: 'rad', minR: 'u', maxR: 'u', dmgMin: 'hp', dmgMax: 'hp', maxBlast: 'u',
  speedMin: 'u/s', speedMax: 'u/s',
  detonateRadius: 'u', detonateDamage: 'hp',
  splitCount:'count',splitSpread:'rad',splitSpeed:'u/s',splitHoming:'rate',
  collisionPriority:'rank',interceptKi:'ki',
  castMoveScale:'×',
  throwWindup:'s',throwRecovery:'s',
  duration:'s',constructKiPerSec:'ki/s',constructKiPerDamage:'ki/hp',moveSpeed:'u/s',turnRate:'rad/s',
});

const number = (key, label, min, max, step, fallback, existingOnly = false, requires) =>
  Object.freeze({ key, label, kind: 'number', unit: UNIT_BY_KEY[key] || '', min, max, step, fallback, existingOnly, ...(requires ? { requires } : {}) });
const boolean = (key, label) =>
  Object.freeze({ key, label, kind: 'boolean', existingOnly: true });
const CAST_STYLES=Object.freeze([
  {value:'auto',label:'Automatic'}, {value:'palm',label:'Palm projection'},
  {value:'two-hand',label:'Two-hand projection'}, {value:'optic-focus',label:'Optic focus'},
  {value:'chest-brace',label:'Chest brace'},
].map(Object.freeze));
const emissionOrigin=Object.freeze({key:'emissionOrigin',label:'Attack origin',kind:'enum',existingOnly:false,fallback:'auto',options:[
 {value:'auto',label:'Kit default'},{value:'right',label:'Right palm'},{value:'left',label:'Left palm'},
 {value:'paired',label:'Combined palms · one stream'},{value:'chest',label:'Chest'},{value:'eyes',label:'Eyes'},
]});
// Authoring compiles to the existing physical ability contract. The immutable
// source snapshot remains the reset basis; imported snapshots never become kits.
function materializeAttack(source,values={}){
 if(source.naniteForm!==undefined){
  const attack={...source,...values},config=naniteConfig(attack);
  if(config.naniteForm==='cannon'){attack.castHand=config.naniteAttachment==='left-forearm'?'left':'right';attack.castStyle='palm';}
  return attack;
 }
 const attack={...source,...values},origin=attack.emissionOrigin??'auto';delete attack.emissionOrigin;
 if(origin==='auto')return attack;
 attack.faceOrigin=origin==='eyes';attack.chest=origin==='chest';attack.castHand=origin==='left'?'left':'right';
 if(!attack.castStyle||attack.castStyle==='auto')attack.castStyle=origin==='eyes'?'optic-focus':origin==='chest'?'chest-brace':origin==='paired'?'two-hand':'palm';
 return attack;
}
// The emitter is production data. A presentation choice cannot move it.
const castEmitter=source=>source.faceOrigin?'face':source.chest?'chest':'hand';
function castStyleOptions(source){
  const origin=source.emissionOrigin??'auto';
  if(origin!=='auto'){
    const styles=origin==='eyes'?['auto','optic-focus']:origin==='chest'?['auto','chest-brace']:origin==='paired'?['auto','two-hand']:['auto','palm'];
    return Object.freeze(CAST_STYLES.filter(option=>styles.includes(option.value)));
  }
  const emitter=castEmitter(source),styles=emitter==='face'?['auto','optic-focus']:
    emitter==='chest'?['auto','chest-brace']:['auto','palm','two-hand'];
  return Object.freeze(CAST_STYLES.filter(option=>styles.includes(option.value)));
}
const remoteTrigger=Object.freeze({key:'remoteDetonate',label:'Second press detonates',kind:'boolean',existingOnly:false,fallback:false});
const collisionPriority=number('collisionPriority','Shot priority (−1 = off)',-1,16,1,-1);
const freezeType = fields => Object.freeze(fields.map(Object.freeze));
const splitFields = [
  number('splitCount','Split children (0 = off)',0,8,1,0),
  number('splitSpread','Split cone angle',0,1.4,.05,.55),
  number('splitSpeed','Child speed',20,2000,1,90),
  number('splitHoming','Child homing',0,100,.1,3),
];

// `fallback` mirrors the value selected by production's current `||` / nullish
// reads. A zero lower bound is used only where zero reaches combat unchanged.
export const ATTACK_TUNING_FIELDS = Object.freeze({
  rifle: freezeType([
    number('life','Projectile lifetime',.05,12,.05,1.4),
    number('scopeZoom','Sight magnification (1 = off)',1,6,.25,1),
    number('blast','Splash radius (0 = direct hit)',0,100,.1,2.2),
    number('magazine','Magazine (0 = energy weapon)',0,300,1,0),
    number('reserveAmmo','Reserve ammunition',0,9999,1,120),
    number('reloadTime','Reload duration',.25,15,.05,2.2),
    number('cost','Energy / shot',0,1000,1,2),
    number('interval','Shot interval',.02,10,.01,.09),
    number('damage','Damage / projectile',.1,1000,.1,5),
    number('speed','Muzzle velocity',1,10000,1,170),
    number('spread','Spread',0,1,.001,.045),
    number('recoil','Recoil',0,30,.1,1.6),
  ]),
  construct: freezeType([
    {key:'constructLifetime',label:'Construct lifetime',kind:'enum',fallback:'timed',options:[
      {value:'timed',label:'Timed'},{value:'upkeep',label:'Continuous upkeep'},{value:'damage',label:'Damage-backed energy'},
    ]},
    number('duration','Timed duration',1,60,.1,9),
    number('constructKiPerSec','Existence cost',.1,100,.1,12),
    number('constructKiPerDamage','Damage conversion',.01,10,.01,1),
    ...[
      number('moveSpeed','Hull movement speed',1,40,.1,12),number('turnRate','Hull turn rate',.1,6,.1,1.8),
      number('damage','Cannon damage',1,120,1,18),number('interval','Cannon interval',.1,6,.1,1.2),
      number('speed','Cannon projectile speed',20,180,1,90),number('range','Cannon acquisition range',10,160,1,90),
      number('blast','Cannon blast radius',1,30,.1,6),
    ].map(field=>({...field,forms:['tank']})),
  ]),
  beam: freezeType([
    emissionOrigin,
    {key:'castStyle',label:'Beam pose',kind:'enum',existingOnly:false,fallback:'auto',options:CAST_STYLES},
    number('castMoveScale','Movement while casting',0,1,.05,1),
    Object.freeze({key:'pierceFighters',label:'Pierce fighters (otherwise stops on impact)',kind:'boolean',existingOnly:false,fallback:false}),
    Object.freeze({key:'interceptBullets',label:'Absorb ballistic bullets',kind:'boolean',existingOnly:false,fallback:false}),
    number('interceptKi','Minimum invested energy',0,10000,1,30),
    number('cost', 'Entry cost', 0, 1000, 1, 0),
    number('cd', 'Recovery', 0, 120, .05, 0),
    number('radius', 'Width', POSITIVE, 100, .1, 1.6),
    number('tipSpeed', 'Tip speed', POSITIVE, 6000, 1, 150),
    number('maxLen', 'Reach', POSITIVE, 2000, 1, 120),
    number('dps', 'Damage / sec', POSITIVE, 5000, 1, 60),
    number('kiPerSec', 'Sustain cost / sec', POSITIVE, 1000, 1, 22),
    number('steer', 'Steering', 0, 100, .1, 10),
    number('pushForce', 'Push acceleration (0 = no shove)', 0, 2000, 1, 368),
    {key:'build',label:'Stream shape',kind:'enum',options:BEAM_BUILDS.map(value=>({value,label:{ray:'Ray · thin',hose:'Hose · focused',torrent:'Torrent · heavy'}[value]}))},
    {key:'temper',label:'Flow pattern',kind:'enum',options:BEAM_TEMPERS.map(value=>({value,label:value}))},
    number('guardChip', 'Blocked damage fraction', 0, 1, .01, .22),
    number('guardDrain', 'Guard drain / sec', 0, 5, .01, .28),
    number('sourceGlow', 'Emitter glow / light (0 = off)', 0, 3, .05, 1),
    number('sourceScale', 'Emitter envelope scale', .1, 3, .05, 1),
    number('impactGlow', 'Surface impact light (0 = off)', 0, 3, .05, 1),
    number('power', 'Impact power', POSITIVE, 100, .1, 1),
    remoteTrigger,
    number('detonateRadius', 'Detonation radius', 0, 500, .1, 12.8),
    number('detonateDamage', 'Detonation damage', 0, 5000, 1, 48),
    number('siphon', 'Energy siphon', POSITIVE, 100, .1, undefined, true),
    number('maxCharge', 'Charge time', POSITIVE, 30, .05, 1.6, true, 'charge'),
    number('kiChargePerSec', 'Charge cost / sec', POSITIVE, 1000, 1, 14, true, 'charge'),
    number('chargePower', 'Charge power', POSITIVE, 100, .1, 1.4, true, 'charge'),
    boolean('charge', 'Charge before firing'),
    boolean('chargeWidth', 'Charge widens beam'),
    boolean('faceOrigin', 'Face emitter'),
    boolean('spiral', 'Spiral stream'),
  ]),
  projectile: freezeType([
    number('throwWindup','Throw preparation',.24,1.5,.02,.38,true),
    number('throwRecovery','Throw recovery',.15,1,.02,.32,true),
    collisionPriority,
    number('cost', 'Entry cost', 0, 1000, 1, 0),
    number('cd', 'Recovery', 0, 120, .05, 0),
    number('damage', 'Damage', POSITIVE, 5000, 1, 14),
    number('speed', 'Speed', POSITIVE, 2000, 1, 70),
    number('radius', 'Radius', POSITIVE, 100, .1, 1.4),
    number('blast', 'Blast radius', POSITIVE, 500, .1, 5),
    remoteTrigger,
    ...splitFields,
    number('power', 'Impact power', POSITIVE, 100, .1, 1),
    number('homing', 'Homing', 0, 100, .1, 0, true),
    number('grav', 'Gravity', 0, 500, .1, 0, true),
    number('range', 'Return range', POSITIVE, 2000, 1, 55, true),
    number('bounces', 'Ricochets', 0, 32, 1, 0, true),
    boolean('shock', 'Ground shockwave'),
    boolean('arrow', 'Arrow body'),
    boolean('boomerang', 'Returning shot'),
    boolean('canister', 'Canister body'),
    boolean('card', 'Card body'),
    boolean('disc', 'Disc body'),
    boolean('pumpkin', 'Pumpkin body'),
    boolean('blade', 'Blade body'),
    boolean('gear', 'Gear attack'),
  ]),
  volley: freezeType([
    {key:'handPattern',label:'Firing hands',kind:'enum',existingOnly:false,fallback:'alternate',options:[
      {value:'alternate',label:'Alternating hands'},{value:'paired',label:'Both hands · 2 shots / cost ×2'},
      {value:'right',label:'Right hand'},{value:'left',label:'Left hand'},
    ]},
    collisionPriority,
    // Volley uses `(cost || 3)`, so authored zero would only be displayed and ignored.
    number('cost', 'Cost / shot', POSITIVE, 1000, 1, 3),
    number('interval', 'Shot interval', POSITIVE, 30, .01, .08),
    number('damage', 'Damage / shot', POSITIVE, 5000, 1, 6),
    number('speed', 'Speed', POSITIVE, 2000, 1, 105),
    number('radius', 'Radius', POSITIVE, 100, .05, .8),
    number('blast', 'Blast radius', POSITIVE, 500, .1, 3.4),
    number('spread', 'Spread', POSITIVE, Math.PI, .01, .09),
    number('homing', 'Homing', 0, 100, .1, 0, true),
    number('grav', 'Gravity', 0, 500, .1, 0, true),
    number('bounces', 'Ricochets', 0, 32, 1, 0, true),
    boolean('arrow', 'Arrow body'),
    boolean('blade', 'Blade body'),
    boolean('gear', 'Gear attack'),
    boolean('oneHand', 'One-hand attack'),
  ]),
  charge: freezeType([
    emissionOrigin,
    {key:'castStyle',label:'Attack pose',kind:'enum',existingOnly:false,fallback:'auto',options:CAST_STYLES},
    number('castMoveScale','Movement while casting',0,1,.05,1),
    collisionPriority,
    remoteTrigger,
    ...splitFields,
    number('cost', 'Entry cost', 0, 1000, 1, 0),
    number('cd', 'Recovery', 0, 120, .05, 0),
    number('kiPerSec', 'Charge cost / sec', POSITIVE, 1000, 1, 12),
    number('maxCharge', 'Charge time', POSITIVE, 30, .05, 2.2),
    number('minR', 'Minimum radius', POSITIVE, 100, .1, 1.3),
    number('maxR', 'Maximum radius', POSITIVE, 100, .1, 5),
    number('dmgMin', 'Minimum damage', POSITIVE, 5000, 1, 20),
    number('dmgMax', 'Maximum damage', POSITIVE, 5000, 1, 70),
    // Production starts this interpolation at a fixed 8u; keeping the authored
    // maximum at or above 8 preserves the charge = scale law.
    number('maxBlast', 'Maximum blast', 8.001, 500, .1, 26),
    number('speedMin', 'Charged speed', POSITIVE, 2000, 1, 42),
    number('speedMax', 'Quick-release speed', POSITIVE, 2000, 1, 70),
    number('chargePower', 'Charge power', POSITIVE, 100, .1, 3),
    boolean('chest', 'Chest emitter'),
    boolean('gear', 'Gear attack'),
  ]),
});

function safeTree(value, path = 'Attack source', depth = 0) {
  if (depth > 24) fail(`${path} is nested too deeply.`);
  if (value === null || ['string', 'boolean'].includes(typeof value)) return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail(`${path} must contain only finite numbers.`);
    return;
  }
  if (!value || typeof value !== 'object') fail(`${path} must contain JSON data only.`);
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) safeTree(value[i], `${path}[${i}]`, depth + 1);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) fail(`Unsafe key in ${path}.`);
    safeTree(child, `${path}.${key}`, depth + 1);
  }
}

function record(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${path} must be an object.`);
  for (const key of Object.keys(value)) if (['__proto__', 'constructor', 'prototype'].includes(key)) fail(`Unsafe key in ${path}.`);
}

function allowed(value, keys, path) {
  if (Object.keys(value).some(key => !keys.includes(key))) fail(`${path} contains unsupported fields.`);
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

export function attackIdentity(attack) {
  record(attack, 'Attack'); safeTree(attack);
  if (typeof attack.type !== 'string') fail('Attack type must be a string.');
  return `attack-v1:${stable(attack)}`;
}

function definitionsFor(source) {
  if(source?.naniteForm!==undefined){
    naniteConfig(source);
    const native=source.naniteForm==='cannon'?ATTACK_TUNING_FIELDS.charge.filter(f=>!['emissionOrigin','faceOrigin','chest','castStyle','castHand'].includes(f.key)&&(!f.existingOnly||Object.hasOwn(source,f.key))):[];
    return [...native,...naniteFields(source)];
  }
  const definitions = ATTACK_TUNING_FIELDS[source?.type];
  if (!definitions) fail(`Unsupported attack type: ${String(source?.type)}.`);
  if(source.type==='construct'&&!['wall','tank'].includes(source.construct))fail('Construct tuning currently supports source walls and tanks only.');
  return definitions.filter(field => (!field.forms||field.forms.includes(source.construct))&&(!field.existingOnly || Object.hasOwn(source, field.key) || (field.requires && source[field.requires] === true)));
}

function sourceValue(source, field) {
  if (Object.hasOwn(source, field.key)) {
    const value = source[field.key];
    // A zero in a truthy-fallback lane is not the production default: combat
    // substitutes the fallback. Metadata must describe what will really run.
    if (field.kind === 'number' && value === 0 && field.min > 0) return field.fallback;
    return value;
  }
  if(field.key==='build')return beamBuildOf(source);
  if(field.key==='temper')return beamTemperOf(source);
  if(field.key==='pushForce')return source.faceOrigin?0:368;
  if(field.key==='detonateRadius')return Math.max(8,(source.radius||1.6)*8);
  if(field.key==='detonateDamage')return (source.dps||60)*.8;
  if(field.key==='handPattern')return source.arrow&&source.gear?'left':source.oneHand?'right':'alternate';
  if(source.type==='rifle'){
    const cls=source.weapon||(source.interval&&source.interval<.2?'rifle':'pistol');
    if(field.key==='life')return cls==='shotgun'?.34:1.4;
    if(field.key==='spread')return cls==='shotgun'?.17:cls==='pistol'?.02:.045;
    if(field.key==='recoil')return cls==='shotgun'?6.5:cls==='pistol'?3:1.6;
  }
  return field.fallback;
}

function isOverride(source,field,value){
  // Explicit choices pin a derived default even when a companion field changes
  // (beam width/DPS, or the volley one-hand/gear flags).
  if(!Object.hasOwn(source,field.key) && ['detonateRadius','detonateDamage','handPattern','build','temper','pushForce'].includes(field.key))return true;
  return value!==sourceValue(source,field);
}

function validateValues(source, values, path) {
  record(values, path);
  const definitions = definitionsFor(source), byKey = Object.fromEntries(definitions.map(field => [field.key, field]));
  allowed(values, Object.keys(byKey), path);
  for (const [key, value] of Object.entries(values)) {
    const field = byKey[key];
    if(['magazine','reserveAmmo'].includes(key)&&!Number.isInteger(value))fail(`${path}.${key} must be a whole number.`);
    if (field.kind === 'boolean') {
      if (typeof value !== 'boolean') fail(`${path}.${key} must be true or false.`);
    } else if(field.kind==='enum') {
      if(!field.options.some(option=>option.value===value))fail(`${path}.${key} must be one of ${field.options.map(option=>option.value).join(', ')}.`);
    } else if (typeof value !== 'number' || !Number.isFinite(value) || value < field.min || value > field.max) {
      fail(`${path}.${key} must be a finite number between ${field.min} and ${field.max}.`);
    }
  }
  const effective = Object.fromEntries(definitions.map(field => [field.key,
    Object.hasOwn(values, field.key) ? values[field.key] : sourceValue(source, field)]));
  if(source.naniteForm!==undefined)naniteConfig({...source,...values});
  if(source.type==='construct'){
    // Validate precisely what native construction receives, including dormant
    // source rates. Display fallbacks must not sanitize an invalid raw source,
    // and normalized policy/settings must never materialize into saved overrides.
    const native={...source,...values};resolveConstructPolicy(native);
    if(native.construct==='tank')tankSettings(native);
  }
  if(source.naniteForm===undefined&&(source.type==='beam'||source.type==='charge')){
    const attack={...source,...effective},options=castStyleOptions(attack);
    if(!options.some(option=>option.value===effective.castStyle))
      fail(`${path}.castStyle is incompatible with the ${castEmitter(attack)} emitter. Choose ${options.map(option=>option.value).join(' or ')}.`);
  }
  if(effective.splitCount!==undefined && (!Number.isInteger(effective.splitCount) || effective.splitCount===1))
    fail(`${path}: splitCount must be 0 (off) or a whole number from 2 to 8.`);
  if(effective.collisionPriority!==undefined && !Number.isInteger(effective.collisionPriority))
    fail(`${path}: collisionPriority must be a whole number from -1 (off) to 16.`);
  if (source.type === 'charge') {
    if (effective.minR >= effective.maxR) fail(`${path}: minR must be less than maxR (radius range).`);
    if (effective.dmgMin >= effective.dmgMax) fail(`${path}: dmgMin must be less than dmgMax (damage range).`);
    if (effective.speedMin > effective.speedMax) fail(`${path}: speedMin must not exceed speedMax (speed range).`);
  }
  return effective;
}

function normalizeEntry(entry, slot) {
  record(entry, `Attack ${slot}`);
  allowed(entry, ['identity', 'source', 'values'], `Attack ${slot}`);
  if (typeof entry.identity !== 'string') fail(`Attack ${slot}.identity must be a string.`);
  record(entry.source, `Attack ${slot}.source`); safeTree(entry.source, `Attack ${slot}.source`);
  const identity = attackIdentity(entry.source);
  if (entry.identity !== identity) fail(`Attack ${slot} source identity does not match its snapshot.`);
  validateValues(entry.source, entry.values, `Attack ${slot}.values`);
  const values = {};
  for (const [key, value] of Object.entries(entry.values)) {
    const field = definitionsFor(entry.source).find(candidate => candidate.key === key);
    if (isOverride(entry.source,field,value)) values[key] = value;
  }
  return { identity, source: copy(entry.source), values };
}

export function validateAttackOverrides(attacks, def) {
  if (attacks === undefined) return {};
  record(attacks, 'Attack overrides');
  const result = {};
  for (const [slot, entry] of Object.entries(attacks)) {
    if (!ATTACK_SLOTS.includes(slot)) fail(`Invalid attack slot: ${slot}.`);
    const normalized = normalizeEntry(entry, slot);
    if (Object.keys(normalized.values).length) result[slot] = normalized;
  }
  if(!def)return result;
  const compatible=reconcileAttackOverrides(def,result);applyAttackOverrides(def,compatible);return compatible;
}

function metadataState(def) {
  const meta = def?._attackTuning;
  if (!meta || meta.version !== 1 || !meta.sources || !meta.attacks) return null;
  try {
    record(meta.sources, 'Attack tuning sources');
    const attacks = validateAttackOverrides(meta.attacks);
    const sources = {};
    for (const [slot, source] of Object.entries(meta.sources)) {
      record(source, `Attack tuning source ${slot}`); safeTree(source, `Attack tuning source ${slot}`);
      if (!ATTACK_TUNING_FIELDS[source.type]&&source.naniteForm===undefined) continue;
      const entry = attacks[slot];
      const expected = materializeAttack(source,entry?.values || {});
      if (stable(expected) !== stable(def.abilities?.[slot])) continue;
      sources[slot] = copy(source);
    }
    return { sources, attacks };
  } catch {
    return null;
  }
}

export function attackSource(def, slot) {
  const meta = metadataState(def);
  const source = meta?.sources?.[slot] || def?.abilities?.[slot];
  if (!source || (!ATTACK_TUNING_FIELDS[source.type]&&source.naniteForm===undefined)) return null;
  if(source.type==='construct'&&!['wall','tank'].includes(source.construct))return null;
  return copy(source);
}

export function attackOverridesFromDef(def) {
  const meta = metadataState(def);
  return copy(meta?.attacks || {});
}

export function reconcileAttackOverrides(def, attacks = {}) {
  const valid = validateAttackOverrides(attacks), result = {};
  for (const [slot, entry] of Object.entries(valid)) {
    const genuine = attackSource(def, slot);
    if (genuine && attackIdentity(genuine) === entry.identity) result[slot] = entry;
  }
  return copy(result);
}

export function attackFields(def, slot, attacks = {}) {
  const source = attackSource(def, slot);
  if (!source) return [];
  const compatible = reconcileAttackOverrides(def, attacks), values = compatible[slot]?.values || {};
  const explicitOrigin=values.emissionOrigin&&values.emissionOrigin!=='auto';
  const mode=values.constructLifetime??source.constructLifetime??'timed';
  const constructModes={duration:'timed',constructKiPerSec:'upkeep',constructKiPerDamage:'damage'};
  return definitionsFor(source).filter(field=>!explicitOrigin||!['faceOrigin','chest'].includes(field.key)).map(field => Object.freeze({
    ...field,
    ...(field.key==='castStyle'?{options:castStyleOptions({...source,...values})}:{}),
    ...(source.type==='construct'&&constructModes[field.key]?{
      disabled:mode!==constructModes[field.key],
      note:mode===constructModes[field.key]?'':field.key==='duration'?'Not used in this mode; resource life has no timer.':'Not charged in this mode.',
    }:{}),
    default: copy(sourceValue(source, field)),
    value: copy(Object.hasOwn(values, field.key) ? values[field.key] : sourceValue({...source,...values}, field)),
  }));
}

export function setAttackOverride(attacks, def, slot, patch) {
  record(patch, `Attack ${slot} patch`); safeTree(patch, `Attack ${slot} patch`);
  const source = attackSource(def, slot);
  if (!source) fail(`Slot ${slot} does not contain a supported attack.`);
  const current = reconcileAttackOverrides(def, attacks);
  const values = { ...(current[slot]?.values || {}), ...patch };
  // Returning to the kit origin also restores its original emitter/pose;
  // unrelated power tuning remains. Legacy flags cannot silently win here.
  if(patch.emissionOrigin==='auto')for(const key of ['faceOrigin','chest','castStyle'])
    if(!Object.hasOwn(patch,key))delete values[key];
  if(Object.hasOwn(patch,'emissionOrigin')&&!Object.hasOwn(patch,'castStyle')){
    const style=values.castStyle??source.castStyle??'auto';
    if(!castStyleOptions({...source,...values}).some(option=>option.value===style))values.castStyle='auto';
  }
  validateValues(source, values, `Attack ${slot}.values`);
  const sparse = {};
  for (const [key, value] of Object.entries(values)) {
    const field = definitionsFor(source).find(candidate => candidate.key === key);
    if (isOverride(source,field,value)) sparse[key] = value;
  }
  const result = { ...current };
  if (Object.keys(sparse).length) result[slot] = { identity: attackIdentity(source), source, values: sparse };
  else delete result[slot];
  const validated=validateAttackOverrides(result);applyAttackOverrides(def,validated);return validated;
}

export function resetAttackOverride(attacks, slot) {
  const result = validateAttackOverrides(attacks); delete result[slot]; return result;
}

export function applyAttackOverrides(def, attacks = {}) {
  const compatible = reconcileAttackOverrides(def, attacks);
  const previousMeta = metadataState(def), abilities = copy(def.abilities || {}), sources = {};
  // First restore any ability previously authored from its immutable genuine basis.
  for (const [slot, source] of Object.entries(previousMeta?.sources || {})) abilities[slot] = copy(source);
  // Then apply only identity-compatible sparse values. Never copy profile `source`
  // into production: that snapshot is untrusted import data.
  for (const [slot, entry] of Object.entries(compatible)) {
    const genuine = attackSource(def, slot);
    sources[slot] = copy(genuine);
    abilities[slot] = materializeAttack(genuine,copy(entry.values));
  }
  validateNaniteLoadout(abilities);
  const result = { ...def, abilities };
  if (Object.keys(compatible).length) result._attackTuning = { version: 1, sources, attacks: copy(compatible) };
  else delete result._attackTuning;
  return result;
}

export function carryAttackOverrides(previousDef, nextDef) {
  const explicit = attackOverridesFromDef(nextDef);
  const candidates = Object.keys(explicit).length ? explicit : attackOverridesFromDef(previousDef);
  return applyAttackOverrides(nextDef, candidates);
}
