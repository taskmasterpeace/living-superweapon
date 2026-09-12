const KINDS=['soldier','lsw'];
export class DeploymentStock{
 constructor(counts){
  for(const kind of KINDS)if(!Number.isSafeInteger(counts[kind])||counts[kind]<0)throw Error('Deployment stock must be a nonnegative integer.');
  this.initial={soldier:counts.soldier,lsw:counts.lsw};this.remaining={...this.initial};this.committed=new Map();
 }
 commit(id,kind){
  if(id==null||!KINDS.includes(kind))return false;
  if(this.committed.has(id))return this.committed.get(id)===kind;
  if(this.remaining[kind]===0)return false;
  this.remaining[kind]--;this.committed.set(id,kind);return true;
 }
 snapshot(){return {initial:{...this.initial},remaining:{...this.remaining},deployed:{soldier:this.initial.soldier-this.remaining.soldier,lsw:this.initial.lsw-this.remaining.lsw}};}
}
