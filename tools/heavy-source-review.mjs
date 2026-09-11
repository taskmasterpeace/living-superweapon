// Source-only audition. No production pose changes or user Studio storage.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/heavy-source';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1000,height:760},recordVideo:{dir:out,size:{width:1000,height:760}}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5180');
 await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),{GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
  document.body.innerHTML='';document.body.style.cssText='margin:0;background:#252823';
  const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1000,760);renderer.setPixelRatio(1);document.body.append(renderer.domElement);
  const label=document.createElement('div');label.style.cssText='position:fixed;top:20px;left:24px;color:#eee8d7;font:16px system-ui';document.body.append(label);
  const scene=new T.Scene();scene.background=new T.Color('#252823');scene.add(new T.HemisphereLight('#e4f3ff','#857865',2));
  const key=new T.DirectionalLight('#fff1d0',3);key.position.set(4,8,5);scene.add(key);
  const grid=new T.GridHelper(8,16,'#6e7063','#383f36');scene.add(grid);
  const camera=new T.PerspectiveCamera(32,1000/760,.01,100),source=await new GLTFLoader().loadAsync('/assets-src/quaternius/library-2/UAL2_Standard.glb');
  // Recolor only the diagnostic mannequin's purple joint material to neutral.
  source.scene.traverse(o=>{if(o.isMesh){o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();for(const m of [].concat(o.material))if(m.name==='M_Joints')m.color.set('#343c40');}});
  scene.add(source.scene);const mixer=new T.AnimationMixer(source.scene);
  window.sourcePose=(name,time,angle='threequarter')=>{
   const clip=source.animations.find(c=>c.name===name);mixer.stopAllAction();const action=mixer.clipAction(clip);action.reset().setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(Math.min(time,clip.duration));
   camera.position.set(...({front:[0,1.4,4.8],rear:[0,1.4,-4.8],left:[-4.8,1.4,0],right:[4.8,1.4,0],threequarter:[3,1.5,4]}[angle]));camera.lookAt(0,.9,.25);scene.updateMatrixWorld(true);renderer.render(scene,camera);
   label.textContent=`QUATERNIUS UAL2 / ${name} / ${time.toFixed(3)}s / ${angle} / SOURCE ONLY`;
   return clip.duration;
  };
 });
 const rows=[];
 for(const name of ['Melee_Hook','Melee_Hook_Rec','OverhandThrow']){
  const duration=await page.evaluate(n=>sourcePose(n,0),name);rows.push({take:name,duration});
  for(const fraction of [0,.25,.5,.75,1]){
   await page.evaluate(([n,t])=>sourcePose(n,t),[name,duration*fraction]);await page.screenshot({path:`${out}/${name}-${fraction}.png`});
  }
  for(const angle of ['front','left','right','rear'])await page.evaluate(async([n,d,a])=>{for(let repeat=0;repeat<2;repeat++)for(let i=0;i<=Math.ceil(d*60);i++){sourcePose(n,i/60,a);await new Promise(requestAnimationFrame);}},[name,duration,angle]);
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/sources.json`,JSON.stringify({rows,errors},null,2));console.log(rows);
}finally{await context.close();await page.video()?.saveAs(`${out}/motion.webm`);await browser.close();}
