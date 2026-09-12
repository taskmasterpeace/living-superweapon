// Keep the existing AABB collision owners while bounding rotation inflation
// along thin cabin walls. Floors and roofs retain their continuous slabs.
export function transportShellPieces(boxes){
 return boxes.flatMap(box=>{
  if(box.half[0]>1||box.half[2]<=2)return [{...box}];
  const count=Math.ceil(box.half[2]/2),half=box.half[2]/count;
  return Array.from({length:count},(_,i)=>({...box,
   center:[box.center[0],box.center[1],box.center[2]-box.half[2]+half*(2*i+1)],
   half:[box.half[0],box.half[1],half]}));
 });
}
