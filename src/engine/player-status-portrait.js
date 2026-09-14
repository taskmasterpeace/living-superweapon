import * as THREE from 'three';
import {figure} from './figure.js';
let renderer;
// One small offscreen context, rendering only on identity/form change, never every frame.
export function portraitOf(def){
 renderer??=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
 renderer.setSize(208,240,false);renderer.setPixelRatio(1);renderer.setClearColor(0,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;
 const scene=new THREE.Scene(),p=figure(def);p.groundRig.visible=false;if(p.aura)p.aura.visible=false;
 scene.add(p.g);scene.add(new THREE.HemisphereLight('#dcecff','#433529',2));
 const key=new THREE.DirectionalLight('#fff1d9',3);key.position.set(3,8,10);scene.add(key);
 p.g.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(p.head),center=bounds.getCenter(new THREE.Vector3()),h=Math.max(1.3,bounds.max.y-bounds.min.y)*2.05;
 const camera=new THREE.OrthographicCamera(-h*208/240/2,h*208/240/2,h/2,-h/2,.01,100);
 center.y-=h*.13;camera.position.set(center.x+.35,center.y,center.z+15);camera.lookAt(center);renderer.render(scene,camera);
 const url=renderer.domElement.toDataURL('image/png'),resources=new Set();
 p.g.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])resources.add(m);});
 for(const r of resources)r.dispose();return url;
}
export async function modularPortraitOf(def){
 const {createModularPresentation}=await import('./modular-presentation.js');
 const c=await createModularPresentation(def);renderer??=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(208,240,false);renderer.setPixelRatio(1);renderer.setClearColor(0,0);
 const scene=new THREE.Scene();scene.add(c.actor);scene.add(new THREE.HemisphereLight('#e9f0ec','#433b2b',2));const key=new THREE.DirectionalLight('#fff4e1',3);key.position.set(3,8,10);scene.add(key);
 const camera=new THREE.OrthographicCamera(-.24,.24,.28,-.28,.01,30);camera.position.set(.035,1.61,4);camera.lookAt(0,1.61,0);
 renderer.render(scene,camera);const url=renderer.domElement.toDataURL('image/png');c.dispose();return url;
}
