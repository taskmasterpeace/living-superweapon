// VEHICLE RIDER — the VISIBLE crew for open seats (motorcycle, ATV,
// hoverboard). A closed hull hides its occupant; an open saddle must show the
// actual runtime character riding it: seated on the saddle, hands to the bars,
// feet on the pegs, body following the machine's lean.
//
// The pose is PROCEDURAL over the fighter's own rig (parts.armL/armR pivots,
// legL/R with userData.knee) — an interim the Mac Mini animation pipeline is
// expected to replace with authored rider clips; keep this module the single
// place that owns the seated pose so the swap is one file. Physics/travel is
// entirely the vehicle's; this only PRESENTS the body on it (entity._animate
// early-returns while seated, so nothing fights these rotations).

export function isOpenSeat(actor) { return !!actor?.env?.openSeat; }

// saddle transform per frame: rider pinned on the seat, rolled with the lean
export function poseRider(actor, f) {
  if (!f?.obj) return;
  const m = actor.motion || {};
  const h = (actor.bodyHeight || 4) * (actor.env?.saddleH ?? 0.62);
  f.pos?.set?.(actor.pos.x, actor.pos.y + h, actor.pos.z);
  const o = f.obj;
  o.visible = true;
  o.position?.copy?.(f.pos);
  if (o.rotation) {
    o.rotation.order = 'YXZ';
    o.rotation.y = m.yaw || 0;
    o.rotation.z = (m.lean || 0) + (m.rollSpin || 0);    // the rider FOLLOWS the machine's lean (and the whip)
    o.rotation.x = 0;
  }
  const P = f.parts;
  if (P) {
    // hands to the bars: both arms reach forward-down
    for (const arm of [P.armL, P.armR]) if (arm?.rotation) { arm.rotation.x = -1.05; arm.rotation.z = 0; }
    // seated: thighs up, knees bent, feet on the pegs
    for (const leg of [P.legL, P.legR]) {
      if (leg?.rotation) leg.rotation.x = -1.25;
      const knee = leg?.userData?.knee;
      if (knee?.rotation) knee.rotation.x = 1.35;
    }
  }
}

// hand the body back to the animation system exactly as it stands
export function unposeRider(f) {
  if (!f?.obj) return;
  if (f.obj.rotation) { f.obj.rotation.x = 0; f.obj.rotation.z = 0; }
  const P = f.parts;
  if (P) {
    for (const arm of [P.armL, P.armR]) if (arm?.rotation) { arm.rotation.x = 0; arm.rotation.z = 0; }
    for (const leg of [P.legL, P.legR]) {
      if (leg?.rotation) leg.rotation.x = 0;
      const knee = leg?.userData?.knee;
      if (knee?.rotation) knee.rotation.x = 0;
    }
  }
}
