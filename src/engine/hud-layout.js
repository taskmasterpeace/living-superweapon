export const HUD_LAYOUT_KEY='lsw.hud-layout.v1';
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export function hudLayout(value={}){
 const n=(v,d)=>typeof v==='number'&&Number.isFinite(v)?v:d;
 return {scale:clamp(n(value?.scale,1),.6,1.4),x:clamp(n(value?.x,.25),0,1),y:clamp(n(value?.y,.27),0,1)};
}
export function hudLayoutPosition(layout,width,height,boxWidth=360,boxHeight=142){
 const l=hudLayout(layout);return {left:clamp(l.x*width,8,Math.max(8,width-boxWidth*l.scale-8)),top:clamp(l.y*height,8,Math.max(8,height-boxHeight*l.scale-8)),scale:l.scale};
}
