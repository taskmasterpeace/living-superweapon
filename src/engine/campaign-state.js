// Local campaign transactions. No browser globals: storage is supplied by the owner.
export const CAMPAIGN_KEY='powerworld.campaign.v1';
export const RESEARCH=Object.freeze({
 scanner_efficiency:{name:'Scanner efficiency',description:'20% shorter Threat Scanner cooldown.',supplies:40,research:20,effect:{scannerCooldownMult:.8}},
 shield_endurance:{name:'Shield endurance',description:'20% more shield-cell protection.',supplies:60,research:30,effect:{shieldHpMult:1.2}},
 field_repairs:{name:'Field repair efficiency',description:'Vehicle repair costs 8 supplies instead of 10.',supplies:50,research:25,effect:{repairCostMult:.8}},
});
const integer=n=>Number.isSafeInteger(n)&&n>=0;
export function freshCampaign(){return {version:1,supplies:120,research:0,purchased:[],awarded:[],spent:[],transactions:[]};}
export function validateCampaign(s){
 if(!s||s.version!==1)throw new Error('Unsupported campaign save version. Keep the original file.');
 if(!integer(s.supplies)||!integer(s.research))throw new Error('Invalid campaign balances.');
 s={...s,spent:s.spent??[]};
 for(const k of ['purchased','awarded','spent'])if(!Array.isArray(s[k])||s[k].some(x=>typeof x!=='string'||!x||x.length>160)||new Set(s[k]).size!==s[k].length)throw new Error('Invalid campaign '+k+'.');
 if(s.purchased.some(x=>!Object.hasOwn(RESEARCH,x)))throw new Error('Unknown research in campaign save.');
 if(!Array.isArray(s.transactions)||s.transactions.length>100)throw new Error('Invalid transaction history.');
 for(const t of s.transactions)if(!t||typeof t.id!=='string'||!['award','purchase','spend'].includes(t.kind)||!Number.isSafeInteger(t.supplies)||!Number.isSafeInteger(t.research))throw new Error('Invalid campaign transaction.');
 return structuredClone(s);
}
export class CampaignState {
 constructor(storage){this.storage=storage;this.state=freshCampaign();this.error=null;
  try{const raw=storage.getItem(CAMPAIGN_KEY);if(raw!==null)this.state=validateCampaign(JSON.parse(raw));}catch(e){this.error=e.message;}
 }
 snapshot(){return structuredClone(this.state);}
 _commit(next){
  if(this.error)throw new Error('Campaign save needs recovery: '+this.error);
  const valid=validateCampaign(next);
  // Persist before publishing: failed quota/write never grants or debits in memory.
  this.storage.setItem(CAMPAIGN_KEY,JSON.stringify(valid));this.state=valid;return this.snapshot();
 }
 _record(next,t){next.transactions=[...next.transactions,t].slice(-100);return this._commit(next);}
 award(operationId,{supplies=0,research=0,sandbox=false}={}){
  if(sandbox)return {accepted:false,reason:'sandbox'};
  if(typeof operationId!=='string'||!operationId||operationId.length>160)throw new Error('Invalid operation ID.');
  if(!integer(supplies)||!integer(research))throw new Error('Invalid reward.');
  if(this.state.awarded.includes(operationId))return {accepted:false,reason:'already_awarded'};
  const next=this.snapshot();next.supplies+=supplies;next.research+=research;next.awarded.push(operationId);
  this._record(next,{id:operationId,kind:'award',supplies,research});return {accepted:true,supplies,research};
 }
 purchase(id){
  const item=Object.hasOwn(RESEARCH,id)?RESEARCH[id]:null;
  if(!item)return {accepted:false,reason:'unknown_research'};
  if(this.state.purchased.includes(id))return {accepted:false,reason:'already_owned'};
  if(this.state.supplies<item.supplies||this.state.research<item.research)return {accepted:false,reason:'unaffordable'};
  const next=this.snapshot();next.supplies-=item.supplies;next.research-=item.research;next.purchased.push(id);
  this._record(next,{id,kind:'purchase',supplies:-item.supplies,research:-item.research});return {accepted:true,effect:{...item.effect}};
 }
 spend(id,supplies){
  if(typeof id!=='string'||!id||id.length>160||!integer(supplies))throw Error('Invalid supply transaction.');
  if(this.state.spent.includes(id))return {accepted:false,reason:'already_spent'};
  if(this.state.supplies<supplies)return {accepted:false,reason:'unaffordable'};
  const next=this.snapshot();next.supplies-=supplies;next.spent.push(id);
  this._record(next,{id,kind:'spend',supplies:-supplies,research:0});return {accepted:true};
 }
 effects(){return Object.assign({},...this.state.purchased.map(id=>RESEARCH[id].effect));}
 exportSave(){if(this.error)throw new Error(this.error);return JSON.stringify(this.state,null,2);}
 importSave(raw){const next=validateCampaign(JSON.parse(raw));this.storage.setItem(CAMPAIGN_KEY,JSON.stringify(next));this.state=next;this.error=null;return this.snapshot();}
 reset(){const next=freshCampaign();this.storage.setItem(CAMPAIGN_KEY,JSON.stringify(next));this.state=next;this.error=null;return this.snapshot();}
}
