// Ghosts: a recording of your best race on a track, replayed as a see-through
// kart in YOU mode.
//
// Every race you finish is recorded — where your kart was 30 times a second,
// and when you passed each checkpoint. If it's your fastest race on that
// track, it becomes your ghost (saved in the browser, one per track).

const GHOST_STEP = 1 / 30; // seconds between recorded positions

const Ghosts = {
  cache: {},

  // Each track and race length has its own ghost, so a 3-lap race is never
  // compared with a 10-lap one.
  key(track, laps) {
    return track.ghostKey + ':l' + laps;
  },

  // Your saved ghost for a track and number of laps, or null if you haven't
  // finished a race like that yet.
  load(track, laps) {
    const id = track.id + ':' + laps;
    if (!(id in this.cache)) {
      let g = Save.get(this.key(track, laps), null);
      if (!g && laps === 10) g = Save.get(track.ghostKey, null);   // ghosts saved before you could pick the laps
      const ok = g && g.v === 1 && g.laps === laps && g.total > 0
        && Array.isArray(g.s) && g.s.length >= 6 && g.s.length % 3 === 0 && Array.isArray(g.cp);
      this.cache[id] = ok ? g : null;
    }
    return this.cache[id];
  },

  store(track, laps, data) {
    this.cache[track.id + ':' + laps] = data;
    Save.set(this.key(track, laps), data);
  },

  // Where the ghost is at race time t (interpolated between recorded positions).
  sample(g, t) {
    const n = g.s.length / 3;
    const f = clamp(t / GHOST_STEP, 0, n - 1);
    const i = Math.min(Math.floor(f), n - 2);
    const k = f - i;
    const a = i * 3, b = a + 3;
    const dh = wrapAngle(g.s[b + 2] - g.s[a + 2]);
    return {
      x: g.s[a] + (g.s[b] - g.s[a]) * k,
      y: g.s[a + 1] + (g.s[b + 1] - g.s[a + 1]) * k,
      heading: g.s[a + 2] + dh * k,
      steer: clamp(dh / GHOST_STEP / 2.9, -1, 1),
    };
  },
};

// Collects positions while a race is on.
class GhostRecorder {
  constructor() {
    this.s = [];
    this.next = 0;
  }

  // Call every physics step with the race clock and the player's kart.
  update(time, kart) {
    while (this.next <= time) {
      this.push(kart);
      this.next += GHOST_STEP;
    }
  }

  push(kart) {
    this.s.push(Math.round(kart.x * 10) / 10, Math.round(kart.y * 10) / 10, Math.round(kart.heading * 100) / 100);
  }

  finish(laps, racer, teamId, paint) {
    this.push(racer.kart); // one last position at the finish line
    return {
      v: 1,
      laps,
      total: racer.finishTime,
      team: teamId,
      paint: paint || null,   // so the ghost wears the paint you had on that day
      cp: racer.cpTimes.map((t) => Math.round(t * 1000) / 1000),
      s: this.s,
    };
  }
}
