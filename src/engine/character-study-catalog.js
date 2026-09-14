import {ACTION_DRAFTS,actionDraft} from './character-action-drafts.js';
import {AUTHORING_SCHEMA,RIG,validateAsset,compileAuthoredMotion} from './character-authoring.js';
// Build from the same study definitions as the editor, never a second clip list.
export function characterStudyCatalog(actor){
 const pose={},bones=[];actor.traverse(o=>{if(o.isBone){pose[o.name]=o.quaternion.toArray();bones.push(o.name);}});
 return Object.keys(ACTION_DRAFTS).map(name=>{
  const asset=validateAsset({schema:AUTHORING_SCHEMA,rig:RIG,name,parts:[],motion:actionDraft(name,pose,actor)},bones),m=asset.motion,clip=compileAuthoredMotion(asset);
  const review=m.visualReview;
  return {clip,entry:{id:'study:'+name,key:name,take:name,label:name,category:'Editable studies',kind:'modular',duration:m.duration,frames:m.keys.length,
   contact:{start:m.markers.contact,end:m.markers.release},markers:m.markers,hand:m.hand,contactStyle:m.contactStyle,
   source:{author:'Power World',description:m.source},runtime:review?.rejected?'Visual review failed · gameplay assignment blocked':'Editable candidate · gameplay assignment pending',issues:review?[review.note]:[],warnings:['Visual and gameplay contact review required'],audioStatus:'unverified',
   editorUrl:'/character-foundation.html?study='+encodeURIComponent(name)}};
 });
}
