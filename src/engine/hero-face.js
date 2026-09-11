import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Replaceable facial construction; eye origins remain the production optic sockets.
// Everything mounts on the driven head and therefore follows flight and ragdolls.
export function buildHeroFace(head,{skin,accent,metal=false,visor=false}) {
  const ink=new THREE.MeshStandardMaterial({color:metal?'#26323b':'#392c28',roughness:.92});
  const white=metal?null:new THREE.MeshStandardMaterial({color:'#f2eee3',roughness:.72});
  const iris=metal?null:new THREE.MeshStandardMaterial({color:'#30454b',roughness:.55});
  const pupil=metal?null:new THREE.MeshBasicMaterial({color:'#11191d'});
  const sheet=points=>{
    const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return new THREE.ShapeGeometry(s);
  };
  const surface=x=>.655*Math.sqrt(Math.max(.05,1-x*x/(.73*.73)));
  const wrap=(g,cx=0,offset=0)=>{
    const a=g.attributes.position;for(let i=0;i<a.count;i++)a.setZ(i,surface(a.getX(i)+cx)+offset-.65);
    g.computeVertexNormals();return g;
  };
  const eye=(side)=>{
    const cx=side*.30;
    const shape=sheet([[-.22,0],[-.13,.075],[.09,.085],[.22,.015],[.12,-.067],[-.12,-.06]].map(([x,y])=>[x*side,y]));
    const e=new THREE.Mesh(wrap(shape,cx,.025),metal?new THREE.MeshBasicMaterial({color:accent}):white);
    e.name='eye-socket';e.position.set(cx,.05,.65);e.visible=!visor;head.add(e);
    if(!metal){
      const disc=new THREE.Mesh(new THREE.SphereGeometry(.059,12,8),iris);disc.scale.set(1,1.08,.22);disc.position.z=surface(cx)+.035-.65;e.add(disc);
      const dot=new THREE.Mesh(new THREE.SphereGeometry(.029,10,8),pupil);dot.scale.z=.25;dot.position.z=disc.position.z+.014;e.add(dot);
    }
    return e;
  };
  const eyeL=eye(-1),eyeR=eye(1);
  // Shallow sculpted bridge and nose planes, rather than a cone glued to the face.
  const nose=new THREE.BufferGeometry();
  nose.setAttribute('position',new THREE.Float32BufferAttribute([
    -.045,.24,.65, .045,.24,.65, 0,-.15,.84,
    -.045,.24,.65, 0,-.15,.84, -.12,-.24,.66,
    .045,.24,.65, .12,-.24,.66, 0,-.15,.84,
    -.12,-.24,.66, 0,-.15,.84, 0,-.28,.72,
    0,-.15,.84, .12,-.24,.66, 0,-.28,.72,
  ],3));nose.setIndex([0,2,1,3,5,4,6,8,7,9,11,10,12,14,13]);nose.computeVertexNormals();
  const n=new THREE.Mesh(nose,skin);n.name='face-bridge';head.add(n);
  const details=[];
  for(const side of [-1,1]){
    const brow=sheet([[-.22,.04],[-.15,.085],[.18,.055],[.22,.005],[.08,.015],[-.13,.035]].map(([x,y])=>[x*side,y+x*.14]));
    wrap(brow,side*.30,.035);brow.translate(side*.30,.16,.65);details.push(brow);
  }
  const mouth=sheet([[-.19,-.485],[-.08,-.485],[.08,-.48],[.19,-.485],[.10,-.508],[-.10,-.51]]);
  mouth.translate(0,0,.609);details.push(mouth);
  const lines=new THREE.Mesh(mergeGeometries(details),ink);lines.name='face-lines';head.add(lines);for(const g of details)g.dispose();
  return {eyeL,eyeR};
}
