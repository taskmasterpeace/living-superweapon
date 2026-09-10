import source from './frontline-convoy-bank-data.json' with {type:'json'};

// Reviewed native heights, not deltas against a layout-dependent analytic base.
// Decode synchronously so loading rock skins never moves gameplay's floor.
const bytes=Uint8Array.from(atob(source.encoded),c=>c.charCodeAt(0));
const view=new DataView(bytes.buffer),heights=new Float32Array(bytes.length/4);
for(let i=0;i<heights.length;i++)heights[i]=view.getFloat32(i*4,true);
export const FRONTLINE_BED_HALF=source.halfSpan;
const n=source.segments+1,grid=source.segments/(2*FRONTLINE_BED_HALF);
export function sampleFrontlineAuthoredHeight(x,z){
 if(Math.max(Math.abs(x),Math.abs(z))>FRONTLINE_BED_HALF)return undefined;
 const fx=(x+FRONTLINE_BED_HALF)*grid,fz=(z+FRONTLINE_BED_HALF)*grid;
 const c=Math.min(source.segments-1,Math.floor(fx)),r=Math.min(source.segments-1,Math.floor(fz));
 const u=fx-c,v=fz-r,i=r*n+c,a=heights[i],b=heights[i+1],d=heights[i+n],e=heights[i+n+1];
 return u+v<=1?a+(b-a)*u+(d-a)*v:e+(b-e)*(1-v)+(d-e)*(1-u);
}
