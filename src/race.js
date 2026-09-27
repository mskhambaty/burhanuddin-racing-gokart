// One race: the karts on the grid, the countdown, laps, checkpoints and results.
//
// Checkpoints: each lap is split into sectors. A kart has to drive through
// every sector in order, so cutting across the sand never counts as a lap.

const COUNTDOWN_SECONDS = 3;

// The people who can drive. Player 1 always races in Burhanuddin Racing
// gold & black.
const PLAYER_SETUPS = [
  { name: 'Player 1', body: COLORS.gold, trim: COLORS.black, helmet: COLORS.black },
  { name: 'Player 2', body: '#c8102e', trim: '#ffffff', helmet: '#ffffff' },
];

class Racer {
  constructor(kart, controlSchemes, track) {
    this.kart = kart;
    this.name = kart.name;
    this.controlSchemes = controlSchemes;
    this.track = track;
    this.lapsDone = 0;
    this.nextSector = 0;      // the kart starts behind the line, in the last sector
    this.passed = 0;          // sectors driven through so far (for positions)
    this.crossedStart = false;
    this.lapStart = 0;
    this.lapTimes = [];
    this.bestLap = null;
    this.finished = false;
    this.finishTime = null;
    this.position = 1;
    this.wrongWayTime = 0;
    this.missedCheckpoint = false;
  }

  get lastReachedSector() {
    return (this.nextSector - 1 + this.track.sectors) % this.track.sectors;
  }

  // Bigger number = further round the track. Used to work out 1st, 2nd, ...
  get progress() {
    if (this.finished) return 1e9 - this.finishTime;
    const n = this.track.points.length;
    const idx = this.kart.loc ? this.kart.loc.idx : 0;
    const intoSector = (idx - this.track.sectorStart(this.lastReachedSector) + n) % n;
    return this.passed * n + intoSector;
  }
}

class Race {
  constructor(track, playerCount) {
    this.track = track;
    this.playerCount = playerCount;
    this.racers = [];
    for (let i = 0; i < playerCount; i++) {
      const setup = PLAYER_SETUPS[i];
      const grid = track.gridSlot(i);
      const kart = new Kart(Object.assign({}, setup, grid));
      kart.loc = track.locate(kart.x, kart.y);
      // 1 player: arrows or WASD. 2 players: P1 WASD, P2 arrows.
      const schemes = playerCount === 1 ? ['arrows', 'wasd'] : [i === 0 ? 'wasd' : 'arrows'];
      this.racers.push(new Racer(kart, schemes, track));
    }
    this.countdown = COUNTDOWN_SECONDS;
    this.time = 0;          // race clock, starts at GO
    this.state = 'countdown'; // countdown -> racing -> finished
    this.finishOrder = [];
    this.newRecord = false;
    this.skids = [];        // new skid marks to paint this frame
    this.dust = [];         // sand dust particles
  }

  update(dt) {
    if (this.state === 'countdown') {
      this.countdown -= dt;
      if (this.countdown <= 0) this.state = 'racing';
      return;
    }

    this.time += dt;

    for (const r of this.racers) {
      const controls = r.finished
        ? { throttle: 0, brake: 0.3, steer: 0 } // roll to a stop after the flag
        : Input.readControls(r.controlSchemes);
      r.kart.update(dt, controls, this.track);
      this.checkProgress(r, dt);
      this.makeEffects(r.kart, dt);
    }

    for (let i = 0; i < this.racers.length; i++) {
      for (let j = i + 1; j < this.racers.length; j++) {
        collideKarts(this.racers[i].kart, this.racers[j].kart);
      }
    }

    // Positions.
    const order = this.racers.slice().sort((a, b) => b.progress - a.progress);
    order.forEach((r, i) => (r.position = i + 1));

    // Dust fades away.
    for (const d of this.dust) d.life -= dt;
    this.dust = this.dust.filter((d) => d.life > 0);

    if (this.state === 'racing' && this.racers.every((r) => r.finished)) {
      this.state = 'finished';
    }
  }

  checkProgress(r, dt) {
    if (r.finished) return;
    const track = this.track;
    const loc = r.kart.loc;
    const sector = track.sectorOf(loc.idx);

    if (sector === r.nextSector) {
      r.passed++;
      if (sector === 0) {
        if (r.crossedStart) this.completeLap(r);
        else r.crossedStart = true; // first time over the line after GO
      }
      r.nextSector = (r.nextSector + 1) % track.sectors;
    }

    // Anywhere other than the sector we're in or the next one means a
    // checkpoint was skipped (or you're going backwards).
    r.missedCheckpoint = sector !== r.lastReachedSector && sector !== r.nextSector;

    // Wrong way: moving against the direction of the track.
    const t = track.tangent(loc.idx);
    const along = r.kart.vx * t.x + r.kart.vy * t.y;
    r.wrongWayTime = along < -30 ? r.wrongWayTime + dt : 0;
  }

  completeLap(r) {
    const lapTime = this.time - r.lapStart;
    r.lapTimes.push(lapTime);
    r.lapStart = this.time;
    r.lapsDone++;
    if (r.bestLap == null || lapTime < r.bestLap) r.bestLap = lapTime;

    // Save the track record.
    const recordKey = 'best-lap:' + this.track.id;
    const record = Save.get(recordKey, null);
    if (record == null || lapTime < record) {
      Save.set(recordKey, lapTime);
      this.newRecord = true;
    }

    if (r.lapsDone >= this.track.laps) {
      r.finished = true;
      r.finishTime = this.time;
      this.finishOrder.push(r);
    }
  }

  makeEffects(kart, dt) {
    const speed = kart.speed;
    if (kart.skidding && !kart.onSand && speed > 40) {
      for (const w of kart.rearWheels()) this.skids.push(w);
    }
    if (kart.onSand && speed > 50 && Math.random() < speed * dt * 0.12) {
      const w = kart.rearWheels()[Math.random() < 0.5 ? 0 : 1];
      this.dust.push({ x: w.x, y: w.y, r: 3 + Math.random() * 4, life: 0.6, max: 0.6 });
    }
  }
}
