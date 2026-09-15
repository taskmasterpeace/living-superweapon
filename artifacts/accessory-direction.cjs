const fs=require('fs');const edit=(p,f)=>fs.writeFileSync(p,f(fs.readFileSync(p,'utf8')));
edit('src/engine/modular-signature-parts.js',s=>s.replace('r.mustache,r.hoodie','r.goldChain,r.mustache,r.hoodie').replace(" if(r.lasso)",` if(r.goldChain){const g=mount('DEF-spine.003'),gold=mat('#d7a932',.8);for(let i=0;i<18;i++){const a=i*Math.PI*2/18,geo=new T.TorusGeometry(.018,.005,4,6);geometries.push(geo);const link=new T.Mesh(geo,gold);link.position.set(Math.cos(a)*.125,1.455-Math.max(0,-Math.sin(a))*.115,Math.sin(a)*.115);link.rotation.y=i%2?Math.PI/3:0;g.add(link);}}
 if(r.lasso)`));
edit('src/engine/modular-costume.js',s=>s.replace("['businessSuit','mustache'","['goldChain','businessSuit','mustache'").replace("'denim','custom']","'denim','space','custom']"));
edit('src/engine/modular-surfaces.js',s=>s.replace("}else if(recipe.pattern==='denim')",` }else if(recipe.pattern==='space'){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#05090f';x.fillRect(0,0,256,256);for(let i=0;i<60;i++){const px=(i*73+17)%256,py=(i*109+41)%256;x.fillStyle=i%4?'#d8e2e9':'#678aaa';const size=i%7?1:3;x.fillRect(px,py,size,size);}t=new T.CanvasTexture(c);
 }else if(recipe.pattern==='denim')`));
edit('character-foundation.html',s=>s.replace('<option value="denim">','<option value="space">Star field</option><option value="denim">').replace('<label><input id="mustache"','<label><input id="goldChain" type="checkbox">Gold chain</label><label><input id="mustache"'));
edit('src/tool/character-foundation.js',s=>s.replaceAll("['businessSuit','mustache'","['goldChain','businessSuit','mustache'"));
edit('src/data/hero-signature-recipes.js',s=>{const at=s.indexOf('export const HERO_SIGNATURE_RECIPES');return s.slice(0,at)+`Object.assign(directions,{
 apex:{...directions.apex,frame:'agile',muscle:.8,skin:'#62b64c',gloveColor:'#62b64c',gloves:'bare',primary:'#05090f',secondary:'#20482b',pattern:'space',patternRegion:'all',aura:'sparks',auraOrigin:'body',emblem:'none',cape:false},
 aegis:{...directions.aegis,armor:true,shoulders:true,headwear:'tactical',hair:'ponytail',hairColor:'#ad7934',primary:'#203d5a',secondary:'#c8ad61',trim:'#3b4853',regionColors:{arms:'#a1afb5',gauntlets:'#a1afb5'},shield:true},
 bulwark:{...directions.bulwark,frame:'heavy',size:1.25,muscle:1.3},
 mystward:{...directions.mystward,skin:'#613d2a',anatomy:'male',hair:'long',hairColor:'#201a1b',primary:'#622b62',secondary:'#d7b469'},
 moses:{...directions.moses,primary:'#35273d',secondary:'#9864bf',goldChain:true,emblem:'ugandaCrane',emblemColor:'#ffffff'},
});
`+s.slice(at)});
edit('src/engine/modular-costume.js',s=>s.replace("'deck52','none'","'deck52','ugandaCrane','none'").replace(" if(id==='triangle')",` if(id==='ugandaCrane'){x.save();x.beginPath();x.ellipse(118,133,58,33,-.25,0,Math.PI*2);x.moveTo(159,126);x.lineTo(176,72);x.lineTo(194,63);x.lineTo(208,78);x.lineTo(187,82);x.lineTo(171,140);x.lineTo(148,158);x.closePath();x.moveTo(80,123);x.lineTo(35,161);x.lineTo(79,149);x.clip();for(let i=0;i<6;i++){x.fillStyle=['#111111','#f7ce36','#c83c38'][i%3];x.fillRect(0,i*43,256,43);}x.restore();x.strokeStyle='#d9b139';x.lineWidth=7;for(let i=0;i<7;i++){const a=Math.PI+i*Math.PI/7;x.beginPath();x.moveTo(187,65);x.lineTo(187+26*Math.cos(a),65+26*Math.sin(a));x.stroke();}x.strokeStyle='#eee4c8';x.lineWidth=5;x.beginPath();x.moveTo(110,159);x.lineTo(107,213);x.lineTo(89,213);x.moveTo(132,158);x.lineTo(145,194);x.lineTo(163,195);x.stroke();}
 if(id==='triangle')`));
