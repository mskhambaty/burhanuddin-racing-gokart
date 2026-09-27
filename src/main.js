// The game loop: reads keys, moves everything, draws everything, ~60 times a second.
//
// Screens:  menu -> garage -> race -> (results) -> garage ...           (career)
//           menu -> teams -> race -> (results) -> race again ...          (two players)

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Physics runs in small fixed steps so the karts behave the same on fast and slow laptops.
const STEP = 1 / 120;

const Game = {
  screen: 'menu', // menu | garage | teams | race | paused
  mode: 'career', // career | versus
  track: TRACKS.giza,
  race: null,
  prize: null,    // prize money won in the last career race
  difficulty: Save.get('difficulty', 'easy'),
  skidLayer: null, // skid marks stay on the track until the next race

  start() {
    Input.init(canvas);
    Career.load();
    this.skidLayer = document.createElement('canvas');
    this.skidLayer.width = GAME_WIDTH;
    this.skidLayer.height = GAME_HEIGHT;
    this.showMenu();

    let last = performance.now();
    let acc = 0;
    const frame = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      this.handleKeys(dt);
      while (acc >= STEP) {
        if (this.screen === 'race') this.race.update(STEP);
        acc -= STEP;
      }
      this.payPrizeMoney();
      this.draw();
      Input.endFrame();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  },

  clearSkids() {
    this.skidLayer.getContext('2d').clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  },

  showMenu() {
    this.screen = 'menu';
    this.clearSkids();
    // Put karts on the grid behind the title card, just for looks.
    this.race = new Race(this.track, 1, this.difficulty);
  },

  showGarage() {
    this.screen = 'garage';
    Garage.selected = 4;
  },

  startCareerRace() {
    this.mode = 'career';
    this.startRace(1, [{ team: Career.data.team, stats: Career.kartStats() }]);
  },

  showTeamSelect() {
    this.screen = 'teams';
    TeamSelect.open();
  },

  startVersusRace(teams) {
    this.mode = 'versus';
    this.versusTeams = teams;
    this.startRace(2, teams.map((team) => ({ team })));
  },

  startRace(playerCount, players) {
    this.race = new Race(this.track, playerCount, this.difficulty, players);
    this.prize = null;
    this.clearSkids();
    this.screen = 'race';
  },

  // After a career race, add the prize money once.
  payPrizeMoney() {
    const race = this.race;
    if (this.mode !== 'career' || this.screen !== 'race') return;
    if (race.state !== 'finished' || this.prize != null) return;
    this.prize = Career.recordRace(race.humans[0].position, this.difficulty);
  },

  handleKeys(dt) {
    if (this.screen === 'menu') {
      if (Input.pressed('Digit1') || Input.pressed('Numpad1')) this.showGarage();
      else if (Input.pressed('Digit2') || Input.pressed('Numpad2')) this.showTeamSelect();
      else if (Input.pressed('KeyD')) {
        const i = DIFFICULTY_ORDER.indexOf(this.difficulty);
        this.difficulty = DIFFICULTY_ORDER[(i + 1) % DIFFICULTY_ORDER.length];
        Save.set('difficulty', this.difficulty);
      }
      return;
    }
    if (this.screen === 'garage') {
      Garage.update(this, dt);
      return;
    }
    if (this.screen === 'teams') {
      TeamSelect.update(this);
      return;
    }
    if (Input.pressed('Escape')) {
      // Career: back to the garage (leaving early wins nothing). Two players: menu.
      if (this.mode === 'career') this.showGarage();
      else this.showMenu();
      return;
    }
    if (Input.pressed('KeyP') && this.race.state !== 'finished') {
      this.screen = this.screen === 'paused' ? 'race' : 'paused';
    }
    if (this.race.state === 'finished' && (Input.pressed('Enter') || Input.pressed('NumpadEnter'))) {
      if (this.mode === 'career') this.showGarage();
      else this.startVersusRace(this.versusTeams);
    }
  },

  draw() {
    if (this.screen === 'garage') {
      Garage.draw(ctx, this);
      return;
    }
    if (this.screen === 'teams') {
      TeamSelect.draw(ctx);
      return;
    }

    const race = this.race;
    ctx.drawImage(this.track.render(), 0, 0);

    // Paint any new skid marks onto the skid layer, then draw it.
    const sctx = this.skidLayer.getContext('2d');
    sctx.fillStyle = 'rgba(20,20,20,0.22)';
    for (const s of race.skids) {
      sctx.beginPath();
      sctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
      sctx.fill();
    }
    race.skids.length = 0;
    ctx.drawImage(this.skidLayer, 0, 0);

    for (const r of race.racers) {
      ctx.globalAlpha = r.finished && !r.isHuman ? 0.45 : 1;
      r.kart.draw(ctx);
    }
    ctx.globalAlpha = 1;

    for (const d of race.dust) {
      const a = d.life / d.max;
      ctx.fillStyle = 'rgba(230,205,150,' + (0.6 * a).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * (2 - a), 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.screen === 'menu') {
      HUD.title(ctx, this.track, Save.get('best-lap:' + this.track.id, null), this.difficulty);
      return;
    }

    for (const r of race.humans) HUD.kartWarnings(ctx, r);
    HUD.leaderboard(ctx, race);
    HUD.racerPanel(ctx, race, race.humans[0], 12, 12);
    if (race.humans[1]) HUD.racerPanel(ctx, race, race.humans[1], GAME_WIDTH - 252, 12);
    HUD.countdown(ctx, race);

    if (race.state === 'finished') HUD.results(ctx, race, this.mode === 'career' ? this.prize : null);
    else if (this.screen === 'paused') HUD.paused(ctx);
  },
};

Game.start();
