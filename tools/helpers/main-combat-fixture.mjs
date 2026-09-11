import * as THREE from 'three';
import {World} from '../../src/engine/world.js';
import {Game} from '../../src/engine/game.js';
import {Fighter} from '../../src/engine/entity.js';
import {MeleeSystem} from '../../src/engine/melee.js';
import {Input} from '../../src/core/input.js';
import {Gamepad} from '../../src/core/gamepad.js';
import {ROSTER} from '../../src/data/characters.js';
import {StudioCombat} from '../../src/tool/studio-combat.js';

// Native World camera/collision, Fighter, controllers, melee and ordnance.
// Only WebGL construction/output is omitted; StudioCombat supplies real bounded
// particles/ordnance and silent audio, not an alternate control or damage path.
export function mainCombatFixture({height=0,mode='freeroam',hero='sol'}={}) {
 globalThis.innerWidth=1600;globalThis.innerHeight=900;
 const noop=()=>{},scene=new THREE.Scene(),w=Object.create(World.prototype);
 const ortho=new THREE.OrthographicCamera(-138.67,138.67,78,-78,1,1400);
 Object.assign(w,{scene,camera:ortho,camOrtho:ortho,camMode:'iso',camPos:new THREE.Vector3(150,170,150),
  camTarget:new THREE.Vector3(),camBasis:new THREE.Vector3(),camDir:new THREE.Vector3(.86,.92,.86).normalize(),
  camDist:260,frustum:78,frustumTarget:78,shakeV:new THREE.Vector3(),sun:new THREE.DirectionalLight(),sunOff:new THREE.Vector3(40,60,20),
  cover:[],interiors:[],_lookActive:false,_lookYaw:0,_lookPitch:0,_lookSens:.0024,_shake:0,_shakeT:0,
  _gseg:4,_ghArena:240,ARENA:240,_gh:new Float32Array(25).fill(height),_qTier:2,_maxPR:1,
  renderer:{setPixelRatio:noop},composer:{setPixelRatio:noop,setSize:noop,passes:[]},bloom:{setSize:noop}});
 ortho.position.copy(w.camPos);ortho.lookAt(0,6,0);ortho.updateMatrixWorld(true);
 const combat=new StudioCombat(scene,w),g=combat.game;
 Object.setPrototypeOf(g,Game.prototype);
 const p=new Fighter(structuredClone(ROSTER.find(d=>d.id===hero)));
 p.pos.set(0,height,0);p.groundY=height;p.obj.position.copy(p.pos);p.gait='grounded';p._game=g;
 p.facing=0;p.aim.set(0,0,1);p.aim3.set(0,0,1);scene.add(p.obj);
 const pad=Object.create(Gamepad.prototype);Object.assign(pad,{active:false,connected:false,dead:.24,lx:0,ly:0,rx:0,ry:0,cur:{},prev:{},btn:[]});
 Object.assign(g,{player:p,entities:[p],humans:[{fighter:p,scheme:'kbm'}],input:new Input(),pad,running:true,modeId:mode,
  mode:{},ms:{},matchOver:false,_aim3pt:new THREE.Vector3(),aimPoint:new THREE.Vector3(),hardLock:null,lockTarget:null,
  fwd:new THREE.Vector3(-1,0,0),right:new THREE.Vector3(0,0,-1),_candidates:[],_flung:[],_decoys:[],fov:false});
 delete g.isHuman;g.melee=new MeleeSystem(g);
 for(let i=0;i<60;i++)p._animate(1/60);p.obj.updateMatrixWorld(true);
 const foe=({x=0,y=height,z=70,team=2}={})=>{
  const f=new Fighter(ROSTER.find(d=>d.id==='kano'));f.pos.set(x,y,z);f.groundY=height;f.obj.position.copy(f.pos);f.team=team;f._game=g;f._vis=1;
  scene.add(f.obj);g.entities.push(f);return f;
 };
 return {g,w,p,pad,foe,combat,control(dt=1/60){g.prepareCombatView?.(dt);g.controlPlayer(dt,dt);},
  close(){combat.dispose();for(const f of g.entities){scene.remove(f.obj);f.dispose();}}};
}
