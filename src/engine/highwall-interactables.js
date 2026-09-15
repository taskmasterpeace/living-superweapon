import * as THREE from 'three';

// Existing bundled recordings, kept distinct from the live surveillance feed.
export const HIGHWALL_MEDIA = Object.freeze([
 {id:'speaker',kind:'mp3',name:'MP3 / signal lure',url:'/audio/computerNoise_000.mp3',source:'Bundled Kenney CC0 computerNoise_000 recording',lure:true},
 {id:'screen',kind:'mp4',name:'MP4 / gameplay archive',url:'/showcase/living-superweapon-gameplay.mp4',source:'Existing bundled Living Superweapon gameplay showcase',lure:false},
]);

export function doorOccupied(door,actors){
 return actors.some(f=>f.alive&&f.pos&&Math.abs(f.pos.x-door.x)<door.hx+Math.max(3.5,f.radius||0)&&Math.abs(f.pos.z-door.z)<door.hz+Math.max(3.5,f.radius||0)&&f.pos.y<door.top&&f.pos.y+12*(f.sizeScale||1)>door.bottom);
}
export function canOperateHighwallDevice(f){return !!(f?.alive&&!f.frozenT&&!(f.stunT>0)&&!(f.sleepT>0)&&!(f.launchT>0)&&!f.grabbing&&!f._fleetVehicle&&!f._aircraftVehicle&&!f.grabbedBy&&!f._carry&&!f._personCarry&&!f._vehicle&&!f.vehicle&&!(f.staggerT>0)&&!(f.downedT>0));}

// A common mounted appliance envelope, in the game's 0.19-metre world units.
// No matching terminal exists in the restored facility catalog. This housing is
// newly authored; both live and archived video use its actual inset display.
export const HIGHWALL_TERMINAL = Object.freeze({width:8,height:10,depth:5.2,screenWidth:6.4,screenHeight:3.6,screenCenterY:7.25});
export function buildHighwallTerminal({map=null,speaker=false}={}){
 const group=new THREE.Group();group.name=speaker?'Highwall / audio terminal':'Highwall / screen terminal';
 const materials={ivory:new THREE.MeshStandardMaterial({color:0xc6c6b4,roughness:.86,flatShading:true}),dark:new THREE.MeshStandardMaterial({color:0x2c3330,roughness:.9,flatShading:true}),red:new THREE.MeshStandardMaterial({color:0x8e2f2b,roughness:.8}),keys:new THREE.MeshStandardMaterial({color:0x777f73,roughness:.8})};
 const box=(name,w,h,d,x,y,z,material=materials.dark)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;};
 box('anchored plinth',7.2,.65,5.2,0,.325,0);
 box('service cabinet',5.7,4.15,3.25,0,2.725,-.35,materials.ivory);
 box('left reinforced cheek',.65,4.5,3.65,-3.05,2.65,-.35);
 box('right reinforced cheek',.65,4.5,3.65,3.05,2.65,-.35);
 box('inset red identification strip',3.7,.36,.09,0,3.25,1.32,materials.red);
 box('control shelf',7.5,.5,3.7,0,4.95,.5);
 box('screen cabinet',8,4.8,1.55,0,7.45,-.5,materials.ivory);
 box('top protective cap',8,.45,2,0,9.775,-.4);
 box('recess backplate',7.1,4.1,.12,0,7.25,.335);
 // Four solid bezel lips protrude beyond the luminous plane; the image is
 // genuinely recessed, not a double-sided plane floating ahead of the box.
 box('left screen bezel',.33,4.1,.42,-3.385,7.25,.53);
 box('right screen bezel',.33,4.1,.42,3.385,7.25,.53);
 box('upper screen bezel',7.1,.25,.42,0,9.175,.53);
 box('lower screen bezel',7.1,.25,.42,0,5.325,.53);
 let face=null;
 if(speaker){
  for(let i=0;i<8;i++)box(`speaker grille ${i}`,6.4,.18,.16,0,5.76+i*.43,.48,materials.keys);
 }else{
  face=new THREE.Mesh(new THREE.PlaneGeometry(HIGHWALL_TERMINAL.screenWidth,HIGHWALL_TERMINAL.screenHeight),new THREE.MeshBasicMaterial({map,color:map?0xffffff:0x182923,side:THREE.FrontSide,toneMapped:false}));
  face.name='inset 16:9 display';face.position.set(0,HIGHWALL_TERMINAL.screenCenterY,.415);group.add(face);
 }
 box('keyboard inset',5.5,.08,1.35,-.4,5.245,1.03);
 for(let row=0;row<3;row++)for(let col=0;col<9;col++)box('key',.42,.085,.24,-2.65+col*.51,5.325,.57+row*.37,materials.keys);
 box('status lamp',.55,.1,.35,3.04,5.25,1.0,materials.red);
 group.userData.terminal={...HIGHWALL_TERMINAL,kind:speaker?'speaker':'display',front:'+Z'};
 return {group,face};
}

export class HighwallInteractables {
 constructor(g,{door={x:-169,z:80,hx:35,hz:3,bottom:0,top:36},doorOpen=false,doorController=null,onDoorChange=()=>false,positions={},onNoise=null}={}){
  this.g=g;this.door=door;this.doorController=doorController;this.doorOpen=doorController?doorController.open:doorOpen;this.onDoorChange=doorController?open=>doorController.request(open):onDoorChange;this.onNoise=onNoise;this.elapsed=0;this.lastFeed=-1;this.lastNoise=-10;this.feedIndex=0;this.media=[];this.items=[];
  for(const cue of ['door.open','door.close'])g.audio?.prepareSample?.(cue)?.catch?.(()=>{});
  this.group=new THREE.Group();this.group.name='HIGHWALL / devices';g.scene.add(this.group);
  this.mat=new THREE.MeshStandardMaterial({color:0x343d35,roughness:.9,flatShading:true});this.gold=new THREE.MeshStandardMaterial({color:0xd9b54d,roughness:.75});
  const add=(id,name,p,w=7,h=9,d=5)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.mat);mesh.position.set(p.x,(p.y||0)+h/2,p.z);this.group.add(mesh);const item={id,name,pos:new THREE.Vector3(p.x,p.y||0,p.z),mesh};this.items.push(item);return item;};
  // Two accessible control posts operate the same gate from either side.
  add('door','Service gate',{x:door.x,z:door.z+door.hz+9},3,5,2);add('door','Service gate',{x:door.x,z:door.z-door.hz-9},3,5,2);
  this.target=new THREE.WebGLRenderTarget(320,180,{depthBuffer:true});this.target.texture.colorSpace=THREE.SRGBColorSpace;
  const terminal=(id,name,p,options={})=>{const {group:mesh,face}=buildHighwallTerminal(options);mesh.position.set(p.x,p.y||0,p.z);this.group.add(mesh);const item={id,name,pos:mesh.position.clone(),mesh,face};this.items.push(item);return item;};
  this.monitor=terminal('monitor','LIVE / surveillance',positions.monitor||{x:-235,z:212},{map:this.target.texture});this.monitorFace=this.monitor.face;
  const viewpoints=positions.cameras||[{x:-169,y:32,z:60,look:{x:-169,y:4,z:-50},name:'Junction'},{x:160,y:32,z:50,look:{x:240,y:4,z:-110},name:'Open field'}];
  this.cameras=viewpoints.slice(0,2).map((p,i)=>{const item=add(`camera-${i}`,`Camera / ${p.name}`,{x:p.x,z:p.z},4,4,5);item.mesh.position.y=p.y;const mast=new THREE.Mesh(new THREE.BoxGeometry(1,p.y,1),this.gold);mast.position.set(p.x,p.y/2,p.z);this.group.add(mast);item.pos.y=0;item.enabled=true;item.camera=new THREE.PerspectiveCamera(65,320/180,.5,1400);const look=new THREE.Vector3(p.look.x,p.look.y,p.look.z),direction=look.clone().sub(item.mesh.position).normalize();item.mesh.lookAt(look);item.camera.position.copy(item.mesh.position).addScaledVector(direction,4);item.camera.lookAt(look);return item;});
  for(const def of HIGHWALL_MEDIA){const item=terminal(def.id,def.name,positions[def.id]||{x:def.id==='speaker'?-218:-200,z:212},{speaker:def.kind!=='mp4'});const el=document.createElement(def.kind==='mp4'?'video':'audio');el.preload='metadata';el.loop=true;el.playsInline=true;el.src=def.url;item.def=def;item.el=el;item.state='stopped';item.volume=.8;item.serial=0;el.onerror=()=>{item.state='unavailable';this.message(`${def.name}: media unavailable`);};
   if(def.kind==='mp4'){item.texture=new THREE.VideoTexture(el);item.texture.colorSpace=THREE.SRGBColorSpace;item.face.material.map=item.texture;item.face.material.color.set(0xffffff);item.face.material.needsUpdate=true;}
   this.media.push(item);
  }
  this.key=e=>{if(!this.focus)return;if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();this.closeMonitor();}else if(e.code==='KeyE'&&!e.repeat){e.preventDefault();e.stopImmediatePropagation();if(this.focus.kind==='monitor')this.cycleFeed();}};
  window.addEventListener('keydown',this.key,true);
 }
 message(text){this.g.hud?.feed?.(text);this.lastMessage=text;}
 get isOpen(){return !!this.focus;}
 nearest(f){if(!canOperateHighwallDevice(f)||this.g.combatOverlayOpen)return null;let best=null,dist=17;for(const it of this.items){const d=Math.hypot(f.pos.x-it.pos.x,f.pos.z-it.pos.z,f.pos.y-it.pos.y);if(d<dist&&this.clearReach(f,it)){best=it;dist=d;}}return best;}
 clearReach(f,it){const a={x:f.pos.x,y:f.pos.y+5,z:f.pos.z},b={x:it.pos.x,y:it.pos.y+5,z:it.pos.z};for(const c of this.g.world.cover||[]){if(a.y<c.bottom||a.y>c.top)continue;let lo=0,hi=1;for(const axis of ['x','z']){const delta=b[axis]-a[axis],half=c[axis==='x'?'hx':'hz']||0;if(Math.abs(delta)<1e-8){if(Math.abs(a[axis]-c[axis])>half){hi=-1;break;}}else{let t0=(c[axis]-half-a[axis])/delta,t1=(c[axis]+half-a[axis])/delta;if(t0>t1)[t0,t1]=[t1,t0];lo=Math.max(lo,t0);hi=Math.min(hi,t1);}}if(lo<=hi&&hi>0&&lo<1)return false;}return true;}
 prompt(f){const it=this.nearest(f);if(!it)return '';if(it.id==='door')return `E · ${this.doorOpen?'Close':'Open'} service gate`;if(it.id==='monitor')return 'E · Inspect LIVE surveillance';if(it.camera)return `E · ${it.enabled?'Disable':'Enable'} ${it.name}`;return `E · Inspect ${it.name} (${it.state})`;}
 interact(f){const it=this.nearest(f);if(!it)return false;if(it.id==='door')this.toggleDoor(f);else if(it.id==='monitor')this.openMonitor(f);else if(it.camera){it.enabled=!it.enabled;this.message(`${it.name}: ${it.enabled?'online':'signal loss'}`);}else this.openMedia(f,it);return true;}
 toggleDoor(f,{open=!this.doorOpen}={}){
  if(!canOperateHighwallDevice(f)||Math.hypot(f.pos.x-this.door.x,f.pos.z-this.door.z)>this.door.hx+20)return false;
  if(f.ai&&!f.def?.capabilities?.openDoors&&!f.def?.canOpenDoors&&f.def?.family!=='soldier')return false;
  if(open===this.doorOpen)return true;
  if(!open&&doorOccupied(this.door,this.g.entities)){this.message('Gate blocked: occupied threshold');return false;}
  try{if(this.onDoorChange(open)===false)return false;}catch(error){this.message(`Gate blocked: ${error.message}`);return false;}
  this.doorOpen=open;this.g.audio?.sample?.(open?'door.open':'door.close',{pos:{x:this.door.x,y:3,z:this.door.z}});this.message(`Service gate ${this.doorController?(open?'opening':'closing'):(open?'open':'closed')}`);return true;
 }
 async toggleMedia(item){
  if(item.state==='playing'||item.state==='starting'){item.serial++;item.el.pause();item.el.currentTime=0;item.state='stopped';return;}
  const serial=++item.serial;item.state='starting';
  try{const audio=this.g.audio;audio?.init?.();audio?.resume?.();if(!audio?.ctx)throw Error('Audio context unavailable');
   if(!item.source){item.source=audio.ctx.createMediaElementSource(item.el);item.gain=audio.ctx.createGain();item.pan=audio.ctx.createStereoPanner();item.source.connect(item.gain);item.gain.connect(item.pan);item.pan.connect(audio.bus?.ambient||audio.master);}this.updateMediaAudio(item);await item.el.play();if(this.disposed){item.el.pause();return;}if(serial!==item.serial)return;item.state='playing';this.message(`${item.name}: playing`);
  }catch(e){if(!this.disposed&&serial===item.serial){item.state='error';this.message(`${item.name}: playback failed (${e.message})`);}}
 }
 pauseMedia(item){item.serial++;item.el.pause();item.state='paused';this.refreshMediaInspector();}
 stopMedia(item){item.serial++;item.el.pause();item.el.currentTime=0;item.state='stopped';this.refreshMediaInspector();}
 openMedia(f,item){
  if(this.focus||this.g.combatOverlayOpen||!canOperateHighwallDevice(f))return false;
  this.focus={owner:f,hp:f.hp,kind:'media',item,previousOverlay:!!this.g.combatOverlayOpen,element:document.activeElement};
  this.g.retireCombatViewInput?.(f,{preserveCarry:true});this.g.combatOverlayOpen=true;document.exitPointerLock?.();
  const dialog=document.createElement('dialog');dialog.setAttribute('aria-label','Highwall media controls');dialog.style.cssText='position:fixed;z-index:100;inset:18% auto auto 50%;transform:translateX(-50%);margin:0;width:min(430px,80vw);padding:18px;border:1px solid #c9a650;border-radius:10px;background:#252e2d;color:#e8e2d6;font:14px Inter,system-ui,sans-serif';
  const title=document.createElement('h2');title.textContent=item.name;title.style.cssText='margin:0 0 12px;font-size:22px;letter-spacing:-.025em;color:#e6c66f';
  const status=document.createElement('p');status.setAttribute('role','status');this.mediaStatus=status;
  const controls=document.createElement('div');controls.style.cssText='display:flex;gap:8px;flex-wrap:wrap';this.mediaButtons={};
  for(const [key,label,fn]of [['play','Play / Resume',()=>{if(!['playing','starting'].includes(item.state))this.toggleMedia(item);this.refreshMediaInspector();}],['pause','Pause',()=>this.pauseMedia(item)],['stop','Stop',()=>this.stopMedia(item)]]){
   const button=document.createElement('button');button.textContent=label;button.onclick=fn;button.style.cssText='border-radius:10px;padding:10px;background:#5d6448;color:#fff;border:1px solid #d9b54d;cursor:pointer;transition:background .2s';button.onpointerenter=()=>{button.style.background='#777f58';};button.onpointerleave=()=>{button.style.background='#5d6448';};this.mediaButtons[key]=button;controls.append(button);
  }
  const volume=document.createElement('label');volume.textContent='Volume ';volume.style.cssText='display:block;margin:18px 0';const slider=document.createElement('input');slider.type='range';slider.style.accentColor='#d9b54d';slider.min=0;slider.max=100;slider.step=1;slider.value=Math.round((item.volume??.8)*100);slider.setAttribute('aria-label','Media volume');const value=document.createElement('output');value.textContent=` ${slider.value}%`;slider.oninput=()=>{item.volume=Number(slider.value)/100;value.textContent=` ${slider.value}%`;this.updateMediaAudio(item);};volume.append(slider,value);
  const source=document.createElement('p');source.style.cssText='line-height:1.6;color:#c9cebb;font-size:12px;overflow-wrap:anywhere';source.textContent=`Source: ${item.def.source} · ${item.def.url}`;
  const note=document.createElement('p');note.textContent=item.def.lure?'Configured noise lure: nearby actors may investigate this speaker while it plays.':'Prerecorded media archive. This is separate from live surveillance.';note.style.lineHeight='1.5';
  const exit=document.createElement('button');exit.textContent='Return · Escape';exit.onclick=()=>this.closeMonitor();exit.style.cssText='border-radius:10px;padding:10px;background:#343d35;color:#fff;border:1px solid #b0a16d;cursor:pointer';
  dialog.append(title,status,controls,volume,note,source,exit);document.body.append(dialog);dialog.show();this.dialog=dialog;this.refreshMediaInspector();this.mediaButtons.play.focus();return true;
 }
 refreshMediaInspector(){if(this.focus?.kind!=='media'||!this.mediaStatus)return;const item=this.focus.item;this.mediaStatus.textContent=`${item.state.toUpperCase()} · ${Math.floor(item.el.currentTime||0)}s${item.state==='error'||item.state==='unavailable'?' · Playback unavailable; check source and retry.':''}`;this.mediaButtons.play.disabled=['playing','starting'].includes(item.state);this.mediaButtons.pause.disabled=!['playing','starting'].includes(item.state);this.mediaButtons.stop.disabled=item.state==='stopped';for(const button of Object.values(this.mediaButtons)){button.style.opacity=button.disabled?'.45':'1';button.style.cursor=button.disabled?'default':'pointer';}}
 updateMediaAudio(item){if(!item.gain)return;const audio=this.g.audio,p=this.g.player?.pos||item.pos,d=Math.hypot(p.x-item.pos.x,p.y-item.pos.y,p.z-item.pos.z);item.gain.gain.value=(item.volume??.8)*Math.pow(Math.max(0,1-d/110),2);const dx=item.pos.x-p.x,dz=item.pos.z-p.z;item.pan.pan.value=Math.max(-1,Math.min(1,(dx*(audio._rx||1)+dz*(audio._rz||0))/Math.max(1,d)));}
 openMonitor(f){if(this.focus||this.g.combatOverlayOpen||!canOperateHighwallDevice(f))return false;this.focus={owner:f,hp:f.hp,kind:'monitor',item:this.monitor,previousOverlay:!!this.g.combatOverlayOpen,element:document.activeElement};this.g.retireCombatViewInput?.(f,{preserveCarry:true});this.g.combatOverlayOpen=true;document.exitPointerLock?.();
  const dialog=document.createElement('dialog');dialog.setAttribute('aria-label','Highwall live surveillance');dialog.style.cssText='position:fixed;z-index:100;inset:12% auto auto 50%;transform:translateX(-50%);margin:0;padding:18px;border:1px solid #c9a650;border-radius:10px;background:#252e2d;color:#e8e2d6;font:14px Inter,system-ui,sans-serif';
  const title=document.createElement('h2');title.textContent='LIVE / SECURITY';title.style.margin='0 0 10px';const status=document.createElement('p');const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;canvas.style.cssText='width:min(640px,75vw);display:block;background:#111';const controls=document.createElement('div');controls.style.cssText='display:flex;gap:12px;margin-top:12px';for(const [label,fn]of [['Cycle viewpoint · E',()=>this.cycleFeed()],['Return · Escape',()=>this.closeMonitor()]]){const button=document.createElement('button');button.textContent=label;button.onclick=fn;button.style.cssText='border-radius:10px;padding:10px;background:#5d6448;color:#fff;border:1px solid #d9b54d;cursor:pointer';controls.append(button);}dialog.append(title,status,canvas,controls);document.body.append(dialog);dialog.show();controls.firstChild.focus();this.dialog=dialog;this.feedStatus=status;this.feedCanvas=canvas;this.lastFeed=-1;return true;
 }
 cycleFeed(){this.feedIndex=(this.feedIndex+1)%this.cameras.length;this.lastFeed=-1;}
 closeMonitor(){if(!this.focus)return;const saved=this.focus;this.focus=null;this.dialog?.remove();this.dialog=null;this.feedCanvas=null;this.feedStatus=null;this.mediaStatus=null;this.mediaButtons=null;this.g.combatOverlayOpen=saved.previousOverlay;this.g.retireCombatViewInput?.(this.g.player,{preserveCarry:true});saved.element?.focus?.();}
 renderFeed(){const it=this.cameras[this.feedIndex],r=this.g.world.renderer;if(!r||!it)return;this.feedStatus&&(this.feedStatus.textContent=`${it.name} · ${it.enabled?'LIVE 320 × 180 / 8 Hz':'SIGNAL LOST'} · Operator remains vulnerable`);
  if(!it.enabled){this.monitorFace.material.map=null;this.monitorFace.material.color.set(0x151916);this.monitorFace.material.needsUpdate=true;if(this.feedCanvas){const c=this.feedCanvas.getContext('2d');c.fillStyle='#151916';c.fillRect(0,0,320,180);c.fillStyle='#e8c461';c.font='20px sans-serif';c.fillText('SIGNAL LOST',85,95);}return;}
  this.monitorFace.material.map=this.target.texture;this.monitorFace.material.color.set(0xffffff);this.monitorFace.material.needsUpdate=true;
  const sight=this.g.world.surfaceSight?.uniforms.wwSightOn,priorSight=sight?.value;const prior=r.getRenderTarget(),visible=this.monitorFace.visible,auto=r.shadowMap.autoUpdate;const actors=this.g.entities.map(f=>[f.obj,f.obj?.visible,!!f._highwallRetiredBody]);try{if(sight)sight.value=0;this.monitorFace.visible=false;r.shadowMap.autoUpdate=false;for(const [obj,,retired]of actors)if(obj)obj.visible=!retired;r.setRenderTarget(this.target);r.clear();r.render(this.g.scene,it.camera);if(this.feedCanvas){this.pixels??=new Uint8Array(320*180*4);r.readRenderTargetPixels(this.target,0,0,320,180,this.pixels);const c=this.feedCanvas.getContext('2d'),im=c.createImageData(320,180);for(let y=0;y<180;y++)im.data.set(this.pixels.subarray((179-y)*1280,(180-y)*1280),y*1280);c.putImageData(im,0,0);}}finally{if(sight)sight.value=priorSight;r.setRenderTarget(prior);this.monitorFace.visible=visible;r.shadowMap.autoUpdate=auto;for(const [obj,v]of actors)if(obj)obj.visible=v;}
 }
 tick(dt=1/60){if(this.disposed)return;this.elapsed+=Number.isFinite(dt)?Math.max(0,Math.min(dt,.25)):1/60;if(this.focus&&(!canOperateHighwallDevice(this.focus.owner)||this.focus.owner.hp<this.focus.hp||this.g.player!==this.focus.owner||!this.g.running||this.g.matchOver||this.focus.item.mesh.parent!==this.group||this.focus.owner.pos.distanceTo(this.focus.item.pos)>25||this.focus.owner.grabbedBy||this.focus.owner.frozenT>0))this.closeMonitor();
  if(this.doorController){this.doorController.tick(dt);this.doorOpen=this.doorController.open;}
  const near=this.g.player?.pos?.distanceTo(this.monitor.pos)<65;if((this.focus?.kind==='monitor'||near)&&this.elapsed-this.lastFeed>=.125){this.lastFeed=this.elapsed;try{this.renderFeed();}catch(e){this.message(`Surveillance unavailable: ${e.message}`);this.closeMonitor();}}
  if(this.focus?.kind==='media')this.refreshMediaInspector();
  for(const item of this.media){this.updateMediaAudio(item);if(item.state==='playing'&&item.def.lure&&(item.volume??.8)>0&&this.elapsed-this.lastNoise>=3){this.lastNoise=this.elapsed;const loud=.55*(item.volume??.8);if(this.onNoise)this.onNoise(item.pos,loud);else this.g.noise?.(item.pos,loud,null);}}
 }
 snapshot(){return {version:1,doorOpen:this.doorOpen,feedIndex:this.feedIndex,cameras:this.cameras.map(c=>c.enabled),media:this.media.map(m=>({id:m.id,state:m.state,time:m.el.currentTime||0,volume:m.volume}))};}
 restore(data){if(data?.version!==1)return;this.feedIndex=data.feedIndex===1?1:0;this.cameras.forEach((c,i)=>{c.enabled=data.cameras?.[i]!==false;});for(const item of this.media){const saved=data.media?.find(m=>m.id===item.id);if(saved&&Number.isFinite(saved.volume))item.volume=Math.max(0,Math.min(1,saved.volume));}/* Playback intentionally needs a fresh user gesture after resume. */}
 dispose(){if(this.disposed)return;this.disposed=true;this.closeMonitor();window.removeEventListener('keydown',this.key,true);for(const item of this.media){item.serial++;item.el.pause();item.el.onerror=null;item.el.removeAttribute('src');item.el.load();item.source?.disconnect();item.gain?.disconnect();item.pan?.disconnect();item.texture?.dispose();}this.target.dispose();const mats=new Set();this.group.traverse(o=>{o.geometry?.dispose();if(o.material)mats.add(o.material);});for(const m of mats)m.dispose();this.group.removeFromParent();}
}
