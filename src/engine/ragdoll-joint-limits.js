import * as T from 'three';

// Limits live in the tumbling torso frame, never in world-up coordinates.
export class RagdollJointLimits {
 constructor(points){
  this.p=points;this.chains=[];
  for(const side of ['L','R'])for(const [a,b,c,sign]of [['hi','knee','ft',1],['sh','el','ha',-1]]){
   this.chains.push({a:a+side,b:b+side,c:c+side,sign,side:side==='L'?-1:1,l1:points[a+side].pos.distanceTo(points[b+side].pos),l2:points[b+side].pos.distanceTo(points[c+side].pos)});
  }
  this.axis=new T.Vector3();this.pole=new T.Vector3();this.right=new T.Vector3();this.up=new T.Vector3();this.forward=new T.Vector3();this.delta=new T.Vector3();this.joint=new T.Vector3();
  this.center=new T.Vector3();this.span=new T.Vector3();this.target=new T.Vector3();this.rotation=new T.Quaternion();this.identity=new T.Quaternion();
  this.hipWidth=points.hiL.pos.distanceTo(points.hiR.pos);
  this.hipDrop=this.center.addVectors(points.hiL.pos,points.hiR.pos).multiplyScalar(.5).distanceTo(points.pelvis.pos);
 }
 move(point,target){this.delta.subVectors(target,point.pos);point.pos.copy(target);point.prev?.add(this.delta);}
 solve(){
  const p=this.p;
  this.up.subVectors(p.chest.pos,p.pelvis.pos).normalize();
  this.right.subVectors(p.shR.pos,p.shL.pos);this.right.addScaledVector(this.up,-this.right.dot(this.up)).normalize();
  this.forward.crossVectors(this.right,this.up).normalize();
  if(this.forward.lengthSq()<.5)return;
  // A bounded pelvis frame closes the otherwise unbraced shoulder/hip twist.
  this.span.subVectors(p.hiR.pos,p.hiL.pos).normalize();
  const twist=Math.acos(T.MathUtils.clamp(this.span.dot(this.right),-1,1));
  if(twist>Math.PI/6){this.rotation.setFromUnitVectors(this.span,this.right);this.rotation.slerp(this.identity,(Math.PI/6)/twist);this.span.applyQuaternion(this.rotation);}
  this.center.copy(p.pelvis.pos).addScaledVector(this.up,-this.hipDrop);
  for(const side of ['L','R'])this.move(p['hi'+side],this.target.copy(this.center).addScaledVector(this.span,this.hipWidth*(side==='L'?-.5:.5)));
  for(const s of this.chains){
   const a=p[s.a],b=p[s.b],c=p[s.c];
   if(s.sign===1){
    // Keep each ankle on its own side of the pelvis before reconstructing the hinge.
    this.axis.subVectors(c.pos,a.pos);const lateral=this.axis.dot(this.right)*s.side;
    if(lateral<0)this.move(c,this.target.copy(c.pos).addScaledVector(this.right,-lateral*s.side));
   }
   this.axis.subVectors(c.pos,a.pos);let d=this.axis.length();if(d<1e-7){this.axis.copy(this.up).negate();d=1e-7;}else this.axis.divideScalar(d);
   const min=Math.sqrt(s.l1*s.l1+s.l2*s.l2+2*s.l1*s.l2*Math.cos((s.sign===1?135:150)*Math.PI/180)),max=(s.l1+s.l2)*.999;
   const bounded=T.MathUtils.clamp(d,min,max);
   if(Math.abs(bounded-d)>1e-6)this.move(c,this.target.copy(a.pos).addScaledVector(this.axis,bounded));d=bounded;
   if(s.sign===1){this.pole.crossVectors(this.axis,this.right);if(this.pole.dot(this.forward)<0)this.pole.negate();}
   else this.pole.copy(this.forward).multiplyScalar(s.sign).addScaledVector(this.axis,-this.forward.dot(this.axis)*s.sign);
   if(this.pole.lengthSq()<1e-7)this.pole.copy(this.forward).addScaledVector(this.axis,-this.forward.dot(this.axis));
   this.pole.normalize();const along=(s.l1*s.l1-s.l2*s.l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,s.l1*s.l1-along*along));
   this.joint.copy(a.pos).addScaledVector(this.axis,along).addScaledVector(this.pole,height);this.move(b,this.joint);
   if(s.sign===1){
    // Rotate the entire two-bone chain at its hip: flexion 100°, extension 35°.
    // Rotating around the lateral axis preserves lengths and side separation.
    this.axis.subVectors(b.pos,a.pos);const flex=Math.atan2(this.axis.dot(this.forward),-this.axis.dot(this.up));
    const boundedFlex=T.MathUtils.clamp(flex,-35*Math.PI/180,100*Math.PI/180);
    if(Math.abs(flex-boundedFlex)>1e-7){
     this.rotation.setFromAxisAngle(this.right,flex-boundedFlex);
     for(const pt of [b,c])this.move(pt,this.target.subVectors(pt.pos,a.pos).applyQuaternion(this.rotation).add(a.pos));
    }
   }
  }
 }
}
