// A KO owns orientation only: leave the last chase position and lens intact.
export function followDeathBody(game) {
  const f=game.player, camera=game.world?.camera;
  if(game.modeId!=='powerworld'||!f||f.alive||!camera||!game.running||game.matchOver
    ||game.mapCam||(game.humans?.length??0)>1||game.hud?.titleOpen||game.combatOverlayOpen
    ||game.world.camMode!=='chase')return false;
  const target=f.ragdoll?.P?.chest?.pos??f.pos;
  if(!target||![target.x,target.y,target.z].every(Number.isFinite))return false;
  if(camera.position.distanceToSquared(target)>0.0001)camera.lookAt(target);
  camera.updateMatrixWorld();
  return true;
}
