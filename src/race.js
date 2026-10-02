// One race: the karts on the grid, the countdown, laps, checkpoints and results.
//
// Checkpoints: each lap is split into sectors. A kart has to drive through
// every sector in order, so cutting across the sand never counts as a lap.

const COUNTDOWN_SECONDS = 3;
const KARTS_PER_RACE = 6;
// Once every human has finished, the computer drivers get this long to finish too.
const FINISH_GRACE_SECONDS = 15;


class Racer {
  constructor(kart, track, isHuman) {
    this.kart = kart;
    this.name = kart.name;
    this.isHuman = isHuman;
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
    this.cpTimes = [0];       // race clock when each checkpoint was passed (index = checkpoint number)
    this.wrongWayTime = 0;
    this.missedCheckpoint = false;
    this.isTeammate = false;   // a driver you hired
    this.driver = null;        // ...and who they are
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
  // players: for each human, { team, stats, paint } (stats come from garage
  // upgrades, paint from the paint shop).
  // options.ghostMode: YOU mode — no computer drivers, race your best time instead.
  // options.laps: how many laps (1 to MAX_LAPS).
  // options.teammates: drivers you hired (from DRIVERS); they race in your colours.
  constructor(track, playerCount, difficulty, players = [], options = {}) {
    this.track = track;
    this.playerCount = playerCount;
    this.ghostMode = !!options.ghostMode;
    this.laps = clamp(Math.round(options.laps || RACE_LAPS), 1, MAX_LAPS);
    this.racers = [];
    this.playerTeam = (players[0] && players[0].team) || 'burhanuddin';
    this.playerPaint = (players[0] && players[0].paint) || null;
    const mates = this.ghostMode ? [] : (options.teammates || []).slice(0, MAX_TEAMMATES);

    // Computer drivers start at the front, then your teammates, and you at the
    // back: you have to fight your way through the pack! (You always start from
    // the back of the grid, so your ghost and you start from the same spot.)
    const aiCount = this.ghostMode ? 0 : KARTS_PER_RACE - playerCount - mates.length;
    for (let i = 0; i < aiCount; i++) {
      const profile = AI_DRIVERS[i];
      const racer = this.addRacer(profile, i, false);
      racer.ai = new AIDriver(racer, this, profile, difficulty);
    }
    mates.forEach((d, i) => {
      // A teammate wears your team's colours, with their own helmet and number.
      const base = playerSetup(0, this.playerTeam, this.playerPaint);
      const number = d.number === base.number ? (d.number % 99) + 1 : d.number;
      const setup = Object.assign(base, { name: d.name, shortName: d.name, helmet: d.helmet, number });
      const racer = this.addRacer(setup, aiCount + i, false);
      racer.isTeammate = true;
      racer.driver = d;
      const skill = DRIVER_STARS[d.stars];
      racer.ai = new AIDriver(racer, this, { skill: 1 }, difficulty, skill);
    });
    for (let i = 0; i < playerCount; i++) {
      const p = players[i] || {};
      const setup = Object.assign(playerSetup(i, p.team, p.paint), { stats: p.stats });
      this.addRacer(setup, KARTS_PER_RACE - playerCount + i, true);
    }
    this.humans = this.racers.filter((r) => r.isHuman);

    // Your ghost: the recording of your best race on this track (with this many laps).
    this.bestGhost = Ghosts.load(track, this.laps);     // the best race so far (before this one)
    this.ghost = null;                       // the see-through kart (YOU mode only)
    this.gap = null;                         // seconds ahead (-) or behind (+) the ghost, at the last checkpoint
    this.recorder = new GhostRecorder();
    this.ghostResult = null;                 // filled in when you finish
    if (this.ghostMode && this.bestGhost) {
      const first = Ghosts.sample(this.bestGhost, 0);
      const kart = new Kart(Object.assign(playerSetup(0, this.bestGhost.team, this.bestGhost.paint), { x: first.x, y: first.y, heading: first.heading }));
      this.ghost = { data: this.bestGhost, kart };
    }
    this.controlMode = 'keyboard';   // or 'trackpad' (set by the game)
    this.ignorePointerBrake = false; // true while a button is being clicked
    this.finishedAt = null;          // race clock when the results appeared
    this.standings().forEach((r, i) => (r.position = i + 1));

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
      else if (this.state === 'finished') controls = { throttle: 0, brake: 0.3, steer: 0 };
      else controls = Input.readControls(this.controlMode, this.ignorePointerBrake);
      r.kart.update(dt, controls, this.track);
      this.checkProgress(r, dt);
      this.makeEffects(r.kart, dt);
    }

    this.updateGhost();

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
      if (everyoneDone || graceOver) {
        this.state = 'finished';
        this.finishedAt = this.time;
      }
    }
  }

  checkProgress(r, dt) {
    if (r.finished) return;
    const track = this.track;
    const loc = r.kart.loc;
    const sector = track.sectorOf(loc.idx);

    if (sector === r.nextSector) {
      r.passed++;
      r.cpTimes[r.passed] = this.time;
      if (r.isHuman && this.ghost) {
        const ghostTime = this.ghost.data.cp[r.passed];
        if (ghostTime !== undefined) this.gap = this.time - ghostTime;
      }
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

    if (r.lapsDone >= this.laps) {
      r.finished = true;
      r.finishTime = this.time;
      this.finishOrder.push(r);
    }
  }

  // Moves the ghost along its recording, and records this race.
  updateGhost() {
    if (this.ghost) {
      const p = Ghosts.sample(this.ghost.data, this.time);
      const k = this.ghost.kart;
      k.x = p.x; k.y = p.y; k.heading = p.heading; k.steerVisual = p.steer;
      this.ghost.done = this.time >= this.ghost.data.total;
    }
    const me = this.humans[0];
    if (!me || this.recorder.done) return;
    if (!me.finished) {
      this.recorder.update(this.time, me.kart);
    } else {
      // You've crossed the line: is this your best race on this track?
      this.recorder.done = true;
      const data = this.recorder.finish(this.laps, me, this.playerTeam, this.playerPaint);
      const before = this.bestGhost;
      const isBest = !before || data.total < before.total;
      this.ghostResult = {
        hadGhost: !!before,
        ghostTotal: before ? before.total : null,
        playerTotal: data.total,
        beatGhost: !!before && isBest,
        newBest: isBest,
      };
      if (isBest) Ghosts.store(this.track, this.laps, data);
    }
  }

  saveRecord(lapTime) {
    const recordKey = this.track.recordKey;
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
