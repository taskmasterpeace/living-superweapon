import {resolveAnimationClip} from '../data/animation-catalog.js';
export const ANIMATION_DRAFT_KEY='powerworld.animation-markers.v1';
export function markerDraft(id,start,end) {
 const source=resolveAnimationClip(id);
 if(!source||source.mode!=='strike')throw Error('Select an authored strike to edit contact markers.');
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
 const valid=validateMarkerDraft(draft);
 return {...resolveAnimationClip(valid.id),contactStart:valid.contactStart,contactEnd:valid.contactEnd};
}
export function readMarkerDrafts(storage) {
 const value=storage.getItem(ANIMATION_DRAFT_KEY);if(!value)return {};
 const parsed=JSON.parse(value);if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')throw Error('Invalid animation draft storage.');
 const result={};for(const [id,draft] of Object.entries(parsed)){const valid=validateMarkerDraft(draft);if(id!==valid.id)throw Error('Animation draft ID mismatch.');result[id]=valid;}return result;
}
export function saveMarkerDraft(storage,draft) {
 const valid=validateMarkerDraft(draft),drafts=readMarkerDrafts(storage);drafts[valid.id]=valid;
 storage.setItem(ANIMATION_DRAFT_KEY,JSON.stringify(drafts));return drafts;
}
export function revertMarkerDraft(storage,id) {
 const drafts=readMarkerDrafts(storage);delete drafts[id];storage.setItem(ANIMATION_DRAFT_KEY,JSON.stringify(drafts));return drafts;
}
