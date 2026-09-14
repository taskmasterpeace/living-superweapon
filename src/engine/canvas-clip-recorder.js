// Records only the action canvas. No microphone, browser chrome or menus.
export function createCanvasClipRecorder(canvas,{Recorder=globalThis.MediaRecorder,onComplete=()=>{},onError=()=>{}}={}){
 let recorder=null,stream=null,chunks=[],metadata=null,save=true;
 const cleanup=()=>{stream?.getTracks().forEach(t=>t.stop());stream=null;recorder=null;};
 return {
  get supported(){return !!(Recorder&&canvas.captureStream);},
  get active(){return recorder?.state==='recording';},
  start(details){
   if(recorder)throw Error('A capture is already active');
   if(!this.supported)throw Error('Canvas recording is unavailable in this browser');
   chunks=[];metadata=structuredClone(details);save=true;
   try{
    stream=canvas.captureStream(30);
    const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>Recorder.isTypeSupported(t));
    recorder=new Recorder(stream,mime?{mimeType:mime,videoBitsPerSecond:8000000}:{videoBitsPerSecond:8000000});
    recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
    recorder.onerror=e=>{save=false;onError(e.error||Error('Recording failed'));this.stop(false);};
    recorder.onstop=()=>{const type=recorder.mimeType||'video/webm',result=new Blob(chunks,{type});cleanup();if(save&&result.size)onComplete(result,metadata);chunks=[];};
    recorder.start(250);
   }catch(e){cleanup();throw e;}
  },
  stop(keep=true){save=keep;if(recorder&&recorder.state!=='inactive')recorder.stop();},
 };
}
