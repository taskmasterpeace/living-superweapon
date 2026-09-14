// Explicit sheet edits become real actor values; legacy roster values remain intact.
export function resolvePhysicalStats(def){
 const a=def.attrs||{},valid=v=>Number.isFinite(v)&&v>=1&&v<=10;
 return {...def,
  strength:valid(a.mgt)?a.mgt:(def.strength??5),
  hp:valid(a.vig)?Math.round(70+a.vig*9):(def.hp??100),
 };
}
