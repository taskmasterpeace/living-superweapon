// Optional authored progression. Existing kits default to every slot available.
// Visual selection is deliberately separate from the level/stat progression.
export function unlockLevel(def,key){
  const n=def?.progression?.unlocks?.[key];
  return Number.isInteger(n)&&n>=1&&n<=10?n:1;
}
export function slotUnlocked(f,key){return (f.level??1)>=unlockLevel(f.def,key);}
export function formAt(def,level,infinite=false){
  const cap=Math.min(infinite?6:10,level??1);let selected=0,form=null;
  for(const [key,value] of Object.entries(def?.progression?.forms||{})){
    const n=Number(key);
    if(Number.isInteger(n)&&n>=2&&n<=cap&&n>selected){selected=n;form=value;}
  }
  return {level:selected,form};
}
