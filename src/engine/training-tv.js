import {collectFootage,FootageTransport} from './field-footage.js';
// Borrows the existing bounded Newsroom reel; this screen never owns frame URLs.
export class TrainingTV {
 constructor(game,screen){this.game=game;this.screen=screen;this.transport=new FootageTransport();this.disposed=false;this.token=0;this.decoded=0;}
 clips(){return collectFootage(this.game).filter(c=>c.shots?.some(s=>s.kind==='training-security'));}
 next(){const clips=this.clips(),index=clips.indexOf(this.transport.clip);this.transport.select(index<clips.length-1?clips[index+1]:null);this.url=null;this.token++;this.drawMessage(this.transport.clip?'Loading security footage…':'MULTI-ANGLE POSE REVIEW');return this.transport.clip;}
 pause(){this.transport.playing=!this.transport.playing;}
 speed(){this.transport.rate=this.transport.rate===1?.5:1;}
 drawMessage(message){const c=this.screen.canvas.getContext('2d');c.fillStyle='#152633';c.fillRect(0,0,768,432);c.fillStyle='#e8f8ff';c.font='30px sans-serif';c.fillText(message,30,210);this.screen.texture.needsUpdate=true;this.screen.mesh.material.map=this.screen.texture;}
 status(){const t=this.transport,c=this.screen.canvas.getContext('2d');c.fillStyle='#152633';c.fillRect(0,382,768,50);c.fillStyle='#e8f8ff';c.font='22px sans-serif';c.fillText('SECURITY · '+(t.playing?'PLAY':'PAUSED')+' · '+t.rate+'× · '+(t.frame/t.fps).toFixed(1)+'s',20,416);this.screen.texture.needsUpdate=true;}
 update(dt){const t=this.transport;if(!t.clip)return false;if(!this.clips().includes(t.clip)){t.select(null);this.token++;return false;}t.advance(dt);this.status();this.screen.mesh.material.map=this.screen.texture;const url=t.clip.frames[Math.floor(t.frame)];if(typeof url!=='string'||url.startsWith('#')||this.pending||url===this.url)return true;
  const token=this.token,clip=t.clip,img=new Image();this.pending=img;img.onload=()=>{this.pending=null;if(this.disposed||token!==this.token||t.clip!==clip)return;const c=this.screen.canvas.getContext('2d');c.fillStyle='#152633';c.fillRect(0,0,768,432);const scale=Math.min(768/img.width,382/img.height),w=img.width*scale,h=img.height*scale;c.drawImage(img,(768-w)/2,0,w,h);c.fillStyle='#e8f8ff';c.font='22px sans-serif';c.fillText('SECURITY · '+(t.playing?'PLAY':'PAUSED')+' · '+t.rate+'× · '+(t.frame/t.fps).toFixed(1)+'s',20,416);this.screen.texture.needsUpdate=true;this.url=url;this.decoded++;};img.onerror=()=>{this.pending=null;if(!this.disposed&&token===this.token)this.drawMessage('Frame unavailable · choose another clip');};img.src=url;return true;
 }
 dispose(){this.disposed=true;this.token++;if(this.pending){this.pending.onload=null;this.pending.onerror=null;this.pending=null;}this.transport.select(null);}
}
