import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot} from '../src/engine/abilities.js';
const scene=new T.Scene(),world={scene,cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}},combat=new StudioCombat(scene,world),g=combat.game;
const f=new Fighter({...ROSTER.find(d=>d.id==='sarge'),build:{gaunt:1,weaponR:'rifle'}});f._game=g;g.player=f;scene.add(f.obj);f.animT=0;f.hasAimWorld=true;f.aim.set(0,0,1);f.aim3.set(0,0,1);f.facing=0;f.gait='grounded';
const local=o=>f.parts.torso.worldToLocal(o.getWorldPosition(new T.Vector3())).toArray().map(v=>+v.toFixed(3));
for(const target of [[0,7,40],[0,80,15],[0,0,12]]){
 f.aimWorld.fromArray(target);
 for(let i=0;i<120;i++){f.animT+=1/60;f.slots.lmb.cd=0;f.ki=f.maxKi;runSlot(f,'lmb',{held:true,dt:1/60},g);f._animate(1/60);f.obj.updateMatrixWorld(true);}
 const p=f.parts,gun=f.obj.getObjectByName('weapon-rifle');
 console.log(JSON.stringify({target,active:f._riflePose?.active,frame:p.g.userData.frame,torsoScale:p.torso.scale.toArray(),shoulderR:local(p.armR),shoulderL:local(p.armL),elbowR:local(p.armR.children[1]),elbowL:local(p.armL.children[1]),handR:local(p.armR.children[2]),handL:local(p.armL.children[2]),stock:local(gun.getObjectByName('weapon-stock-contact')),support:local(gun.getObjectByName('weapon-support-grip'))}));
}
f.dispose();combat.dispose();
