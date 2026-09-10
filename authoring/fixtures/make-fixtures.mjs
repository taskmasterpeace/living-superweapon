// Generates the fixture packages under authoring/fixtures. One valid package, then one deliberately
// broken copy per validation rule. Each broken copy re-signs its package hash so the ONLY failure
// it carries is the one it is named for — a fixture that fails for two reasons proves nothing.
import {writeFile,mkdir,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sha256,packageHashOf} from '../lib/hash.js';
import {limitsFor} from '../lib/budgets.js';
import {HUMANOID_SLOTS,POSE_BRIDGE} from '../lib/slots.js';

const ROOT=resolve(fileURLToPath(new URL('.',import.meta.url)));
const ZERO='0'.repeat(64);
const identity=[0,0,0,1];
// A tiny but structurally real pose bank: unit directions, unit quaternions, support in [0,1].
function bank(){
 const frame=[];
 for(let i=0;i<8;i++)frame.push(0,-1,0);
 for(let i=0;i<5;i++)frame.push(0,0,0,1);
 frame.push(0);
 const second=frame.slice();second[0]=0.6;second[1]=-0.8;
 return {version:1,source:{note:'fixture'},clips:{idle:{take:'Fixture_Idle',duration:1/60,frames:[frame,second]}}};
}
function baseManifest(bankText){
 const mapping={};HUMANOID_SLOTS.forEach((slot,i)=>mapping[slot]=`joint_${i}`);
 const measured={triangles:0,drawCalls:0,materials:0,bones:0,textures:0,bytes:Buffer.byteLength(bankText)};
 return {
  format:'pw-asset-package',formatVersion:1,id:'fixture.motion',version:1,kind:'humanoid-motion',displayName:'Fixture motion',tags:['fixture'],
  provenance:{author:'PowerWorld authoring fixtures',license:'CC0-1.0',redistribution:'free',terms:'Synthetic test data.'},
  source:{adapter:'fixture@1',files:[{path:'authoring/fixtures/make-fixtures.mjs',sha256:ZERO}],recipe:{path:'authoring/recipes/fixture/recipe.json',sha256:ZERO}},
  tool:{name:'powerworld-authoring',version:'0.1.0',three:'0.169.0',adapterVersion:1},
  build:{options:{},cacheKey:ZERO,contentHash:ZERO,profile:'desktop'},
  units:{lengthUnit:'game-unit',metersPerUnit:0.19,up:'+Y',forward:'+Z',handedness:'right',sourceConversion:{scale:1,yawDegrees:0,mirrorX:false,sourceUp:'+Y',sourceForward:'+Z'}},
  outputs:[{path:'pose-bank.json',role:'pose-bank',sha256:sha256(Buffer.from(bankText)),bytes:Buffer.byteLength(bankText)}],
  rig:{skeleton:POSE_BRIDGE.skeleton,mapping,bones:HUMANOID_SLOTS.length},
  clips:[{id:'idle',take:'Fixture_Idle',duration:1/60,loop:true,sampleRate:60,frames:2,mirror:null,handedness:'none',events:[{t:0,type:'loop'}]}],
  budgets:{profile:'desktop',measured,limits:limitsFor('humanoid-motion','desktop')},
  compatibility:{poseBridge:{frameLength:POSE_BRIDGE.frameLength,layout:POSE_BRIDGE.layout,engineModule:POSE_BRIDGE.engineModule}},
 };
}
async function writePackage(dir,manifest,files){
 await rm(dir,{recursive:true,force:true});await mkdir(dir,{recursive:true});
 for(const [name,text] of Object.entries(files))await writeFile(join(dir,name),text);
 manifest.packageHash=packageHashOf(manifest);
 await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
}
const bankText=JSON.stringify(bank());
await writePackage(join(ROOT,'valid','fixture.motion','v1'),baseManifest(bankText),{'pose-bank.json':bankText});

const broken={
 'invalid-rig-mapping':m=>{delete m.rig.mapping.kneeL;m.rig.mapping.handR='joint_5';},
 'missing-muzzle':m=>{Object.assign(m,{kind:'equipment',id:'fixture.sidearm',equipment:{class:'firearm',twoHanded:false,hand:'right'},rig:{skeleton:'none'},
   sockets:[{name:'grip',parent:'body',position:[0,0,0],rotation:identity},{name:'support',parent:'body',position:[0,-.6,0],rotation:identity},{name:'magazine',parent:'body',position:[0,-.3,-.4],rotation:identity},{name:'holster',parent:'body',position:[0,0,0],rotation:identity}]});
   delete m.clips;delete m.compatibility;m.outputs=[{path:'model.glb',role:'glb',sha256:sha256(Buffer.from('not a glb')),bytes:9}];m.budgets.limits=limitsFor('equipment','desktop');},
 'nan-frame':null,
 'missing-license':m=>{delete m.provenance.license;},
 'unsafe-external-path':m=>{m.source.files[0].path='../../../../Windows/System32/config';},
 'budget-exceeded':m=>{m.budgets.measured.triangles=m.budgets.limits.triangles+1;},
 'duplicate-clip-id':m=>{m.clips.push({...m.clips[0]});},
 'incompatible-version':m=>{m.formatVersion=2;},
};
for(const [name,mutate] of Object.entries(broken)){
 const manifest=baseManifest(bankText);
 const files={'pose-bank.json':bankText};
 if(name==='nan-frame'){
  const bad=JSON.parse(bankText);bad.clips.idle.frames[1][3]='NaN-placeholder';
  const text=JSON.stringify(bad).replace('"NaN-placeholder"','NaN');
  files['pose-bank.json']=text;manifest.outputs[0].sha256=sha256(Buffer.from(text));manifest.outputs[0].bytes=Buffer.byteLength(text);
 }else if(name==='missing-muzzle'){mutate(manifest);files['model.glb']='not a glb';delete files['pose-bank.json'];}
 else mutate(manifest);
 await writePackage(join(ROOT,'invalid',name),manifest,files);
}
console.log('fixtures written under authoring/fixtures/{valid,invalid}');
