// VEHICLE RETICLE — the crosshair that CANNOT lie. It marks the screen
// projection of the gun's actual impact solution: the same muzzle + direction
// the shell leaves with (vehicle-weapons.js muzzleWorld — the one truth
// source), swept through the same world geometry the shell flies through
// (projectile-contact.js sweepSplitObstacle, own hull excluded via the
// prototype-world trick ScoutGunner proved). No mouse ray, no camera-center
// guess — if the reticle sits on a rock, the shell hits that rock.
//
// The solve() half is pure and headlessly testable; the DOM half only runs
// where a document exists.
import * as THREE from 'three';
import { sweepSplitObstacle } from './projectile-contact.js';
import { muzzleWorld } from './vehicle-weapons.js';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _p = new THREE.Vector3(), _m = new THREE.Matrix4();
const _out = {};

// The impact solution: {point:{x,y,z}, kind:'ground'|'cover'|'interior'|'expiry', range}
export function reticleSolution(world, actor) {
  const spec = actor?.weapon?.spec;
  if (!spec) return null;
  const { pos, dir } = muzzleWorld(actor);
  const range = (spec.speed || 200) * (spec.life || 3);
  _a.set(pos.x, pos.y, pos.z);
  _b.set(pos.x + dir.x * range, pos.y + dir.y * range, pos.z + dir.z * range);
  // the shell's own obstacle set, minus the hull it launches over
  const sw = reticleSolution._sw ??= { cover: [] };
  Object.setPrototypeOf(sw, world);
  sw.cover.length = 0;
  for (const c of world.cover || []) if (c !== actor.cover && c.hp > 0 && !c.hidden) sw.cover.push(c);
  const hit = sweepSplitObstacle(sw, _a, _b, spec.radius || .5, _out, true);
  const t = hit ? Math.max(0, Math.min(1, _out.t)) : 1;
  const point = _p.copy(_a).lerp(_b, t);
  return { point: { x: point.x, y: point.y, z: point.z }, kind: hit ? _out.kind : 'expiry', range: range * t };
}

export class VehicleReticle {
  constructor() { this.el = null; }
  _ensure() {
    if (this.el || typeof document === 'undefined') return this.el;
    const el = document.createElement('div');
    el.id = 'fleetReticle';
    el.style.cssText = 'position:fixed;z-index:1190;pointer-events:none;width:26px;height:26px;transform:translate(-50%,-50%);display:none';
    el.innerHTML = '<svg viewBox="0 0 26 26" width="26" height="26"><circle cx="13" cy="13" r="9" fill="none" stroke="#ffd24a" stroke-width="1.6" opacity=".9"/><circle cx="13" cy="13" r="1.7" fill="#ffd24a"/><path d="M13 0v6M13 20v6M0 13h6M20 13h6" stroke="#ffd24a" stroke-width="1.4" opacity=".8"/></svg>';
    document.body.appendChild(el);
    return this.el = el;
  }
  hide() { if (this.el) this.el.style.display = 'none'; }
  // project the weapon-truth point through the LIVE camera transform (its
  // matrixWorldInverse is only refreshed at render — invert matrixWorld here
  // so the mark cannot lag a frame behind a moving camera, the Wave-1 lesson)
  update(game, actor) {
    const el = this._ensure();
    if (!el) return;
    const cam = game.world?.camera;
    const sol = cam && (actor?.cls === 'tracked' || actor?.cls === 'mech') ? reticleSolution(game.world, actor) : null;
    if (!sol) { this.hide(); return; }
    cam.updateMatrixWorld?.(true);
    _p.set(sol.point.x, sol.point.y, sol.point.z)
      .applyMatrix4(_m.copy(cam.matrixWorld).invert())
      .applyMatrix4(cam.projectionMatrix);
    if (_p.z > 1 || _p.z < -1) { this.hide(); return; }
    el.style.display = 'block';
    el.style.left = ((_p.x * .5 + .5) * innerWidth) + 'px';
    el.style.top = ((-_p.y * .5 + .5) * innerHeight) + 'px';
    el.style.opacity = actor.weapon?.canFire ? '1' : '.35';   // reload/dry reads as a dimmed mark
  }
  dispose() { this.el?.remove(); this.el = null; }
}
