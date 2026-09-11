export const HUD_LAYOUT_KEY='lsw.hud-layout.v1';
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export function hudLayout(value={}){
 const n=(v,d)=>typeof v==='number'&&Number.isFinite(v)?v:d;
 // Missing coordinates follow viewport edges; saved numeric coordinates keep
 // their original normalized, user-authored meaning.
 const coord=v=>typeof v==='number'&&Number.isFinite(v)?clamp(v,0,1):null;
 return {scale:clamp(n(value?.scale,.85),.6,1.4),x:coord(value?.x),y:coord(value?.y)};
}
export function hudLayoutPosition(layout,width,height,boxWidth=360,boxHeight=142){
 const l=hudLayout(layout),scale=Math.max(0,Math.min(l.scale,(width-16)/boxWidth,(height-16)/boxHeight));
 return {left:clamp(l.x===null?18:l.x*width,8,Math.max(8,width-boxWidth*scale-8)),top:clamp(l.y===null?height-boxHeight*scale-20:l.y*height,8,Math.max(8,height-boxHeight*scale-8)),scale};
}
export function nudgeHudLayout(layout,width,height,dx,dy,boxWidth=360,boxHeight=142){
 const p=hudLayoutPosition(layout,width,height,boxWidth,boxHeight);
 return hudLayout({...layout,x:(p.left+dx)/width,y:(p.top+dy)/height});
}
