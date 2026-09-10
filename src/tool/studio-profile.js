import { frameOf } from '../engine/figure.js';
import { heroModelOf,HERO_BODIES } from '../data/hero-models.js';
import { CAMERA_DEFAULTS, MOTION_DEFAULTS, WAKE_DEFAULTS, SURFACE_WAKE_DEFAULTS, FLIGHT_STYLES, poseDefaultsForStyle } from '../data/flight-tuning.js';
import { applyAttackOverrides, attackOverridesFromDef, validateAttackOverrides } from '../data/attack-tuning.js';
import {validateEffects} from '../data/effects-profile.js';
import {FRONTLINE_CAMERA} from '../data/camera-presets.js';

export const STORAGE_KEY = 'lsw.studio.profiles.v1';
export const LIMITS = {
  frame:{scale:[.65,1.5],bulk:[.65,1.65],broad:[.7,1.6],head:[.65,1.4],neck:[.6,1.6],stance:[.7,1.4]},
  camera:{fov:[40,85],range:[18,60],height:[0,18],shoulder:[-10,10],boostFov:[0,18],boostRange:[0,15],cutaway:[0,1]},
  motion:{acceleration:[3,18],braking:[3,16],boostAcceleration:[3,18],groundSprint:[1,2.2]},
  environment:{massKg:[20,2000],windResistance:[.1,50],fallSafeSpeed:[30,160],fallDamageScale:[0,2]},
  wake:{life:[.18,.8],width:[.06,.9],intensity:[0,1]},
  surfaceWake:{intensity:[0,1],minSpeed:[30,180],maxHeight:[4,50],life:[.4,3]},
  pose:{armLx:[-3.2,1.2],armRx:[-3.2,1.2],armLz:[-.9,.9],armRz:[-.9,.9],elbowL:[0,2.5],elbowR:[0,2.5],hipL:[-1.6,1.2],hipR:[-1.6,1.2],kneeL:[0,2.4],kneeR:[0,2.4],headPitch:[-1.3,.7]},
};
const copy = value => JSON.parse(JSON.stringify(value));
const legacyStates = ['hover','forward','backward','brake','boost'];
const strafeStates = ['strafeLeft','strafeRight'];
const states = [...legacyStates,...strafeStates];
const fail = message => { throw new Error(message); };
function record(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${path} must be an object.`);
  for (const key of Object.keys(value)) {
    if (['__proto__','constructor','prototype'].includes(key)) fail(`Unsafe key in ${path}.`);
    // Attack source snapshots may contain catalog arrays. Their dedicated
    // validator handles JSON safety and never applies the snapshot itself.
    if(path==='Profile'&&key==='attacks')continue;
    if(value[key] && typeof value[key]==='object') recordTree(value[key],`${path}.${key}`);
  }
}
function recordTree(value,path) {
  if(Array.isArray(value)) fail(`${path} must not be an array.`);
  record(value,path);
}
function numbers(value, ranges, path) {
  record(value,path);
  allowed(value,Object.keys(ranges),path);
  for(const [key,[min,max]] of Object.entries(ranges)) {
    const n=value[key];
    if(path==='Camera'&&key==='cutaway'&&n===undefined)continue; // optional in existing version-one profiles
    if(path==='Flight'&&key==='groundSprint'&&n===undefined)continue;
    if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max) fail(`${path}.${key} must be between ${min} and ${max}.`);
  }
}
function allowed(value,keys,path){
  if(Object.keys(value).some(key=>!keys.includes(key)))fail(`${path} contains unsupported fields.`);
}
function purple(hex) {
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(...rgb),min=Math.min(...rgb),d=max-min;
  if(d<.08||max===0||d/max<.18)return false;
  const [r,g,b]=rgb;let h=max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4;
  h*=60;return h>=265&&h<=315;
}
export function validateProfile(p) {
  record(p,'Profile');
  allowed(p,['version','heroId','model','colors','frame','camera','motion','poses','wake','surfaceWake','attacks','progression','effects','environment'],'Profile');
  if(p.version!==1)fail('Unsupported profile version. Import a version 1 Studio profile.');
  if(typeof p.heroId!=='string'||!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(p.heroId))fail('Invalid hero ID.');
  record(p.model,'Model');
  allowed(p.model,['costume','flightStyle','hairColor','locomotion','strikes','heavyStrikes','definition','body','surface'],'Model');
  if(p.model.surface!==undefined&&!['standard','field'].includes(p.model.surface))fail('Unknown material surface.');
  if(p.model.body!==undefined&&!HERO_BODIES.includes(p.model.body))fail('Unknown body source. Choose a bundled superhero body or procedural modules.');
  if(p.model.definition!==undefined&&(typeof p.model.definition!=='number'||!Number.isFinite(p.model.definition)||p.model.definition<0||p.model.definition>1))fail('Body definition must be between 0 and 1.');
  if(p.model.strikes!==undefined&&!['authored','procedural'].includes(p.model.strikes))fail('Unknown light strikes mode.');
  if(p.model.heavyStrikes!==undefined&&!['authored','procedural'].includes(p.model.heavyStrikes))fail('Unknown heavy strikes mode.');
  if(p.model.locomotion!==undefined&&!['authored','procedural'].includes(p.model.locomotion))fail('Unknown ground locomotion mode.');
  if(!['fitted','martial','plated','tactical'].includes(p.model.costume))fail('Unknown costume module.');
  if(!FLIGHT_STYLES.includes(p.model.flightStyle))fail('Unknown flight style.');
  record(p.colors,'Colors');
  allowed(p.colors,['primary','secondary','accent','skin','cape'],'Colors');
  for(const [path,color] of [...Object.entries(p.colors),['hairColor',p.model.hairColor]]){
    if(!/^#[0-9a-f]{6}$/i.test(color))fail(`${path} must be a six-digit hex color.`);
    if(p.heroId!=='kivuli'&&purple(color))fail('Purple is reserved for KIVULI. Choose another hue.');
  }
  for(const key of ['primary','secondary','accent','skin'])if(!p.colors[key])fail(`Missing ${key} color.`);
  numbers(p.frame,LIMITS.frame,'Frame');numbers(p.camera,LIMITS.camera,'Camera');numbers(p.motion,LIMITS.motion,'Flight');
  if(p.wake!==undefined)numbers(p.wake,LIMITS.wake,'Wake');
  if(p.environment!==undefined)numbers(p.environment,LIMITS.environment,'Environment');
  const surfaceWake={...SURFACE_WAKE_DEFAULTS,...p.surfaceWake};
  if(p.surfaceWake!==undefined)numbers(p.surfaceWake,LIMITS.surfaceWake,'Surface wake');
  const attacks=validateAttackOverrides(p.attacks);
  const effects=validateEffects(p.effects);
  const progression=validateProgression(p.progression,p);
  record(p.poses,'Poses');allowed(p.poses,states,'Poses');for(const state of legacyStates)numbers(p.poses[state],LIMITS.pose,`Pose ${state}`);
  for(const state of strafeStates)if(p.poses[state]!==undefined)numbers(p.poses[state],LIMITS.pose,`Pose ${state}`);
  // Version-one profiles remain portable. Complete only newly introduced pose
  // states in a copy; never rewrite a saved record just because it was opened.
  if(!p.wake||p.model.body===undefined||p.model.surface===undefined||strafeStates.some(state=>p.poses[state]===undefined)) {
    const complete=copy(p),defaults=poseDefaultsForStyle(p.model.flightStyle);
    // Imported version-one records predate these selectors. Do not let a new
    // stock hero default silently reskin somebody's saved character.
    complete.model.body ??= 'procedural';complete.model.surface ??= 'standard';
    complete.wake ??= {...WAKE_DEFAULTS};
    complete.surfaceWake=surfaceWake;
    for(const state of strafeStates)complete.poses[state] ??= copy(defaults[state]);
    complete.attacks=attacks;
    complete.progression=progression;
    complete.effects=effects;
    return complete;
  }
  return {...p,attacks,progression,effects,surfaceWake};
}
function validateProgression(value,base){
  if(value===undefined)return {unlocks:{},forms:{}};
  record(value,'Progression');allowed(value,['unlocks','forms'],'Progression');
  const unlocks=value.unlocks??{},forms=value.forms??{};
  record(unlocks,'Unlocks');allowed(unlocks,['lmb','rmb','q','e','f','r','shift'],'Unlocks');record(forms,'Forms');
  for(const [slot,n] of Object.entries(unlocks))if(!Number.isInteger(n)||n<1||n>10)fail(`Unlock ${slot} must be a whole level from 1 to 10.`);
  for(const [level,form] of Object.entries(forms)){
    if(!/^(?:[2-9]|10)$/.test(level))fail('Form level must be a whole level from 2 to 10.');
    record(form,`Form ${level}`);allowed(form,['name','model','frame','colors'],`Form ${level}`);
    if(form.name!==undefined&&(typeof form.name!=='string'||form.name.length>32||/[<>\u0000-\u001f]/.test(form.name)))fail('Form name must be plain text, at most 32 characters.');
    for(const key of ['model','frame','colors'])if(form[key]!==undefined)record(form[key],`Form ${level} ${key}`);
    // Reuse the exact presentation validator against the completed sparse form.
    // Omit progression in this leaf so nested form validation cannot recur.
    const leaf={...base,model:{...base.model,...form.model},frame:{...base.frame,...form.frame},colors:{...base.colors,...form.colors}};
    delete leaf.progression;validateProfile(leaf);
  }
  return copy({unlocks,forms});
}
export function profileFromDef(def) {
  const model=heroModelOf(def);
  const poses=poseDefaultsForStyle(model.flightStyle);
  return {version:1,heroId:def.id,model:{body:model.body??'procedural',surface:model.surface??'standard',costume:model.costume,flightStyle:model.flightStyle,hairColor:model.hairColor,definition:model.definition,locomotion:model.locomotion??'authored',strikes:model.strikes??'authored',heavyStrikes:model.heavyStrikes??'authored'},
    frame:frameOf(def),colors:{skin:'#e8c39a',...def.colors},camera:{...CAMERA_DEFAULTS,...model.camera},
    motion:{...MOTION_DEFAULTS,...model.motion},
    environment:{massKg:def.metal?162:90,windResistance:1+Math.max(0,(def.strength??5)-4)**2*.55,fallSafeSpeed:56,fallDamageScale:def.archetype==='soldier'?1:0,...def.environment},
    wake:{...WAKE_DEFAULTS,...model.wake},surfaceWake:{...SURFACE_WAKE_DEFAULTS,...model.surfaceWake},effects:validateEffects(def.effects),attacks:attackOverridesFromDef(def),progression:copy(def.progression??{unlocks:{},forms:{}}),
    poses:Object.fromEntries(states.map(state=>[state,{...poses[state],...model.poses?.[state]}]))};
}
// An explicit language change replaces authored targets; the UI warns before calling this.
// Return a new profile so the whole operation remains one undoable history entry.
export function resetFlightStyle(profile,style) {
  const p=copy(profile);p.model.flightStyle=style;
  p.poses=copy(poseDefaultsForStyle(style));
  return validateProfile(p);
}
export function resetCamera(profile,preset='bfp') {
  const p=copy(profile);p.camera={...(preset==='frontline'?FRONTLINE_CAMERA:CAMERA_DEFAULTS)};
  return validateProfile(p);
}
export function applyProfile(def,profile) {
  profile=validateProfile(profile);
  if(def.id!==profile.heroId)fail('This profile belongs to a different hero.');
  const p=copy(profile);
  return applyAttackOverrides({...def,...(p.environment?{environment:p.environment}:{}),frame:p.frame,colors:p.colors,effects:p.effects,progression:p.progression,model:{...def.model,...p.model,poses:p.poses,camera:p.camera,motion:p.motion,wake:p.wake,surfaceWake:p.surfaceWake}},p.attacks);
}
function readStore(storage) {
  let raw;
  try {raw=storage.getItem(STORAGE_KEY);}catch(e){fail(`Cannot read local storage: ${e.message}`);}
  if(raw===null)return {};
  try {const records=JSON.parse(raw);record(records,'Storage');return records;}
  catch(e){fail(`Studio storage could not be read; existing data was kept. ${e.message}`);}
}
export function loadProfile(id,storage=localStorage) {
  const records=readStore(storage);if(!Object.hasOwn(records,id))return null;
  const profile=validateProfile(records[id]);
  if(profile.heroId!==id)fail('Saved profile ID does not match its storage entry.');
  return copy(profile);
}
export function saveProfile(profile,storage=localStorage) {
  profile=validateProfile(profile);const records=readStore(storage);records[profile.heroId]=copy(profile);
  storage.setItem(STORAGE_KEY,JSON.stringify(records));return copy(profile);
}
export function removeProfile(id,storage=localStorage) {
  const records=readStore(storage);delete records[id];storage.setItem(STORAGE_KEY,JSON.stringify(records));
}
export function installProfiles(roster,storage=localStorage) {
  const result={applied:0,errors:[]};let records;
  try{records=readStore(storage);}catch(e){result.errors.push(e.message);return result;}
  for(const def of roster)if(Object.hasOwn(records,def.id)) {
    try{const applied=applyProfile(def,records[def.id]);Object.assign(def,applied);if(!Object.hasOwn(applied,'_attackTuning'))delete def._attackTuning;result.applied++;}
    catch(e){result.errors.push(`${def.id}: ${e.message}`);}
  }
  return result;
}
export class DraftHistory {
  constructor(value){this.entries=[copy(value)];this.index=0;this.saved=JSON.stringify(value);}
  get value(){return copy(this.entries[this.index]);}
  get canUndo(){return this.index>0;}
  get canRedo(){return this.index<this.entries.length-1;}
  get dirty(){return JSON.stringify(this.entries[this.index])!==this.saved;}
  push(value){
    if(JSON.stringify(value)===JSON.stringify(this.entries[this.index]))return;
    this.entries.splice(this.index+1);this.entries.push(copy(value));
    if(this.entries.length>81)this.entries.shift();this.index=this.entries.length-1;
  }
  undo(){if(this.canUndo)this.index--;return this.value;}
  redo(){if(this.canRedo)this.index++;return this.value;}
  markSaved(){this.saved=JSON.stringify(this.entries[this.index]);}
}
