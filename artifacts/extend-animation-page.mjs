import fs from 'node:fs';
const path='src/tool/animation-page.js';let s=fs.readFileSync(path,'utf8');
function replace(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,60));s=s.replace(a,b);}
replace("import {mountFavorites}","import {poseHoldPair,clearHoldPreview} from './paired-hold-preview.js';\nimport {mountFavorites}");
replace('const catalog=buildAnimationCatalog();','const catalog=buildAnimationCatalog();catalog.entries=[...catalog.entries,...catalog.procedural];');
replace('rate=1,fighter,base=[];','rate=1,fighter,receiver,base=[];');
replace('function character(){if(fighter)',"function character(){if(receiver){scene.remove(receiver.obj);receiver.dispose();receiver=null;}if(fighter)");
replace("view('front');}","view('front');if(entry.kind==='procedural')makeReceiver();}");
replace('function choose(e){entry=e;clip=resolveAnimationClip(e.id);time=0;loadMarkers();',"function choose(e){clearHoldPreview(fighter);if(receiver){scene.remove(receiver.obj);receiver.dispose();receiver=null;}entry=e;clip=resolveAnimationClip(e.id)||{duration:e.duration};time=0;loadMarkers();if(e.kind==='procedural')makeReceiver();$('.eyebrow').textContent=e.kind==='procedural'?'NATIVE PAIRED HOLD / PROCEDURAL':'AUTHORED CLIP PREVIEW';");
replace("e.issues.join(', '):'Pose data valid'","e.issues.join(', '):e.kind==='procedural'?'Native hold preview; no imported frames':'Pose data valid'");
replace("if(fighter.parts.rig){samplePoseFrame", "if(entry.kind==='procedural'){poseHoldPair(fighter,receiver,time,entry.friendly);}else if(fighter.parts.rig){samplePoseFrame");
replace('function character(){',"function makeReceiver(){receiver=new Fighter(ROSTER.find(d=>d.id==='merc'),{rimK:.14});scene.add(receiver.obj);poseHoldPair(fighter,receiver,0,entry.friendly);receiver.obj.traverse(o=>base.push({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()}));center.z=1.65;distance=Math.max(distance,28);view('side');}\nfunction character(){");
replace("Audio links and procedural families remain to be integrated.","Paired holds use native procedural poses; their timing is reviewed in the Threat Room. Audio links and other procedural families remain to be integrated.");
fs.writeFileSync(path,s);
