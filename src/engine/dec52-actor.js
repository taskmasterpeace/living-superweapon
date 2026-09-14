import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createDec52GameplayMotion} from './dec52-gameplay-motion.js';
import {metersToUnits,unitsToMeters} from '../core/world-units.js';
// Shipped fleet pivot assets use .19 metres per asset unit. No humanoid retarget.
export async function createDec52Actor({family='hound',scene,loader=new GLTFLoader()}={}){
 if(!['rat','hound'].includes(family))throw Error('Supported Dec-52 creature families: rat, hound');
 const asset=await loader.loadAsync('/models/dec52/'+family+'/model.glb'),actor=asset.scene,root=new T.Group();
 root.name='Dec-52 '+family;actor.scale.multiplyScalar(metersToUnits(.19));root.add(actor);
 const motion=createDec52GameplayMotion(actor,family),events={},velocity={x:0,z:0};let disposed=false,last=null;
 scene?.add(root);
 const api={root,actor,clips:motion.clips,get playback(){return last;},
  acceptAction({type,token}={}){
   if(disposed)throw Error('Dec-52 actor disposed');
   if(!['bite','jump','hit'].includes(type)||!['string','number'].includes(typeof token)||typeof token==='number'&&!Number.isFinite(token))throw Error('Accepted action requires supported type and stable token');
   events[type==='bite'?'attackToken':type+'Token']=token;
  },
  sync(state,dt){
   if(disposed)return null;
   if(!state?.pos||![state.pos.x,state.pos.y,state.pos.z,state.yaw,dt].every(Number.isFinite)||dt<0)throw Error('Invalid Dec-52 actor state');
   root.position.copy(state.pos);root.rotation.y=state.yaw;
   velocity.x=unitsToMeters(Number.isFinite(state.vel?.x)?state.vel.x:0);velocity.z=unitsToMeters(Number.isFinite(state.vel?.z)?state.vel.z:0);
   last=motion.update({...events,velocity,dead:state.alive===false,incapacitated:!!state.incapacitated,hitstop:!!state.hitstop,searching:!!state.searching,flying:!!state.flying},dt);
   root.updateMatrixWorld(true);return last;
  },
  dispose(){if(disposed)return;disposed=true;motion.dispose();root.removeFromParent();const geometries=new Set(),materials=new Set();actor.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
 };return api;
}
