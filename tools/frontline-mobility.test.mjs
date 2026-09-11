import test from 'node:test';
import assert from 'node:assert/strict';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {Game} from '../src/engine/game.js';
import * as T from 'three';
import {StudioCombat} from '../src/tool/studio-combat.js';

test('holding jump cannot turn a grounded soldier into a flyer',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sarge')),scene=new T.Scene();
 const stage=new StudioCombat(scene,{scene,camera:new T.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}});
 f._game=stage.game;stage.game.entities=[f];f._openSky=true;f.gait='grounded';
 try{for(let i=0;i<150;i++){f.flyHeld=true;f.update(1/60,stage.game);}assert.equal(f.flying,false);assert.ok(f.pos.y<.2);}
 finally{stage.dispose();f.dispose();}
});
test('third-person fighter hides decorative altitude and facing rings but retains physical shadow',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sarge'));
 try{f._openSky=true;f._animate(1/60);assert.equal(f.parts.bandRing.visible,false);assert.equal(f.parts.faceWedge.visible,false);assert.notEqual(f.parts.shadow.visible,false);}
 finally{f.dispose();}
});

test('PowerWorld environment never grants flight to a grounded soldier',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sarge'));
 try {f._openSky=true;f.toggleFlight();assert.equal(f.flying,false);}
 finally {f.dispose();}
});
test('native flyer retains toggle flight in PowerWorld',()=>{
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));
 try {f._openSky=true;f.toggleFlight();assert.equal(f.flying,true);f.toggleFlight();assert.equal(f.flying,false);}
 finally {f.dispose();}
});
test('idle third-person player does not carry an always-on location halo',()=>{
 const mark=new T.Group(),material=new T.MeshBasicMaterial(),g={playerMark:mark,player:{alive:true,_openSky:true,pos:new T.Vector3(),vel:new T.Vector3(),def:{colors:{accent:'#ffffff'}}},mode:{},running:true,time:0,_pmRing:{material},_pmGlow:{material}};
 Game.prototype.updatePlayerMark.call(g,1/60);assert.equal(mark.visible,false);
});
test('carrying an unselected grenade does not reveal its aim arc',()=>{
 const arc=new T.Group(),p=new Fighter(ROSTER.find(d=>d.id==='sarge'));
 p._openSky=true;
 const g={throwArc:arc,player:p,mode:{},running:true,_arcDots:[],_arcRing:new T.Mesh(new T.RingGeometry(),new T.MeshBasicMaterial())};
 Game.prototype.updateThrowArc.call(g);assert.equal(arc.visible,false);
 p.dispose();
});
