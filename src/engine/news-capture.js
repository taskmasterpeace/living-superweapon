// Async frame ownership: the destination array is transferred, never copied while encoding.
const sizes = new Map();
export function newsFrameBytes(frames) { return (frames || []).reduce((sum, u) => sum + (sizes.get(u) || 0), 0); }
export function revokeFrames(frames) {
  if (!frames) return;
  for (let i = 0; i < frames.length; i++) {
    const u = frames[i];
    if (typeof u === 'string' && u.startsWith('blob:')) { URL.revokeObjectURL(u); sizes.delete(u); }
    frames[i] = null;
  }
}

function makeEncodeCanvas() {
  // Prefer the promise-based canvas API while retaining the same small pool
  // and HTML fallback. Encoding format, not canvas type, controls idle scheduling.
  if (typeof globalThis.OffscreenCanvas === 'function' &&
      typeof globalThis.OffscreenCanvas.prototype?.convertToBlob === 'function') {
    return new OffscreenCanvas(1, 1);
  }
  return document.createElement('canvas');
}

export class NewsFrameEncoder {
  constructor({ maxPending = 3, makeCanvas = makeEncodeCanvas,
    createURL = blob => URL.createObjectURL(blob), onReady = () => {} } = {}) {
    this.maxPending = maxPending; this.makeCanvas = makeCanvas; this.createURL = createURL; this.onReady = onReady;
    this.pending = new Set(); this.pool = []; this.sequence = 0;
    this.worker=null;this.workerJobs=new Map();
    if(makeCanvas===makeEncodeCanvas&&typeof Worker==='function'&&typeof createImageBitmap==='function'&&typeof OffscreenCanvas==='function'){
      try{
        this.worker=new Worker(new URL('./news-encode.worker.js',import.meta.url),{type:'module'});
        this.worker.onmessage=({data})=>this.workerJobs.get(data.id)?.(data.blob);
        this.worker.onerror=event=>{event.preventDefault();this._failWorker();};
        this.worker.onmessageerror=()=>this._failWorker();
      }catch{this.worker=null;}
    }
  }
  _failWorker(){
    this.worker?.terminate();this.worker=null;
    for(const finish of [...this.workerJobs.values()])finish(null);
  }
  get available() { return this.pending.size < this.maxPending; }
  capture(source, frames) {
    if (!this.available) return false;
    let canvas=null,settled=false,timer;
    const token = '#enc' + ++this.sequence;
    frames.push(token);
    let resolve;
    const done = new Promise(r => { resolve = r; }); this.pending.add(done);
    const complete = blob => {
      if(settled)return;settled=true;clearTimeout(timer);this.workerJobs.delete(token);
      const i = frames.indexOf(token);
      if (i >= 0) {
        if (blob) { const url = this.createURL(blob); frames[i] = url; sizes.set(url, blob.size || 0); }
        else frames[i] = null;
      }
      this.pending.delete(done);
      if (canvas&&this.pool.length < this.maxPending) this.pool.push(canvas);
      resolve(); this.onReady();
    };
    try {
      if(this.worker){
        const worker=this.worker;this.workerJobs.set(token,complete);
        // Capture ownership now, before the live monitor is painted again.
        // Transfer the bitmap; encoding and its readback stay in the worker.
        timer=setTimeout(()=>this._failWorker(),10000);
        createImageBitmap(source).then(bitmap=>{
          if(settled||this.worker!==worker){bitmap.close();complete(null);return;}
          try{worker.postMessage({id:token,bitmap},[bitmap]);}catch{bitmap.close();this._failWorker();}
        },()=>complete(null));
        return true;
      }
      canvas=this.pool.pop()||this.makeCanvas();canvas.width=source.width;canvas.height=source.height;
      canvas.getContext('2d').drawImage(source,0,0);
      // Compatibility fallback keeps the same codec/quality. It cannot guarantee
      // the main-thread stall isolation provided by the dedicated worker above.
      if (typeof canvas.convertToBlob === 'function') {
        canvas.convertToBlob({ type: 'image/webp', quality: 0.78 }).then(complete, () => complete(null));
      } else canvas.toBlob(complete, 'image/webp', 0.78);
    } catch { complete(null); }
    return true;
  }
  flush() { return Promise.all([...this.pending]); }
}
