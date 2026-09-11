// NON-SHIPPING PROTOTYPE: small convex projection in three corners' coordinates.
// Projected dual-coordinate descent minimizes ||displacement||² subject to
// normalized row · displacement >= rhs. Infeasible/non-converged proposals are
// rejected; callers may choose another outward face, never commit a bad solve.
export class ContactProjection {
 constructor(){this.rows=[];this.rhs=[];this.dual=[];this.solution=new Float64Array(9);this.clear();}
 clear(){this.count=0;this.invalid=false;}
 add(values,rhs){
  let norm=0;for(let k=0;k<9;k++)norm+=values[k]*values[k];
  if(norm<1e-20){if(rhs>1e-8)this.invalid=true;return;}
  const row=this.rows[this.count]||(this.rows[this.count]=new Float64Array(9)),scale=1/Math.sqrt(norm);
  for(let k=0;k<9;k++)row[k]=values[k]*scale;
  this.rhs[this.count]=rhs*scale;this.dual[this.count++]=0;
 }
 solve(){
  const x=this.solution;x.fill(0);if(this.invalid)return false;
  for(let iteration=0;iteration<256;iteration++){
   let change=0;
   for(let i=0;i<this.count;i++){
    const row=this.rows[i];let dot=0;for(let k=0;k<9;k++)dot+=row[k]*x[k];
    const next=Math.max(0,this.dual[i]+this.rhs[i]-dot),delta=next-this.dual[i];this.dual[i]=next;
    if(delta){for(let k=0;k<9;k++)x[k]+=row[k]*delta;change=Math.max(change,Math.abs(delta));}
   }
   if(change<1e-9){
    for(let i=0;i<this.count;i++){let dot=0;for(let k=0;k<9;k++)dot+=this.rows[i][k]*x[k];if(dot<this.rhs[i]-1e-8)return false;}
    return true;
   }
  }
  return false;
 }
}
