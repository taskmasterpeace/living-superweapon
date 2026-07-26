// THE COMIC LAYER — captions, speech balloons and sound effects, anchored to the fight.
//
// Robert: "do the caption layer, obsess over details, and find a comic book font for speech
// bubbles." The fonts were chosen by rendering eleven candidates inside real balloons and judging
// them in context (see styles/comic.css). This file is the other half: the craft of PLACING them.
//
// FOUR THINGS A LETTERER DOES THAT SOFTWARE USUALLY DOESN'T, and all four are here:
//
//   1. BALANCED LINES. A letterer never lets a balloon read "I am going to break every bone / in."
//      They shuffle the break points until the lines are close to equal length and the shape is a
//      pleasing block. `balance()` tries every line count and scores the result.
//   2. THE TAIL POINTS AT THE MOUTH. Not at the feet, not at the middle of the sprite — and it
//      swaps sides so it never crosses the balloon or leaves the screen.
//   3. EMPHASIS INSIDE THE BALLOON. Comics bold the load-bearing word. `*like this*`.
//   4. NOTHING OVERLAPS. Two people talking at once is two balloons stacked, not one on top of
//      the other — the layer keeps a live list and pushes later ones clear.
//
// ⚠ IT NEVER TOUCHES THE SIM. Every element lives in its own fixed layer with pointer-events off,
// it is driven from the HUD's frame, and a caption that throws can never reach the game loop.

const LAYER_ID = 'comicLayer';

// ---------------------------------------------------------------------------------------------
// ⚠ LINE BALANCING IS THE WHOLE DIFFERENCE between "a box with text in it" and lettering. Greedy
// wrapping gives a long first line and a stub last one; a letterer would never ship that. Try every
// plausible line count, lay the words out as evenly as possible for each, and score on how ragged
// the result is — plus a nudge toward fewer lines so short lines don't get split for no reason.
export function balance(text, maxChars = 26) {
  const words = String(text).trim().split(/\s+/);
  if (words.length < 2) return words.join(' ');
  const total = words.join(' ').length;
  const maxLines = Math.min(5, Math.max(1, Math.ceil(total / Math.max(8, maxChars * 0.62))));
  let best = null, bestScore = Infinity;
  for (let n = 1; n <= maxLines; n++) {
    const target = total / n;
    const lines = []; let cur = '';
    for (const w of words) {
      const next = cur ? cur + ' ' + w : w;
      // start a new line once this one has passed its share, unless we'd run out of lines
      if (cur && next.length > target * 1.12 && lines.length < n - 1) { lines.push(cur); cur = w; }
      else cur = next;
    }
    if (cur) lines.push(cur);
    if (lines.length !== n) continue;
    const lens = lines.map(l => l.length);
    const longest = Math.max(...lens);
    if (longest > maxChars && n < maxLines) continue;         // still too wide — try more lines
    const spread = longest - Math.min(...lens);
    const score = spread * 1.6 + longest * 0.35 + n * 1.1;     // ragged is bad, wide is bad, tall is bad
    if (score < bestScore) { bestScore = score; best = lines; }
  }
  return (best || [words.join(' ')]).join('\n');
}

// `*word*` is the letterer's bold; `**word**` is the one they'd also colour.
function markup(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<b class="shoutword">$1</b>')
    .replace(/\*(.+?)\*/g, '<b>$1</b>');
}

export class Comic {
  constructor(game) {
    this.g = game;
    this.items = [];
    this.el = document.getElementById(LAYER_ID) || (() => {
      const d = document.createElement('div'); d.id = LAYER_ID; document.body.appendChild(d); return d;
    })();
  }

  _add(node, life, item) {
    this.el.appendChild(node);
    const it = { node, t: life, life, ...item };
    this.items.push(it);
    return it;
  }

  // ------------------------------------------------------------------------------- BALLOONS
  // `speaker` is a Fighter (anything with `.pos`). Tone: talk · shout · whisper · think · radio.
  say(speaker, text, opts = {}) {
    if (!text) return null;
    const tone = opts.tone || 'talk';
    const node = document.createElement('div');
    node.className = 'cmb' + (tone === 'shout' ? ' shout' : tone === 'whisper' ? ' whisper'
      : tone === 'think' ? ' thought' : tone === 'radio' ? ' radio' : '');
    const body = balance(text, tone === 'whisper' ? 22 : tone === 'shout' ? 18 : 26);
    if (tone === 'shout') {
      node.innerHTML = '<div class="edge"></div><div class="fill"></div><span>' + markup(body) + '</span>';
    } else {
      node.innerHTML = markup(body) + '<div class="tail"><i></i></div>';
    }
    // ⚠ LENGTH DECIDES THE DWELL, not a fixed timer. A three-word bark and a full sentence cannot
    // share a duration or one of them is always wrong. ~13 characters a second, with a floor.
    const life = opts.life || Math.max(1.5, Math.min(6.5, 0.9 + text.length / 13));
    return this._add(node, life, { kind: 'bub', speaker, tone, offY: opts.offY });
  }

  // ------------------------------------------------------------------------------- CAPTIONS
  // The yellow box. `where`: tl · tr · bl · br · top · centre.
  caption(text, opts = {}) {
    const node = document.createElement('div');
    node.className = 'cmcap' + (opts.halftone ? ' halftone' : '') + (opts.red ? ' red' : '')
      + (opts.paper ? ' paper' : '') + (opts.big ? ' big' : '') + (opts.tilt === 'r' ? ' tr' : '');
    let body = markup(balance(text, opts.big ? 22 : 30));
    // the drop cap breaks the top edge of the box, exactly as the reference sheet does it
    if (opts.drop !== false && /^[A-Za-z]/.test(text)) {
      body = body.replace(/^(<[^>]+>)?([A-Za-z])/, (m, tag, ch) => (tag || '') + '<span class="drop">' + ch + '</span>');
    }
    node.innerHTML = body;
    const it = this._add(node, opts.life || 3.4, { kind: 'cap', where: opts.where || 'tl' });
    this._placeCaption(it);
    return it;
  }

  _placeCaption(it) {
    const n = it.node, W = innerWidth, H = innerHeight;
    const S = this._safe();
    const m = 20, bw = n.offsetWidth || 240, bh = n.offsetHeight || 44;
    const pos = {
      tl: [S.x0 + m, S.y0 + m], tr: [S.x1 - bw - m, S.y0 + m],
      bl: [S.x0 + m, S.ly - bh - m], br: [S.x1 - bw - m, S.y1 - bh - m],
      top: [(W - bw) / 2, S.y0 + m], centre: [(W - bw) / 2, (H - bh) / 2],
    }[it.where] || [S.x0 + m, S.y0 + m];
    n.style.left = Math.round(pos[0]) + 'px';
    n.style.top = Math.round(pos[1]) + 'px';
  }

  // ------------------------------------------------------------------------------------ SFX
  // A sound effect at a world point. `power` 0–1 scales it and decides whether it earns a burst.
  sfx(text, pos, opts = {}) {
    const node = document.createElement('div');
    const power = opts.power == null ? 0.6 : opts.power;
    node.className = 'cmsfx' + (power > 0.75 ? ' heavy' : '') + (opts.red ? ' red' : '')
      + (opts.white ? ' white' : '');
    node.style.setProperty('--rot', ((Math.random() * 16 - 8).toFixed(1)) + 'deg');
    // ⚠ 46px BASE WAS A THIRD OF THE SCREEN once a ten-letter word was scaled by power. A sound
    // effect is punctuation on a panel, not the panel — it has to be able to sit BESIDE a balloon.
    node.style.fontSize = Math.round((opts.size || 32) * (0.75 + power * 0.55)) + 'px';
    node.innerHTML = (power > 0.75 ? '<div class="burst"></div>' : '') + markup(String(text).toUpperCase());
    return this._add(node, opts.life || 0.95, { kind: 'sfx', world: pos, drift: 0 });
  }

  // ⚠ THE SAFE AREA. A letterer works inside the panel's margins; balloons that drift under the
  // controls rail or the player panel are unreadable, and no amount of z-index fixes that because
  // the HUD is information the player also needs. These are the rails the HUD actually owns.
  _safe() {
    const W = innerWidth, H = innerHeight;
    const phone = document.body.classList.contains('phone');
    return {
      x0: 10, y0: 10,
      x1: W - (phone ? 10 : 258),        // the controls / kit rail on the right
      y1: H - (phone ? 90 : 118),        // the player panel and mode bar along the bottom
      lx: phone ? 10 : 356,              // the player panel's right edge, bottom-left only
      ly: H - 210,
    };
  }

  // ------------------------------------------------------------------------------------ tick
  update(dt) {
    // ⚠ THE LAYER KEEPS ITS OWN CLOCK. hud.update() takes no dt, and a caption whose dwell depends
    // on the caller remembering to pass one is a caption that outstays its welcome on the first
    // frame somebody forgets. Measure it here and the timing is correct from every call site.
    const now = performance.now();
    if (!(dt > 0)) { dt = Math.min(0.05, (now - (this._last || now)) / 1000); }
    this._last = now;
    const W = this.g.world, sw = innerWidth, sh = innerHeight;
    const live = [];
    // balloons are placed top-down so an earlier one keeps its spot and later ones move clear
    const taken = [];
    for (const it of this.items) {
      it.t -= dt;
      if (it.t <= 0) {
        if (!it._out) { it._out = 1; it.node.classList.add('out'); it.t = 0.2; live.push(it); continue; }
        it.node.remove();
        continue;
      }
      if (it.kind === 'bub' && it.speaker) {
        const f = it.speaker;
        if (!f.alive || !f.pos) { it.t = Math.min(it.t, 0.12); live.push(it); continue; }
        // ⚠ THE TAIL POINTS AT THE MOUTH. Head height is where a voice comes from; anchoring at
        // the feet or the centre is the tell that a machine placed it.
        const head = (f.parts && f.parts.head ? 12.5 : 11) + (it.offY || 0);
        const sp = W.screenPosOf(f.pos.x, f.pos.y + head, f.pos.z);
        if (sp.behind) { it.node.style.opacity = '0'; live.push(it); continue; }
        it.node.style.opacity = '';
        // ⚠ offsetWidth, NOT getBoundingClientRect. The rect reports the TRANSFORMED box, so while
        // the pop animation is scaling a balloon from 0.6 the measurement comes back small — and the
        // clamp that keeps balloons out of the HUD rail then lets an under-measured one straight
        // through it. offsetWidth is the layout size and is immune to the transform.
        const bw = it.node.offsetWidth || 180, bh = it.node.offsetHeight || 48;
        const GAP = 18;
        let x = sp.x - bw / 2, y = sp.y - bh - GAP, up = false;
        if (y < 8) { y = sp.y + GAP; up = true; }                 // no room above — flip under them
        const S = this._safe();
        x = Math.max(S.x0, Math.min(S.x1 - bw, x));
        if (y + bh > S.y1) y = sp.y - bh - GAP;              // keep clear of the bottom furniture
        // and out of the bottom-left player panel specifically
        if (x < S.lx && y + bh > S.ly) y = Math.min(y, S.ly - bh - 6);
        y = Math.max(S.y0, y);
        // don't stack on an earlier balloon
        for (let guard = 0; guard < 6; guard++) {
          const hit = taken.find(t => !(x + bw < t.x || x > t.x + t.w || y + bh < t.y || y > t.y + t.h));
          if (!hit) break;
          y = up ? hit.y + hit.h + 6 : hit.y - bh - 6;
          if (y < 8) { y = sp.y + GAP; up = true; }
        }
        taken.push({ x, y, w: bw, h: bh });
        it.node.style.left = Math.round(x) + 'px';
        it.node.style.top = Math.round(y) + 'px';
        it.node.classList.toggle('up', up);
        // the tail slides along the balloon's edge to stay under the speaker, and never runs off it
        const tail = it.node.querySelector('.tail');
        if (tail) {
          const tx = Math.max(16, Math.min(bw - 26, sp.x - x - 9));
          tail.style.left = Math.round(tx) + 'px';
        }
      } else if (it.kind === 'sfx' && it.world) {
        // ⚠ SFX SHARE THE OCCUPANCY LIST. They were placed independently, so a KRAKA-DOOM landed on
        // top of the balloon of the man it was happening to. A panel never does that.
        const sp = W.screenPosOf(it.world.x, it.world.y + 4, it.world.z);
        if (sp.behind) { it.node.style.opacity = '0'; live.push(it); continue; }
        it.node.style.opacity = '';
        it.drift += dt * 26;                                     // SFX float up as they fade
        const fw = it.node.offsetWidth || 120, fh = it.node.offsetHeight || 40;
        const S = this._safe();
        // ⚠ A REAL PLACEMENT SEARCH, not one nudge downward. Pushing only down walked the word into
        // the next balloon and then the clamp shoved it back on top of the first. Try the natural
        // spot and eight neighbours, score each by how much balloon it covers, and take the best —
        // so a sound effect lands in whatever gap the panel actually has.
        const cx = sp.x - fw / 2, cy = sp.y - fh / 2 - it.drift;
        const cands = [[0, 0], [0, -fh - 10], [0, fh + 10], [-fw * 0.62, 0], [fw * 0.62, 0],
                       [-fw * 0.55, -fh - 8], [fw * 0.55, -fh - 8], [0, -fh * 2 - 16], [0, fh * 2 + 16]];
        let fx = cx, fy = cy, bestCover = Infinity;
        for (const [ox, oy] of cands) {
          const tx = Math.max(S.x0, Math.min(S.x1 - fw, cx + ox));
          const ty = Math.max(S.y0, Math.min(S.y1 - fh, cy + oy));
          let cover = 0;
          for (const t of taken) {
            const w2 = Math.min(tx + fw, t.x + t.w) - Math.max(tx, t.x);
            const h2 = Math.min(ty + fh, t.y + t.h) - Math.max(ty, t.y);
            if (w2 > 0 && h2 > 0) cover += w2 * h2;
          }
          if (cover < bestCover) { bestCover = cover; fx = tx; fy = ty; if (!cover) break; }
        }
        taken.push({ x: fx, y: fy, w: fw, h: fh });
        it.node.style.left = Math.round(fx) + 'px';
        it.node.style.top = Math.round(fy) + 'px';
      }
      live.push(it);
    }
    this.items = live;
  }

  clear() {
    for (const it of this.items) it.node.remove();
    this.items.length = 0;
  }
}
