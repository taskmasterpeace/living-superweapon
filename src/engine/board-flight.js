import {Box3,Matrix4,Quaternion} from 'three';
import {airControlState} from './lost-control-pose.js';
const inverse=new Matrix4(),matrix=new Matrix4(),bounds=new Box3(),partBounds=new Box3(),rootQ=new Quaternion(),parentQ=new Quaternion();

export function ridingBoard(f){
 return f.def.flyStyle==='ice'&&f.flying&&airControlState(f)==='flight'&&!f.mstate&&!f.grabState&&!f._abilityMeleePose;
}

// The deck follows the final feet in character space, including authored scale.
// It never writes the fighter's position, velocity or movement capability.
export function syncFlightBoard(f){
 const p=f.parts,board=p.iceBoard;if(!board)return;
 board.visible=ridingBoard(f);if(!board.visible)return;
 p.g.updateMatrixWorld(true);p.g.getWorldQuaternion(rootQ);
 for(const side of ['L','R']){
  const boot=p['leg'+side].userData.boot;
  boot.parent.getWorldQuaternion(parentQ);
  boot.quaternion.copy(parentQ.invert().multiply(rootQ));
 }
 p.g.updateMatrixWorld(true);inverse.copy(p.g.matrixWorld).invert();bounds.makeEmpty();
 for(const side of ['L','R'])p['leg'+side].userData.boot.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.geometry)return;
  if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
  matrix.multiplyMatrices(inverse,mesh.matrixWorld);
  partBounds.copy(mesh.geometry.boundingBox).applyMatrix4(matrix);bounds.union(partBounds);
 });
 if(bounds.isEmpty())return;
 board.rotation.set(0,0,0);
 board.position.set((bounds.min.x+bounds.max.x)/2,bounds.min.y-.175,(bounds.min.z+bounds.max.z)/2);
 board.scale.set(Math.max(1,(bounds.max.x-bounds.min.x+.5)/3.6),1,Math.max(1,(bounds.max.z-bounds.min.z+1)/6.2));
}

