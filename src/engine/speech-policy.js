// Distances are game units: local talk uses the existing 90u psyche neighbourhood;
// yell matches the existing 190u cry reach. These are not claims of real metres.
export function speechView(game, speaker, tone, opts, point, width, height) {
  if (!game.running || game._frontlinePreparing || game.hud?.titleOpen || game.matchOver) return null;
  if (!speaker?.alive || !speaker.pos) return null;
  const listener = game.player;
  const enemy = listener && speaker !== listener && game.isFoe?.(listener, speaker);
  const radio = opts.radio === true || String(opts.tone).toLowerCase() === 'radio';
  const distance = listener ? Math.hypot(speaker.pos.x-listener.pos.x, speaker.pos.y-listener.pos.y, speaker.pos.z-listener.pos.z) : 0;
  // Only friendly radio is allowed to disclose a remote speaker. A hidden enemy
  // never gains a location cue, even when the caller asks for offscreen speech.
  if (!(radio && !enemy)) {
    if (!speaker.obj?.visible || (enemy && ((speaker._vis ?? 1) < .4 || (game.canSee && !game.canSee(listener, speaker))))) return null;
    if (distance > (tone === 'yell' ? 190 : tone === 'whisper' ? 40 : 90)) return null;
  }
  const offscreen = !point || point.behind || point.x < 0 || point.x > width || point.y < 0 || point.y > height;
  if (offscreen && !(radio && !enemy) && !(tone === 'yell' && opts.allowOffscreen === true)) return null;
  return {mode: radio || offscreen ? 'radio' : 'balloon', direction: point?.behind ? 'BEHIND' : point?.x < 0 ? 'LEFT' : point?.x > width ? 'RIGHT' : point?.y < 0 ? 'ABOVE' : point?.y > height ? 'BELOW' : 'NEARBY'};
}

export class SpeechPolicy {
  constructor() { this.clear(); }
  clear() { this.speakers = new WeakMap(); this.active = null; }
  admit(speaker, text, tone, opts = {}, now = 0, life = 3) {
    if (!speaker || (Number.isFinite(opts.at) && now - opts.at > 1.5)) return false;
    const category = opts.category || tone;
    const priority = Number.isFinite(opts.priority) ? opts.priority : /warning|danger/.test(category) ? 2 : tone === 'yell' ? 1 : 0;
    const state = this.speakers.get(speaker) || {last:-Infinity, categories:new Map(), lines:new Map()};
    if (now - (state.lines.get(text) ?? -Infinity) < 18 || now - (state.categories.get(category) ?? -Infinity) < 5) return false;
    if (now - state.last < 2 && priority <= (this.active?.priority ?? 0)) return false;
    if (this.active && this.active.until > now && priority <= this.active.priority) return false;
    state.last = now; state.categories.set(category,now); state.lines.set(text,now);
    for (const [line,t] of state.lines) if (now-t > 30) state.lines.delete(line);
    this.speakers.set(speaker,state); this.active = {speaker,priority,until:now+life};
    return true;
  }
}
