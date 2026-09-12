import light from './strike-bank.json' with {type:'json'};
import heavy from './heavy-strike-bank.json' with {type:'json'};
export const STRIKE_CLIPS={...light.clips,...heavy.clips};
const ids={jab:'strike/jab',cross:'strike/cross',power:'heavy-strike/power'};
export function markerDraft(id,start,end) {
 const key=Object.keys(ids).find(k=>ids[k]===id),source=STRIKE_CLIPS[key];
 if(!source)throw Error('Select an authored strike to edit contact markers.');
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>source.duration)throw Error('Contact start must precede end, within the clip duration.');
 return {version:1,id,take:source.take,duration:source.duration,sourceContactStart:source.contactStart,sourceContactEnd:source.contactEnd,contactStart:start,contactEnd:end};
}
export function validateMarkerDraft(draft) {
 if(!draft||draft.version!==1)throw Error('Unsupported animation draft version.');
 const valid=markerDraft(draft.id,draft.contactStart,draft.contactEnd);
 for(const key of ['take','duration','sourceContactStart','sourceContactEnd'])if(draft[key]!==valid[key])throw Error('Source animation changed. Rebase the markers against the current clip.');
 return valid;
}
export function clipWithMarkers(draft) {
 const valid=validateMarkerDraft(draft),key=Object.keys(ids).find(k=>ids[k]===valid.id);
 return {...STRIKE_CLIPS[key],contactStart:valid.contactStart,contactEnd:valid.contactEnd};
}
export function validateStrikeMarkers(markers) {
 if(markers===undefined)return;
 if(!markers||typeof markers!=='object'||Array.isArray(markers))throw Error('Strike markers must be a keyed record.');
 for(const [key,draft] of Object.entries(markers)) {
  if(!Object.hasOwn(ids,key)||draft?.id!==ids[key])throw Error('Marker assignment must match the strike source.');
  validateMarkerDraft(draft);
 }
}
const resolved=new WeakMap();
export function strikeClipFor(def,key) {
 const draft=def.model?.strikeMarkers?.[key];if(!draft)return STRIKE_CLIPS[key];
 if(!resolved.has(draft)){try{validateStrikeMarkers({[key]:draft});resolved.set(draft,clipWithMarkers(draft));}catch{resolved.set(draft,STRIKE_CLIPS[key]);}}
 return resolved.get(draft);
}
