import {ACTION_DRAFTS,actionDraft,createContactRehearsal} from '../engine/character-action-drafts.js';
import * as T from 'three';
import {compileAuthoredMotion,AUTHORING_SCHEMA,RIG,validateAsset,samplePose,createAuthoredParts,saveCharacterRecipe,readCharacterRecipe,recipeEnvelope} from '../engine/character-authoring.js';
import {validateModularRecipe} from '../engine/modular-costume.js';
export function installAuthoring({actor,scene,camera,orbit,getRecipe,setRecipe,clips,setMotion,ROSTER}){
 const bones=[];actor.traverse(o=>{if(o.isBone)bones.push(o.name);});
 let asset={schema:AUTHORING_SCHEMA,rig:RIG,name:'Custom headgear',parts:[],motion:null},active=false,time=0,playing=false,selected=-1;
 const rehearsal=createContactRehearsal(actor,scene);const mount=createAuthoredParts(actor),initial=new Map();for(const name of bones)initial.set(name,actor.getObjectByName(name).quaternion.clone());
 const details=document.createElement('details');details.className='creator-category';details.innerHTML=`<summary>Build parts & animations</summary><div class="authoring-body">
 <a href="/authoring/combat-reference.md" download>Download stats, attack timing and damage reference</a><a href="/authoring/combat-reference.json" download>Download full roster combat data (JSON)</a><a href="/authoring/character-contract.json" download>Download rig and socket contract for AI</a><p>Build rigid headgear on named bones. Pose joints and capture keys. Export JSON for another author or AI.</p>
 <label>Project name<input id="au-name" value="Custom headgear" maxlength="80"></label>
 <div class="buttons"><button id="au-export">Export asset</button><button id="au-import">Import asset</button><button id="au-clip-export">Export animation clip</button></div><input id="au-file" type="file" accept=".json" hidden>
 <div class="buttons"><button id="au-front">Front</button><button id="au-back">Back</button><button id="au-side">Side</button><button id="au-top">Top</button></div>
 <label>Bone / socket<select id="au-bone"></select></label>
 <label>Shape<select id="au-shape"><option>box</option><option>sphere</option><option>cylinder</option></select></label>
 <label>Part color<input id="au-color" type="color" value="#e4e3d9"></label>
 <div class="buttons"><button id="au-add">Add part</button><button id="au-remove">Remove selected part</button></div><select id="au-parts" aria-label="Authored parts"></select>
 <small>Part dimensions and offsets are in metres, relative to the selected bone.</small>
 ${['position','size','rotation'].map(k=>`<fieldset><legend>Part ${k}${k==='rotation'?' (degrees)':''}</legend>${['x','y','z'].map((a,i)=>`<label>${a.toUpperCase()}<input id="au-${k}-${i}" type="number" step="${k==='rotation'?5:.01}" value="${k==='size'?.1:0}"></label>`).join('')}</fieldset>`).join('')}
 <hr><h2>Animation keyframes</h2>
 <label>Starting study<select id="au-study"></select></label><button id="au-study-load">Load action study</button><small>Blocking studies are editable candidates, not approved gameplay animations.</small>
 <label>Contact preview<select id="au-contact-mode"><option value="none">None</option><option value="prop">Carry an object</option><option value="partner">Grab another character</option></select></label><label>Partner size<input id="au-partner-size" type="range" min=".6" max="1.6" step=".05" value="1"></label><label>Airborne context<input id="au-air" type="checkbox"></label>
 <label>Base clip<select id="au-base"></select></label><button id="au-start">Start from current pose</button>
 <label>Duration (seconds)<input id="au-duration" type="number" min=".1" max="30" step=".05" value="1"></label>
 ${['contact','release','controlReturn'].map((k,i)=>`<label>${['Contact / grip','Release / launch','Control returns'][i]}<input id="au-${k}" type="number" min="0" step=".05" value="${[.3,.6,1][i]}"></label>`).join('')}
 <label>Animation bone<select id="au-joint-bone"></select></label><small>Rotate the selected bone, then capture a key. These are local joint rotations, not character movement.</small>
 ${['x','y','z'].map((a,i)=>`<label>Joint ${a.toUpperCase()} (degrees)<input id="au-joint-${i}" type="range" min="-180" max="180" step="1" value="0"></label>`).join('')}
 <label>Time (seconds)<input id="au-time" type="range" min="0" max="1" step=".01" value="0"></label><output id="au-clock">0.00 s</output>
 <div class="buttons"><button id="au-key">Capture key</button><button id="au-play">Play draft</button><button id="au-stop">Exit draft</button><button id="au-delete-key">Delete key</button></div><select id="au-keys" aria-label="Captured keyframes"></select>
 <hr><h2>Character appearance</h2>
 <label>Neck<select id="au-neck"><option value="skin">Skin</option><option value="uniform">Uniform</option></select></label>
 <label>Clothing<select id="au-outfit"><option value="separates">Separate garments</option><option value="bodysuit">Full body suit</option></select></label>
 <label>Complexion<select id="au-skin"><option value="">Choose preset</option>${[['Deep brown','#482c23'],['Dark brown','#633b28'],['Warm brown','#895838'],['Medium brown','#ad7954'],['Tan','#c59a74'],['Light','#e0b797'],['Fair','#f0cfb8']].map(([n,v])=>`<option value="${v}">${n}</option>`).join('')}</select></label>
 <label>Save for character<select id="au-roster"></select></label><div class="buttons"><button id="au-save">Save to this browser</button><button id="au-load">Load saved character</button></div>
 <small>Saved appearance is available to the game on this same address and port. Export a character recipe to transfer it to another machine or port. Asset drafts export separately.</small>
 <output id="au-status" role="status">Ready · all new motion is a review candidate.</output></div>`;
 document.querySelector('aside').prepend(details);
 const style=document.createElement('style');style.textContent='.authoring-body{padding:12px;display:flex;flex-direction:column;gap:10px}.authoring-body input[type=number],.authoring-body input:not([type]){width:120px;background:oklch(.23 .025 85);color:inherit;border:1px solid oklch(.4 .03 85);border-radius:.625rem;padding:6px}.authoring-body fieldset{border:1px solid #555b52;border-radius:.625rem}.authoring-body p{font-size:12px}.authoring-body select{max-width:260px}';document.head.append(style);
 const $=id=>details.querySelector('#au-'+id),status=s=>$('status').textContent=s;
 const run=fn=>()=>{try{fn();}catch(e){status(e.message);}};
 for(const b of bones){$('bone').add(new Option(b,b));$('joint-bone').add(new Option(b,b));}$('joint-bone').value='DEF-head';$('bone').value=bones.find(x=>x==='DEF-head')||bones[0];
 for(const name of Object.keys(ACTION_DRAFTS))$('study').add(new Option(name,name));
 for(const c of clips)$('base').add(new Option(c.name,c.name));$('base').value='Idle_Loop';
 for(const r of ROSTER)$('roster').add(new Option(r.name||r.id,r.id));$('roster').value=getRecipe().rosterId||'vega';
 const refreshParts=()=>{const select=$('parts');select.replaceChildren();asset.parts.forEach((p,i)=>select.add(new Option(p.name,String(i))));select.value=String(selected);mount.set(asset);};
 const syncPart=()=>{const p=asset.parts[selected];if(!p)return;$('bone').value=p.bone;$('shape').value=p.shape;$('color').value=p.color;for(const key of ['position','size','rotation'])p[key].forEach((v,i)=>$(key+'-'+i).value=key==='rotation'?v*180/Math.PI:v);};
 $('parts').onchange=()=>{selected=+$('parts').value;syncPart();};
 $('add').onclick=run(()=>{const p={name:'Part '+(asset.parts.length+1),bone:$('bone').value,shape:$('shape').value,color:$('color').value,position:[0,.12,.11],size:[.25,.06,.035],rotation:[0,0,0]};const next={...asset,parts:[...asset.parts,p]};asset=validateAsset(next,bones);selected=asset.parts.length-1;refreshParts();syncPart();});
 $('remove').onclick=run(()=>{if(selected<0)return;asset.parts.splice(selected,1);selected=Math.min(selected,asset.parts.length-1);refreshParts();syncPart();});
 const editPart=()=>{if(selected<0)return;const p={...asset.parts[selected],bone:$('bone').value,shape:$('shape').value,color:$('color').value};for(const k of ['position','size','rotation'])p[k]=[0,1,2].map(i=>+$(k+'-'+i).value*(k==='rotation'?Math.PI/180:1));const next={...asset,parts:asset.parts.map((v,i)=>i===selected?p:v)};asset=validateAsset(next,bones);mount.set(asset);};
 for(const id of ['shape','color',...['position','size','rotation'].flatMap(k=>[0,1,2].map(i=>k+'-'+i))])$(id).oninput=run(editPart);
 const capture=()=>Object.fromEntries(bones.map(n=>[n,actor.getObjectByName(n).quaternion.toArray()]));
 const refreshKeys=()=>{$('keys').replaceChildren();for(const k of asset.motion?.keys||[])$('keys').add(new Option(k.time.toFixed(2)+' s',String(k.time)));};
 const syncJoint=()=>{const b=actor.getObjectByName($('joint-bone').value);for(let i=0;i<3;i++)$('joint-'+i).value=b.rotation[['x','y','z'][i]]*180/Math.PI;};
 $('bone').onchange=run(editPart);$('joint-bone').onchange=syncJoint;
 const readTiming=()=>{const duration=+$('duration').value,markers=Object.fromEntries(['contact','release','controlReturn'].map(k=>[k,+$(k).value]));return {duration,markers};};
 $('base').onchange=()=>{active=false;setMotion($('base').value,0);};
 $('study-load').onclick=run(()=>{asset=validateAsset({...asset,motion:actionDraft($('study').value,capture())},bones);$('name').value=asset.motion.name;$('duration').value=asset.motion.duration;$('time').max=asset.motion.duration;for(const [k,v] of Object.entries(asset.motion.markers))$(k).value=v;active=true;playing=true;time=0;working={};refreshKeys();status('Editable blocking study loaded');});
 $('start').onclick=run(()=>{const timing=readTiming();asset=validateAsset({...asset,motion:{...timing,name:$('name').value,base:$('base').value,keys:[{time:0,pose:capture()}]}},bones);time=0;active=true;playing=false;$('time').max=timing.duration;refreshKeys();syncJoint();status('Draft started. Pose a bone, move the time slider, then capture.');});
 let working={};
 for(let i=0;i<3;i++)$('joint-'+i).oninput=()=>{if(!active){status('Start a draft first');return;}playing=false;const name=$('joint-bone').value,b=actor.getObjectByName(name);b.rotation.set(...[0,1,2].map(j=>+$('joint-'+j).value*Math.PI/180));working[name]=b.quaternion.toArray();};
 $('duration').onchange=()=>{const d=+$('duration').value;if(d>=.1&&d<=30){$('time').max=d;time=Math.min(time,d);}};
 $('time').oninput=()=>{time=+$('time').value;playing=false;};
 $('key').onclick=run(()=>{if(!asset.motion)throw Error('Start a draft first');const keys=asset.motion.keys.filter(k=>Math.abs(k.time-time)>.005);keys.push({time,pose:capture()});keys.sort((a,b)=>a.time-b.time);asset=validateAsset({...asset,motion:{...asset.motion,...readTiming(),keys}},bones);working={};refreshKeys();status('Captured '+time.toFixed(2)+' seconds');});
 $('keys').onchange=()=>{time=+$('keys').value;$('time').value=time;working={};playing=false;};
 $('delete-key').onclick=run(()=>{if(!asset.motion||asset.motion.keys.length<=1)throw Error('Keep at least one key');const t=+$('keys').value;asset.motion.keys=asset.motion.keys.filter(k=>k.time!==t);refreshKeys();});
 $('play').onclick=run(()=>{if(!asset.motion)throw Error('Capture a draft first');asset=validateAsset({...asset,motion:{...asset.motion,...readTiming()}},bones);working={};active=true;playing=true;time=0;});
 $('stop').onclick=()=>{active=false;playing=false;working={};status('Returned to source / flight preview');};
 $('export').onclick=run(()=>{asset.name=$('name').value;const out=validateAsset(asset,bones);const url=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='powerworld-authoring-asset.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Exported parts, keys, timing and rig contract.');});
 $('clip-export').onclick=run(()=>{const clip=compileAuthoredMotion(validateAsset(asset,bones)),data={rig:RIG,status:'candidate',source:asset.motion.source,markers:asset.motion.markers,clip:T.AnimationClip.toJSON(clip)},url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='powerworld-animation-clip.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Exported Three.js clip and separate timing metadata');});
 $('import').onclick=()=>$('file').click();$('file').onchange=async()=>{try{const f=$('file').files[0];if(!f)return;if(f.size>4000000)throw Error('Asset exceeds 4 MB');const next=validateAsset(JSON.parse(await f.text()),bones);asset=next;selected=asset.parts.length-1;$('name').value=asset.name;refreshParts();syncPart();refreshKeys();active=!!asset.motion;playing=false;time=0;working={};if(asset.motion){$('duration').value=asset.motion.duration;$('time').max=asset.motion.duration;for(const [k,v] of Object.entries(asset.motion.markers))$(k).value=v;}status('Imported validated candidate.');}catch(e){status(e.message);}finally{$('file').value='';}};
 for(const [id,pos] of Object.entries({front:[0,0,1],back:[0,0,-1],side:[1,0,0],top:[0,1,.001]}))$(id).onclick=()=>{const distance=camera.position.distanceTo(orbit.target);camera.position.copy(orbit.target).add(new T.Vector3(...pos).multiplyScalar(distance));orbit.update();};
 $('neck').onchange=()=>setRecipe({...getRecipe(),neckStyle:$('neck').value});$('outfit').onchange=()=>setRecipe({...getRecipe(),outfit:$('outfit').value,...($('outfit').value==='bodysuit'?{belt:false,knees:false}: {})});$('skin').onchange=()=>{if($('skin').value)setRecipe({...getRecipe(),skin:$('skin').value});};
 $('save').onclick=run(()=>{const r=validateModularRecipe(recipeEnvelope(getRecipe()));saveCharacterRecipe($('roster').value,r);status('Saved '+$('roster').selectedOptions[0].textContent+' on this browser address. Export for backup.');});
 $('load').onclick=run(()=>{const r=readCharacterRecipe($('roster').value);if(!r)throw Error('No saved appearance for this character');const validated=validateModularRecipe(r);if(validated.authoredAsset){asset=validated.authoredAsset;refreshParts();refreshKeys();}setRecipe(validated);status('Loaded saved appearance');});
 return {get asset(){return asset.parts.length||asset.motion?asset:null;},update(dt){rehearsal.set(active?$('contact-mode').value:'none',+$('partner-size').value,$('air').checked);if(!active||!asset.motion)return;const m=asset.motion;if(playing){time=m.loop?(time+dt)%m.duration:Math.min(m.duration,time+dt);if(!m.loop&&time===m.duration)playing=false;}
  document.querySelector('#status').textContent=m.name+' | authored candidate | '+time.toFixed(2)+' / '+m.duration.toFixed(2)+' s'+(m.loop?' | loop':'');
  const pose={...samplePose(m,time),...working};for(const [name,q] of Object.entries(pose))actor.getObjectByName(name)?.quaternion.fromArray(q);actor.updateMatrixWorld(true);rehearsal.update(time,m);$('time').value=time;$('clock').textContent=time.toFixed(2)+' s · '+(time<m.markers.contact?'Startup':time<m.markers.release?'Contact / held':time<m.markers.controlReturn?'Recovery':'Control returned');
 }};
}
