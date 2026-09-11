import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const root='assets-src/frontline-heightfield-candidate';
test('authored displacement data preserves native pad, seam, corridor and traversable gradients',async()=>{
 const data=JSON.parse(await readFile(root+'/relief-delta.json','utf8'));
 const raw=Buffer.from(data.encoded,'base64'),delta=new Int16Array(raw.buffer,raw.byteOffset,raw.byteLength/2);
 const bytes=await readFile(root+'/native-before.f32'),before=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/4);
 assert.equal(data.segments,256);assert.equal(data.halfSpan,1028);assert.equal(delta.length,257*257);
 const after=Float32Array.from(before,(h,i)=>h+delta[i]*data.step),spacing=2056/256;
 let changed=0,bank=0,slope=0;
 for(let row=0;row<257;row++)for(let col=0;col<257;col++){
  const i=row*257+col,x=-1028+col*spacing,z=-1028+row*spacing;
  assert.ok(Number.isFinite(after[i])&&after[i]>=-.001&&after[i]<155);
  if(Math.hypot(x,z)<130||Math.max(Math.abs(x),Math.abs(z))>=1012||Math.abs(x)<110)assert.equal(delta[i],0,'Pad/corridor/seam was displaced');
  if(Math.abs(x)>170&&Math.abs(x)<550&&Math.abs(z)<750){bank++;if(Math.abs(delta[i]*data.step)>2)changed++;}
  if(col<256)slope=Math.max(slope,Math.abs(after[i+1]-after[i])/spacing);
  if(row<256)slope=Math.max(slope,Math.abs(after[i+257]-after[i])/spacing);
 }
 assert.ok(changed/bank>.35,'Source authoring must materially replace the uniform bank shapes');
 assert.ok(slope<1.5,`Unsafe native bank gradient ${slope}`);
});

test('source-authored scanned chips are closed, short, bounded and avoid the pad and convoy road',async()=>{
 const data=JSON.parse(await readFile(root+'/scanned-chip.json','utf8'));
 const places=JSON.parse(await readFile(root+'/chip-placements.json','utf8'));
 assert.ok(data.index.length/3<=160,'Scanned chip exceeds the fixed instance triangle budget');
 const edges=new Map();
 for(let i=0;i<data.index.length;i+=3)for(let j=0;j<3;j++){
  const key=[data.index[i+j],data.index[i+(j+1)%3]].sort((a,b)=>a-b).join(':');
  edges.set(key,(edges.get(key)||0)+1);
 }
 assert.equal([...edges.values()].filter(count=>count!==2).length,0,'The source chip has open scan boundaries');
 const ys=data.position.filter((_,i)=>i%3===1);assert.ok(Math.max(...ys)-Math.min(...ys)<=.321);
 assert.equal(places.length,3600);
 for(const [x,z,size,yaw,stretch] of places){
  assert.ok([x,z,size,yaw,stretch].every(Number.isFinite));
  assert.ok(Math.hypot(x,z)>142&&Math.hypot(x,z)<890);
  assert.ok(!(x>-300&&x<-160&&z>150&&z<550),'Chip intrudes into reserved convoy corridor');
  assert.ok(size>0&&size<=2.4&&stretch>=.7&&stretch<=1);
  assert.ok((Math.max(...ys)+.1)*size<.63,'Visual chip becomes an uncollidable standing boulder');
 }
});
