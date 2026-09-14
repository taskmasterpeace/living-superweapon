import fs from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as T from 'three';
import {ACTION_DRAFTS,actionDraft} from '../src/engine/character-action-drafts.js';
import {validateAsset} from '../src/engine/character-authoring.js';
import {CHARACTER_BONES} from '../src/data/character-bones.js';
const b=await fs.readFile('public/models/modular-hero/modular-hero.glb'),g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
const mixer=new T.AnimationMixer(g.scene);mixer.clipAction(g.animations.find(c=>c.name==='Idle_Loop')).play();mixer.setTime(0);const pose={};g.scene.traverse(o=>{if(o.isBone)pose[o.name]=o.quaternion.toArray();});
const catalog=[];await fs.mkdir('public/authoring/studies',{recursive:true});
for(const name of Object.keys(ACTION_DRAFTS)){const id=name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),asset=validateAsset({schema:'powerworld-authoring-v1',rig:'ual-deform-v1',name,parts:[],motion:actionDraft(name,pose)},CHARACTER_BONES);await fs.writeFile('public/authoring/studies/'+id+'.json',JSON.stringify(asset,null,2));catalog.push({id,name,url:'/authoring/studies/'+id+'.json',status:'blocking candidate',markers:asset.motion.markers,duration:asset.motion.duration});}
await fs.writeFile('public/authoring/studies/catalog.json',JSON.stringify(catalog,null,2));console.log(catalog.length+' editable blocking studies');
