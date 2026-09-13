// A placed beacon belongs to the dimension where it was planted. Leaving
// training retires its anchor, retaining the carried item and its cooldown.
export function retireTrainingBeacons(fighters,room){
 let count=0;
 for(const fighter of fighters)for(const item of fighter.items||[]){
  if(item.def.kind!=='beacon'||item._trainingRoom!==room)continue;
  const resources=new Set();
  item.mesh?.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const m of [].concat(o.material||[]))resources.add(m);});
  item.mesh?.removeFromParent();for(const r of resources)r.dispose();
  item.mesh=null;item.pos=null;item._trainingRoom=null;
  item.state='cooldown';item.cd=Math.max(item.cd||0,item.def.cd||3);count++;
 }
 return count;
}
