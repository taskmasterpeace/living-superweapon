// Tap the existing master mix without replacing gameplay/audio methods.
export async function startGameAudio(page){await page.evaluate(()=>{
 const a=PW.game.audio,d=a.ctx.createMediaStreamDestination(),probe=a.ctx.createAnalyser();probe.fftSize=2048;a.master.connect(d);a.master.connect(probe);
 const chunks=[],recorder=new MediaRecorder(d.stream),audit={startedAt:PW.game.time,state:a.ctx.state,peak:0};recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
 const timer=setInterval(()=>{const values=new Float32Array(probe.fftSize);probe.getFloatTimeDomainData(values);for(const v of values)audit.peak=Math.max(audit.peak,Math.abs(v));},30);
 window.__finishMix=()=>new Promise(resolve=>{recorder.onstop=async()=>{clearInterval(timer);a.master.disconnect(d);a.master.disconnect(probe);const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));resolve({audit:{...audit,endedAt:PW.game.time},base64:btoa(text)});};recorder.stop();});recorder.start();
});}
export async function finishGameAudio(page,out,writeFile){const capture=await page.evaluate(()=>window.__finishMix?.());if(capture){await writeFile(out+'/native-combat-audio.webm',Buffer.from(capture.base64,'base64'));await writeFile(out+'/audio-audit.json',JSON.stringify(capture.audit,null,2));}}
