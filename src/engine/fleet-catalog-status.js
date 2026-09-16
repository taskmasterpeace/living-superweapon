// FLEET CATALOG STATUS — the honest per-capability ledger. A model appearing
// in a selector is NOT a finished vehicle: every catalog row exposes each
// capability separately (model · player movement · camera · seats · weapon ·
// damage · AI operation · animation · audio), each derived from the actual
// data (envelopes, mounts, hulls, open seats) plus an authored ACCEPTANCE
// ledger naming the gate that proved it. There is deliberately NO aggregate
// "working" badge — a missing system stays visible.
import { classOf, drives } from '../data/fleet-handling.js';
import { envelopeOf } from '../data/vehicle-envelopes.js';
import { VEHICLE_MOUNTS } from '../data/vehicle-mounts.js';

export const FLEET_FAMILIES = {
  wheeled: 'Ground · wheeled', hover: 'Ground · hover', tracked: 'Armor · tracked',
  rotor: 'Rotor / VTOL', fixedwing: 'Fixed-wing', mech: 'Walker', ship: 'Sea',
  turret: 'Defense · emplacement', static: 'Defense · structure', drone: 'Drone system',
};

// Which class passed which movement gate. One authored ledger; a class not
// listed here is honestly incomplete however nice its envelope numbers look.
const MOVEMENT_GATE = {
  wheeled: 'fleet-support-repair gate',
  tracked: 'vehicle-turret gate + Gate A browser run',
  rotor: 'vehicle-helicopter gate',
  fixedwing: 'vehicle-jet gate',
  mech: 'vehicle-mech gate',
};
const AI_GATE = { tracked: 'vehicle-ai gate + Gate A browser run' };

const cap = (state, note) => ({ state, note });

export function vehicleStatus(row) {
  const cls = classOf(row), env = envelopeOf(row.id);
  const variant = /-damaged$|-destroyed$/.test(row.id);
  const drivable = drives(row) && !variant;
  const giant = ['aircraft-carrier', 'mothership'].includes(row.id);
  const mount = VEHICLE_MOUNTS[row.id];
  const c = {
    model: cap(row.url ? 'yes' : 'no', row.url || 'no asset'),
    playerMovement: !drivable ? cap('n/a', cls === 'turret' || cls === 'static' ? 'emplacement — AA gameplay lives in aa-emplacement.js' : variant ? 'condition variant' : 'not a driven class')
      : env && MOVEMENT_GATE[cls] ? cap('accepted', MOVEMENT_GATE[cls])
      : env ? cap('incomplete', 'envelope authored; no acceptance gate for this class yet')
      : cap('incomplete', 'no envelope row'),
    camera: drivable ? cap('accepted', 'class camera + Alt freelook (Gate A/B browser runs)') : cap('n/a', ''),
    seats: drivable ? cap('accepted', env?.openSeat ? 'VehicleSession · OPEN seat, visible rider' : 'VehicleSession · closed hull') : cap('n/a', ''),
    weapon: mount ? cap('accepted', `${mount.label} (vehicle-fire gate)`) : cap('incomplete', 'no mount authored'),
    damage: !drivable ? cap('incomplete', 'no hull receiver')
      : giant ? cap('incomplete', 'capital platform — needs per-section receivers, a single hull box blankets the map')
      : cap('accepted', 'VehicleHull cover record (vehicle-hull gate)'),
    aiOperation: AI_GATE[cls] ? cap('accepted', AI_GATE[cls]) : cap('incomplete', 'no operator policy for this class yet'),
    animation: cls === 'mech' ? cap('accepted', 'procedural diagonal gait, stride locked to travel (vehicle-mech gate); terrain foot-IK open')
      : env?.openSeat ? cap('interim', 'procedural rider pose — single swap point for Mac Mini authored clips')
      : drivable ? cap('accepted', 'rig-driven parts (turret/rotors/wheels/gear)')
      : cap('n/a', ''),
    audio: cls === 'wheeled' ? cap('accepted', 'recorded start/idle/accel/brake/off set')
      : cls === 'rotor' || cls === 'fixedwing' ? cap('incomplete', 'loop wired; silent until an authentic recording is bound (honest, no fake engine)')
      : cap('incomplete', 'no engine audio'),
  };
  return { id: row.id, name: row.name || row.id, family: FLEET_FAMILIES[cls] || cls, cls, capabilities: c };
}

// Every FLEET row (vehicles + defense hardware), organized by family. Dogs,
// creatures and constructs live in other collections and never appear here.
export function fleetStatusTable(catalog) {
  const rows = (catalog?.models || []).filter(m => (m.collection ?? 'fleet') === 'fleet');
  const table = rows.map(vehicleStatus);
  table.sort((a, b) => a.family.localeCompare(b.family) || a.name.localeCompare(b.name));
  return table;
}
