import * as THREE from 'three';
import {cloneReviewActor,applyReviewPose,reviewFrame} from './melee-recording.js';
import '../styles/melee-review.css';

export function openMeleeReview(game,recording,onClose=()=>{}){
 if(recording.frames.length<2||game.combatOverlayOpen)return null;
 const frames=recording.frames.slice(),start=frames[0].time,end=frames.at(-1).time;
 const previousRunning=game.running,focus=document.activeElement;
 const dialog=document.createElement('dialog');dialog.className='melee-review';dialog.setAttribute('aria-label','Threat Room combat review');
 dialog.innerHTML=`<header><div><h1>THREAT ROOM <span>Combat review</span></h1><p>Recorded poses · practice paused · effects and terrain are not replayed</p></div><button data-close>Return to practice</button></header><div class="melee-review-stage"></div><footer><nav aria-label="Review camera"></nav><div class="melee-review-transport"><button data-play>Play</button><label>Speed <select data-speed><option value="0.25">¼ speed</option><option value="0.5">½ speed</option><option value="1">Normal</option></select></label><label class="melee-review-timeline">Exchange <input data-time type="range" min="0" max="${end-start}" step="0.001" value="0"></label><output data-clock></output></div><p data-readout aria-live="off"></p></footer>`;
 document.body.append(dialog);
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 const stage=dialog.querySelector('.melee-review-stage');stage.append(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#101311');
 scene.add(new THREE.HemisphereLight(0xe8edf2,0x51442b,2.1));const sun=new THREE.DirectionalLight(0xffe1ae,2.5);sun.position.set(15,30,20);scene.add(sun);
 const copies=recording.actors.map(a=>cloneReviewActor(a.template.model));copies.forEach(c=>scene.add(c.model));
 const camera=new THREE.PerspectiveCamera(42,1,.1,3000),center=new THREE.Vector3(),offset=new THREE.Vector3();
 const bounds=new THREE.Box3();for(const frame of frames)for(const actor of frame.actors)bounds.expandByPoint(new THREE.Vector3().fromArray(actor.pose));
 const base=bounds.getCenter(new THREE.Vector3()),span=Math.max(24,bounds.getSize(new THREE.Vector3()).length()+14);
 const grid=new THREE.GridHelper(Math.max(80,span*2),20,0x786344,0x292c27);grid.position.set(base.x,bounds.min.y,base.z);scene.add(grid);
 const yaw=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().fromArray(frames[0].actors[0].pose,3),'YXZ').y;
 let view='side',time=start,playing=false,last=performance.now(),raf,closed=false;
 const slider=dialog.querySelector('[data-time]'),play=dialog.querySelector('[data-play]'),speed=dialog.querySelector('[data-speed]');
 for(const [id,label]of [['rear','Gameplay angle'],['front','Front'],['side','Side'],['overhead','Overhead']]){
  const button=document.createElement('button');button.textContent=label;button.dataset.view=id;button.onclick=()=>{view=id;};dialog.querySelector('nav').append(button);
 }
 function draw(now){
  if(closed)return;
  if(playing){time=Math.min(end,time+Math.min(.1,(now-last)/1000)*Number(speed.value));if(time===end){playing=false;play.textContent='Play';}}
  last=now;const {a,b,mix}=reviewFrame(frames,time);
  copies.forEach((c,i)=>applyReviewPose(c.nodes,a.actors[i].pose,b.actors[i].pose,mix));
  center.copy(copies[0].model.position).add(copies[1].model.position).multiplyScalar(.5);center.y+=5;
  const distance=Math.max(24,copies[0].model.position.distanceTo(copies[1].model.position)*1.1+14);
  offset.set(...(view==='front'?[.4,.35,1]:view==='side'?[1,.25,0]:view==='overhead'?[0,1,.015]:[.4,.3,-1])).normalize().multiplyScalar(distance);
  offset.applyAxisAngle(new THREE.Vector3(0,1,0),yaw);camera.position.copy(center).add(offset);camera.lookAt(center);
  const width=stage.clientWidth,height=stage.clientHeight;if(renderer.domElement.width!==Math.round(width*renderer.getPixelRatio())||renderer.domElement.height!==Math.round(height*renderer.getPixelRatio())){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
  renderer.render(scene,camera);slider.value=time-start;dialog.querySelector('[data-clock]').textContent=`${(time-start).toFixed(2)} / ${(end-start).toFixed(2)} s`;
  dialog.querySelector('[data-readout]').textContent=a.actors.map((f,i)=>`${i?'Target':'You'}: ${f.phase} · HP ${f.hp.toFixed(1)} · energy ${f.ki.toFixed(1)}`).join('     /     ');
  for(const button of dialog.querySelectorAll('[data-view]'))button.setAttribute('aria-pressed',String(button.dataset.view===view));
  raf=requestAnimationFrame(draw);
 }
 function close(){if(closed)return;closed=true;cancelAnimationFrame(raf);window.removeEventListener('keydown',keys,true);game.combatOverlayOpen=false;game.running=previousRunning;game.retireCombatViewInput?.();dialog.close();dialog.remove();copies.forEach(c=>c.dispose());grid.geometry.dispose();grid.material.dispose();renderer.dispose();focus?.focus?.();onClose();}
 function keys(e){e.stopImmediatePropagation();if(e.code==='Escape'){e.preventDefault();close();}if(e.code==='Space'){e.preventDefault();play.click();}}
 play.onclick=()=>{if(time>=end)time=start;playing=!playing;play.textContent=playing?'Pause':'Play';};slider.oninput=()=>{time=start+Number(slider.value);playing=false;play.textContent='Play';};dialog.querySelector('[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 game.retireCombatViewInput?.();game.combatOverlayOpen=true;game.running=false;document.exitPointerLock?.();window.addEventListener('keydown',keys,true);dialog.showModal();play.focus();raf=requestAnimationFrame(draw);
 return {close};
}
