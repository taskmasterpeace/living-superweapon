import * as T from 'three';
// Tailoring surfaces share the skeleton's bind frame; no cloth or joint changes.
export function createTailoring(actor){let key='';const groups=[],materials=[],geometry=[];
const clear=()=>{groups.forEach(g=>g.removeFromParent());materials.forEach(m=>m.dispose());geometry.forEach(g=>g.dispose());groups.length=materials.length=geometry.length=0;};
function mount(name){const bone=actor.getObjectByName(T.PropertyBinding.sanitizeNodeName(name));let inv;actor.traverse(o=>{const i=o.skeleton?.bones.indexOf(bone);if(i>=0)inv=o.skeleton.boneInverses[i];});const g=new T.Group();g.matrix.copy(inv).multiply(new T.Matrix4().makeScale(1,1,-1));g.matrixAutoUpdate=false;bone.add(g);groups.push(g);return g;}
function box(g,size,pos,color){const geo=new T.BoxGeometry(...size),m=new T.MeshStandardMaterial({color,roughness:.85,flatShading:true});geometry.push(geo);materials.push(m);const o=new T.Mesh(geo,m);o.position.set(...pos);g.add(o);return o;}
return{set(r){const k=JSON.stringify([r.anatomy,r.bust,r.primary,r.skin,r.armor,r.coat,r.footwear,r.secondary,r.regionColors,r.businessSuit]);if(k===key)return;key=k;clear();if(r.coat){const g=mount('DEF-spine.003');box(g,[.275,.32,.135],[0,1.325,0],r.primary);}
const amount=r.bust??(r.anatomy==='female'?.45:0);
if(r.businessSuit){const g=mount('DEF-spine.003');box(g,[.085,.26,.018],[0,1.345,-.158],'#eeeee5');for(const side of [-1,1]){const lapel=box(g,[.055,.20,.021],[side*.064,1.385,-.173],r.primary);lapel.rotation.z=side*-.35;}box(g,[.026,.17,.024],[0,1.32,-.18],r.secondary);}
if(amount>0&&!r.armor&&!r.coat){const g=mount('DEF-spine.003');for(const s of [-1,1]){const o=box(g,[.14,.115,.024+amount*.035],[s*.076,1.39,-.105-amount*.012],r.regionColors?.torso||r.primary);o.rotation.y=s*-.16;o.rotation.z=s*.06;}}
for(const side of ['L','R']){const sign=side==='L'?1:-1,g=mount('DEF-foot.'+side),x=sign*.10;if(r.footwear==='sandals'){box(g,[.13,.025,.25],[x,.026,-.05],r.regionColors?.shoes||r.trim||'#222222');box(g,[.105,.055,.22],[x,.064,-.05],r.skin);box(g,[.14,.025,.035],[x,.095,-.12],r.secondary);box(g,[.14,.025,.035],[x,.095,.015],r.secondary);}else if(r.footwear==='shoes'){box(g,[.012,.035,.15],[x+sign*.072,.065,-.045],r.secondary);}}
},dispose:clear};}
