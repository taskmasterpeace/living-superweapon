import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {torsoDepth} from './hero-torso.js';
// Dense where the garment bends, with explicit front/back bevel boundaries.
// Uniform tessellation of a rounded box wastes most vertices on tiny bevels.
function panelGeometry(w,h,d){
  const geo=new THREE.BoxGeometry(w,h,d,Math.ceil(w/.14),Math.ceil(h/.14),3);
  const radius=Math.min(.04,w*.22,h*.22,d*.22),half=new THREE.Vector3(w/2,h/2,d/2).subScalar(radius);
  const lower=half.clone().negate(),p=geo.attributes.position,point=new THREE.Vector3(),inside=new THREE.Vector3(),normal=new THREE.Vector3();
  for(let i=0;i<p.count;i++){
    point.fromBufferAttribute(p,i);
    if(Math.abs(point.z)<d*.49)point.z=Math.sign(point.z)*(d/2-radius);
    inside.copy(point).clamp(lower,half);
    normal.copy(point).sub(inside).normalize();point.copy(inside).addScaledVector(normal,radius);
    p.setXYZ(i,point.x,point.y,point.z);
  }
  geo.clearGroups();return geo;
}

function smoothPanelNormals(geo){
  // Angle-weighted normals of the actual deformed triangles, shared across
  // BoxGeometry's duplicated face edges. Analytic skin derivatives can point
  // behind coarse bevel faces where the chest curves sharply; unshared face
  // averaging instead leaves diamond-shaped shading seams.
  const p=geo.attributes.position,n=geo.attributes.normal,index=geo.index,welds=new Map(),sums=[];
  for(let i=0;i<p.count;i++){
    const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e5)).join(',');
    if(!welds.has(key))welds.set(key,new THREE.Vector3());
    sums.push(welds.get(key));
  }
  const points=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()],a=new THREE.Vector3(),b=new THREE.Vector3(),face=new THREE.Vector3();
  for(let i=0;i<index.count;i+=3){
    for(let j=0;j<3;j++)points[j].fromBufferAttribute(p,index.getX(i+j));
    face.crossVectors(a.subVectors(points[1],points[0]),b.subVectors(points[2],points[0])).normalize();
    for(let j=0;j<3;j++){
      const angle=a.subVectors(points[(j+1)%3],points[j]).angleTo(b.subVectors(points[(j+2)%3],points[j]));
      sums[index.getX(i+j)].addScaledVector(face,angle);
    }
  }
  for(const normal of welds.values())normal.normalize();
  for(let i=0;i<n.count;i++)n.setXYZ(i,sums[i].x,sums[i].y,sums[i].z);
}

// Costume modules mount only on driven meshes. They do not add bones, author motion or alter
// gameplay dimensions. New outfits reuse these sockets and automatically survive a ragdoll.
export function dressHero(p, model) {
  const {suit,suit2,armor}=p.mats;
  const box=(parent,w,h,d,x,y,z,mat,rz=0)=>{
    const m=new THREE.Mesh(parent===p.torso?panelGeometry(w,h,d):new RoundedBoxGeometry(w,h,d,2,.06),mat);
    if(parent===p.torso){
      // Chest panels wrap the carrier on both sides. Their back surface seats
      // slightly inside the suit; varying definition cannot float or bury them.
      const side=z<0?-1:1,geo=m.geometry;
      geo.rotateZ(rz);geo.translate(x,y,0);
      const pos=geo.attributes.position;
      for(let i=0;i<pos.count;i++){
        const px=pos.getX(i),py=pos.getY(i);
        pos.setZ(i,torsoDepth(px,py,model.definition,side)+pos.getZ(i)+side*(d*.5-.025));
      }
      smoothPanelNormals(geo);
      geo.computeBoundingBox();geo.computeBoundingSphere();m.name='costume-chest-panel';
    }else{m.position.set(x,y,z);m.rotation.z=rz;}
    m.castShadow=true;parent.add(m);return m;
  };
  if(model.costume==='martial') {
    const surface=(vertices,indices,mat,name)=>{
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
      const mesh=new THREE.Mesh(geo,mat);mesh.name=name;mesh.castShadow=true;p.torso.add(mesh);return mesh;
    };
    // A V-shaped inset follows the chest depth. Folded lapels are cloth planes,
    // not cylindrical/box trim floating above an otherwise featureless torso.
    const outline=[[1.34,.56],[1.18,.51],[.8,.39],[.2,.18],[-.25,.015]],levels=[],panel=[],panelIndex=[];
    for(let i=0;i<outline.length-1;i++){
      const [y,w]=outline[i],[ny,nw]=outline[i+1],count=Math.ceil((y-ny)/.085);
      for(let j=0;j<count;j++){const t=j/count;levels.push([y+(ny-y)*t,w+(nw-w)*t]);}
    }
    levels.push(outline.at(-1));
    const columns=6;
    for(const [y,w] of levels)for(let j=0;j<=columns;j++){
      const x=w*(2*j/columns-1);panel.push(x,y,torsoDepth(x,y,model.definition)+.022);
    }
    for(let i=0;i<levels.length-1;i++)for(let j=0;j<columns;j++){
      const a=i*(columns+1)+j,b=a+columns+1;panelIndex.push(a,b,a+1,a+1,b,b+1);
    }
    surface(panel,panelIndex,suit2,'martial-undershirt');
    for(const side of [-1,1]){
      const vertices=[],indices=[];
      for(const [y,w] of levels)for(let j=0;j<3;j++){
        const x=side*(w+j*.095);vertices.push(x,y,torsoDepth(x,y,model.definition)+[.028,.065,.012][j]);
      }
      for(let i=0;i<levels.length-1;i++)for(let j=0;j<2;j++){
        const a=i*3+j,b=a+3;
        if(side===1)indices.push(a,b,a+1,a+1,b,b+1);else indices.push(a,a+1,b,a+1,b+1,b);
      }
      surface(vertices,indices,suit,'martial-lapel');
    }
    // The generic energy medallion occupied the neckline; this costume's sash
    // supplies its focal accent instead. The original rig slot remains intact.
    p.emblem.visible=false;
    p.pelvis.material=suit;
    // The shared fitted waistband is the sash; only its hanging end is extra.
    box(p.pelvis,.25,1.10,.16,.32,-.17,.59,suit2,-.13);
    for(const arm of [p.armL,p.armR]) {
      const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.34,.31,.40,12),suit2);
      cuff.position.y=-.55;arm.children[1].add(cuff);
    }
    for(const leg of [p.legL,p.legR]) {
      leg.userData.thigh.scale.x*=1.23;leg.userData.thigh.scale.z*=1.15;
      leg.userData.thigh.material=suit;leg.userData.shin.material=suit;
      for(const cap of leg.userData.thigh.children)cap.material=suit;
    }
  } else if(model.costume==='plated') {
    for(const side of [-1,1]) {
      box(p.torso,1.30,1.12,.25,side*.68,.46,.79,armor,-side*.10);
      box(p.torso,.52,1.30,.30,side*.63,.15,-.75,armor);
    }
    for(let i=0;i<3;i++)box(p.torso,1.25-i*.09,.23,.14,0,-.44-i*.31,.62,armor);
  } else if(model.costume==='tactical') {
    for(const side of [-1,1]) {
      box(p.torso,.21,2.28,.12,side*.87,.10,.71,suit2,-side*.10);
      box(p.pelvis,.45,.52,.26,side*.70,.1,.58,armor);
    }
    box(p.torso,.55,.72,.22,.61,-.2,.83,armor);
  }
}
