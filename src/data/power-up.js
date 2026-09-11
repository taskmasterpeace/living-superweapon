// Explicit form inventory. Names guard old saves against accidentally relocating
// a replacement ability in the same slot. Utility buffs are deliberately absent.
const form=(slot,name)=>Object.freeze({slot,name});
export const GENERIC_POWER_UPS=Object.freeze({
 sol:form('r','Solar Overload'),kano:form('f','Ascend'),vega:form('f','Prince’s Pride'),aurum:form('r','Overcharge Ring'),volt:form('r','Overclock'),hive:form('r','Overmind'),
 rift:form('f','Untethered'),titan:form('f','Overdrive Core'),stefanos:form('f','These Wounds Will Not Heal'),ironclad:form('f','Overpower'),rage:form('f','Fury Rising'),stormcall:form('f','Wrath of the Sky'),ripclaw:form('r','Berserker Rage'),majesty:form('f','BINARY'),
 aegis:form('f','Blessing of Ares'),olympus:form('f','THE WORD'),marshal:form('f','Resolve of the Dead'),circuit:form('f','System Surge'),trench:form('f',"King's Tide"),decibel:form('f','Crescendo'),foundry:form('f','Tempered'),talon:form('f','Flow State'),abeo:form('f','Tempered Oath'),ramiro:form('f','My Son Goes Home'),jawah:form('f','Stored Decibels'),dune:form('f','Hardpack'),feral:form('f','Blood Frenzy'),
});
export const GENERIC_CUSTOM_POWER_UPS=Object.freeze(['powerbuff','overload']);
export function migratePowerUpDef(def,source){
 if(!def||def.powerUp)return def;
 const selected=source??GENERIC_POWER_UPS[def.id],ability=def.abilities?.[selected?.slot];
 if(!selected||ability?.type!=='buff'||ability.name!==selected.name)return def;
 const abilities={...def.abilities};delete abilities[selected.slot];
 return {...def,abilities,powerUp:{schema:1,sourceSlot:selected.slot,ability:{...ability}}};
}
// Legacy recipes keep their point cost and picked form, freeing the old attack
// slot. If a save carried two generic forms, preserve the second as an ability.
export function migratePowerUpPicks(picks){
 if(!picks||picks.powerUp)return picks;
 const entry=Object.entries(picks.slots??{}).find(([,id])=>GENERIC_CUSTOM_POWER_UPS.includes(id));
 if(!entry)return picks;
 return {...picks,powerUp:entry[1],powerUpSourceSlot:entry[0],slots:{...picks.slots,[entry[0]]:null}};
}
