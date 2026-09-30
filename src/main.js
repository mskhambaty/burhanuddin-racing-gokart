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

// The top-down camera follows your kart. Smaller = zoomed out (see more of the track).
const TOPDOWN_ZOOM = 0.85;

const Game = {
  screen: 'menu', // menu | garage | race | paused
  track: TRACKS[Save.get('track', 'giza')] || TRACKS.giza,
  mode: Save.get('mode', 'race'), // race (vs the computer) | ghost (YOU mode: vs your best time)
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
    this.skidLayer.width = WORLD_WIDTH;
    this.skidLayer.height = WORLD_HEIGHT;
    this.showMenu();
    setTimeout(() => this.warmUp(this.track), 200); // the track you last chose

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
    this.skidLayer.getContext('2d').clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  },

  showMenu() {
    this.screen = 'menu';
    this.clearSkids();
    // Karts on the grid behind the title card, just for looks.
    this.race = new Race(this.track, 1, this.difficulty, [{ team: Career.data.team }]);
  },

  showGarage() {
    this.screen = 'garage';
    Garage.selected = 6;
  },

  startRace() {
    this.warmUp(this.track); // a no-op if the garage already did it
    const players = [{ team: Career.data.team, stats: Career.kartStats() }];
    this.race = new Race(this.track, 1, this.difficulty, players, { ghostMode: this.mode === 'ghost' });
    this.race.controlMode = this.controls;
    this.view = 'cockpit'; // every race starts in the steering wheel view (C switches)
    this.prize = null;
    this.camHeading = this.race.humans[0].kart.heading;
    this.clearSkids();
    this.screen = 'race';
  },

  // After a race, add the prize money once (there are no prizes in YOU mode).
  payPrizeMoney() {
    if (this.screen !== 'race' || this.race.ghostMode) return;
    if (this.race.state !== 'finished' || this.prize != null) return;
    this.prize = Career.recordRace(this.race.humans[0].position, this.difficulty);
  },

  // The bigger tracks take a moment to draw the first time. Do it now (while
  // you are in the garage) so the race itself never stutters.
  warmUp(track) {
    track.render();      // the map, scenery and minimap
    groundFor(track);    // the ground used by the 3D views
  },

  // Pick the track (dir = 1 next, -1 previous).
  changeTrack(dir) {
    const i = TRACK_ORDER.indexOf(this.track.id);
    this.track = TRACKS[TRACK_ORDER[(i + dir + TRACK_ORDER.length) % TRACK_ORDER.length]];
    Save.set('track', this.track.id);
    const track = this.track;
    setTimeout(() => this.warmUp(track), 40); // after the garage has redrawn
  },

  changeMode() {
    this.mode = this.mode === 'race' ? 'ghost' : 'race';
    Save.set('mode', this.mode);
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
      this.drawTopDown(true); // the whole map, behind the title card
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
    if (race.state === 'finished') {
      if (race.ghostMode) HUD.resultsGhost(ctx, race);
      else HUD.results(ctx, race, this.prize);
    }
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

  // The view from above. In a race the camera follows your kart; on the title
  // screen (whole = true) the whole map is shown.
  drawTopDown(whole) {
    const race = this.race;
    let zoom = GAME_WIDTH / WORLD_WIDTH, x = 0, y = 0;
    if (!whole) {
      const k = race.humans[0].kart;
      zoom = TOPDOWN_ZOOM;
      x = clamp(k.x - GAME_WIDTH / zoom / 2, 0, Math.max(0, WORLD_WIDTH - GAME_WIDTH / zoom));
      y = clamp(k.y - GAME_HEIGHT / zoom / 2, 0, Math.max(0, WORLD_HEIGHT - GAME_HEIGHT / zoom));
    }
    const vw = GAME_WIDTH / zoom, vh = GAME_HEIGHT / zoom;
    // Only the part of the map you can see is drawn.
    ctx.drawImage(this.track.render(), x, y, vw, vh, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.drawImage(this.skidLayer, x, y, vw, vh, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-x, -y);
    this.drawRacersFromAbove(race);
    ctx.restore();
  },

  drawRacersFromAbove(race) {
    for (const r of race.racers) {
      ctx.globalAlpha = r.finished && !r.isHuman ? 0.45 : 1;
      r.kart.draw(ctx);
    }
    ctx.globalAlpha = 1;
    if (race.ghost && this.screen !== 'menu') {
      const k = race.ghost.kart;
      ctx.globalAlpha = 0.5;
      k.draw(ctx);
      ctx.globalAlpha = 1;
      HUD.text(ctx, 'GHOST', k.x, k.y - 20, { font: 'bold 11px system-ui, sans-serif', align: 'center', color: '#e8e8ff', outlineWidth: 3 });
    }
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
