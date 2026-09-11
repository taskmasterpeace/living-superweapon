import source from './frontline-bank-data.json' with {type:'json'};

// Authored and reviewed offline from CC0 measured displacement. Synchronous
// decoding prevents a late asset response from changing the physical floor.
const bytes=Uint8Array.from(atob(source.encoded),c=>c.charCodeAt(0));
const view=new DataView(bytes.buffer),delta=new Float32Array(bytes.length/2);
for(let i=0;i<delta.length;i++)delta[i]=view.getInt16(i*2,true)*source.step;
const n=source.segments+1,half=source.halfSpan,grid=source.segments/(half*2);

export function sampleFrontlineBankDelta(x,z){
 if(Math.abs(x)>=half||Math.abs(z)>=half)return 0;
 const fx=(x+half)*grid,fz=(z+half)*grid,c=Math.floor(fx),r=Math.floor(fz),u=fx-c,v=fz-r,i=r*n+c;
 // Same diagonal as the native plane; exact lattice values are unchanged.
 const a=delta[i],b=delta[i+1],d=delta[i+n],e=delta[i+n+1];
 return u+v<=1?a+(b-a)*u+(d-a)*v:e+(b-e)*(1-v)+(d-e)*(1-u);
}
