import { FIREARMS, BLADES, GEAR } from './armory.js';

// Presentation metadata only: these dimensions do not impose inventory capacity,
// equipment eligibility, stacking, or action bindings on the game.
export const ITEM_ICON_SPEC = Object.freeze({
  masterPixels: 512,
  safeArea: Object.freeze({ x: 48, y: 48, width: 416, height: 416 }),
  transparent: true,
  renderPixels: Object.freeze({ compact: 48, inventory: 64, inspect: 96 }),
  fit: 'contain',
  elongatedFrameAspect: 2,
});

// Explicit proposals so new registry entries cannot silently inherit guessed sizes.
const footprints = {
  firearm: {
    m24: [5, 2], m107: [5, 2], ak: [4, 2], m16: [4, 2], kuchler: [4, 2],
    battle: [4, 2], saw: [5, 2], mp5: [3, 2], pdw: [3, 2], pump: [4, 2],
    auto12: [4, 2], p9: [2, 2], magnum: [2, 2], machinepistol: [2, 2],
  },
  melee: { bat: [4, 1], katana: [4, 1], claws: [2, 1], knife: [2, 1], tomahawk: [2, 2], baton: [3, 1], nodachi: [5, 1] },
  gear: {
    teargas: [1, 2], mustard: [1, 2], smoke: [1, 2], flashbang: [1, 2], frag: [1, 2],
    breach: [2, 1], claymore: [2, 1], nvg: [2, 1], motion: [1, 2], thermal: [2, 1],
    plate: [2, 3], shield: [2, 4], ifak: [2, 2], rappel: [2, 2], jammer: [2, 2], beacon: [1, 2],
  },
};

function present(category, registry, item) {
  const size = footprints[category][item.id];
  if (!size) throw new Error(`Missing presentation footprint: ${category}.${item.id}`);
  const id = `${category}.${item.id}`;
  return Object.freeze({
    id, registry, registryId: item.id, name: item.n, category,
    subtype: category === 'firearm' ? item.cls : category === 'melee' ? item.mesh : item.kind,
    // The source hero flag is descriptive, never a grant/restriction of equipment.
    authoredHeroWeapon: item.hero === true,
    proposedEquipmentRole: category === 'firearm' ? (item.cls === 'pistol' ? 'sidearm' : 'primary-weapon') : category === 'melee' ? 'melee-weapon' : 'gadget',
    icon: Object.freeze({ id: `item.${id}`, status: 'missing', src: null }),
    proposedFootprint: Object.freeze({ status: 'proposed', columns: size[0], rows: size[1], unit: 'cell' }),
  });
}

export const ITEM_PRESENTATION = Object.freeze([
  ...FIREARMS.map(item => present('firearm', 'FIREARMS', item)),
  ...BLADES.map(item => present('melee', 'BLADES', item)),
  ...GEAR.map(item => present('gear', 'GEAR', item)),
]);

const byId = new Map(ITEM_PRESENTATION.map(item => [item.id, item]));
export const itemPresentationById = id => byId.get(id) ?? null;
