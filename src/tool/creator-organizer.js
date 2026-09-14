import {rankOf, liftTonsOfRank, designationOf} from '../data/scale.js';

const STORAGE_KEY = 'power-world.creator-review.v1';
const GROUPS = [
  ['Body', 'frame anatomy muscle size bust skin infection metallic shimmer mercenarySeed generateMercenary'],
  ['Hair & face', 'hair hairColor eyeColor eyeGlow expression beard mustache'],
  ['Clothes & colors', 'color secondary trim pattern patternScale uploadPattern patternFile patternStatus coat tornClothes robe sleeves collar cape armor capeStyle centerPanel skirt coatStyle colorRegion regionColor applyRegionColor resetRegionColor patternRegion kilt hoodie businessSuit unlitBlack footwear gloves gloveColor'],
  ['Accessories', 'goldChain shoulders gauntlets knees belt backpack beltStyle wristbands glasses visor eyepatch clawStyle headwear wings shieldStyle claws tentacles wristBlasters lasso handModule'],
  ['Tattoos & emblems', 'emblemColor emblem emblemPlacement uploadEmblem emblemFile tattooRegion uploadTattoo tattooFile clearTattoo tattooStatus emblemScale exampleTattoo pinTattoo clearTattooLayers tattooLayersStatus'],
  ['Auras', 'aura auraState auraOrigin glowRegion glowStrength'],
  ['Animation', 'weapon shield sourceTake hands scrub pause angle'],
  ['Save & export', 'exportRecipe importRecipe recipeFile recipeStatus'],
];
const node = (tag, text, cls) => {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (cls) el.className = cls;
  return el;
};
const fingerprint = recipe => {
  const source = JSON.stringify(recipe);
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
  return `${source.length}:${hash >>> 0}`;
};

/** Move existing controls, retaining their listeners and IDs. Call after FOUNDATION is ready. */
export function organizeCreator({getRecipe, ROSTER}) {
  const aside = document.querySelector('aside');
  if (!aside || aside.dataset.organized) return;
  aside.dataset.organized = 'true';
  const style = node('style');
  style.textContent = `
    aside[data-organized]{font-family:Inter,system-ui,sans-serif;gap:10px}
    .creator-category{border:1px solid oklch(.34 .025 85);border-radius:.625rem;background:oklch(.22 .018 85);flex-shrink:0;overflow:hidden}
    .creator-category summary{cursor:pointer;padding:12px;color:oklch(.85 .1 85);font-weight:600;transition:background .2s}
    .creator-category summary:hover{background:oklch(.29 .025 85)}
    .creator-category[open]>summary{border-bottom:1px solid oklch(.34 .025 85)}
    .creator-category-content{padding:12px;display:flex;flex-direction:column;gap:10px}
    .creator-category label{font-size:12px;gap:6px}.creator-category select{max-width:165px;min-width:0}
    .creator-category input:not([type=checkbox]):not([type=color]):not([type=range]){width:100%;min-width:0;background:oklch(.18 .02 85);color:oklch(.9 .02 85);border:1px solid oklch(.4 .03 85);border-radius:.625rem;padding:8px}
    .creator-category [hidden]{display:none}.creator-review-row{display:grid;grid-template-columns:18px 1fr;gap:6px;align-items:start}
    .creator-review-row input[type=checkbox]{margin-top:10px}.creator-review-row small{grid-column:2;font-size:10px;line-height:1.4}
    .creator-review-row[data-state=needs-review] small{color:oklch(.84 .14 85)}
    .creator-fact{font-size:12px;line-height:1.5;margin:0;overflow-wrap:anywhere}
    .creator-category button{transition:border-color .2s,box-shadow .2s;border-radius:.625rem}.creator-category button:hover{box-shadow:0 2px 10px #0004}
  `;
  document.head.append(style);
  const sections = new Map();
  function section(title, open = true) {
    const details = node('details', undefined, 'creator-category');
    details.open = open;
    details.append(node('summary', title));
    const content = node('div', undefined, 'creator-category-content');
    details.append(content);
    aside.append(details);
    return content;
  }
  const originals = [...aside.children];
  for (const [name] of GROUPS) sections.set(name, section(name));
  const categoryById = new Map(GROUPS.flatMap(([name, ids]) => ids.split(' ').map(id => [id, name])));
  // Capture helper text's preceding category before moving labels out of shared wrappers.
  let previous = 'Body';
  const helpers = [];
  for (const child of originals) {
    const controls = [child, ...child.querySelectorAll('[id], [data-motion]')];
    for (const control of controls) {
      const name = control.hasAttribute('data-motion') ? 'Animation' : categoryById.get(control.id);
      if (name) previous = name;
    }
    if (child.tagName === 'SMALL' && !categoryById.has(child.id)) helpers.push([child, child.querySelector('a') ? 'Save & export' : previous]);
  }
  for (const [id, name] of categoryById) {
    const control = document.getElementById(id);
    if (control && aside.contains(control)) sections.get(name).append(control.closest('label') || control);
  }
  for (const control of aside.querySelectorAll('[data-motion]')) sections.get('Animation').append(control);
  for (const [helper, name] of helpers) sections.get(name).append(helper);
  for (const child of originals) {
    if (child.parentElement !== aside || child.id === 'costume') continue;
    if (child.tagName === 'H2' && child.textContent === 'Character recipe') continue;
    if (['HR', 'H2'].includes(child.tagName) || (!child.children.length && !child.textContent.trim())) child.remove();
    // Future controls remain accessible even if their ID is not in this version's map.
    else sections.get('Save & export').append(child);
  }

  const review = section('Character to-do & approvals', true);
  const facts = section('Power facts · current roster');
  aside.insertBefore(review.parentElement, sections.get('Body').parentElement);
  aside.insertBefore(facts.parentElement, review.parentElement);
  let data = {};
  try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) data = saved; } catch { /* An unavailable store still permits an in-memory review. */ }
  let currentKey, current, lastPrint, timer;
  const persistence = node('small');
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); persistence.textContent = 'Saved on this browser · export for a portable copy.'; }
    catch { persistence.textContent = 'Browser storage unavailable. Export to keep your review.'; }
  }
  function heroFor(recipe) {
    const selected = document.getElementById('costume')?.value || 'base';
    return ROSTER.find(hero => hero.id === recipe.rosterId || selected === `roster-${hero.id}`);
  }
  function renderFacts(hero) {
    facts.replaceChildren();
    if (!hero) { facts.append(node('p', 'Custom recipe — no linked roster power definition. Power values are not inferred from appearance.', 'creator-fact')); return; }
    facts.append(node('strong', `${hero.name} · ${hero.role ?? 'Role unspecified'}`));
    const rank = rankOf(hero);
    facts.append(node('p', `HP ${hero.hp ?? 'unknown'} · Speed ${hero.speed ?? 'unknown'} · Strength ${hero.strength ?? 'unknown'} · Flight tier ${hero.flightTier ?? '3 (engine default)'}`, 'creator-fact'));
    facts.append(node('p', `Rank ${rank} · ${designationOf(rank)} · Lift ${liftTonsOfRank(rank).toLocaleString(undefined, {maximumFractionDigits: 2})} metric tons (current rank model).`, 'creator-fact'));
    facts.append(node('small', 'Authored base values; charge, buffs and combat modifiers can change damage. Missing damage types are unspecified.'));
    for (const [slot, ability] of Object.entries(hero.abilities || {})) {
      const values = [];
      for (const field of ['damage', 'dps', 'dmgMin', 'dmgMax', 'finisher', 'hits', 'range', 'maxLen', 'cost', 'kiPerSec', 'cd', 'heal', 'ratio', 'dur', 'mult']) {
        if (ability[field] !== undefined) values.push(`${field} ${ability[field]}`);
      }
      facts.append(node('p', `${slot.toUpperCase()} · ${ability.name || ability.type} (${ability.type}) — ${values.join(' · ') || 'No numeric damage authored'} · damage type: ${ability.dtype ?? (['beam','lifedrain'].includes(ability.type)?'energy (engine default)':ability.type==='melee'?'physical (engine default)':'unspecified')}`, 'creator-fact'));
    }
  }
  function renderReview() {
    review.replaceChildren(node('strong', current.name));
    review.append(node('small', 'Check to approve. Recipe edits reopen completed approvals for review.'));
    current.tasks.forEach(task => {
      const row = node('div', undefined, 'creator-review-row');
      row.dataset.state = task.state;
      const check = node('input'); check.type = 'checkbox'; check.checked = task.state === 'reviewed'; check.setAttribute('aria-label', `Approve ${task.text}`);
      const input = node('input'); input.type = 'text'; input.value = task.text; input.maxLength = 300; input.setAttribute('aria-label', 'Edit review task');
      const stamp = node('small', `${task.state === 'reviewed' ? 'Approved' : task.state === 'needs-review' ? 'Needs review after edit' : 'To do'} · ${new Date(task.updatedAt).toLocaleString()}`);
      check.addEventListener('change', () => { task.state = check.checked ? 'reviewed' : 'todo'; task.updatedAt = new Date().toISOString(); save(); renderReview(); });
      input.addEventListener('change', () => { task.text = input.value.trim() || task.text; task.state = 'todo'; task.updatedAt = new Date().toISOString(); save(); renderReview(); });
      row.append(check, input, stamp); review.append(row);
    });
    const add = node('button', 'Add task'); add.type = 'button';
    add.addEventListener('click', () => {
      current.tasks.push({text: 'New review task', state: 'todo', updatedAt: new Date().toISOString()}); save(); renderReview();
      const inputs = review.querySelectorAll('input[type=text]'); inputs[inputs.length - 1].focus(); inputs[inputs.length - 1].select();
    });
    const exportButton = node('button', 'Export review JSON'); exportButton.type = 'button';
    exportButton.addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify({version: 1, characterId: currentKey, exportedAt: new Date().toISOString(), ...current}, null, 2)], {type: 'application/json'}));
      const link = node('a'); link.href = url; link.download = `${currentKey.replace(/[^a-z0-9_-]/gi, '-')}-review.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    review.append(add, exportButton, persistence);
  }
  function refresh() {
    const recipe = getRecipe();
    const hero = heroFor(recipe);
    const key = hero?.id || document.getElementById('costume')?.value || recipe.name || 'custom';
    const print = fingerprint(recipe);
    if (key !== currentKey) {
      currentKey = key;
      const defaults = ['Approve tattoos', 'Approve emblem', 'Approve hair and face', 'Approve outfit and colors', 'Approve animation and flight'];
      if (hero?.id === 'bulwark') defaults.push('Proposed, not implemented: Bulwark rush changes');
      if (hero?.id === 'apex') defaults.push('Review existing Consume drain; proposed gaze presentation is not implemented');
      if (hero) defaults.push('Proposed lifting tier changes are not implemented; review current rank model');
      if (!Object.hasOwn(data, key) || !Array.isArray(data[key]?.tasks)) data[key] = {name: hero?.name || recipe.name || key, tasks: defaults.map(text => ({text, state: 'todo', updatedAt: new Date().toISOString()}))};
      current = data[key];
      lastPrint = current.recipeFingerprint || print;
      renderFacts(hero);
    }
    if (print !== lastPrint) {
      for (const task of current.tasks) if (task.state === 'reviewed') { task.state = 'needs-review'; task.updatedAt = new Date().toISOString(); }
      current.recipeChangedAt = new Date().toISOString();
    }
    lastPrint = print; current.recipeFingerprint = print; save(); renderReview();
  }
  function schedule(event) {
    if (review.contains(event.target) || facts.contains(event.target) || event.target.closest('summary')) return;
    clearTimeout(timer); timer = setTimeout(refresh, 180);
  }
  aside.addEventListener('change', schedule);
  aside.addEventListener('click', schedule);
  // Async file handlers update status after applying a recipe or image. Observe those
  // completion signals so a slow image decode cannot leave approvals looking current.
  const statusObserver = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(refresh, 180); });
  for (const id of ['recipeStatus', 'patternStatus', 'tattooStatus', 'tattooLayersStatus']) {
    const status = document.getElementById(id);
    if (status) statusObserver.observe(status, {childList: true, characterData: true, subtree: true});
  }
  refresh();
  return {refresh};
}
