// These zones are data-only; their normal update systems render and apply them.
// Swapping their collections preserves suspended desert duration and ownership.
export class TrainingHazardScope {
 constructor(game){
  this.g=game;this.saved=new Map();
  for(const key of ['_fires','_smoke','_sing']){
   this.saved.set(key,game[key]);game[key]=[];
  }
 }
 close(){
  for(const [key,list]of this.saved)this.g[key]=list;
  this.saved.clear();
 }
}
