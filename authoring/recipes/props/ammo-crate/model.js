// Ammunition crate — procedural prop factory. A grounded, hard-surface field prop: olive steel
// case, two hinged lid halves, rope handles, stencil plate. Origin at the base centre so it sits
// on the ground; +Z is the front (stencil side). Game units (1u = 0.19m): 0.9m long, 0.5m tall.
export function createModel(THREE){
 const g=new THREE.Group();g.name='ammo-crate';
 const olive=new THREE.MeshStandardMaterial({color:'#4f5636',roughness:.85,metalness:.15});olive.name='olive-steel';
 const dark=new THREE.MeshStandardMaterial({color:'#2a2c26',roughness:.8,metalness:.25});dark.name='worn-steel';
 const rope=new THREE.MeshStandardMaterial({color:'#8a7a58',roughness:1,metalness:0});rope.name='rope';
 const stencil=new THREE.MeshStandardMaterial({color:'#d9d2b6',roughness:.95,metalness:0});stencil.name='stencil';
 const mesh=(geo,mat,name,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{const m=new THREE.Mesh(geo,mat);m.name=name;m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
 const L=4.7,W=2.4,H=2.0;
 mesh(new THREE.BoxGeometry(L,H*.75,W),olive,'case',0,H*.375,0);
 mesh(new THREE.BoxGeometry(L*.5-.03,H*.25,W+.06),olive,'lid-left',-L*.25,H*.875,0);
 mesh(new THREE.BoxGeometry(L*.5-.03,H*.25,W+.06),olive,'lid-right',L*.25,H*.875,0);
 mesh(new THREE.BoxGeometry(.06,H*.28,W+.1),dark,'lid-seam',0,H*.875,0);
 for(const [name,x] of [['band-left',-L*.32],['band-right',L*.32]])mesh(new THREE.BoxGeometry(.18,H*.78,W+.08),dark,name,x,H*.39,0);
 for(const [name,x,sign] of [['hinge-left',-L*.25,1],['hinge-right',L*.25,1]])mesh(new THREE.CylinderGeometry(.08,.08,L*.42,8),dark,name,x,H*.75,-W*.5-.02,0,0,Math.PI/2);
 for(const [name,x] of [['handle-left',-L*.5-.12],['handle-right',L*.5+.12]]){
  const h=mesh(new THREE.TorusGeometry(.42,.07,6,12,Math.PI),rope,name,x,H*.42,0,0,Math.PI/2,0);h.rotation.z=x<0?Math.PI/2:-Math.PI/2;
 }
 mesh(new THREE.BoxGeometry(L*.42,H*.26,.02),stencil,'stencil-plate',0,H*.4,W*.5+.011);
 for(let i=0;i<4;i++)mesh(new THREE.BoxGeometry(.06,H*.14,.02),dark,`stencil-glyph-${i}`,-L*.14+i*L*.09,H*.4,W*.5+.024,0,0,i%2?.3:-.3);
 for(const [name,x,z] of [['foot-fl',-L*.42,W*.36],['foot-fr',L*.42,W*.36],['foot-bl',-L*.42,-W*.36],['foot-br',L*.42,-W*.36]])mesh(new THREE.BoxGeometry(.3,.12,.3),dark,name,x,.06,z);
 const socket=(name,x,y,z)=>{const o=new THREE.Object3D();o.name='socket-'+name;o.position.set(x,y,z);g.add(o);return o;};
 socket('carry-left',-L*.5-.12,H*.42,0);socket('carry-right',L*.5+.12,H*.42,0);socket('lid',0,H,0);
 return g;
}
