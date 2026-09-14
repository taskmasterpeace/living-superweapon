import * as T from 'three';
import {emblemTexture,customEmblemTexture} from './modular-costume.js';

// Coordinates match the authored faceted body: Y up, front -Z. Mounting through
// the inverse bind frame keeps markings attached without editing the skeleton.
export function createImagePlacements(actor){
 const groups=[],geometries=[],materials=[],textures=[],capeMarks=[];
 let signature=null,disposed=false;
 const reflection=new T.Matrix4().makeScale(1,1,-1);
 function mount(name,local=false){
  const bone=actor.getObjectByName(T.PropertyBinding.sanitizeNodeName(name));
  if(!bone)throw Error('Missing image placement bone '+name);
  const group=new T.Group();group.name='ImagePlacement.'+name;
  if(!local){let inverse;actor.traverse(o=>{const i=o.skeleton?.bones.indexOf(bone);if(i>=0)inverse=o.skeleton.boneInverses[i];});
   if(!inverse)throw Error('Missing image placement bind inverse '+name);
   group.matrix.copy(inverse).multiply(reflection);group.matrixAutoUpdate=false;
  }
  bone.add(group);groups.push(group);return group;
 }
 function clear(){for(const g of groups)g.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();groups.length=geometries.length=materials.length=textures.length=capeMarks.length=0;}
 function material(map,color='#ffffff'){
  const m=new T.MeshStandardMaterial({map,color,transparent:true,alphaTest:.05,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,roughness:.8});materials.push(m);return m;
 }
 function orientUV(geo,mat){
  // Shared emblem maps use glTF flipY=false; these meshes use plane UVs.
  if(mat.map?.flipY===false){const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,1-uv.getY(i));}
 }
 function plane(group,mat,size,pos,rotation=[0,0,0],layer=0){
  const geo=new T.PlaneGeometry(...size);orientUV(geo,mat);geometries.push(geo);const mesh=new T.Mesh(geo,mat);mesh.position.set(...pos);mesh.rotation.set(...rotation);mesh.renderOrder=5+layer;group.add(mesh);return mesh;
 }
 function tattoo(layer,index){
  if(!layer.image)return;const map=new T.TextureLoader().load(layer.image);map.colorSpace=T.SRGBColorSpace;textures.push(map);
  const mat=material(map),scale=T.MathUtils.clamp(Number.isFinite(layer.scale)?layer.scale:1,.25,2),offset=index*.0004;
  const regions=layer.region==='wholeHead'?['face','headBack','headLeft','headRight','headTop']: [layer.region||'upperArmL'];
  for(const region of regions){
   if(region==='upperArmL'||region==='upperArmR'){
    // Bone-local +Z is the visible arm surface in the source bind frame.
    plane(mount('DEF-upper_arm.'+(region==='upperArmR'?'R':'L'),true),mat,[.12*scale,.13*scale],[0,.14,.097+offset],[0,0,0],index);
   }else if(region==='chest')plane(mount('DEF-spine.003'),mat,[.12*scale,.13*scale],[0,1.36,-.143-offset],[0,Math.PI,0],index);
   else{
    const placements={headTop:[[.20,.18],[0,1.809+offset,0],[-Math.PI/2,0,0]],face:[[.18,.17],[0,1.67,-.137-offset],[0,Math.PI,0]],headBack:[[.18,.20],[0,1.67,.085+offset],[0,0,0]],headLeft:[[.15,.20],[.111+offset,1.67,-.008],[0,Math.PI/2,0]],headRight:[[.15,.20],[-.111-offset,1.67,-.008],[0,-Math.PI/2,0]]};
    const p=placements[region];if(!p)throw Error('Unknown tattoo region '+region);
    plane(mount('DEF-head'),mat,p[0].map(v=>v*scale),p[1],p[2],index);
   }
  }
 }
 function cape(mat,r,scale){
  const geo=new T.PlaneGeometry(.26*scale,.25*scale,16,16),p=geo.attributes.position,base=[];
  // Sample the authored cape folds before applying its style and bend morphs.
  for(let i=0;i<p.count;i++){
   let x=p.getX(i),y=p.getY(i)+1.22;
   const rows=[[1.46,.17,.12],[1.16,.20,.17],[.72,.25,.24],[.31,.28,.29]];
   y=T.MathUtils.clamp(y,.73,1.45);let row=rows.findIndex((a,j)=>j<3&&y<=a[0]&&y>=rows[j+1][0]);row=Math.max(0,row);
   const a=rows[row],b=rows[row+1],f=(a[0]-y)/(a[0]-b[0]),w=T.MathUtils.lerp(a[1],b[1],f);x=T.MathUtils.clamp(x,-w*.95,w*.95);
   const col=(x/w+1)*2,c=Math.min(3,Math.floor(col)),fold=T.MathUtils.lerp(c%2?.05:.012,(c+1)%2?.05:.012,col-c);
   const raised=T.MathUtils.lerp(c%2?.025:0,(c+1)%2?.025:0,col-c);y+=raised;
   const t=Math.max(0,(1.46-y)/1.15);let z=T.MathUtils.lerp(a[2],b[2],f)+fold+.003;
   if(r.capeStyle==='short')y=1.46-(1.46-y)*.52;
   if(r.capeStyle==='shoulder')x=x*.52+.12;
   if(r.capeStyle==='pointed')y+=Math.abs(x)*.65*t;
   if(r.capeStyle==='split'&&Math.abs(x)<.05)y+=.24*t;
   base.push([x,y,z,t]);p.setXYZ(i,x,y,z);
  }
  orientUV(geo,mat);geo.computeVertexNormals();geometries.push(geo);const mesh=new T.Mesh(geo,mat);mesh.name='ImagePlacement.cape';mesh.renderOrder=6;mount('DEF-spine.003').add(mesh);capeMarks.push({geo,base});
 }
 return {
  set(r={}){
   if(disposed)throw Error('Image placements disposed');
   const layers=[...(r.tattooImage?[{image:r.tattooImage,region:r.tattooRegion,scale:r.tattooScale}]:[]),...(r.tattoos||[])];
   const next=JSON.stringify([layers,r.emblemPlacement,r.emblem,r.emblemImage,r.emblemColor,r.emblemScale,r.cape,r.capeStyle]);if(next===signature)return;
   clear();signature=null;
   try{
    layers.forEach(tattoo);
    if(['cape','shoeLeft','shoeRight'].includes(r.emblemPlacement)&&r.emblem&&r.emblem!=='none'&&(r.emblemPlacement!=='cape'||r.cape)){
     const map=r.emblem==='custom'?customEmblemTexture(r.emblemImage):emblemTexture(r.emblem);
     if(map){const mat=material(map,r.emblemColor||'#ffffff'),scale=T.MathUtils.clamp(Number.isFinite(r.emblemScale)?r.emblemScale:1,.25,2);
      if(r.emblemPlacement==='cape')cape(mat,r,scale);
      else{
       const side=r.emblemPlacement==='shoeLeft'?'L':'R',group=mount('DEF-foot.'+side);
       const bone=actor.getObjectByName(T.PropertyBinding.sanitizeNodeName('DEF-foot.'+side));let inverse;actor.traverse(o=>{const i=o.skeleton?.bones.indexOf(bone);if(i>=0)inverse=o.skeleton.boneInverses[i];});
       const x=new T.Vector3().setFromMatrixPosition(inverse.clone().invert()).x;
       // Instep slopes toward the toe, matching the authored shoe upper.
       plane(group,mat,[.085*scale,.08*scale],[x,.098,-.086],[-Math.PI/2-.145,0,0]);
      }
     }
    }
    signature=next;
   }catch(error){clear();throw error;}
  },
  update(time,flight=false){
   let bend;actor.traverse(o=>{if(o.userData.slot==='cape'){const index=o.morphTargetDictionary?.capeBend;if(index!==undefined)bend=o.morphTargetInfluences[index];}});
   bend=Number.isFinite(bend)?T.MathUtils.clamp(bend,0,.4):T.MathUtils.clamp(.08+(flight?.2:0)+Math.sin((Number.isFinite(time)?time:0)*2)*.035,0,.4);
   for(const {geo,base}of capeMarks){const p=geo.attributes.position;for(let i=0;i<base.length;i++){const [x,y,z,t]=base[i];p.setXYZ(i,x,y+.055*t*t*bend,z+.20*t*t*bend);}p.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();}
  },
  dispose(){if(disposed)return;clear();signature=null;disposed=true;},
 };
}
