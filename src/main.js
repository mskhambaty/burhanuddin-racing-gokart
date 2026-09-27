// The game loop: reads keys, moves everything, draws everything, ~60 times a second.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Physics runs in small fixed steps so the karts behave the same on fast and slow laptops.
const STEP = 1 / 120;

const Game = {
  screen: 'menu', // menu | race | paused
  track: TRACKS.giza,
  race: null,
  playerCount: 1,
  difficulty: Save.get('difficulty', 'easy'),
  skidLayer: null, // skid marks stay on the track until the next race

  start() {
    Input.init();
    this.skidLayer = document.createElement('canvas');
    this.skidLayer.width = GAME_WIDTH;
    this.skidLayer.height = GAME_HEIGHT;
    this.showMenu();

    let last = performance.now();
    let acc = 0;
    const frame = (now) => {
      acc += Math.min(0.1, (now - last) / 1000);
      last = now;
      this.handleKeys();
      while (acc >= STEP) {
        if (this.screen === 'race') this.race.update(STEP);
        acc -= STEP;
      }
      this.draw();
      Input.endFrame();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  },

  showMenu() {
    this.screen = 'menu';
    this.skidLayer.getContext('2d').clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    // Put karts on the grid behind the title card, just for looks.
    this.race = new Race(this.track, 1, this.difficulty);
  },

  newRace(playerCount) {
    this.playerCount = playerCount;
    this.race = new Race(this.track, playerCount, this.difficulty);
    this.skidLayer.getContext('2d').clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.screen = 'race';
  },

  handleKeys() {
    if (this.screen === 'menu') {
      if (Input.pressed('Digit1') || Input.pressed('Numpad1')) this.newRace(1);
      else if (Input.pressed('Digit2') || Input.pressed('Numpad2')) this.newRace(2);
      else if (Input.pressed('KeyD')) {
        const i = DIFFICULTY_ORDER.indexOf(this.difficulty);
        this.difficulty = DIFFICULTY_ORDER[(i + 1) % DIFFICULTY_ORDER.length];
        Save.set('difficulty', this.difficulty);
        this.race = new Race(this.track, 1, this.difficulty);
      }
      return;
    }
    if (Input.pressed('Escape')) {
      this.showMenu();
      return;
    }
    if (Input.pressed('KeyP')) {
      this.screen = this.screen === 'paused' ? 'race' : 'paused';
    }
    if (this.race.state === 'finished' && (Input.pressed('Enter') || Input.pressed('NumpadEnter'))) {
      this.newRace(this.playerCount);
    }
  },

  draw() {
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
    if (race.humans[1]) HUD.racerPanel(ctx, race, race.humans[1], GAME_WIDTH - 222, 12);
    HUD.countdown(ctx, race);

    if (race.state === 'finished') HUD.results(ctx, race);
    else if (this.screen === 'paused') HUD.paused(ctx);
  },
};

Game.start();
