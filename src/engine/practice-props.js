// Session-owned native props. Never reset unrelated world damage or pickups.
export class PracticeProps {
 constructor(stage,origin){
  this.game=stage.g;this.entries=[[-18,22,0],[18,22,1]].map(([x,z,rung])=>{
   const ref=stage._rock(origin.x+x,origin.z+z,rung);
   ref.mesh.position.y+=this.game.world.heightAt(ref.x,ref.z);
   return {ref,position:ref.mesh.position.clone(),rotation:ref.mesh.quaternion.clone()};
  });
 }
 owns(ref){return this.entries.some(e=>e.ref===ref);}
 busy(){return this.game.entities.some(f=>this.owns(f._carry?.sourceRef))||(this.game._flung||[]).some(f=>this.owns(f.sourceRef));}
 reset(){
  if(this.busy())return false;
  for(const {ref,position,rotation}of this.entries){ref.carried=false;ref.dead=false;ref.x=position.x;ref.z=position.z;ref.mesh.position.copy(position);ref.mesh.quaternion.copy(rotation);ref.mesh.visible=true;}
  return true;
 }
 dispose(){for(const {ref}of this.entries){ref.mesh.removeFromParent();const i=this.game.world.rocks.indexOf(ref);if(i>=0)this.game.world.rocks.splice(i,1);}this.entries=[];}
}
