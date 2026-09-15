export const HIGHWALL_SAVE_KEY='warworld.highwall.session.v1';
export function writeHighwallSave(storage,data){
 const text=JSON.stringify(data,(_,v)=>v===Infinity?'@ww:infinity':v);
 readHighwallText(text);
 const prior=storage.getItem(HIGHWALL_SAVE_KEY);
 if(prior){try{readHighwallText(prior);storage.setItem(HIGHWALL_SAVE_KEY+'.previous',prior);}catch(e){if(e.name==='QuotaExceededError')throw e;}}
 storage.setItem(HIGHWALL_SAVE_KEY,text);return true;
}
export function readHighwallText(text){
 const s=JSON.parse(text,(_,v)=>v==='@ww:infinity'?Infinity:v);
 if(s?.schema!==1||typeof s.preset!=='string'||!Array.isArray(s.units)||s.units.length>160||!s.units.every(f=>f.def?.id&&Array.isArray(f.pos)&&f.pos.length===3&&f.pos.every(Number.isFinite)&&Number.isFinite(f.hp)))throw Error('Invalid Highwall session');
 return s;
}
export function readHighwallSave(storage){
 for(const key of [HIGHWALL_SAVE_KEY,HIGHWALL_SAVE_KEY+'.previous']){try{const text=storage.getItem(key);if(text)return readHighwallText(text);}catch{}}
 throw Error('No valid Highwall save found');
}
