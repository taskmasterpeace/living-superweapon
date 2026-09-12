// Ability portals belong to their dimension, independently of the deployment gate.
export class TrainingPortalScope {
  constructor(game) {
    this.game = game;
    this.saved = game.portals;
    this.open = game._openPair;
    this.visibility = [];
    for (const pair of this.saved || []) for (const side of [pair.a, pair.b]) {
      if (!side?.grp) continue;
      this.visibility.push([side.grp, side.grp.visible]);
      side.grp.visible = false;
    }
    game.portals = [];
    game._openPair = null;
  }
  close() {
    if (!this.game) return;
    const game = this.game;
    for (const pair of [...game.portals]) game._closePair(pair);
    game.portals = this.saved;
    game._openPair = this.open;
    for (const [group, visible] of this.visibility) group.visible = visible;
    this.game = null;
  }
}
