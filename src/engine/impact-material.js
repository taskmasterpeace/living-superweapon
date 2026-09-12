// Surface identity is independent of the attack's damage type.
export function impactMaterial(target,opts={}){
 if(opts.naniteResult?.absorbed>0)return 'metal';
 return target.def?.bodyMaterial||target.body||(target.def?.metal?'metal':'flesh');
}
export function presentMaterialHit(game,target,amount,opts,blocked,outcome){
 if(blocked||opts.dot||!(outcome?.healthLost??amount)||opts.naniteResult?.absorbed>0)return;
 const material=impactMaterial(target,opts),now=game.time||0;
 if(now<(target._materialFxUntil||0))return;
 target._materialFxUntil=now+.08;
 const point=opts.contactPoint||target.center();
 if(material==='metal'){
  game.vfx.contact(point,opts.src?.aim3||target.aim3,{color:'#ffd18a',power:Math.min(1.4,.4+amount/40)});
  game.audio.land(Math.min(.7,.2+amount/60),'metal',point);
 }else if(material==='flesh'&&(opts.strike||opts.ballistic||opts.dmgClass==='slash')){
  game.particles.burst(point.x,point.y,point.z,{count:Math.min(10,3+Math.ceil(amount/6)),speed:7,life:.22,size:.45,color:['#9d2925','#c74432'],up:2,grav:15,drag:3});
 }
}
