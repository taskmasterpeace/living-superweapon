// Portable presentation only. These values never change damage or guard rules.
export const EFFECT_FIELDS=Object.freeze({
 shield:{intensity:{label:'Shield surface',min:0,max:2,step:.05,value:1},rippleDuration:{label:'Hit ripple duration',min:.2,max:1.5,step:.05,value:.7}},
 charge:{intensity:{label:'Charge gathering',min:0,max:2,step:.05,value:1}},
 construct:{assemblyTime:{label:'Construct assembly time',min:.15,max:2,step:.05,value:.65},density:{label:'Construct particle density',min:0,max:2,step:.1,value:1}},
});
export function validateEffects(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Effects must be an object.');
 for(const key of Object.keys(value))if(!Object.hasOwn(EFFECT_FIELDS,key))throw new Error(`Unknown effect group: ${key}`);
 const result={};
 for(const [group,fields] of Object.entries(EFFECT_FIELDS)){
  const values=value[group]===undefined?{}:value[group];
  if(!values||typeof values!=='object'||Array.isArray(values))throw new Error(`Effects.${group} must be an object.`);
  for(const key of Object.keys(values))if(!Object.hasOwn(fields,key))throw new Error(`Unknown ${group} effect: ${key}`);
  result[group]={};
  for(const [key,field] of Object.entries(fields)){
   const n=values[key]===undefined?field.value:values[key];
   if(typeof n!=='number'||!Number.isFinite(n)||n<field.min||n>field.max)throw new Error(`Effects.${group}.${key} must be between ${field.min} and ${field.max}.`);
   result[group][key]=n;
  }
 }
 return result;
}
