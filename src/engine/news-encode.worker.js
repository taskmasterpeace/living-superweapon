// Dedicated realm: GPU readback/codec work must not block gameplay's main thread.
const pool=[];
self.onmessage=async({data:{id,bitmap}})=>{
 let canvas,blob=null;
 try{
  canvas=pool.pop()||new OffscreenCanvas(bitmap.width,bitmap.height);
  canvas.width=bitmap.width;canvas.height=bitmap.height;
  canvas.getContext('2d').drawImage(bitmap,0,0);bitmap.close();
  blob=await canvas.convertToBlob({type:'image/webp',quality:.78});
 }catch{}finally{
  bitmap.close();if(canvas&&pool.length<3)pool.push(canvas);
  self.postMessage({id,blob});
 }
};
