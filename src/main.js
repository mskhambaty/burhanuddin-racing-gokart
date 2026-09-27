// The game loop: reads the controls, moves everything, draws everything,
// ~60 times a second.
//
// Screens:  menu -> garage -> race -> (results) -> garage -> ...

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Physics runs in small fixed steps so the karts behave the same on fast and slow laptops.
const STEP = 1 / 120;

// The three ways to watch your kart. Press C (or click the VIEW button) to switch.
const VIEW_MODES = ['cockpit', 'chase', 'top'];
const VIEW_LABELS = { cockpit: 'Steering wheel', chase: 'Rear', top: 'Top down' };

const Game = {
  screen: 'menu', // menu | garage | race | paused
  track: TRACKS.giza,
  race: null,
  prize: null,    // prize money won in the last race
  difficulty: Save.get('difficulty', 'easy'),
  controls: Save.get('controls', 'trackpad'),
  view: Save.get('view', 'cockpit'),
  camHeading: 0,  // the rear camera swings round smoothly behind the kart
  pointerOnButton: false, // pressing a button shouldn't also brake
  time: 0,
  skidLayer: null, // skid marks stay on the track until the next race

  start() {
    Input.init(canvas);
    Career.load();
    if (!VIEW_MODES.includes(this.view)) this.view = 'cockpit';
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
      this.time += dt;
      this.handleInput(dt);
      while (acc >= STEP) {
        if (this.screen === 'race') this.race.update(STEP);
        acc -= STEP;
      }
      this.payPrizeMoney();
      this.updateCamera(dt);
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
    // Karts on the grid behind the title card, just for looks.
    this.race = new Race(this.track, 1, this.difficulty, [{ team: Career.data.team }]);
  },

  showGarage() {
    this.screen = 'garage';
    Garage.selected = 4;
  },

  startRace() {
    const players = [{ team: Career.data.team, stats: Career.kartStats() }];
    this.race = new Race(this.track, 1, this.difficulty, players);
    this.race.controlMode = this.controls;
    this.prize = null;
    this.camHeading = this.race.humans[0].kart.heading;
    this.clearSkids();
    this.screen = 'race';
  },

  // After a race, add the prize money once.
  payPrizeMoney() {
    if (this.screen !== 'race' || this.race.state !== 'finished' || this.prize != null) return;
    this.prize = Career.recordRace(this.race.humans[0].position, this.difficulty);
  },

  cycleView() {
    this.view = VIEW_MODES[(VIEW_MODES.indexOf(this.view) + 1) % VIEW_MODES.length];
    Save.set('view', this.view);
  },

  cycleDifficulty() {
    this.difficulty = DIFFICULTY_ORDER[(DIFFICULTY_ORDER.indexOf(this.difficulty) + 1) % DIFFICULTY_ORDER.length];
    Save.set('difficulty', this.difficulty);
  },

  toggleControls() {
    this.controls = this.controls === 'trackpad' ? 'keyboard' : 'trackpad';
    Save.set('controls', this.controls);
  },

  // The rear camera turns smoothly to follow the kart instead of snapping.
  updateCamera(dt) {
    if (!this.race || !this.race.humans.length) return;
    const kart = this.race.humans[0].kart;
    const diff = wrapAngle(kart.heading - this.camHeading);
    this.camHeading += diff * Math.min(1, dt * 6);
  },

  clicked(rect) {
    return Input.mouse.clicked && Input.mouseIn(rect);
  },

  handleInput(dt) {
    if (!Input.mouse.down) this.pointerOnButton = false;

    if (this.screen === 'menu') {
      const b = HUD.menuButtons();
      if (Input.pressed('Enter') || Input.pressed('Space') || Input.pressed('Digit1') || this.clicked(b.start)) {
        this.showGarage();
      } else if (Input.pressed('KeyD') || this.clicked(b.difficulty)) {
        this.cycleDifficulty();
      } else if (Input.pressed('KeyT') || this.clicked(b.controls)) {
        this.toggleControls();
      }
      return;
    }
    if (this.screen === 'garage') {
      Garage.update(this, dt);
      return;
    }

    // Racing (or paused).
    const race = this.race;
    const b = HUD.raceButtons();
    for (const r of [b.view, b.pause]) {
      if (this.clicked(r)) this.pointerOnButton = true;
    }
    race.ignorePointerBrake = this.pointerOnButton;

    if (Input.pressed('Escape')) {
      this.showGarage(); // leaving early wins nothing
      return;
    }
    if (Input.pressed('KeyC') || Input.pressed('KeyV') || this.clicked(b.view)) this.cycleView();

    if (race.state === 'finished') {
      // Wait a moment so a click meant for braking doesn't skip the results.
      const ready = race.time - race.finishedAt > 1;
      if (Input.pressed('Enter') || Input.pressed('Space') || (ready && Input.mouse.clicked && !this.pointerOnButton)) {
        this.showGarage();
      }
      return;
    }
    if (Input.pressed('KeyP') || this.clicked(b.pause)) {
      this.screen = this.screen === 'paused' ? 'race' : 'paused';
    } else if (this.screen === 'paused' && Input.mouse.clicked && !this.pointerOnButton) {
      this.screen = 'race';
    }
  },

  draw() {
    // Hide the pointer while racing with the trackpad — the steering wheel shows where it is.
    const b = HUD.raceButtons();
    const racing = this.screen === 'race' && this.race.state !== 'finished';
    const overButton = Input.mouseIn(b.view) || Input.mouseIn(b.pause);
    canvas.style.cursor = racing && this.controls === 'trackpad' && !overButton ? 'none' : 'default';

    if (this.screen === 'garage') {
      Garage.draw(ctx, this);
      return;
    }

    const race = this.race;
    this.paintSkids();

    if (this.screen === 'menu') {
      this.drawTopDown();
      HUD.title(ctx, this);
      return;
    }

    const me = race.humans[0];
    if (this.view === 'top') {
      this.drawTopDown();
    } else {
      const heading = this.view === 'chase' ? this.camHeading : me.kart.heading;
      draw3DView(ctx, { x: 0, y: 0, w: GAME_WIDTH, h: GAME_HEIGHT }, race, me, this.view, heading, this.time);
    }

    HUD.raceHud(ctx, this, race, me);
    if (race.state === 'finished') HUD.results(ctx, race, this.prize);
    else if (this.screen === 'paused') HUD.paused(ctx);
  },

  // Paint any new skid marks onto the skid layer.
  paintSkids() {
    const sctx = this.skidLayer.getContext('2d');
    sctx.fillStyle = 'rgba(20,20,20,0.22)';
    for (const s of this.race.skids) {
      sctx.beginPath();
      sctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
      sctx.fill();
    }
    this.race.skids.length = 0;
  },

  drawTopDown() {
    const race = this.race;
    ctx.drawImage(this.track.render(), 0, 0);
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
  },
};

Game.start();
