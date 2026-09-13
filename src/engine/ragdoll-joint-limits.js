import * as T from 'three';

// A bounded two-bone hinge for the faceted rig. The core may tumble freely,
// but knees/elbows cannot fold backwards or collapse past their flexion limit.
export class RagdollJointLimits {
 constructor(points){
  this.p=points;this.chains=[];
  for(const side of ['L','R'])for(const [a,b,c,sign]of [['hi','knee','ft',1],['sh','el','ha',-1]]){
   this.chains.push({a:a+side,b:b+side,c:c+side,sign,l1:points[a+side].pos.distanceTo(points[b+side].pos),l2:points[b+side].pos.distanceTo(points[c+side].pos)});
  }
  this.axis=new T.Vector3();this.pole=new T.Vector3();this.right=new T.Vector3();this.up=new T.Vector3();this.forward=new T.Vector3();this.delta=new T.Vector3();this.joint=new T.Vector3();
 }
 solve(){
  const p=this.p;
  this.right.subVectors(p.shR.pos,p.shL.pos).normalize();this.up.subVectors(p.chest.pos,p.pelvis.pos).normalize();this.forward.crossVectors(this.right,this.up).normalize();
  if(this.forward.lengthSq()<.5)return;
  for(const s of this.chains){
   const a=p[s.a],b=p[s.b],c=p[s.c];this.axis.subVectors(c.pos,a.pos);let d=this.axis.length();if(d<1e-7){this.axis.copy(this.up).negate();d=1e-7;}else this.axis.divideScalar(d);
   const min=Math.sqrt(s.l1*s.l1+s.l2*s.l2+2*s.l1*s.l2*Math.cos(150*Math.PI/180)),max=(s.l1+s.l2)*.999;
   const bounded=T.MathUtils.clamp(d,min,max);
   if(Math.abs(bounded-d)>1e-6){this.delta.copy(a.pos).addScaledVector(this.axis,bounded).sub(c.pos);c.pos.add(this.delta);c.prev?.add(this.delta);}d=bounded;
   this.pole.copy(this.forward).multiplyScalar(s.sign).addScaledVector(this.axis,-this.forward.dot(this.axis)*s.sign);
   if(this.pole.lengthSq()<1e-7)this.pole.copy(this.right).addScaledVector(this.axis,-this.right.dot(this.axis));
   this.pole.normalize();const along=(s.l1*s.l1-s.l2*s.l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,s.l1*s.l1-along*along));
   this.joint.copy(a.pos).addScaledVector(this.axis,along).addScaledVector(this.pole,height);
   this.delta.copy(this.joint).sub(b.pos);b.pos.copy(this.joint);b.prev?.add(this.delta);
  }
 }
}
