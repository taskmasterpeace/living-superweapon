// Authored migration of pre-2026-09-14 pickup weights. Values are frozen data:
// editing strength, health or resilience must never manufacture extra mass.
export const STOCK_BODY_WEIGHT_LB=Object.freeze({
 sol:266,kano:214,vega:234,aurum:222,nova:194,rime:192,volt:152,warden:284,hive:162,pyre:264,torch:174,apex:294,specter:224,vanguard:314,kraken:284,rift:172,titan:962,sarge:212,merc:192,kivuli:192,gale:162,stefanos:212,sandra:192,ironclad:884,rage:458,stormcall:334,webline:186,ripclaw:290,majesty:266,mystward:192,onyx:264,chainfire:274,tempest:192,knightfall:222,aegis:324,olympus:302,marshal:284,circuit:932,trench:322,decibel:182,coldsnap:182,foundry:962,talon:204,abeo:982,jelani:286,kamaria:204,ramiro:262,jawah:222,moses:274,dune:242,graven:242,bulwark:400,feral:282,breach:230,recon:172,
});
export const KG_PER_LB=.45359237;
const positive=v=>Number.isFinite(v)&&v>0;
// A Fighter supplies runtime Size Change; a plain def describes its base body.
// The Studio's explicit kilograms override older pounds when both are present.
export function physicalBodyWeightLb(body){
 const def=body?.def||body||{},kg=def.environment?.massKg;
 const base=positive(kg)?kg/KG_PER_LB:positive(def.weightLb)?def.weightLb:STOCK_BODY_WEIGHT_LB[def.id]??(def.metal?162:90)/KG_PER_LB;
 const size=body?.def&&positive(body.sizeScale)?Math.max(.25,Math.min(8,body.sizeScale)):1;
 return base*size**3;
}
export const physicalBodyMassKg=body=>physicalBodyWeightLb(body)*KG_PER_LB;
