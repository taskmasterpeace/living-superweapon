// Hierarchy-only source candidate from the project's already optimized original
// scout. The binary payload and all mesh/material/texture declarations stay exact.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const src='public/models/frontline/armored-scout.glb',out='assets-src/frontline-scout-articulation';mkdirSync(out,{recursive:true});
const bytes=readFileSync(src),jsonLength=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+jsonLength)),tail=bytes.subarray(20+jsonLength),originalNodes=structuredClone(g.nodes);
function wrap(name,wrapperName,extras){
 const index=g.nodes.findIndex(n=>n.name===name);assert.ok(index>=0);const node=g.nodes[index],parent=g.nodes.find(n=>n.children?.includes(index));assert.ok(parent);
 const wrapper={name:wrapperName,children:[index],extras};
 for(const k of ['translation','rotation','scale','matrix'])if(node[k]){wrapper[k]=node[k];delete node[k];}
 const wrapperIndex=g.nodes.length;g.nodes.push(wrapper);parent.children[parent.children.indexOf(index)]=wrapperIndex;return wrapperIndex;
}
const yaw=wrap('turret','turret_yaw',{articulation:'yaw',axis:[0,1,0],radians:true,positive:'turns +Z toward +X',rest:0});
const pitch=wrap('barrel','gun_pitch',{articulation:'gun elevation',axis:[1,0,0],radians:true,positiveElevationRotationSign:-1,rest:0,clearance:'Source inspection required; no claimed unrestricted elevation envelope'});
const muzzle=g.nodes.length;
g.nodes.push({name:'muzzle',translation:[0,.01,1.34],extras:{purpose:'bore endpoint, not a visual muzzle flash',forward:[0,0,1],source:'Original barrel brake authored endpoint world (0,2.80,1.49) metres',geometryAdded:false}});
g.nodes[pitch].children.push(muzzle);
g.nodes.find(n=>n.name==='ArmoredScout').extras.articulationCandidate='Source only; original mesh/material binary unchanged. Drive turret_yaw Y and gun_pitch negative X for positive elevation; muzzle local +Z.';
let text=Buffer.from(JSON.stringify(g)),padding=(4-text.length%4)%4;text=Buffer.concat([text,Buffer.alloc(padding,0x20)]);
const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(20+text.length+tail.length,8);header.writeUInt32LE(text.length,12);header.writeUInt32LE(0x4e4f534a,16);
const candidate=Buffer.concat([header,text,tail]),file=`${out}/armored-scout-articulated.glb`;writeFileSync(file,candidate);
const hash=b=>createHash('sha256').update(b).digest('hex');
const report={status:'SOURCE ONLY; no live public/runtime changes',input:src,inputSHA256:hash(bytes),output:file,outputSHA256:hash(candidate),inputBytes:bytes.length,outputBytes:candidate.length,binaryPayloadUnchanged:true,originalNodes,articulation:{yawNode:'turret_yaw',yawPivot:[0,2.24,.02],pitchNode:'gun_pitch',pitchPivot:[0,2.79,.15],muzzleNode:'muzzle',muzzleRest:[0,2.80,1.49],muzzleDirection:[0,0,1]},optimization:'Reuse already optimized shipping BIN/accessors/materials/images unchanged. Hierarchy-only wrappers add no draws, triangles, textures or decoder.'};
writeFileSync(`${out}/build-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
