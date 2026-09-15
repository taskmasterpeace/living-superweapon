import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {createSoldierFamilyDefinition} from '../src/data/soldier-family.js';
import {loadModularCharacter} from '../src/engine/modular-character.js';
import {HandheldDeviceView,handheldUnavailable} from '../src/engine/handheld-device-view.js';
globalThis.ProgressEvent??=class{constructor(type,data){Object.assign(this,{type},data);}};
async function body(){const b=await readFile('public/models/modular-hero/modular-hero.glb');return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
test('handheld admission enforces ownership, recovery, actions, transport and both-hand conflicts',()=>{
 const f={alive:true,def:{},_modularCharacter:{actor:{}},slots:{}};
 assert.equal(handheldUnavailable(f),'');
 for(const patch of [{_inventoryDevice:false},{alive:false},{_carry:{}},{_personCarry:{}},{_fleetVehicle:{}},{_firearmReload:{}},{mstate:'active'},{stunT:1},{flying:true},{prone:true},{crouching:true}])assert.ok(handheldUnavailable({...f,...patch}));
});
test('held device preserves root/aim and releases both claims; entry/exit camera is bounded',async()=>{
 const x=mainCombatFixture({mode:'powerworld'});x.w.waterAt=()=>0;try{
 const f=x.g.addFighter(createSoldierFamilyDefinition({role:'rifleman'}),{team:0,x:0,z:0});await loadModularCharacter(f,{load:body});f.gait='grounded';
 // Unarmed fixture: no weapon ownership is fabricated for this hold test.
 for(const arm of [f.parts.armL,f.parts.armR]){const h=arm.children[2];h.userData.gripOccupied=false;h.children.forEach(o=>{if(o.userData.weaponKind)o.visible=false;});}
 const camera=new T.PerspectiveCamera(58,16/9,.6,4200);camera.position.set(0,13,-25);camera.lookAt(0,8,0);
 const game={player:f,running:true,world:{camera,heightAt:()=>0,_camNearestT:()=>1,cover:[],chase(){camera.position.set(0,13,-25);camera.lookAt(0,8,0);camera.fov=58;}},hud:{feed(){}},retireCombatViewInput(){}};
 const view=new HandheldDeviceView(game),root=f.pos.clone(),aim=JSON.stringify(f.aim3),originalDoc=globalThis.document;
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};
 try{
 assert.equal(view.open(f),true);const positions=[];
 for(let i=0;i<32;i++){f.animT=i/60;f._animate(1/60);f._modularCharacter.update();view.frameCamera(1/60);positions.push(camera.position.clone());}
 assert.equal(view.state.phase,'hold');assert.deepEqual(f.pos,root);assert.equal(JSON.stringify(f.aim3),aim);
 assert.ok(view.state.contacts.every(c=>c.gap<.18),JSON.stringify(view.state.contacts));
 assert.ok(positions.slice(1).every((p,i)=>p.distanceTo(positions[i])<4),'camera transition has no full-distance snap');
 view.close();for(let i=0;i<24&&view.isOpen;i++){f._animate(1/60);f._modularCharacter.update();view.frameCamera(1/60);}
 assert.equal(view.isOpen,false);assert.ok([f.parts.armL,f.parts.armR].every(a=>!a.children[2].userData.gripOccupied));assert.ok(camera.position.distanceTo(new T.Vector3(0,13,-25))<.001);
 // Native inventory/mount transaction retains the same gun and ammo objects.
 x.g.equipFrom(f,{id:'device-test-pistol',mesh:'pistol',ab:{type:'rifle',weapon:'pistol',name:'Test pistol',oneHand:true,damage:3}},{primary:true});
 const gear=f._gearHeld,ammo=f.slots._gear.ammo,weapon=f._gearMesh;
 assert.equal(view.open(f),true);assert.equal(f._inventoryStowed,true);assert.equal(weapon.visible,false);
 f.hp-=1;view.frameCamera(1/60);assert.equal(view.state.phase,'exit');
 for(let i=0;i<24&&view.isOpen;i++)view.frameCamera(1/60);
 assert.equal(view.isOpen,false);assert.equal(f._gearHeld,gear);assert.equal(f.slots._gear.ammo,ammo);assert.equal(f._inventoryStowed,false);assert.equal(weapon.visible,true);
 f._inventoryDevice=false;assert.equal(view.open(f),false,'item ownership remains authoritative');
 }finally{view.dispose();globalThis.document=originalDoc;}
 }finally{x.close();}
});
