// A camera has a visible near plane, not just a centre ray. Include a small
// clearance envelope and t=0 so a lens inside/against a slab can see out.
// Presentation only: never mutate the building's physical collision boxes.
export function buildingObstructsView(world, camera, player, box) {
 const t=world.traceBox3(camera.x,camera.y,camera.z,player.x,player.y+6,player.z,box,1.5);
 return t>=0&&t<.98;
}
