// Keep native field systems, but give the training dimension its own instances.
// The suspended world's field timers and GPU resources retain their ownership.
export class TrainingFieldScope {
  constructor(game) {
    this.saved = [];
    for (const key of ['timeFields', 'gravityZones']) {
      const system = game[key];
      if (!system) continue;
      const list = system.list;
      const visibility = list.filter(f => f.mesh).map(f => [f.mesh, f.mesh.visible]);
      for (const [mesh] of visibility) mesh.visible = false;
      this.saved.push({system, list, visibility});
      system.list = [];
    }
  }
  close() {
    for (const {system, list, visibility} of this.saved) {
      system.clear();
      system.list = list;
      for (const [mesh, visible] of visibility) mesh.visible = visible;
    }
    this.saved.length = 0;
  }
}
