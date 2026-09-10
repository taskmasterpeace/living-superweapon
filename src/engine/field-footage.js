import {revokeFrames} from './news-capture.js';
// Menu borrows URLs. Boot transfers one bounded previous-match reel to this owner.
export function archiveFieldFootage(game){
 const next=game.news?.takeClips()||[];
 if(!next.length)return;
 for(const c of game._fieldClips||[]){revokeFrames(c.frames);c._dead=true;c._imgs=null;c._imageUrls=null;}
 game._fieldClips=next;
}
export function collectFootage(game){
 return [...new Set([...(game?._fieldClips||[]),...(game?._openingClips||[]),...(game?.news?.clips||[])])]
  .filter(c=>c&&!c._dead&&Array.isArray(c.frames)&&c.frames.length).reverse();
}
export class FootageTransport{
 constructor(){this.clip=null;this.frame=0;this.playing=true;this.rate=1;this.loop=true;}
 get fps(){return Number.isFinite(this.clip?.fps)&&this.clip.fps>0?this.clip.fps:12;}
 get duration(){return (this.clip?.frames?.length||0)/this.fps;}
 select(clip){this.clip=clip;this.frame=0;}
 seek(frame){this.frame=Math.max(0,Math.min((this.clip?.frames?.length||1)-1,Number.isFinite(frame)?frame:0));}
 advance(dt){
  const n=this.clip?.frames?.length||0;
  if(!this.playing||!n||!Number.isFinite(dt)||dt<=0)return;
  this.frame+=dt*this.fps*this.rate;
  if(this.frame>=n){if(this.loop)this.frame%=n;else{this.frame=n-1;this.playing=false;}}
 }
}
