// Physical shot contact is separate from hostility/AI target selection.
export function canReceiveShot(game,shooter,target){
 if(!target?.alive||target===shooter)return false;
 if(game.isFoe(shooter,target))return true;
 const holder=target.grabbedBy;
 return !!(holder?.alive&&holder.grabbing===target&&game.isFoe(shooter,holder));
}
