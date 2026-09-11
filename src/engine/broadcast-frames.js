// JPEG encoding completes asynchronously, including after the end screen opens.
import {revokeFrames} from './news-capture.js';
export function retireOpeningClips(game){
 for(const clip of game._openingClips||[]){revokeFrames(clip.frames);clip._dead=true;clip._imgs=null;clip._imageUrls=null;}
 game._openingClips=null;
}
// Refresh the one decoded clip in place; never assign pending/revoked URLs to Image.
export function hydrateClipFrames(clip,makeImage=()=>new Image()){
 if(clip._dead){clip._imgs=[];clip._imageUrls=[];return [];}
 const images=clip._imgs||(clip._imgs=[]),urls=clip._imageUrls||(clip._imageUrls=[]);
 images.length=clip.frames.length;urls.length=clip.frames.length;
 for(let i=0;i<clip.frames.length;i++){
  const value=clip.frames[i],url=value&&value[0]!=='#'?value:'';
  if(!images[i])images[i]=makeImage();
  if(urls[i]!==url){
   urls[i]=url;
   if(url)images[i].src=url;
   else {images[i]=makeImage();}
  }
 }
 return images;
}
