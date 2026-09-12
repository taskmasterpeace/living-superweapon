// Finite building slabs must not behave like ground-to-roof cover columns.
export function buildingContact({feet,previousFeet,headHeight,velocityY,flying,launched,stepHeight=2.5},piece){
 const bottom=piece.bottom,top=piece.top;
 if(feet>=top+.05)return 'above';
 const head=feet+headHeight,previousHead=previousFeet+headHeight;
 if(head<bottom)return 'below';
 if(velocityY>0&&previousHead<=bottom&&head>=bottom)return 'ceiling';
 if(piece.standable&&velocityY<=2&&previousFeet>=top-.05)return 'land';
 if(piece.buildingRole==='step'&&!flying&&!launched&&top-feet<=stepHeight&&top>=feet)return 'step';
 return 'wall';
}
