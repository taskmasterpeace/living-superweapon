import {CanvasTexture,Group,Sprite,SpriteMaterial,SRGBColorSpace} from 'three';

// Identification, not targeting assistance. Never disclose a fog-hidden actor,
// a soldier behind cover, a corpse, or a friend as an enemy.
export function canIdentifySoldier(game,f){
 const p=game.player;
 return !!(game.running&&p&&f!==p&&f.team!==p.team&&f.alive&&f.hp>0&&f.obj.visible&&
  (f._vis??1)>=.4&&p.pos.distanceToSquared(f.pos)<260*260&&game.canSee?.(p,f));
}

export class SoldierLabels {
 constructor(game,soldiers){
  this.game=game;this.soldiers=soldiers;this.root=new Group();this.root.name='clone-identification';
  this.labels=[];
  if(typeof document==='undefined')return;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=88;
  const c=canvas.getContext('2d');
  c.fillStyle='#ec7853';c.beginPath();c.moveTo(24,20);c.lineTo(40,36);c.lineTo(24,52);c.lineTo(8,36);c.closePath();c.fill();
  c.font='600 30px Inter, system-ui, sans-serif';c.textBaseline='middle';
  c.lineWidth=5;c.strokeStyle='#151914';c.strokeText('CLONE RIFLE',53,38);
  c.fillStyle='#f0eee1';c.fillText('CLONE RIFLE',53,38);
  this.texture=new CanvasTexture(canvas);this.texture.colorSpace=SRGBColorSpace;
  this.material=new SpriteMaterial({map:this.texture,transparent:true,depthTest:true,depthWrite:false,toneMapped:false});
  for(const f of soldiers){const sprite=new Sprite(this.material);sprite.scale.set(13,2.24,1);sprite.visible=false;this.root.add(sprite);this.labels.push({f,sprite});}
  game.scene.add(this.root);
 }
 update(){
  for(const {f,sprite} of this.labels){
   sprite.visible=canIdentifySoldier(this.game,f);
   if(!sprite.visible)continue;
   f.parts.head.getWorldPosition(sprite.position);sprite.position.y+=2.6;
  }
 }
 dispose(){this.root.removeFromParent();this.texture?.dispose();this.material?.dispose();this.labels.length=0;}
}
