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

import { SHAPES, buildShape, tailPath, TONES } from './balloon.js';
import {Matrix4,Vector3} from 'three';

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

// ---------------------------------------------------------------------------------------------
// THE CONVENTIONS OF COMIC LETTERING, which are not the conventions of typesetting. Sources:
// Blambot's "Comic Book Grammar & Tradition", and the lettering guides at comicory / comicpad.
//
//   · EMPHASIS IS BOLD ITALIC, not bold. Plain bold is a typesetting habit; a letterer leans the
//     stressed word as well as thickening it, and that is why comic emphasis reads as a VOICE
//     raising rather than a heading.
//   · IT IS SURGICAL. "Bold every other word looks panicked; bold one word every couple of panels
//     lands the emphasis." So `*` is deliberate and there is no auto-bolding anywhere in here.
//   · THE CROSSBAR I. The letter I is drawn with serifs top and bottom ONLY for the personal
//     pronoun — never inside a word. It is the single most recognisable rule in the craft and the
//     fastest way to spot lettering done by someone who did not look it up. Our font has one glyph
//     for I, so the bars are drawn: a span with two rules, sized off the current font.
//   · DOUBLE DASHES replace em dashes.
//   · ELECTRONIC SPEECH IS ITALICISED inside the balloon (handled in the CSS, per tone).
function markup(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<b class="shoutword">$1</b>')
    .replace(/\*(.+?)\*/g, '<b>$1</b>')
    .replace(/\u2014/g, '--')                                   // em dash -> the letterer's double dash
    // the crossbar I: standalone pronoun only, and not inside a tag we just wrote
    // \u26a0 EITHER CASE. Balloons are text-transformed to caps, so a script written in ordinary
    // sentence case ("i can't hold it") still renders an uppercase pronoun \u2014 and it must get its
    // crossbars like any other. Matching only `I` in the source silently skipped half of them.
    .replace(/(^|[\s(\u201c"'>])[Ii](?=$|[\s.,!?;:)\u201d"'<])/g, '$1<span class="crossI">I</span>');
}

export class Comic {
  constructor(game) {
    this.g = game;
    this.items = [];
    this._point = new Vector3();
    this._viewMatrix = new Matrix4();
    this._clipCorners = Array.from({length:8},()=>new Vector3());
    this._bodyMeshes = new WeakMap();
    this.el = document.getElementById(LAYER_ID) || (() => {
      const d = document.createElement('div'); d.id = LAYER_ID; document.body.appendChild(d); return d;
    })();
  }

  _add(node, life, item) {
    // ⚠ EDGE CASE — A CROWD ALL TALKING. Six fighters barking every second is a screen of paper.
    // Oldest balloons are retired so the layer degrades gracefully instead of piling up.
    if (item && item.kind === 'bub') {
      const bubs = this.items.filter(i => i.kind === 'bub' && !i._out);
      const MAX = document.body.classList.contains('phone') ? 2 : 4;
      for (let i = 0; i <= bubs.length - MAX; i++) { bubs[i].t = Math.min(bubs[i].t, 0.12); }
    }
    if (node.parentNode !== this.el) this.el.appendChild(node);
    const it = { node, t: life, life, ...item };
    this.items.push(it);
    return it;
  }

  // ------------------------------------------------------------------------------- BALLOONS
  // ⚠ MEASURE THE WORDS, THEN BUILD THE SHAPE AROUND THEM. The first version drew balloons with
  // clip-path and border-radius, which CUT the box the text is laid out in — so the words could
  // only ever be clipped by a spike or spill past a curve, and no amount of padding could fix it
  // because the shape had no idea how big the text was. Now the text is measured first, an SVG
  // path is generated to contain it (see balloon.js for the per-shape inflation), and the words sit
  // dead centre where they are mathematically incapable of touching the outline.
  //
  // Tones: talk · yell · whisper · think · robot · alien.
  say(speaker, text, opts = {}) {
    if (!text) return null;
    let tone = String(opts.tone || 'talk').toLowerCase();
    if (tone === 'shout') tone = 'yell';                 // old names, kept working
    if (tone === 'radio') tone = 'robot';
    if (tone === 'thought') tone = 'think';
    if (!TONES.includes(tone)) tone = 'talk';
    // ⚠ EDGE CASE — A WALL OF TEXT. A balloon is not a subtitle track: past this it is cropped with
    // an ellipsis, because a 400-word balloon cannot be made to work, only made smaller.
    text = String(text).trim();
    if (!text) return null;
    if (text.length > 180) text = text.slice(0, 177).replace(/\s+\S*$/, '') + '…';

    // Field combat needs the firing corridor clear. Keep the same admitted
    // dialogue and lifetime, but identify the speaker in the HUD, not a tail
    // crossing the beam. City comic lettering deliberately retains its style.
    if (this.g.modeId === 'powerworld') {
      for (const it of this.items.filter(it => it.kind === 'field')) it.node.remove();
      this.items = this.items.filter(it => it.kind !== 'field');
      const node = document.createElement('div'); node.className = 'cmfield';
      const name = document.createElement('div'); name.className = 'cmfield-speaker';
      name.textContent = speaker?.name || speaker?.def?.name || 'FIELD COMMS';
      const line = document.createElement('div'); line.className = 'cmfield-text';
      line.textContent = text.replace(/\*+/g, '');
      node.appendChild(name); node.appendChild(line);
      node.style.visibility = 'hidden';
      return this._add(node, opts.life || Math.max(1.5, Math.min(6.5, 0.9 + text.length / 13)),
        {kind:'field', speaker, tone});
    }

    const node = document.createElement('div');
    node.className = 'cmb t-' + tone;

    const span = document.createElement('div');
    span.className = 'cmtext';
    span.innerHTML = markup(balance(text, tone === 'yell' ? 16 : tone === 'whisper' ? 20 : 22));
    node.appendChild(span);
    if (opts.inverted) node.classList.add('inv');
    this.el.appendChild(node);                            // must be in the DOM to be measured

    // 1 — MEASURE. offsetWidth is the layout size and is immune to the pop transform.
    let tw = Math.max(28, span.offsetWidth), th = Math.max(16, span.offsetHeight);
    // ⚠ EDGE CASE — AN UNBREAKABLE WORD. `white-space: pre` means one long token cannot wrap, and a
    // 600px balloon then blows straight through the safe area. Force a wrap and re-measure.
    const S0 = this._safe(true);
    const cap = Math.max(120, (S0.x1 - S0.x0) * 0.52);
    if (tw > cap) {
      // ⚠ WIDTH, NOT MAX-WIDTH. The span is absolutely positioned inside .cmb, and .cmb has no
      // width yet — it is sized AFTER measuring. `max-width` leaves the span to shrink-to-fit
      // against a zero-width containing block, so `overflow-wrap: anywhere` collapses it to ONE
      // LETTER PER LINE: a 72-character word measured 46px wide and 465px tall and produced a
      // balloon that ran off the bottom of the screen. An explicit width has nothing to resolve.
      span.style.whiteSpace = 'pre-wrap';
      span.style.overflowWrap = 'anywhere';
      span.style.width = Math.round(cap) + 'px';
      tw = Math.max(28, span.offsetWidth); th = Math.max(16, span.offsetHeight);
    }
    // ⚠ AND A HEIGHT CEILING. Even a correctly wrapped block can be taller than the screen, and a
    // balloon that does not fit cannot be placed — only shrunk. One step down, then accept it.
    const maxH = (S0.y1 - S0.y0) * 0.62;
    if (th > maxH) {
      span.style.fontSize = '13px';
      span.style.lineHeight = '1.1';
      tw = Math.max(28, span.offsetWidth); th = Math.max(16, span.offsetHeight);
      if (th > maxH) { span.style.height = Math.round(maxH) + 'px'; span.style.overflow = 'hidden'; th = Math.round(maxH); }
    }
    // 2 — BUILD a shape that contains it. buildShape guards nonsense so a path can never be NaN.
    const seed = (text.length * 31 + tone.length * 7) | 0;
    const shape = buildShape(tone, tw, th, seed);
    // 3 — LAY the text out in the middle of that shape.
    node.style.width = Math.ceil(shape.w) + 'px';
    node.style.height = Math.ceil(shape.h) + 'px';
    span.style.left = Math.round((shape.w - tw) / 2) + 'px';
    span.style.top = Math.round((shape.h - th) / 2) + 'px';

    const NS = 'http://www.w3.org/2000/svg';
    // ⚠ the SVG overflows its own box on purpose — the TAIL reaches outside the balloon body, and
    // clipping it would put us right back where we started.
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'cmsvg');
    svg.setAttribute('width', Math.ceil(shape.w));
    svg.setAttribute('height', Math.ceil(shape.h));
    svg.setAttribute('overflow', 'visible');
    const tail = document.createElementNS(NS, 'path');
    tail.setAttribute('class', 'cmtail');
    const body = document.createElementNS(NS, 'path');
    body.setAttribute('class', 'cmbody');
    body.setAttribute('d', shape.path);
    // tail first so the body's fill covers the join and the outline stays one continuous line
    svg.appendChild(tail); svg.appendChild(body);
    node.insertBefore(svg, span);

    const life = opts.life || Math.max(1.5, Math.min(6.5, 0.9 + text.length / 13));
    const it = this._add(node, life, { kind: 'bub', speaker, tone, offY: opts.offY, shape, svg, tail, body, noTail: !speaker });
    it._mounted = true;
    return it;
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

  impact(text,pos,opts={}) {
    const it=this.sfx(text,pos,opts),feedback=opts.feedback;
    if(feedback){it.node.classList.add('impact-'+feedback.id);it.node.dataset.impact=feedback.id;it.node.setAttribute('aria-label',feedback.label||text);}
    return it;
  }

  // ⚠ THE SAFE AREA. A letterer works inside the panel's margins; balloons that drift under the
  // controls rail or the player panel are unreadable, and no amount of z-index fixes that because
  // the HUD is information the player also needs. These are the rails the HUD actually owns.
  _safe(openCombat = false) {
    const W = innerWidth, H = innerHeight;
    // Chase HUD occupies corners, not entire right/bottom rails. Actual visible
    // panels join the occupancy list; the open upper-right remains usable.
    if(openCombat&&this.g.world?.camMode==='chase')return {x0:10,y0:10,x1:W-10,y1:H-10,lx:10,ly:H-10};
    const phone = document.body.classList.contains('phone');
    return {
      x0: 10, y0: 10,
      x1: W - (phone ? 10 : 258),        // the controls / kit rail on the right
      y1: H - (phone ? 90 : 118),        // the player panel and mode bar along the bottom
      lx: phone ? 10 : 356,              // the player panel's right edge, bottom-left only
      ly: H - 210,
    };
  }

  _combatOccupancy(taken) {
    const W=this.g.world,v=this._point,camera=W.camera,corners=this._clipCorners;
    camera.updateMatrixWorld(true);
    for(const f of this.g.entities||[]) {
      if(!f.alive||!f.obj?.visible||(!f.isPlayer&&this.g.fov&&(f._vis??1)<.35))continue;
      const p=f.parts;if(!p?.head)continue;
      let meshes=this._bodyMeshes.get(f);
      if(!meshes){
        meshes=[p.head,p.cowl,p.torso,p.pelvis,...p.armL.children.slice(0,3),...p.armR.children.slice(0,3)];
        for(const leg of [p.legL,p.legR])meshes.push(leg.userData.thigh,leg.userData.shin,leg.userData.boot);
        this._bodyMeshes.set(f,meshes);
      }
      f.obj.updateMatrixWorld(true);
      let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
      const include=point=>{
        v.copy(point).applyMatrix4(camera.projectionMatrix);
        const x=(v.x+1)*innerWidth*.5,y=(1-v.y)*innerHeight*.5;
        x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
      };
      for(const mesh of meshes){
        if(!mesh?.geometry)continue;
        if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox;
        this._viewMatrix.multiplyMatrices(camera.matrixWorldInverse,mesh.matrixWorld);
        let clipped=false;
        for(let i=0;i<8;i++){
          const c=corners[i].set(i&1?b.max.x:b.min.x,i&2?b.max.y:b.min.y,i&4?b.max.z:b.min.z).applyMatrix4(this._viewMatrix);
          if(c.z<=-camera.near&&c.z>=-camera.far)include(c);
          else clipped=true;
        }
        // A corner behind the near plane cannot simply be discarded: the
        // clipped edge can fill the frame even when surviving corners do not.
        if(clipped)for(let i=0;i<8;i++)for(let bit=1;bit<=4;bit*=2){
          const j=i^bit;if(j<i)continue;const a=corners[i],b=corners[j];
          for(let k=0;k<2;k++){
            const plane=k?-camera.far:-camera.near;
            if((a.z<plane&&b.z>plane)||(a.z>plane&&b.z<plane))include(v.lerpVectors(a,b,(plane-a.z)/(b.z-a.z)));
          }
        }
      }
      if(x1<0||y1<0||x0>innerWidth||y0>innerHeight||!Number.isFinite(x0))continue;
      taken.push({x:x0-8,y:y0-8,w:x1-x0+16,h:y1-y0+16,fighter:f});
    }
    for(const key of ['statusDock','plPanel','kit','slots','radar','foe','mode','charge']){
      const el=this.g.hud?.el[key];if(!el)continue;
      const s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden'||s.opacity==='0')continue;
      const r=el.getBoundingClientRect();if(r.width&&r.height)taken.push({x:r.x-8,y:r.y-8,w:r.width+16,h:r.height+16});
    }
  }

  _clearPlacement(it,cx,cy,w,h,S,taken,anchor=null) {
    const xs=[cx,S.x0,S.x1-w],ys=[cy,S.y0,S.y1-h];
    for(const t of taken){xs.push(t.x-w-8,t.x+t.w+8);ys.push(t.y-h-8,t.y+t.h+8);}
    let best=null,cost=Infinity;
    for(const x of xs)for(const y of ys){
      const tx=Math.round(Math.max(S.x0,Math.min(S.x1-w,x))),ty=Math.round(Math.max(S.y0,Math.min(S.y1-h,y)));
      if(tx+w>S.x1||ty+h>S.y1||taken.some(t=>tx+w>t.x&&tx<t.x+t.w&&ty+h>t.y&&ty<t.y+t.h))continue;
      const tailPenalty=anchor&&!this._tailClear(tx+w/2,ty+h/2,anchor,taken,it)?Math.max(w,h)*2:0;
      const score=Math.hypot(tx-cx,ty-cy)+tailPenalty+(it._placed?Math.hypot(tx-it._placed.x,ty-it._placed.y)*.35:0);
      if(score<cost){cost=score;best={x:tx,y:ty,w,h,item:it};}
    }
    it.node.style.visibility=best?'':'hidden';
    if(best){it._placed=best;taken.push(best);}
    return best;
  }

  _tailClear(x,y,sp,taken,it) {
    // A tail may end at its speaker, but must not spear another fighter, HUD
    // panel or balloon. Expand by the tail's shoulder width, not just its line.
    return !taken.some(r=>{
      if(r.fighter===it.speaker||r.item===it)return false;
      let lo=0,hi=1;
      for(const [start,delta,min,max] of [[x,sp.x-x,r.x-12,r.x+r.w+12],[y,sp.y-y,r.y-12,r.y+r.h+12]]){
        if(Math.abs(delta)<.001){if(start<min||start>max)return false;}
        else {const a=(min-start)/delta,b=(max-start)/delta;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));if(lo>hi)return false;}
      }
      return true;
    });
  }

  // ------------------------------------------------------------------------------------ tick
  update(dt) {
    // ⚠ THE LAYER KEEPS ITS OWN CLOCK. hud.update() takes no dt, and a caption whose dwell depends
    // on the caller remembering to pass one is a caption that outstays its welcome on the first
    // frame somebody forgets. Measure it here and the timing is correct from every call site.
    const now = performance.now();
    if (!(dt > 0)) { dt = Math.min(0.05, (now - (this._last || now)) / 1000); }
    this._last = now;
    if(!this.items.length)return;
    const W = this.g.world, sw = innerWidth, sh = innerHeight;
    const live = [];
    // balloons are placed top-down so an earlier one keeps its spot and later ones move clear
    const taken = [];
    // Protect the free-aim cue plus actual silhouettes. A fixed central carpet
    // both missed the lower-screen player and needlessly severed speech tails.
    const chase = !!(W && W.camMode === 'chase');
    if (chase) taken.push({ x: sw*.5-20, y: sh*.5-20, w:40, h:40 });
    if(chase)this._combatOccupancy(taken);
    if(this.g.modeId==='powerworld'){
      // These field-only overlays are outside the old comic HUD inventory.
      for(const el of [document.getElementById('frontlineObjective'),this.g.hud?.el?.fieldRecorder,this.g.hud?.el?.feed]){
        if(!el||el.hidden)continue;
        const s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden'||s.opacity==='0')continue;
        const r=el.getBoundingClientRect();if(r.width&&r.height)taken.push({x:r.x-8,y:r.y-8,w:r.width+16,h:r.height+16});
      }
    }
    for (const it of this.items) {
      it.t -= dt;
      if (it.t <= 0) {
        if (!it._out) { it._out = 1; it.node.classList.add('out'); it.t = 0.2; live.push(it); continue; }
        it.node.remove();
        continue;
      }
      if (it.kind === 'field') {
        const f=it.speaker;
        const hidden=this.g.modeId!=='powerworld'||!this.g.running||this.g._frontlinePreparing||this.g.hud?.titleOpen||this.g.matchOver
          ||(f&&(!f.alive||!f.pos||!f.obj?.visible||(!f.isPlayer&&this.g.fov&&(f._vis??1)<.35)
            ||W.screenPosOf(f.pos.x,f.pos.y+11,f.pos.z).behind));
        if(hidden){it.node.style.visibility='hidden';live.push(it);continue;}
        const w=it.node.offsetWidth,h=it.node.offsetHeight;
        const S={x0:16,y0:12,x1:sw-16,y1:Math.min(180,sh*.26)};
        const place=this._clearPlacement(it,(sw-w)/2,64,w,h,S,taken);
        if(place){it.node.style.left=place.x+'px';it.node.style.top=place.y+'px';}
      } else if (it.kind === 'bub') {
        const f = it.speaker;
        if (f && (!f.alive || !f.pos)) { it.t = Math.min(it.t, 0.12); live.push(it); continue; }
        if(chase&&f&&(!f.obj?.visible||(!f.isPlayer&&this.g.fov&&(f._vis??1)<.35))){it.node.style.visibility='hidden';live.push(it);continue;}
        const bw = it.shape.w, bh = it.shape.h;
        let sp = null;
        if (f) {
          // ⚠ THE TAIL POINTS AT THE MOUTH — head height, not the feet or the centre.
          if(f.parts?.head){
            f.parts.head.localToWorld(this._point.set(0,-.12,.7));this._point.y+=it.offY||0;
            sp=W.screenPosOf(this._point.x,this._point.y,this._point.z);
          }else sp=W.screenPosOf(f.pos.x,f.pos.y+11+(it.offY||0),f.pos.z);
          if (sp.behind) { it.node.style.visibility = 'hidden'; live.push(it); continue; }
          it.node.style.visibility='';
          it.node.style.opacity = '';
        }
        const S = this._safe(chase);
        const GAP = 26;
        let x, y;
        if (sp) { x = sp.x - bw / 2; y = sp.y - bh - GAP; }
        else { x = (sw - bw) / 2; y = sh * 0.3; }
        if(chase){
          const place=this._clearPlacement(it,x,y,bw,bh,S,taken,sp);
          if(!place){live.push(it);continue;}x=place.x;y=place.y;
        }else{
        x = Math.max(S.x0, Math.min(S.x1 - bw, x));
        if (y < S.y0) y = (sp ? sp.y + GAP : S.y0);
        if (y + bh > S.y1) y = Math.max(S.y0, (sp ? sp.y - bh - GAP : S.y1 - bh));
        if (x < S.lx && y + bh > S.ly) y = Math.min(y, S.ly - bh - 6);
        y = Math.max(S.y0, Math.min(S.y1 - bh, y));
        for (let guard = 0; guard < 6; guard++) {
          const hit = taken.find(t => !(x + bw < t.x || x > t.x + t.w || y + bh < t.y || y > t.y + t.h));
          if (!hit) break;
          y = hit.y + hit.h + 8;
          if (y + bh > S.y1) { y = Math.max(S.y0, hit.y - bh - 8); break; }
        }
        taken.push({ x, y, w: bw, h: bh });
        }
        it.node.style.left = Math.round(x) + 'px';
        it.node.style.top = Math.round(y) + 'px';
        // ⚠ THE TAIL IS REDRAWN EVERY FRAME toward wherever the speaker now is, in the SVG's own
        // coordinates. That is what lets it follow a moving fighter instead of pointing where they
        // used to be — and it never deforms the balloon, because it is a separate path.
        if (it.tail) {
          if (!sp || it.noTail) { it.tail.setAttribute('d', ''); }
          else {
            // ⚠ EDGE CASE — A SPEAKER THE BALLOON COULD NOT REACH. When the balloon has been
            // clamped away from its speaker (screen edge, HUD rail, a stack), a tail drawn to the
            // true position becomes a spear across the panel. Past a sane reach it is dropped —
            // an untailed balloon reads as off-panel speech, which is a real convention; a
            // hundred-pixel spike reads as a bug.
            const rawX = sp.x - x, rawY = sp.y - y;
            const reach = Math.max(bw, bh) * 1.6 + 90;
            const away = Math.hypot(rawX - bw / 2, rawY - bh / 2);
            if (away > reach || it.tone === 'narrate'||(chase&&!this._tailClear(x+bw/2,y+bh/2,sp,taken,it))) { it.tail.setAttribute('d', ''); }
            else {
              const tx = Math.max(-80, Math.min(bw + 80, rawX));
              const ty = Math.max(-80, Math.min(bh + 80, rawY));
              it.tail.setAttribute('d', tailPath(it.tone, bw, bh, tx, ty));
            }
          }
        }
      } else if (it.kind === 'sfx' && it.world) {
        // ⚠ SFX SHARE THE OCCUPANCY LIST. They were placed independently, so a KRAKA-DOOM landed on
        // top of the balloon of the man it was happening to. A panel never does that.
        const sp = W.screenPosOf(it.world.x, it.world.y + 4, it.world.z);
        if (sp.behind) { it.node.style.opacity = '0'; live.push(it); continue; }
        it.node.style.opacity = '';
        it.drift += dt * 26;                                     // SFX float up as they fade
        const fw = it.node.offsetWidth || 120, fh = it.node.offsetHeight || 40;
        const S = this._safe(chase);
        // ⚠ A REAL PLACEMENT SEARCH, not one nudge downward. Pushing only down walked the word into
        // the next balloon and then the clamp shoved it back on top of the first. Try the natural
        // spot and eight neighbours, score each by how much balloon it covers, and take the best —
        // so a sound effect lands in whatever gap the panel actually has.
        const cx = sp.x - fw / 2, cy = sp.y - fh / 2 - it.drift;
        if(chase){
          // Bounds of the authored CSS animation, not an unscaled text guess.
          // cmSfx's easing overshoots its 1.14 keyframe (peak <1.30).
          // Exit peaks at 1.25. Rotation is +/-8deg, sin(8deg)<.14, cos<=1.
          // Include burst size, stroke/shadow, and the rotated 22px exit drift.
          const heavy=it.node.classList.contains('heavy'),bw=fw*(heavy?1.18:1)+12,bh=fh*(heavy?2.1:1)+12;
          const halfScale=it._out?.625:.65;
          const px=Math.max(0,(bw+bh*.14)*halfScale+(it._out?4:0)-fw/2),py=Math.max(0,(bh+bw*.14)*halfScale+(it._out?28:0)-fh/2);
          const place=this._clearPlacement(it,cx-px,cy-py,fw+px*2,fh+py*2,S,taken);
          if(place){it.node.style.left=Math.round(place.x+px)+'px';it.node.style.top=Math.round(place.y+py)+'px';}
          live.push(it);continue;
        }
        const cands = [[0, 0], [0, -fh - 10], [0, fh + 10], [-fw * 0.62, 0], [fw * 0.62, 0],
                       [-fw * 0.55, -fh - 8], [fw * 0.55, -fh - 8], [0, -fh * 2 - 16], [0, fh * 2 + 16]];
        // ⚠ §11: the existing offsets (±fw*0.62) cannot clear the centre box's ~230px half-width.
        // Add two lateral candidates wide enough to reach the outer band. The search still tries the
        // natural spot first and takes the least-covering option, so a dead-centre hit still gets its word.
        if (chase) { const L = sw * 0.12 + fw / 2 + 12; cands.push([-L, 0], [L, 0]); }
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
