import fs from 'node:fs';const path='src/tool/character-foundation.js';let s=fs.readFileSync(path,'utf8');s=s.replace("import {GLTFLoader}","import {Fighter} from '../engine/entity.js';\nimport {ROSTER} from '../data/characters.js';\nimport {createModularFlightAdapter} from '../engine/modular-flight.js';\nimport {GLTFLoader}");s=s.replace("let motion='Punch_Cross'","let motion='Punch_Cross'");s=s.replace("const find=n=>",`const native=new Fighter(ROSTER.find(d=>d.id==='vega'));native._openSky=true;native.obj.visible=false;scene.add(native.obj);native._animate(0);
const height=native.parts.head.position.y+.8*native.parts.head.scale.y;actor.scale.setScalar(height/1.8325);camera.position.set(14,8,22);orbit.target.set(0,height/2,0);orbit.update();
const flightAdapter=createModularFlightAdapter(actor,native);
const find=n=>`);
const a=s.indexOf('function draw(){'),b=s.indexOf('for(const b of document.querySelectorAll',a);
s=s.slice(0,a)+`let flightHands='fist';
function sourcePose(name,t){const clip=gltf.animations.find(c=>c.name===name);mixer.stopAllAction();flightAdapter.reset();const action=mixer.clipAction(clip);action.reset().setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(t*clip.duration);return clip;}
function draw(){
 const flight=motion.startsWith('flight');
 if(flight){
  sourcePose(flightHands==='open'?'A_TPose':'Punch_Cross',flightHands==='open'?0:.4);
  native.flying=true;native.gait='airborne';native.pos.set(0,3,0);native.vel.set(0,motion==='flightRise'?30:0,motion==='flightHover'?0:70);native.cruiseHeld=motion==='flightBoost';native.animT=phase*8;
  native._animate(1/60);flightAdapter.update();
 }else sourcePose(motion,phase);
 sword.visible=motion.startsWith('Sword');actor.updateMatrixWorld(true);
 document.querySelector('#status').textContent=flight?'Native procedural flight · '+flightHands+' hands':motion+' · original authored clip · '+(phase*100).toFixed(0)+'%';
 renderer.render(scene,camera);
}
`+s.slice(b);
s=s.replace("camera.position.set(Math.sin(a)*13,4.5,Math.cos(a)*13)","camera.position.set(Math.sin(a)*24,8,Math.cos(a)*24)");s=s.replace("actor,meshes,mixer,clips:","actor,meshes,mixer,native,flightAdapter,clips:");s=s.replace("gltf.animations.find(c=>c.name===motion).duration+.35","(motion.startsWith('flight')?8:gltf.animations.find(c=>c.name===motion).duration)+.35");s=s.replace("function resize(){",`document.querySelector('#hands').onchange=e=>{flightHands=e.target.value;draw();};
document.querySelector('#size').onchange=e=>{const scale=+e.target.value;actor.scale.setScalar(height/1.8325*scale);draw();};
function resize(){`);fs.writeFileSync(path,s);
let h=fs.readFileSync('character-foundation.html','utf8');h=h.replace('<button id="pause">','<button data-motion="flightHover">Hover</button><button data-motion="flightForward">Flight</button><button data-motion="flightRise">Rise</button><button data-motion="flightBoost">Boost</button><label>Flight hands <select id="hands"><option value="fist">Fist</option><option value="open">Open</option></select></label><label>Size <select id="size"><option value="1">Native height</option><option value="0.85">Compact</option><option value="1.25">Heavy</option></select></label><button id="pause">');fs.writeFileSync('character-foundation.html',h);
