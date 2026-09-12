import {validateMarkerDraft} from '../data/strike-markers.js';
export {markerDraft,validateMarkerDraft,clipWithMarkers} from '../data/strike-markers.js';
export const ANIMATION_DRAFT_KEY='powerworld.animation-markers.v1';
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
