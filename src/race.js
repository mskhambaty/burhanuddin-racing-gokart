// One race: the karts on the grid, the countdown, laps, checkpoints and results.
//
// Checkpoints: each lap is split into sectors. A kart has to drive through
// every sector in order, so cutting across the sand never counts as a lap.

const COUNTDOWN_SECONDS = 3;
const KARTS_PER_RACE = 6;
// Once every human has finished, the computer drivers get this long to finish too.
const FINISH_GRACE_SECONDS = 15;

// The people who can drive. Player 1 always races in Burhanuddin Racing
// gold & black.
const PLAYER_SETUPS = [
  { name: 'Player 1', body: COLORS.gold, trim: COLORS.black, helmet: COLORS.black },
  { name: 'Player 2', body: '#c8102e', trim: '#ffffff', helmet: '#ffffff' },
];

class Racer {
  constructor(kart, track, isHuman) {
    this.kart = kart;
    this.name = kart.name;
    this.isHuman = isHuman;
    this.controlSchemes = null; // humans: which keys they use
    this.ai = null;             // computer drivers: their brain
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
  constructor(track, playerCount, difficulty) {
    this.track = track;
    this.playerCount = playerCount;
    this.racers = [];

    // Computer drivers start at the front, humans at the back: you have to
    // fight your way through the pack!
    const aiCount = KARTS_PER_RACE - playerCount;
    let slot = 0;
    for (let i = 0; i < aiCount; i++) {
      const profile = AI_DRIVERS[i];
      const racer = this.addRacer(profile, slot++, false);
      racer.ai = new AIDriver(racer, this, profile, difficulty);
    }
    for (let i = 0; i < playerCount; i++) {
      const racer = this.addRacer(PLAYER_SETUPS[i], slot++, true);
      // 1 player: arrows or WASD. 2 players: P1 WASD, P2 arrows.
      racer.controlSchemes = playerCount === 1 ? ['arrows', 'wasd'] : [i === 0 ? 'wasd' : 'arrows'];
    }
    this.humans = this.racers.filter((r) => r.isHuman);

    this.countdown = COUNTDOWN_SECONDS;
    this.time = 0;          // race clock, starts at GO
    this.state = 'countdown'; // countdown -> racing -> finished
    this.finishOrder = [];
    this.humansDoneAt = null;
    this.newRecord = false;
    this.skids = [];        // new skid marks to paint this frame
    this.dust = [];         // sand dust particles
  }

  addRacer(setup, slot, isHuman) {
    const kart = new Kart(Object.assign({}, setup, this.track.gridSlot(slot)));
    kart.loc = this.track.locate(kart.x, kart.y);
    const racer = new Racer(kart, this.track, isHuman);
    this.racers.push(racer);
    return racer;
  }

  // Everyone in race order: finishers first, then by distance covered.
  standings() {
    return this.racers.slice().sort((a, b) => b.progress - a.progress);
  }

  update(dt) {
    if (this.state === 'countdown') {
      this.countdown -= dt;
      if (this.countdown <= 0) this.state = 'racing';
      return;
    }

    this.time += dt;

    for (const r of this.racers) {
      let controls;
      if (r.ai) controls = r.ai.controls(dt);
      else if (r.finished) controls = { throttle: 0, brake: 0.3, steer: 0 }; // roll to a stop
      else controls = Input.readControls(r.controlSchemes);
      r.kart.update(dt, controls, this.track);
      this.checkProgress(r, dt);
      this.makeEffects(r.kart, dt);
    }

    // Karts that have finished become "ghosts" so they don't get in the way.
    const onTrack = this.racers.filter((r) => !r.finished);
    for (let i = 0; i < onTrack.length; i++) {
      for (let j = i + 1; j < onTrack.length; j++) {
        collideKarts(onTrack[i].kart, onTrack[j].kart);
      }
    }

    // Positions.
    this.standings().forEach((r, i) => (r.position = i + 1));

    // Dust fades away.
    for (const d of this.dust) d.life -= dt;
    this.dust = this.dust.filter((d) => d.life > 0);

    if (this.state === 'racing') {
      if (this.humansDoneAt == null && this.humans.every((r) => r.finished)) {
        this.humansDoneAt = this.time;
      }
      const everyoneDone = this.racers.every((r) => r.finished);
      const graceOver = this.humansDoneAt != null && this.time - this.humansDoneAt > FINISH_GRACE_SECONDS;
      if (everyoneDone || graceOver) this.state = 'finished';
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

    // Save the track record (only laps driven by people count).
    if (r.isHuman) this.saveRecord(lapTime);

    if (r.lapsDone >= this.track.laps) {
      r.finished = true;
      r.finishTime = this.time;
      this.finishOrder.push(r);
    }
  }

  saveRecord(lapTime) {
    const recordKey = 'best-lap:' + this.track.id;
    const record = Save.get(recordKey, null);
    if (record == null || lapTime < record) {
      Save.set(recordKey, lapTime);
      this.newRecord = true;
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
