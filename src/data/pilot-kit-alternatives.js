// Deliberately unequipped pilot powers retained for Studio authoring.
// These are exact source snapshots, not balance recommendations or runtime defaults.
const CATALOG=Object.freeze({
  decibel:Object.freeze({
    r:Object.freeze([Object.freeze({id:'canary-cry',name:'THE CANARY CRY',ability:Object.freeze({type:'cone',name:'THE CANARY CRY',kiPerSec:34,range:52,arc:.9,dps:44,push:90,lift:8,sonic:true,color:'#ffe066'})})]),
  }),
  talon:Object.freeze({
    r:Object.freeze([Object.freeze({id:'finale-routine',name:'Finale Routine',ability:Object.freeze({type:'rush',name:'Finale Routine',cost:18,cd:12,range:66,hits:9,interval:.07,damage:8,finisher:34,color:'#37c7ff'})})]),
  }),
  moses:Object.freeze({
    r:Object.freeze([Object.freeze({id:'full-bond',name:'FULL BOND',ability:Object.freeze({type:'buff',name:'FULL BOND',cost:28,cd:20,mult:1.7,dur:10,heal:35,color:'#9dff5a',color2:'#ffffff'})})]),
  }),
  webline:Object.freeze({
    r:Object.freeze([Object.freeze({id:'maximum-spider',name:'Maximum Spider',ability:Object.freeze({type:'rush',name:'Maximum Spider',cost:18,cd:12,range:70,hits:10,interval:.06,damage:8,finisher:36,color:'#eaffff'})})]),
  }),
  apex:Object.freeze({
    r:Object.freeze([Object.freeze({id:'perfect-wave',name:'Perfect Wave',ability:Object.freeze({type:'beam',material:'air',name:'Perfect Wave',cost:24,cd:14,radius:3.4,tipSpeed:648,maxLen:170,dps:128,kiPerSec:30,charge:true,maxCharge:2,kiChargePerSec:20,chargePower:2,chargeWidth:true,steer:6,color:'#9dff5a',color2:'#ffffff'})})]),
  }),
  vanguard:Object.freeze({
    f:Object.freeze([Object.freeze({id:'invincible',name:'Invincible',ability:Object.freeze({type:'buff',name:'Invincible',cost:22,cd:18,mult:1.4,dur:4,invuln:2.5,color:'#ffd24a',color2:'#fff'})})]),
  }),
});

const copy=value=>JSON.parse(JSON.stringify(value));
const SLOTS=Object.freeze(['lmb','rmb','q','e','f','r','shift']);
const fail=message=>{throw new Error(message);};

export function kitAlternativesFor(heroId,slot){
  return copy(CATALOG[heroId]?.[slot]||[]);
}

export function kitAlternativeSlots(heroId){
  return Object.keys(CATALOG[heroId]||{});
}

export function validateKitSelections(value,heroId){
  if(value===undefined)return {};
  if(!value||typeof value!=='object'||Array.isArray(value))fail('Kit selections must be an object.');
  const result={};
  for(const [slot,id] of Object.entries(value)){
    if(!SLOTS.includes(slot))fail(`Invalid kit slot: ${slot}.`);
    const match=CATALOG[heroId]?.[slot]?.find(entry=>entry.id===id);
    if(!match)fail(`Unknown ${heroId} ${slot.toUpperCase()} kit alternative.`);
    result[slot]=id;
  }
  return result;
}

export function selectKitAlternative(profile,heroId,slot,id=''){
  if(profile?.heroId!==heroId)fail('This kit selection belongs to a different hero.');
  const next=copy(profile),kit=validateKitSelections(next.kit,heroId);
  if(id){
    if(!CATALOG[heroId]?.[slot]?.some(entry=>entry.id===id))fail(`Unknown ${heroId} ${slot.toUpperCase()} kit alternative.`);
    kit[slot]=id;
  }else delete kit[slot];
  next.kit=kit;
  // Attack source snapshots stay dormant while their alternative is unequipped.
  // Reconciliation applies only an identity-compatible snapshot when that exact
  // named source returns; selecting a kit must never erase saved custom work.
  return next;
}

export function applyKitAlternatives(def,value){
  const kit=validateKitSelections(value,def.id),abilities=copy(def.abilities||{});
  for(const slot of kitAlternativeSlots(def.id))delete abilities[slot];
  for(const [slot,id] of Object.entries(kit))abilities[slot]=copy(CATALOG[def.id][slot].find(entry=>entry.id===id).ability);
  const result={...def,abilities};
  if(Object.keys(kit).length)result._kitSelections=copy(kit);else delete result._kitSelections;
  return result;
}

export function kitSelectionsFromDef(def){
  try{return validateKitSelections(def?._kitSelections,def.id);}catch{return {};}
}
