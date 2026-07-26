// THE CODEX + THE DAMAGE CODEX — extracted from hud.js (code review item 4).
//
// Methods of HUD, installed onto HUD.prototype as a mixin; the text is byte-identical to what
// left hud.js. These are the CASE FILE half of the HUD: every line derives from live data —
// the sheet, the Elo book, `resistOf` run over the live roster — so neither screen can drift
// from the engine. That shared property is why they belong together and apart from the rest.

import { CF_BUILD, agoStr, cfAbilityRows, cfCounterNotes, esc, fileDate, fileNoOf, isSynthDef } from './hudUtil.js';
import { ROSTER } from '../data/characters.js';
import { DTYPES, DTYPE_INFO, resistOf } from './entity.js';
import { VIS_MEANING, VIS_SOURCE, VIS_SHAPE, VIS_TRAIL, VIS_IMPACT, VIS_RESIDUE, VIS_MATERIAL, VIS_TELL,
         BEAM_BUILDS, BEAM_TEMPERS, BUILD_MEANING, TEMPER_MEANING, visOf, beamBuildOf, beamTemperOf } from '../data/visual.js';
import { POWERS as CATALOG_POWERS } from '../data/creator.js';
import { FIREARMS, BLADES, GEAR } from '../data/armory.js';
import { ATTR_DEFS, TALENTS, bakeSheet, deriveAttrs, heroTalents, rankColor, rankName } from '../data/ranks.js';
import { identityOf } from '../data/identities.js';
import { causeLine, mulberry } from '../data/news.js';
import { championId, injuryOf, recOf, recentIncidents, snapshotTable } from '../data/rankings.js';

import { heroStats } from './hud.js';
import { THREAT_COLORS, recoveryTier } from './hud.js';
import { degreeLine } from '../data/education.js';
import { rankOf, rankBandOf, comparisonOf, csOf, liftTonsOfRank, liftWords, knockbackOf, LB_PER_TON } from '../data/scale.js';
export const CodexMixin = {
  showCodex(def) {
    const render = (c) => {
      const idn = identityOf(c), st = heroStats(c), synth = isSynthDef(c);
      const fno = fileNoOf(c, ROSTER), rec = recOf(c.id, c);
      const snapAll = snapshotTable(ROSTER), me = snapAll.find(r => r.id === c.id) || { rank: '—' };
      const incid = recentIncidents(c.id, ROSTER);
      const champ = championId() === c.id;
      const tc = THREAT_COLORS[c.threat] || 'var(--text-4)';
      const rows = cfAbilityRows(c);
      const counters = cfCounterNotes(c);
      const ai = c.ai || {};
      const at = deriveAttrs(c), tl = heroTalents(c);
      // ⚠ the SHEET argument is load-bearing: magic resistance derives from RESOLVE, so calling
      // resistOf(def) alone hands back the res-6 default for everyone and the chips show a flat
      // 1.03 across the whole roster — the codex would be hiding the rule it exists to display.
      const rez = resistOf(c, bakeSheet(c));
      let h = 0; for (const ch of String(c.id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const rng = mulberry(h);
      const domKind = Object.values(c.abilities || {}).some(a => a.type === 'beam') ? 'beam'
        : (c.strength ?? 5) >= 7 ? 'fists'
        : Object.values(c.abilities || {}).some(a => a.dmgClass === 'slash') ? 'blade' : 'blast';
      const vp = c.voicePitch || 1;
      const ft = c.flightTier ?? 3;
      // THE RANK LADDER — the designation is a legal classification, so the case file states it
      // twice: once as physical capability (§ DERIVED) and once as containment posture (§02).
      const rk = rankOf(c), rkb = rankBandOf(rk), rkt = liftTonsOfRank(rk), rkk = knockbackOf(rk);
      const ev = c.evade || {};
      const red = (w) => `<span class="redact">${'█'.repeat(w)}</span>`;
      this.codexEl.innerHTML = `<div class="cfbox" style="--cfa:${esc(c.colors.accent)}">
        <div class="cftop">
          <span class="clschip">TOP SECRET // THRESHOLD</span>
          <span class="cft">CASE FILE ${esc(fno)} · ASCENDANT REGISTRY · COSMIC-EYES ONLY</span>
          <div class="cfnav"><span id="cfPrev" title="Previous file (←)">‹</span><span id="cfNext" title="Next file (→)">›</span><span id="cfClose" title="Close (ESC)">✕</span></div>
        </div>
        <div class="cfhead">
          <div class="cfportrait">${esc(c.name[0])}</div>
          <div class="cfid">
            <div class="cfalias">${esc(c.name)}${champ ? ' 🏆' : ''}</div>
            <div class="cfrole">${esc(c.title || '')} · ${esc(c.role || '')}</div>
            <div class="cfhome"><span class="cfflag">${idn.f}</span><b>${esc(idn.n)}</b><i>${esc(idn.c)}${idn.co ? ' · ' + esc(idn.co) : ''}</i></div>
            <div class="cfmeta">FILE OPENED ${fileDate(c.id)} · LAST REVIEWED TODAY · HANDLER: ${red(9)}</div>
          </div>
          <div class="cfstamp">LEFEVRE<br/>${esc((c.threat || 'UNRATED').toUpperCase())}<small>THRESHOLD TREATY ASSESSMENT</small></div>
        </div>
        <div class="cfbody">
        <div class="cfrail">
          <div class="cfsec">
            <div class="cfsh">§01 · IDENTIFICATION</div>
            <div class="cfrow"><span class="k">LEGAL NAME</span><span class="v">${esc(idn.n)}</span></div>
            <div class="cfrow"><span class="k">REGISTERED</span><span class="v">${esc(idn.c)}</span></div>
            <div class="cfrow"><span class="k">NATION</span><span class="v">${esc(idn.co)} ${idn.f}</span></div>
            <div class="cfrow"><span class="k">STATUS</span><span class="v ${synth ? 'syn' : 'ok'}">● ${synth ? 'OPERATIONAL — SYNTHETIC' : 'ACTIVE IN THE FIELD'}</span></div>
            <div class="cfrow"><span class="k">RESIDENCE</span><span class="v">${red(14)}</span></div>
            <div class="cfrow"><span class="k">FRAME</span><span class="v">${CF_BUILD[c.strength ?? 5]} · 1.80m REF</span></div>
            <div class="cfrow"><span class="k">VOICE</span><span class="v">${vp < 0.85 ? 'LOW REGISTER' : vp > 1.1 ? 'HIGH REGISTER' : 'MID REGISTER'}</span></div>
          </div>
          <div class="cfsec">
            <div class="cfsh">ATTRIBUTES — THE LADDER</div>
            ${ATTR_DEFS.map(a => { const v = at[a.k]; return `<div class="atline" title="${esc(a.d || a.name)}"><span class="atn">${esc(a.name.toUpperCase())}</span><span class="atr" style="color:${rankColor(v)}">${esc(rankName(v).toUpperCase())}</span><span class="atb"><i style="width:${v * 10}%;background:${rankColor(v)}"></i></span><b class="atv">${v}</b></div>`; }).join('')}
          </div>
          <div class="cfsec">
            <div class="cfsh">DERIVED</div>
            <div class="cfrow"><span class="k">HULL</span><span class="v">${c.hp} HP · GUARD ${(c.guardType || 'BLOCK').toUpperCase()}</span></div>
            ${degreeLine(c) ? `<div class="cfrow"><span class="k">EDUCATION</span><span class="v">${esc(degreeLine(c))}</span></div>` : ''}
            <div class="cfrow"><span class="k">POWER CORE</span><span class="v ${c.energyInfinite ? 'syn' : ''}">${c.energyInfinite ? '∞ CORE — TIER-CAPPED II' : `RESERVE ${c.ki} · ${recoveryTier(c)} RECOVERY`}</span></div>
            <div class="cfrow"><span class="k">STRENGTH RANK</span><span class="v hot">${rk} · ${esc(rkb.name.toUpperCase())}${rkb.cs ? ' · ' + rkb.cs + 'CS' : ''}</span></div>
            <div class="cfrow"><span class="k">LIFT</span><span class="v">${esc(liftWords(rk).toUpperCase())} · ${esc(comparisonOf(rk).toUpperCase())}</span></div>
            <div class="cfrow"><span class="k">MIGHT</span><span class="v">${(c.meleeTiers ?? 3) >= 3 ? 'FULL STRIKE CHAIN' : 'HEAVY HANDS'} · KNOCKBACK ${rkk.spaces} SPACES${rkk.throughWall ? ' · THROUGH THE WALL' : ''}</span></div>
            <div class="cfrow"><span class="k">FLIGHT</span><span class="v">${['GROUNDED', 'CLASS I — UNSTABLE', 'CLASS II — LEVITATOR', 'CLASS III — FULL FLIGHT'][ft]}</span></div>
            <div class="cfrow"><span class="k">ESCAPE</span><span class="v">${(ev.name || ev.kind || 'DASH').toUpperCase()}</span></div>
          </div>
          <div class="cfsec">
            <div class="cfsh">DEFENSES — TYPED RESISTANCE</div>
            <div class="cfres">${DTYPES.map(dt => { const rz = rez[dt] ?? 1; if (rz === 1) return ''; const info = DTYPE_INFO[dt] || {}; const cls = rz === 0 ? 'imm' : rz < 1 ? 'res' : 'weak'; return `<span class="rchip ${cls}" title="${esc(info.note || dt)}">${esc(info.label || dt.toUpperCase())} ${rz === 0 ? 'IMMUNE' : '×' + (Math.round(rz * 100) / 100)}</span>`; }).filter(Boolean).join('') || '<span class="rchip">STANDARD PROFILE — NO NOTED RESISTANCES</span>'}</div>
          </div>
          ${tl.length ? `<div class="cfsec"><div class="cfsh">TALENTS</div>${tl.map(k => TALENTS[k] ? `<div class="cfrow"><span class="k">◆</span><span class="v">${esc(TALENTS[k].name.toUpperCase())} — ${esc(TALENTS[k].d || '')}</span></div>` : '').join('')}</div>` : ''}
          ${(c.items || []).length ? `<div class="cfsec"><div class="cfsh">CARRIED GEAR</div>${c.items.map(i => `<div class="cfrow"><span class="k">■</span><span class="v">${esc(i.name.toUpperCase())}${i.charges ? ' ×' + i.charges : ''}</span></div>`).join('')}</div>` : ''}
        </div>
        <div class="cfmain">
          <div class="cftabs" role="tablist">
            <button class="cftab on" role="tab" data-pane="threat"   aria-selected="true">THREAT</button>
            <button class="cftab"    role="tab" data-pane="armament" aria-selected="false">ARMAMENT</button>
            <button class="cftab"    role="tab" data-pane="record"   aria-selected="false">RECORD</button>
            <button class="cftab"    role="tab" data-pane="doctrine" aria-selected="false">DOCTRINE</button>
          </div>
          <div class="cfpane on" data-pane="threat">
          <div class="cfcols">
          <div class="cfsec">
            <div class="cfsh">§02 · THREAT ASSESSMENT</div>
            <div class="cfrow"><span class="k">LEFEVRE CLASS</span><span class="v" style="color:${tc};font-weight:700">${esc(c.threat || 'UNRATED')}</span></div>
            <div class="cfrow"><span class="k">DESIGNATION</span><span class="v" style="font-weight:700">${esc(rkb.name.toUpperCase())} — RANK ${rk}</span></div>
            ${rkb.threat ? `<div class="cfrow"><span class="k">CONTAINMENT</span><span class="v hot" style="font-weight:700">${esc(rkb.threat)}</span></div>` : ''}
            <div class="cfrow"><span class="k">BASIS</span><span class="v">OUTPUT ${st.power}/10 · REACH ${st.range}/10 · MOBILITY ${st.mobility}/10 · RESILIENCE ${st.defense}/10</span></div>
            <div class="cfrow"><span class="k">FLIGHT CERT</span><span class="v">${['GROUNDED — LEAP ONLY', 'CLASS I — UNSTABLE', 'CLASS II — LEVITATOR', 'CLASS III — FULL FLIGHT'][ft]}${c.flySpeed ? ` · AIRSPEED ×${c.flySpeed}` : ''}</span></div>
          </div>
          </div>
          <div class="cfsec wide">
            <div class="cfsh">§06 · IF ENCOUNTERED — COUNTERMEASURE BRIEF</div>
            <div class="cfcounter">${counters.map(([k2, t]) => `<div class="cn"><i>[${esc(k2)}]</i><span>${esc(t)}</span></div>`).join('')}</div>
          </div>
          </div>

          <div class="cfpane" data-pane="record">
          <div class="cfsec">
            <div class="cfsh">§03 · SANCTIONED RECORD</div>
            <div class="cfrow"><span class="k">POWER INDEX</span><span class="v hot">${rec.elo} · RANK #${me.rank}/${snapAll.length}${champ ? ' · REIGNING CHAMPION' : ''}</span></div>
            <div class="cfrow"><span class="k">BOUT RECORD</span><span class="v">${rec.w}–${rec.l}${rec.w + rec.l ? '' : ' (UNTESTED)'} · ${rec.ko} KO / ${rec.kod} CONCEDED</span></div>
            ${(() => { const inj = injuryOf(c.id); return inj ? `<div class="cfrow"><span class="k">§ MEDICAL</span><span class="v" style="color:var(--danger-2)">CARRYING ${esc(inj.name).toUpperCase()} — CLEARS IN ${inj.bouts} SANCTIONED BOUT${inj.bouts > 1 ? 'S' : ''} · −5% CERTIFIED OUTPUT</span></div>` : '<div class="cfrow"><span class="k">§ MEDICAL</span><span class="v">FIT TO FIGHT — NO ACTIVE INJURIES</span></div>'; })()}
            ${incid.length ? incid.map(x => `<div class="cfrow"><span class="k">${x.win ? '▲ VICTORY' : '▼ DEFEAT'}</span><span class="v" style="color:${x.win ? 'var(--good)' : 'var(--danger-2)'}">${x.win ? 'def.' : 'lost to'} ${esc(x.vs)} · ${x.how === 'tournament' ? 'INVITATIONAL' : x.how.toUpperCase()} · ${agoStr(x.t)}</span></div>`).join('') : '<div class="cfrow"><span class="k">HISTORY</span><span class="v">NO SANCTIONED BOUTS ON RECORD</span></div>'}
          </div>
          </div>

          <div class="cfpane" data-pane="doctrine">
          <div class="cfsec">
            <div class="cfsh">§04 · BEHAVIORAL DOCTRINE</div>
            <div class="cfrow"><span class="k">DOCTRINE</span><span class="v hot">${(ai.style || 'BRAWLER').toUpperCase()}</span></div>
            <div class="cfrow"><span class="k">BAND · AGGRO · AIR</span><span class="v">~${ai.range || 30}u · ${Math.round((ai.aggro ?? 0.6) * 100)}% · ${Math.round((ai.fly ?? 0.3) * 100)}%</span></div>
            ${[c.thorns && 'THORNED — PUNISHES GRABS', c.phase && 'INTANGIBILITY CAPABLE', c.grabHeal && 'ABSORBS ON GRAB', c.teleEscape && 'TELEPORT ESCAPE ARTIST', c.metal && 'ARMORED CHASSIS', c.frostResist && 'COLD-HARDENED', (c.beamMight || 1) >= 1.2 && 'CERTIFIED BEAM MASTER'].filter(Boolean).map(t => `<div class="cfrow"><span class="k">FLAG</span><span class="v hot">${t}</span></div>`).join('')}
          </div>
          <div class="cfsec wide">
            <div class="cfsh">§07 · FIELD INTERCEPT</div>
            <div class="cfquote">“Subject was last observed delivering ${esc(causeLine(rng, domKind))}.”<b>— WITNESS DEPOSITION · INCIDENT FILE ${red(6)} · TRANSCRIBED BY THE ${esc(idn.co.toUpperCase())} DESK</b></div>
          </div>
          </div>

          <div class="cfpane" data-pane="armament">
          <div class="cfsec wide">
            <div class="cfsh">§05 · DOCUMENTED ARMAMENT — VERIFIED FIGURES</div>
            <div class="cfarmwrap"><table class="cfarm"><tr><th>SLOT</th><th>DESIGNATION</th><th>CLASS</th><th>OUTPUT</th><th>KI</th><th>CYCLE</th><th>REACH</th><th>NOTES</th></tr>
            ${rows.map(r => `<tr class="${r.ult ? 'ult' : ''}"><td class="sl2">${esc(r.slot)}</td><td class="an3">${esc(r.name)}</td><td>${esc(r.kind)}</td><td class="dm">${esc(r.dmg)}</td><td>${esc(r.cost)}</td><td>${esc(r.cd)}</td><td>${esc(r.reach)}</td><td>${esc(r.notes)}</td></tr>`).join('')}
            </table></div>
          </div>
          </div>
        </div>
        </div>
        <div class="cffoot"><span>THRESHOLD TREATY OFFICE · INDEX COPY 7 OF 9</span><span>PAGE 1 OF 1 · FILE ${esc(fno)}</span></div>
      </div>`;
      // THE TABS. ⚠ The active pane is remembered on the HUD, not on the render, so paging through
      // the roster with ‹ › keeps you on the tab you were reading — flicking between two fighters'
      // armament tables is the whole reason to have tabs, and resetting to the first pane on every
      // page would make that comparison impossible.
      const panes = [...this.codexEl.querySelectorAll('.cfpane')];
      const tabs = [...this.codexEl.querySelectorAll('.cftab')];
      const show = (id) => {
        this._cfTab = id;
        for (const t of tabs) { const on = t.dataset.pane === id; t.classList.toggle('on', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); }
        for (const q of panes) q.classList.toggle('on', q.dataset.pane === id);
      };
      for (const t of tabs) t.onclick = () => show(t.dataset.pane);
      show(tabs.some(t => t.dataset.pane === this._cfTab) ? this._cfTab : 'threat');
      const nav = (d) => { const i = ROSTER.indexOf(c); render(ROSTER[(i + d + ROSTER.length) % ROSTER.length]); };
      this.codexEl.querySelector('#cfPrev').onclick = () => nav(-1);
      this.codexEl.querySelector('#cfNext').onclick = () => nav(1);
      this.codexEl.querySelector('#cfClose').onclick = () => { this.codexEl.style.display = 'none'; };
      const dn = this.codexEl.querySelector('#cfDone'); if (dn) dn.onclick = () => { this.codexEl.style.display = 'none'; };
      this.codexEl.scrollTop = 0;
    };
    render(def);
    this.codexEl.style.display = 'flex';
  },

  // ==============================================================================================
  // THE VISUAL LANGUAGE — Robert: "I want to understand the language of all of our attack types...
  // I feel like the codex that we have is not well designed, where you can see the characters and
  // where you can see the — I don't even know what the categories are."
  //
  // So this screen leads with THE CATEGORIES, names them, says what each one is FOR, and then
  // shows every character's kit written in them. Every value is resolved by the same `visOf` the
  // renderer calls, so the page cannot describe an effect the game does not draw.
  showVisual() {
    const el = this.visualEl;
    const R = ROSTER;
    const AXES = [
      ['SOURCE', VIS_SOURCE, VIS_MEANING.source], ['SHAPE', VIS_SHAPE, VIS_MEANING.shape],
      ['TRAIL', VIS_TRAIL, VIS_MEANING.trail], ['IMPACT', VIS_IMPACT, VIS_MEANING.impact],
      ['RESIDUE', VIS_RESIDUE, VIS_MEANING.residue], ['MATERIAL', VIS_MATERIAL, VIS_MEANING.material],
      ['TELL', VIS_TELL, VIS_MEANING.tell],
    ];
    // how often each value actually occurs — a vocabulary word nothing uses is a gap, and the
    // screen should say so rather than list it as if the game were full of them
    const count = {};
    const kits = [];
    for (const d of R) {
      const rows = [];
      for (const [slot, a] of Object.entries(d.abilities || {})) {
        const v = visOf(a); if (!v) continue;
        for (const k of ['source', 'shape', 'trail', 'impact', 'residue', 'material', 'tell']) {
          count[k] = count[k] || {}; count[k][v[k]] = (count[k][v[k]] || 0) + 1;
        }
        rows.push({ slot, a, v });
      }
      kits.push({ d, rows });
    }
    const axisBlock = AXES.map(([name, vocab, why]) => {
      const key = name.toLowerCase();
      const chips = vocab.map(w => {
        const n = (count[key] || {})[w] || 0;
        return `<span class="vlchip${n ? '' : ' vlz'}">${esc(w)}${n ? `<i>${n}</i>` : ''}</span>`;
      }).join('');
      return `<div class="vlaxis"><div class="vlname">${name}</div>
        <div class="vlwhy">${esc(why)}</div><div class="vlchips">${chips}</div></div>`;
    }).join('');

    const beamBlock = `<div class="vlaxis"><div class="vlname">BEAM · BUILD</div>
        <div class="vlwhy">how much of it there is — from the radius the weapon already declares</div>
        <div class="vlchips">${BEAM_BUILDS.map(x => `<span class="vlchip">${x}<i>${R.reduce((n, d) => n + Object.values(d.abilities || {}).filter(a => a.type === 'beam' && beamBuildOf(a) === x).length, 0)}</i></span>`).join('')}</div>
        ${BEAM_BUILDS.map(x => `<div class="vlmean"><b>${x}</b>${esc(BUILD_MEANING[x])}</div>`).join('')}</div>
      <div class="vlaxis"><div class="vlname">BEAM · TEMPER</div>
        <div class="vlwhy">what it is doing inside that build — from what it is made of</div>
        <div class="vlchips">${BEAM_TEMPERS.map(x => `<span class="vlchip">${x}<i>${R.reduce((n, d) => n + Object.values(d.abilities || {}).filter(a => a.type === 'beam' && beamTemperOf(a) === x).length, 0)}</i></span>`).join('')}</div>
        ${BEAM_TEMPERS.map(x => `<div class="vlmean"><b>${x}</b>${esc(TEMPER_MEANING[x])}</div>`).join('')}</div>`;

    const kitBlock = kits.map(({ d, rows }) => `<div class="vlhero">
      <div class="vlh"><i style="background:${d.colors.accent}"></i>${esc(d.name)}
        <span>${rows.length} in the kit</span></div>
      <div class="vltab">${rows.map(r => `<div class="vlrow">
        <b>${esc(r.slot.toUpperCase())}</b>
        <span class="vlab">${esc(r.a.name)}</span>
        <span class="vlt">${esc(r.v.material)}</span>
        <span class="vlt">${esc(r.v.shape)}</span>
        <span class="vlt">${esc(r.v.source)}</span>
        <span class="vlt">${esc(r.v.trail)}</span>
        <span class="vlt">${esc(r.v.impact)}</span>
        <span class="vlt${r.v.tell === 'none' ? ' vlz' : ''}">${esc(r.v.tell)}</span>
        ${r.v.build ? `<span class="vlt vlbeam">${esc(r.v.build)} ${esc(r.v.temper)}</span>` : ''}
      </div>`).join('')}</div></div>`).join('');

    // ---- WHAT NOBODY CARRIES. He asked for this directly: "we have a lot of powers and a lot of
    // items that don't have a character assigned to them — I wanna know that as well."
    const heroNames = new Set(), heroTypes = new Set();
    for (const d of R) for (const a of Object.values(d.abilities || {})) { heroNames.add(a.name); heroTypes.add(a.type); }
    const catOrphan = CATALOG_POWERS.filter(p => p.ab && p.ab.name && !heroNames.has(p.ab.name));
    const typeOrphan = [...new Set(CATALOG_POWERS.map(p => p.ab && p.ab.type).filter(t => t && !heroTypes.has(t)))];
    const arm = [...(FIREARMS || []), ...(BLADES || []), ...(GEAR || [])];
    const armOrphan = arm.filter(x => !heroNames.has(x.n || x.name));
    const gapBlock = `<div class="dgsec">WHAT NOBODY CARRIES</div>
      <div class="dgsub">Everything below is built, tested and reachable — and no fighter on the
      roster uses it. This list is generated, so it shrinks the moment somebody picks something up.</div>
      <div class="vlgap"><b>${catOrphan.length}</b> of ${CATALOG_POWERS.length} ORIGIN catalog powers are carried by no roster hero</div>
      <div class="vlgap"><b>${armOrphan.length}</b> of ${arm.length} armory weapons and items are carried by no roster hero</div>
      <div class="vlgap"><b>${typeOrphan.length}</b> ability TYPES the engine fully implements that no hero uses:
        <span class="vlz2">${esc(typeOrphan.join(' · '))}</span></div>`;

    el.innerHTML = `<div class="obox dgbox">
      <div class="oh">The Visual Language</div>
      <div class="dgsub">Every attack in the game resolves the same set of traits, and the renderer
        reads exactly these. The categories are below; under them is every fighter's kit written in
        them, so two powers that look alike will say so.</div>
      <div class="dgsec">THE CATEGORIES</div>
      ${axisBlock}
      <div class="dgsec">BEAMS GET TWO MORE</div>
      <div class="dgsub">A beam is an outer <b>sheath</b> around a brighter inner <b>core</b> — that
        part was always true. What it did not have was a form: 25 beams and only VEGA's helix. Two
        axes now multiply into the variety, rather than one list of hand-picked shapes.</div>
      ${beamBlock}
      ${gapBlock}
      <div class="dgsec">EVERY KIT, IN THE LANGUAGE</div>
      <div class="vlkey"><b>slot</b><span>name</span><span>material</span><span>shape</span><span>source</span><span>trail</span><span>impact</span><span>tell</span></div>
      ${kitBlock}
      <button class="ok" id="vlClose">Close</button></div>`;
    el.style.display = 'block';
    el.querySelector('#vlClose').onclick = () => { el.style.display = 'none'; };
  },

  showDamage() {
    const el = this.damageEl;
    const R = ROSTER;
    // who resists / is weak to each type — computed from the same function combat uses, WITH the
    // same second argument the Fighter ctor passes. Without the sheet every hero reports the
    // res-6 default for magic and the MAGIC row comes out empty — see the note in showCodex.
    const tables = R.map(d => ({ d, r: resistOf(d, bakeSheet(d)) }));
    const nameOf = (x) => x.d.name;
    const rows = DTYPES.map(t => {
      const info = DTYPE_INFO[t];
      const immune = tables.filter(x => x.r[t] === 0).map(nameOf);
      const resists = tables.filter(x => x.r[t] > 0 && x.r[t] < 0.9).map(nameOf);
      const weak = tables.filter(x => x.r[t] > 1.05).map(nameOf);
      const cap = (a, n = 6) => a.length > n ? a.slice(0, n).join(' · ') + ` +${a.length - n}` : (a.join(' · ') || '—');
      return `<div class="dgrow">
        <div class="dgtag" style="--dc:${info.c}">${info.label}</div>
        <div class="dgbody">
          <div class="dgnote">${esc(info.note)}</div>
          <div class="dgline"><b>IMMUNE</b><span>${esc(cap(immune))}</span></div>
          <div class="dgline"><b>RESISTS</b><span>${esc(cap(resists))}</span></div>
          <div class="dgline dgw"><b>WEAK</b><span>${esc(cap(weak))}</span></div>
        </div></div>`;
    }).join('');
    el.innerHTML = `<div class="obox dgbox">
      <div class="oh">Damage Codex</div>
      <div class="dgsub">Every hit in the game carries a TYPE. Every fighter carries resistances to those types.
        This table is generated from the live combat tables — it is always what the engine is actually doing.</div>
      ${rows}
      <div class="dgsec">THE ORDER OF OPERATIONS</div>
      <div class="dgsub">Damage is filtered in this order — anything that stops it here never reaches health:
        <b>armour</b> (bullets only) → <b>toughness</b> (Strength) → <b>type resistance</b> →
        <b>shield pack</b> → <b>phase</b> → <b>guard</b> → health.</div>
      <div class="dgsec">READING A FIGHT</div>
      <div class="dgsub"><b>IMMUNE</b> means exactly that — a machine cannot be poisoned, and the number will say so.
        <b>ACID</b> is the answer to armour: it corrodes plate for five seconds, and a chassis that was
        shrugging off bullets starts taking them. Against bare flesh it is the wrong tool.</div>
      <div class="dgsec">THE WOUND LANGUAGE</div>
      <div class="dgsub"><b>BLEEDING</b> — heavy physical trauma and every slash-class weapon can open a wound.
        The wound ticks while you MOVE and tears wide open at a sprint; stand still ~4 seconds and it clots
        shut on its own. Machines and energy bodies cannot bleed. The tell is red drips falling straight
        DOWN, a darkening patch on the suit, and a trail on the ground behind a runner — downward red
        belongs to bleeding alone: drain pulls inward, poison blooms green, fire flickers up.</div>
      <div class="dgsub"><b>SLEEP</b> — a tranquilizer payload (arrows, darts). The victim folds SLOWLY to the
        ground, uncontrolled, and wakes INSTANTLY on any damage — one wake rule, no exceptions. Machines
        don't sleep. The tell is three rounded pale-gold dots drifting slowly overhead and soft slow rings —
        rounded and gentle where stun's stars are sharp and fast. Three seconds of immunity after waking.</div>
      <div class="dgsub"><b>BLIND</b> — dense oily smoke that owns the eyes. Inside the cloud a fighter gains
        no new sight: bots hunt what they BELIEVE (and believe wrongly), your target lock breaks, the aim
        magnet lets go, and your own fog of war closes in. The tell is the blocked-eye mark at the brow.
        Step out and your eyes clear in about half a second.</div>
      <button class="odone oghost">Close</button>
    </div>`;
    el.querySelector('.oghost').onclick = () => { el.style.display = 'none'; };
    el.style.display = 'flex';
  },
};




