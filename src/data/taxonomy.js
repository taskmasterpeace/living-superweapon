// =================================================================================================
// THE CANONICAL POWER TAXONOMY — Robert's 153 nodes, as data.
//
// He sent a full classification of the superpower poster and, correctly, refused to let it stay a
// flat list: *"The original poster is not a clean taxonomy. It places six different things at the
// same level."* Powers, families, variations, animal templates, learned skills and equipment are
// different KINDS of thing and must not be siblings.
//
// ⚠ IT IS A FILE, NOT A DOCUMENT, FOR THE REASON WE ALREADY PAID FOR ONCE. `data/education.js`
// described sixty research effects in a `d:` prose string and every one of them was unreachable by
// construction (manual, wire-queue item 6). A taxonomy in Markdown is the same disease: it cannot be
// queried, it cannot be audited, and it drifts the day someone adds a hero. So every node carries
// `t` (node_type) and `e` (the ENGINE TYPE that implements it, or null with the reason why not), and
// `coverage()` reports the split so the state of it can never be claimed rather than measured.
//
// ⚠ THE HEADLINE FINDING. The orphan audit says 44 ability types are declared and 18 are DEAD —
// implemented in `engine/systems.js`/`systems2.js` and carried by nobody. Mapped against this
// taxonomy, **17 of those 18 are named here**. They are not a leftover list; they are the missing
// branches of a real classification, and this file is the map that says which archetype should carry
// each one. The only dead type with no node is `timefield`: the poster has no time powers at all.
//
// ⚠ `e` MEANS "A DEF COULD DECLARE THIS TODAY", nothing weaker. Where a node would need a system we
// have not built, `e` is null and `why` says so in one line. A faked mapping is worse than an honest
// gap, exactly as a faked effect verb is worse than prose — the gap at least admits what it is.
//
// Robert's own audit, reproduced by `verify()`:
//   42 PHY + 20 ANM + 11 ENV + 16 ENE + 8 ARC + 3 META + 14 PSI + 9 MAT + 13 SKL + 17 EQP = 153
// =================================================================================================

// ---- node_type: what KIND of content a row is. This is the field that stops "Cats", "Guns",
// "Magic", "Drive Giant Wheel" and "Super Strength" being treated as the same kind of thing.
export const NODE_TYPES = ['family', 'power', 'technique', 'physiology_template', 'skill',
  'device', 'armor', 'vehicle_capability', 'artifact', 'artifact_grant'];

export const DOMAINS = {
  PHY: 'Physical Form and Physiology',
  ANM: 'Animal-Derived Physiology',
  ENV: 'Environmental, Elemental and Sonic',
  ENE: 'Energy and Fundamental Forces',
  ARC: 'Spatial, Arcane, Dimensional and Cosmic',
  META: 'Power Interaction',
  PSI: 'Mental, Psionic and Cognitive',
  MAT: 'Matter, Object and Biological Manipulation',
  SKL: 'Learned Mastery and Expertise',
  EQP: 'Technology, Equipment and Artifacts',
};

// The gameplay tag vocabularies, kept DELIBERATELY SEPARATE from the taxonomy — his rule, and the
// same rule `data/visual.js` already follows: what a power IS and how it is DELIVERED are two axes.
export const TAGS = {
  delivery: ['contact', 'melee', 'grab', 'projectile', 'beam', 'line', 'cone', 'burst', 'aura',
    'field', 'barrier', 'trap', 'mine', 'summon', 'transformation', 'movement', 'teleport', 'environmental'],
  role: ['damage', 'defense', 'shield', 'mobility', 'crowdControl', 'healing', 'stealth', 'detection',
    'support', 'debuff', 'counter', 'interruption', 'rescue', 'summoning', 'environmentalUtility'],
  activation: ['passive', 'tap', 'hold', 'charge', 'channel', 'toggle', 'reaction', 'counter',
    'combo', 'transformation', 'ultimate'],
  target: ['self', 'ally', 'enemy', 'object', 'vehicle', 'structure', 'area', 'environment', 'global'],
  source: ['biological', 'mutation', 'alien', 'animalDerived', 'psionic', 'magical', 'divine',
    'infernal', 'cosmic', 'dimensional', 'technological', 'artifact', 'learned', 'borrowed', 'copied'],
};

// n = canonical name · t = node_type · e = engine type (null = not built) · p = poster label if it
// differs · why = the one-line reason `e` is null.
const F = 'family', P = 'power', TQ = 'technique', TPL = 'physiology_template', SK = 'skill',
  DEV = 'device', ARM = 'armor', VEH = 'vehicle_capability', ART = 'artifact', GR = 'artifact_grant';

export const GROUPS = [
  // ------------------------------------------------------------------ PHY (42)
  { id: 'PHY-TRN', domain: 'PHY', title: 'Body-State Transformation', nodes: [
    { id: 'body-transmutation', n: 'Body Transmutation', t: F, e: null, p: 'Transmute Body', why: 'family heading' },
    { id: 'metal-transformation', n: 'Metal Transformation', t: F, e: null, p: 'Turn into Metal', why: 'family heading' },
    { id: 'iron-form', n: 'Iron Form', t: P, e: 'buff' },
    { id: 'molten-metal-form', n: 'Molten-Metal Form', t: P, e: 'buff' },
    { id: 'organic-steel-form', n: 'Organic-Steel Form', t: P, e: 'buff' },
    { id: 'property-absorption', n: 'Property Absorption by Touch', t: P, e: 'mimic', p: 'Take on Properties of Anything Touched' },
    { id: 'any-element-form', n: 'Any-Element Transformation', t: P, e: 'buff' },
    { id: 'water-form', n: 'Water Form', t: P, e: null, why: 'a liquid body needs a material state the figure rig has no representation for' },
    { id: 'diamond-form', n: 'Diamond Form', t: P, e: 'buff' },
    { id: 'sand-form', n: 'Sand Form', t: P, e: null, why: 'a body that disperses and reforms needs particulate bodies' },
    { id: 'avm-transformation', n: 'Animal/Vegetable/Mineral Transformation', t: P, e: null, why: 'arbitrary target morphology; no mesh pipeline for it' },
    { id: 'plasma-envelope', n: 'Fiery-Plasma Body Envelope', t: P, e: 'buff', p: 'Envelope Body in Fiery Plasma' },
  ] },
  { id: 'PHY-MOR', domain: 'PHY', title: 'Morphology and Structural Control', nodes: [
    { id: 'body-manipulation', n: 'Body Manipulation', t: F, e: null, why: 'family heading' },
    { id: 'shape-shifting', n: 'Shape-Shifting', t: P, e: null, why: 'needs a second figure to shift INTO; the rig is one build per def' },
    { id: 'size-alteration', n: 'Size Alteration', t: F, e: 'size', why: null },
    { id: 'shrinking', n: 'Shrinking', t: P, e: 'size' },
    { id: 'growth', n: 'Growth', t: P, e: 'size' },
    { id: 'density-control', n: 'Density Control', t: P, e: 'buff' },
    { id: 'intangibility', n: 'Intangibility', t: P, e: 'phase' },
    { id: 'invisibility', n: 'Invisibility', t: P, e: 'invisible' },
    { id: 'self-replication', n: 'Self-Replication', t: P, e: 'duplicate' },
    { id: 'bouncing-body', n: 'Inflatable/Bouncing Body', t: P, e: 'elastic' },
    { id: 'stretching', n: 'Stretching and Elongation', t: P, e: 'elastic' },
  ] },
  { id: 'PHY-ANA', domain: 'PHY', title: 'Anatomical Traits and Natural Weapons', nodes: [
    { id: 'specialized-body-parts', n: 'Specialized Body Parts', t: F, e: null, why: 'family heading' },
    { id: 'prehensile-hair', n: 'Prehensile Hair', t: P, e: 'tentacle' },
    { id: 'wings', n: 'Wings', t: P, e: null, why: 'BUILDS already draws wings; flight is def.flightTier, not an ability' },
    { id: 'claws', n: 'Claws', t: P, e: 'melee' },
    { id: 'chi-fist', n: 'Chi-Enhanced Fist', t: P, e: 'melee' },
    { id: 'alloy-skull', n: 'Hyperdense-Alloy Skull', t: P, e: 'melee', p: 'Adamantium-Enhanced Skull' },
    { id: 'impenetrable-skin', n: 'Impenetrable Skin', t: P, e: null, why: 'a passive; def.armor and def.resist already carry it' },
  ] },
  { id: 'PHY-ENH', domain: 'PHY', title: 'Enhanced Physical Functions and Adaptations', nodes: [
    { id: 'superhuman-physical', n: 'General Superhuman Physical Ability', t: F, e: null, p: 'Superhuman Ability', why: 'family heading — never a selectable power' },
    { id: 'super-speed', n: 'Super Speed', t: P, e: 'dash' },
    { id: 'super-strength', n: 'Super Strength', t: P, e: null, why: 'a passive; def.rank and the lift ladder carry it' },
    { id: 'super-durability', n: 'Super Durability', t: P, e: null, why: 'a passive; def.hp and def.armor carry it' },
    { id: 'super-rotation', n: 'Super Rotation', t: P, e: 'rush' },
    { id: 'super-ingestion', n: 'Super Ingestion', t: P, e: 'consume' },
    { id: 'super-healing', n: 'Super Healing', t: P, e: 'regen' },
    { id: 'aquatic-adaptation', n: 'Aquatic Adaptations', t: P, e: null, why: 'waterAt is a drag multiplier; there is no swimming state yet' },
  ] },
  { id: 'PHY-SEN', domain: 'PHY', title: 'Sensory Powers', nodes: [
    { id: 'sensory-enhancement', n: 'Sensory Enhancement', t: F, e: null, why: 'family heading' },
    { id: 'echolocation', n: 'Echolocation', t: P, e: 'vision' },
    { id: 'enhanced-vision', n: 'Enhanced Vision', t: P, e: 'vision' },
    { id: 'night-vision', n: 'Night Vision', t: P, e: 'vision' },
  ] },
  // ------------------------------------------------------------------ ANM (20)
  { id: 'ANM-GEN', domain: 'ANM', title: 'General Animal Adaptation', nodes: [
    { id: 'animal-physiology-general', n: 'General Animal-Like Physiology', t: TPL, e: null, why: 'a template grants a PACKAGE; there is no package layer yet' },
    { id: 'animal-physiology-unspecified', n: 'Unspecified Animal Physiology', t: TPL, e: null, p: 'Non-Specific', why: 'source animal undefined by design' },
    { id: 'animal-mimicry', n: 'Animal Mimicry', t: P, e: 'mimic' },
  ] },
  { id: 'ANM-VER', domain: 'ANM', title: 'Vertebrate Physiology', nodes: [
    { id: 'mammalian', n: 'Mammalian Physiology', t: TPL, e: null, why: 'template layer' },
    { id: 'feline', n: 'Feline Physiology', t: F, e: null, p: 'Cats', why: 'family heading' },
    { id: 'feline-general', n: 'General Feline Attributes', t: TPL, e: null, why: 'template layer' },
    { id: 'tiger', n: 'Tiger Physiology', t: TPL, e: null, why: 'template layer' },
    { id: 'puma', n: 'Puma Physiology', t: TPL, e: null, why: 'template layer' },
    { id: 'cheetah', n: 'Cheetah Physiology', t: TPL, e: null, why: 'template layer' },
    { id: 'wolf', n: 'Wolf Physiology', t: TPL, e: null, why: 'template layer' },
    { id: 'monkey', n: 'Monkey Physiology', t: TPL, e: null, why: 'template layer' },
    { id: 'bat', n: 'Bat Physiology', t: TPL, e: null, why: 'template layer; echolocation is its reachable part' },
    { id: 'owl', n: 'Owl Physiology', t: TPL, e: null, why: 'template layer' },
    { id: 'toad', n: 'Toad Physiology', t: TPL, e: null, why: 'template layer' },
    { id: 'lizard', n: 'Lizard Physiology', t: TPL, e: null, why: 'template layer' },
    { id: 'vertebrate-other', n: 'Other Vertebrate Physiology', t: TPL, e: null, why: 'template layer' },
  ] },
  { id: 'ANM-ART', domain: 'ANM', title: 'Arthropod Physiology', nodes: [
    { id: 'arthropod', n: 'Arthropod Physiology', t: F, e: null, why: 'family heading' },
    { id: 'insect', n: 'Insect Physiology', t: TPL, e: null, why: 'template layer' },
    { id: 'spider', n: 'Spider Physiology', t: TPL, e: 'wallcrawl' },
    { id: 'scorpion', n: 'Scorpion Physiology', t: TPL, e: null, why: 'template layer; the venom half is a payload' },
  ] },
  // ------------------------------------------------------------------ ENV (11)
  { id: 'ENV-ATM', domain: 'ENV', title: 'Atmosphere, Weather and Temperature', nodes: [
    { id: 'air-wind', n: 'Air and Wind Manipulation', t: P, e: 'cone' },
    { id: 'weather-control', n: 'Weather Control', t: F, e: 'weather', why: null },
    { id: 'weather-comprehensive', n: 'Comprehensive Weather Control', t: P, e: 'weather', p: 'All Form of Weather Control' },
    { id: 'temperature-reduction', n: 'Temperature Reduction', t: P, e: 'cone' },
  ] },
  { id: 'ENV-SON', domain: 'ENV', title: 'Sound and Sonic Effects', nodes: [
    { id: 'sound-powers', n: 'Sound Powers', t: F, e: null, p: 'Sound-Related', why: 'family heading' },
    { id: 'sound-control', n: 'Sound Control', t: P, e: 'cone' },
    { id: 'sound-to-light', n: 'Sound-to-Light Conversion', t: P, e: null, p: 'Convert Sound into Light', why: 'no conversion mechanic between effect types' },
    { id: 'super-scream', n: 'Super Scream', t: P, e: 'cone' },
  ] },
  { id: 'ENV-UMB', domain: 'ENV', title: 'Darkness and Shadow', nodes: [
    { id: 'darkforce', n: 'Darkness/Dimensional Energy Powers', t: F, e: null, p: 'Powers of Darkness Dimension', why: 'family heading' },
    { id: 'shadow-generation', n: 'Shadow Generation', t: P, e: 'construct' },
    { id: 'umbral-control', n: 'Umbral-Force Control', t: P, e: 'construct', p: 'Control Darkforce' },
  ] },
  // ------------------------------------------------------------------ ENE (16)
  { id: 'ENE-FND', domain: 'ENE', title: 'Fundamental Forces', nodes: [
    { id: 'fundamental-force', n: 'Fundamental-Force Control', t: F, e: null, why: 'family heading' },
    { id: 'gravity-control', n: 'Gravity Control', t: P, e: 'gravity' },
  ] },
  { id: 'ENE-ELC', domain: 'ENE', title: 'Electrical Powers', nodes: [
    { id: 'electrical', n: 'Electrical Powers', t: F, e: null, why: 'family heading' },
    { id: 'electricity-gen', n: 'Electricity Generation', t: P, e: 'projectile' },
    { id: 'electricity-genman', n: 'Electricity Generation and Manipulation', t: P, e: 'beam' },
  ] },
  { id: 'ENE-MAG', domain: 'ENE', title: 'Magnetic Powers', nodes: [
    { id: 'magnetic', n: 'Magnetic Powers', t: F, e: null, why: 'family heading' },
    { id: 'magnetism-control', n: 'Magnetism Control', t: P, e: 'telekinesis' },
    { id: 'magnetic-fields', n: 'Magnetic-Field Generation and Control', t: P, e: 'dome' },
  ] },
  { id: 'ENE-THR', domain: 'ENE', title: 'Heat, Light and Plasma', nodes: [
    { id: 'heat-light', n: 'Heat and Light Generation', t: P, e: 'beam' },
    { id: 'superheated-plasma', n: 'Super-Heated Plasma', t: P, e: 'beam' },
    { id: 'plasmoid', n: 'Energy-Plasmoid Creation', t: P, e: 'growingorb' },
  ] },
  { id: 'ENE-RAD', domain: 'ENE', title: 'Radiation', nodes: [
    { id: 'radiation-powers', n: 'Radiation Powers', t: F, e: null, p: 'Radiation-Related', why: 'family heading' },
    { id: 'radiation-control', n: 'Radiation Control', t: P, e: 'nova' },
  ] },
  { id: 'ENE-PRJ', domain: 'ENE', title: 'General Energy Projection and Defense', nodes: [
    { id: 'energy-emission', n: 'Energy Emission', t: P, e: 'beam' },
    { id: 'psionic-force-field', n: 'Psionic Force Field', t: P, e: 'dome' },
    { id: 'eye-beams', n: 'Eye Beams', t: P, e: 'beam' },
  ] },
  // ------------------------------------------------------------------ ARC (8)
  { id: 'ARC-MAG', domain: 'ARC', title: 'Arcane and Supernatural Forces', nodes: [
    { id: 'magic', n: 'Magic', t: F, e: null, why: 'family heading' },
    { id: 'mystic-arts', n: 'Mystic Arts', t: TQ, e: 'construct' },
    { id: 'hex-generation', n: 'Hex Generation', t: P, e: 'projectile' },
    { id: 'divine-transformation', n: 'Divine Transformation Package', t: P, e: 'buff', p: 'Shazam!-based' },
    { id: 'hellfire', n: 'Hellfire Control', t: P, e: 'cone' },
    { id: 'otherworldly', n: 'Otherworldly Forces', t: F, e: 'banish', why: null },
  ] },
  { id: 'ARC-SPC', domain: 'ARC', title: 'Spatial and Cosmic Powers', nodes: [
    { id: 'teleportation', n: 'Teleportation', t: P, e: 'teleport' },
    { id: 'power-cosmic', n: 'Cosmic-Force Channeling', t: P, e: 'beam', p: 'Wield the Power Cosmic' },
  ] },
  // ------------------------------------------------------------------ META (3)
  { id: 'META-PWR', domain: 'META', title: 'Meta-Powers', nodes: [
    { id: 'meta-powers', n: 'Meta-Powers', t: F, e: null, why: 'family heading' },
    { id: 'power-copying', n: 'Power Assumption or Copying', t: P, e: 'mimic' },
    { id: 'power-dampening', n: 'Power Dampening', t: P, e: null, why: 'nothing can suppress another fighter’s slots; _disarmT is the nearest and is gear-only' },
  ] },
  // ------------------------------------------------------------------ PSI (14)
  { id: 'PSI-TEL', domain: 'PSI', title: 'Telepathy and Communication', nodes: [
    { id: 'telepathy', n: 'Telepathy', t: F, e: null, why: 'family heading' },
    { id: 'thought-reading', n: 'Thought Reading', t: P, e: 'vision' },
    { id: 'thought-influence', n: 'Thought Reading and Influence', t: P, e: 'mindcontrol' },
    { id: 'animal-communication', n: 'Animal Communication', t: P, e: null, why: 'wildlife has scare() and roosting, no allegiance' },
  ] },
  { id: 'PSI-FOR', domain: 'PSI', title: 'Foresight and Probability', nodes: [
    { id: 'precognition', n: 'Precognition', t: P, e: null, why: 'needs a prediction of the opponent’s next action; the AI has no plan to read' },
    { id: 'probability', n: 'Probability Manipulation', t: P, e: null, why: 'no roll to bend — combat is deterministic except for spread' },
  ] },
  { id: 'PSI-KIN', domain: 'PSI', title: 'Psychokinesis', nodes: [
    { id: 'telekinesis', n: 'Telekinesis', t: P, e: 'telekinesis' },
  ] },
  { id: 'PSI-PRC', domain: 'PSI', title: 'Perception, Illusion and Language', nodes: [
    { id: 'illusion-generation', n: 'Illusion Generation', t: P, e: 'duplicate' },
    { id: 'omnilingualism', n: 'Omnilingualism', t: P, e: null, why: 'no language layer; the street speaks formant nonsense by design' },
  ] },
  { id: 'PSI-INT', domain: 'PSI', title: 'Intelligence and Genius', nodes: [
    { id: 'intelligence', n: 'Intelligence', t: F, e: null, why: 'family heading' },
    { id: 'super-intelligence', n: 'Super Intelligence', t: P, e: null, why: 'a passive; the INTELLECT attribute carries it' },
    { id: 'mechanical-genius', n: 'Mechanical Genius', t: SK, e: null, why: 'belongs to the firm’s engineer role, not a combat slot' },
    { id: 'genetics-genius', n: 'Cloning and Genetics Genius', t: SK, e: null, why: 'belongs to the firm’s scientist role' },
    { id: 'mastermind', n: 'Villainous Mastermind Intellect', t: SK, e: null, p: 'Evil Genius', why: 'alignment, not a mechanism — ai.level is the reachable part' },
  ] },
  // ------------------------------------------------------------------ MAT (9)
  { id: 'MAT-ENE', domain: 'MAT', title: 'Object Energization', nodes: [
    { id: 'object-energization', n: 'Object Energization', t: P, e: null, why: 'props can be carried and thrown but cannot be CHARGED' },
  ] },
  { id: 'MAT-BIO', domain: 'MAT', title: 'Biological Growth', nodes: [
    { id: 'plant-growth', n: 'Accelerated Plant Growth', t: P, e: 'construct' },
  ] },
  { id: 'MAT-TRN', domain: 'MAT', title: 'Matter Transformation and Molecular Control', nodes: [
    { id: 'petrification', n: 'Temporary Petrification', t: P, e: null, p: 'Turn Matter into Stone for One Hour', why: 'the duration is a parameter, but no matter-state system exists' },
    { id: 'molecular-manipulation', n: 'Molecular Manipulation', t: P, e: 'reshape' },
    { id: 'elemental-transmutation', n: 'Elemental Transmutation', t: P, e: 'reshape', p: 'Transmute Elements' },
  ] },
  { id: 'MAT-FLD', domain: 'MAT', title: 'Elemental and Fluid Manipulation', nodes: [
    { id: 'water-manipulation', n: 'Water Manipulation', t: P, e: 'cone' },
  ] },
  { id: 'MAT-PRP', domain: 'MAT', title: 'Physical-Property and Chemical Manipulation', nodes: [
    { id: 'object-colour', n: 'Object Color Alteration', t: P, e: null, why: 'no gameplay consequence to an object’s colour' },
    { id: 'reaction-speed', n: 'Chemical-Reaction Speed Alteration', t: P, e: null, why: 'no chemistry model; the nearest is the DoT tick rate' },
    { id: 'object-mass', n: 'Object Mass Increase', t: P, e: null, why: 'PROP_WEIGHT is a constant per prop kind, not a per-object field' },
  ] },
  // ------------------------------------------------------------------ SKL (13)
  { id: 'SKL-RNG', domain: 'SKL', title: 'Ranged-Weapon Mastery', nodes: [
    { id: 'archery', n: 'Archery', t: SK, e: 'bow' },
    { id: 'marksmanship', n: 'Marksmanship', t: SK, e: 'rifle' },
    { id: 'firearms', n: 'Firearms Proficiency', t: SK, e: 'rifle', p: 'Guns' },
    { id: 'thrown-mastery', n: 'Thrown-Object Mastery', t: SK, e: 'volley' },
  ] },
  { id: 'SKL-CBT', domain: 'SKL', title: 'Combat, Tactics and Fieldcraft', nodes: [
    { id: 'tactical-expertise', n: 'Tactical and Weapons Expertise', t: SK, e: null, why: 'a talent, not a slot — HERO_TALENTS.tactician is it' },
    { id: 'martial-arts', n: 'Martial Arts', t: SK, e: 'melee' },
    { id: 'future-karate', n: 'Future-Era Karate Mastery', t: SK, e: 'melee', p: 'Master of 31st-Century Karate' },
    { id: 'expert-hunting', n: 'Expert Hunting', t: SK, e: null, why: 'a talent — HERO_TALENTS.predator is it' },
  ] },
  { id: 'SKL-DEC', domain: 'SKL', title: 'Deception, Performance and Control', nodes: [
    { id: 'illusion-mastery', n: 'Illusion Mastery', t: SK, e: 'duplicate' },
    { id: 'impersonation', n: 'Impersonation Mastery', t: SK, e: null, why: 'no identity/disguise state' },
    { id: 'performance-arts', n: 'Performance Arts', t: SK, e: null, why: 'the crowd cheers on a clean KO; nothing performs TO it' },
    { id: 'puppetry', n: 'Puppetry Mastery', t: SK, e: 'possess' },
  ] },
  { id: 'SKL-ACR', domain: 'SKL', title: 'Acrobatics', nodes: [
    { id: 'acrobatics', n: 'Acrobatics Mastery', t: SK, e: null, why: 'a talent — HERO_TALENTS.acrobat and def.evade carry it' },
  ] },
  // ------------------------------------------------------------------ EQP (17)
  { id: 'EQP-WPN', domain: 'EQP', title: 'Weapons and Projectors', nodes: [
    { id: 'melting-ray', n: 'Metal-Melting Ray', t: DEV, e: 'beam' },
    { id: 'projectile-weapon', n: 'Projectile-Weapon Capability', t: DEV, e: 'projectile', p: 'Projectiles' },
    { id: 'glue-projection', n: 'Glue Projection', t: DEV, e: 'projectile' },
    { id: 'vibro-gauntlets', n: 'Vibro-Shock Gauntlets', t: DEV, e: 'melee' },
    { id: 'themed-arsenal', n: 'Themed Gadget Arsenal', t: DEV, e: 'volley', p: 'Goblin-Themed Weapons' },
  ] },
  { id: 'EQP-AUG', domain: 'EQP', title: 'Prostheses and Mechanical Augmentation', nodes: [
    { id: 'powered-prostheses', n: 'Powered Prostheses', t: DEV, e: null, why: 'a limb module system; BUILDS is cosmetic only' },
    { id: 'tentacle-arms', n: 'Mechanical Tentacle Arms', t: DEV, e: 'tentacle' },
  ] },
  { id: 'EQP-ARM', domain: 'EQP', title: 'Armor Systems', nodes: [
    { id: 'armored-suit', n: 'Armored Suit', t: ARM, e: null, why: 'def.armor is authored, not equipped — the gear system covers weapons only' },
    { id: 'telescopic-legs', n: 'Armored Suit with Telescopic Legs', t: ARM, e: null, why: 'armour module layer' },
  ] },
  { id: 'EQP-MOB', domain: 'EQP', title: 'Mobility Devices and Vehicles', nodes: [
    { id: 'flight-harness', n: 'Electromagnetic Flight Harness', t: DEV, e: 'buff' },
    { id: 'giant-wheel', n: 'Giant-Wheel Vehicle Operation', t: VEH, e: 'mount', p: 'Drive Giant Wheel' },
  ] },
  { id: 'EQP-ART', domain: 'EQP', title: 'Enchanted and Cosmic Artifacts', nodes: [
    { id: 'enchanted-objects', n: 'Enchanted Objects', t: F, e: null, why: 'family heading' },
    { id: 'crowbar-grant', n: 'Enchanted Crowbar Grant', t: GR, e: null, grants: ['strength', 'stamina'], why: 'artifacts grant PACKAGES; no grant layer' },
    { id: 'storm-hammer-grant', n: 'Storm-Hammer Artifact Grant', t: GR, e: null, grants: ['flight', 'energyAbsorption', 'energyProjection'], p: 'Flight, Energy Absorption & Projection via Mjolnir', why: 'grant layer' },
    { id: 'antigrav-metal-grant', n: 'Anti-Gravity Metal Grant', t: GR, e: null, grants: ['flight', 'enhancedEyesight'], p: 'Flight and Enhanced Eyesight via Nth Metal', why: 'grant layer' },
    { id: 'truth-lasso-grant', n: 'Truth-Binding Lasso Grant', t: GR, e: null, grants: ['truthDiscovery'], p: 'Truth-Discovery via Lasso of Truth', why: 'no interrogation mechanic' },
    { id: 'enchanted-gem-grant', n: 'Enchanted-Gem Power Package', t: GR, e: null, grants: ['various'], p: 'Various Powers via Enchanted Gems', why: 'grant layer' },
  ] },
];

export const TAXONOMY = GROUPS.flatMap(g =>
  g.nodes.map(n => ({ ...n, group: g.id, domain: g.domain, groupTitle: g.title })));

export const nodeOf = (id) => TAXONOMY.find(n => n.id === id) || null;
export const nodesFor = (engineType) => TAXONOMY.filter(n => n.e === engineType);
export const domainCounts = () => {
  const out = {};
  for (const n of TAXONOMY) out[n.domain] = (out[n.domain] || 0) + 1;
  return out;
};

// ⚠ REPRODUCE HIS AUDIT, don't trust it. He states 42/20/11/16/8/3/14/9/13/17 = 153; if a later edit
// drops or duplicates a node this is the line that notices.
export const EXPECTED = { PHY: 42, ANM: 20, ENV: 11, ENE: 16, ARC: 8, META: 3, PSI: 14, MAT: 9, SKL: 13, EQP: 17 };
export function verify() {
  const got = domainCounts(), bad = [];
  for (const k of Object.keys(EXPECTED)) if (got[k] !== EXPECTED[k]) bad.push(`${k} ${got[k]} != ${EXPECTED[k]}`);
  const ids = TAXONOMY.map(n => n.id);
  const dupes = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dupes.length) bad.push('duplicate ids: ' + dupes.join(','));
  const badType = TAXONOMY.filter(n => !NODE_TYPES.includes(n.t)).map(n => n.id);
  if (badType.length) bad.push('bad node_type: ' + badType.join(','));
  const gaps = TAXONOMY.filter(n => !n.e && !n.why).map(n => n.id);
  if (gaps.length) bad.push('unmapped with no reason: ' + gaps.join(','));
  return { total: TAXONOMY.length, expected: 153, counts: got, problems: bad };
}

// ⚠ THE COVERAGE QUERY IS THE WHOLE POINT OF THIS BEING A FILE. Pass the roster in (this module must
// not import characters.js — the taxonomy is a classification, not a consumer) and it reports which
// nodes are CARRIED by a live hero, which name an engine type that exists but nobody uses, and which
// name a system that is not built. A Markdown table could state these numbers; only this can be wrong
// in a way that shows up.
export function coverage(roster, deadTypes) {
  const carried = new Set((roster || []).flatMap(d => Object.values(d.abilities || {}).map(a => a.type)));
  const dead = new Set(deadTypes || []);
  const out = { carried: [], implementedUncarried: [], notBuilt: [], families: [] };
  for (const n of TAXONOMY) {
    if (n.t === 'family' && !n.e) { out.families.push(n.id); continue; }
    if (!n.e) out.notBuilt.push(n.id);
    else if (carried.has(n.e)) out.carried.push(n.id);
    else out.implementedUncarried.push(n.id);
  }
  out.deadTypesNamed = [...dead].filter(t => TAXONOMY.some(n => n.e === t));
  out.deadTypesUnnamed = [...dead].filter(t => !TAXONOMY.some(n => n.e === t));
  return out;
}
