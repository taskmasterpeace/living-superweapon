// Authoring view of native articulation, never a second combat simulation.
import {beginPersonCarry,syncPersonCarry} from '../engine/person-carry.js';
export function poseHoldPair(holder,receiver,time,friendly){
 holder.pos.set(0,0,0);holder.faceDir(0,1);holder.vel.set(0,0,0);
 receiver.pos.set(0,friendly?1.8:0,3.3);receiver.faceDir(0,-1);receiver.vel.set(0,0,0);
 holder.grabbing=receiver;receiver.grabbedBy=holder;holder.grabState='clinch';holder.grabMode=friendly?'friendly':'front';
 holder.poseGrab=1;holder.state='idle';receiver.state='hit';receiver.stateT=0;
 holder.animT=time;receiver.animT=time;
 if(friendly){beginPersonCarry(holder,receiver,.5);syncPersonCarry(holder,{world:{cover:[],heightAt:()=>0}});}else holder._personCarry=null;
 // Scrubbing establishes the held orientation immediately; it must not replay
 // only the first smoothing step of a half-turn on every reset frame.
 holder.obj.rotation.y=holder.facing;receiver.obj.rotation.y=receiver.facing;
 holder._sync();receiver._sync();holder._animate(1/60);receiver._animate(1/60);
}
export function clearHoldPreview(holder){if(holder.grabbing?.grabbedBy===holder)holder.grabbing.grabbedBy=null;holder.grabbing=null;holder.grabState=null;holder.grabMode='';holder.poseGrab=0;holder._personCarry=null;}
