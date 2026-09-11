// Source-bound configuration only. These controls cannot add a module to an
// ordinary attack; catalog publication and native actions are separate gates.
const number=(key,label,min,max,step,fallback,unit='')=>Object.freeze({key,label,kind:'number',min,max,step,fallback,unit});
const choice=(key,label,values,fallback)=>Object.freeze({key,label,kind:'enum',fallback,options:Object.freeze(values.map(value=>Object.freeze({value,label:value})))});
export const NANITE_DEFAULTS=Object.freeze({naniteContour:'beveled',naniteLength:1,naniteWidth:1,naniteOffset:0,
 naniteAssemblyTime:.65,naniteMaterial:'steel',naniteDensity:.75,naniteCellHp:12,naniteRepairDelay:.4,naniteReformTime:.75,naniteBreakSpeed:6,naniteStage1:.25,naniteStage2:.7});
export const NANITE_FIELDS=Object.freeze([
 choice('naniteAttachment','Forearm',['right-forearm','left-forearm'],'right-forearm'),
 choice('naniteContour','Edge contour',['flat','beveled'],'beveled'),
 number('naniteLength','Fitted length',.8,1.2,.01,1,'×'),number('naniteWidth','Fitted width',.8,1.3,.01,1,'×'),
 number('naniteOffset','Axial offset',-.15,.15,.01,0,'forearm lengths'),number('naniteAssemblyTime','Assembly time',.15,2,.01,.65,'s'),
 choice('naniteMaterial','Metal',['steel','titanium','blackened'],'steel'),number('naniteDensity','Assembly fragments',0,1,.01,.75),
 number('naniteCellHp','Cell integrity',4,40,1,12,'hp'),number('naniteRepairDelay','Quiet before reform',.1,3,.01,.4,'s'),
 number('naniteReformTime','Reform time',.15,3,.01,.75,'s'),number('naniteBreakSpeed','Breakaway speed',0,12,.1,6,'u/s'),
 number('naniteStage1','First charge stage',.05,.65,.01,.25),number('naniteStage2','Second charge stage',.35,.95,.01,.7),
]);
export function naniteFields(source){
 return NANITE_FIELDS.filter(f=>source.naniteForm==='cannon'||!['naniteStage1','naniteStage2'].includes(f.key))
  .map(f=>f.key==='naniteAttachment'?Object.freeze({...f,fallback:source.naniteForm==='cannon'?'right-forearm':'left-forearm'}):f);
}
export function naniteConfig(source){
 if(!source||source.naniteForm===undefined)return null;
 const form=source.naniteForm;
 if(!['cannon','shield'].includes(form)||source.type!==(form==='cannon'?'charge':'naniteShield'))throw new Error('Invalid nanite source form/type.');
 if(form==='cannon'&&((source.emissionOrigin!==undefined)||(source.faceOrigin!==undefined)||(source.chest!==undefined)||(source.castStyle!==undefined&&source.castStyle!=='palm')||(source.castHand!==undefined&&!['left','right'].includes(source.castHand))))throw new Error('Nanite cannon origin is owned by its forearm.');
 const fields=naniteFields(source),keys=new Set(fields.map(f=>f.key));
 for(const key of Object.keys(source))if(key.startsWith('nanite')&&key!=='naniteForm'&&!keys.has(key))throw new Error(`Unsupported nanite setting: ${key}.`);
 const config={naniteForm:form};
 for(const f of fields){
  const value=source[f.key]===undefined?f.fallback:source[f.key];
  if(f.kind==='enum'?!f.options.some(o=>o.value===value):typeof value!=='number'||!Number.isFinite(value)||value<f.min||value>f.max)throw new Error(`Invalid ${f.key}.`);
  config[f.key]=value;
 }
 if(form==='cannon'&&config.naniteStage2+1e-12<config.naniteStage1+.1)throw new Error('Nanite charge stages need a gap of at least 0.10.');
 return Object.freeze(config);
}
export function validateNaniteLoadout(abilities){
 const arms=new Set();
 for(const source of Object.values(abilities||{})){
  const config=naniteConfig(source);if(!config)continue;
  if(arms.has(config.naniteAttachment))throw new Error('Only one nanite module may occupy each forearm.');
  arms.add(config.naniteAttachment);
 }
}
