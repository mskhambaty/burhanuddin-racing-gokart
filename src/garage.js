// The garage: see your money, upgrade your kart, and head out to race.
// Works with the keyboard (Up/Down + Enter) or the mouse.

const Garage = {
  selected: 6,        // which button is highlighted (6 = the RACE button)
  message: null,      // { text, good, time } — a short note after buying
  resetArmed: false,  // press R twice to start a new career
  showcase: null,     // the big kart drawn on the left
  teamArrows: {
    left: { x: 90, y: 360, w: 44, h: 40 },
    right: { x: 406, y: 360, w: 44, h: 40 },
  },

  // Buttons: one per upgrade, then the track and mode pickers, then the race button.
  buttons() {
    const list = UPGRADE_ORDER.map((key, i) => ({
      kind: 'upgrade', key, x: 560, y: 150 + i * 76, w: 680, h: 68,
    }));
    list.push({ kind: 'track', x: 560, y: 460, w: 336, h: 52 });
    list.push({ kind: 'mode', x: 904, y: 460, w: 336, h: 52 });
    list.push({ kind: 'race', x: 560, y: 526, w: 680, h: 114 });
    return list;
  },

  update(game, dt) {
    const buttons = this.buttons();
    if (this.message) {
      this.message.time -= dt;
      if (this.message.time <= 0) this.message = null;
    }

    if (Input.pressed('ArrowUp') || Input.pressed('KeyW')) {
      this.selected = (this.selected - 1 + buttons.length) % buttons.length;
    }
    if (Input.pressed('ArrowDown') || Input.pressed('KeyS')) {
      this.selected = (this.selected + 1) % buttons.length;
    }

    let activate = Input.pressed('Enter') || Input.pressed('NumpadEnter') || Input.pressed('Space');
    let clickDir = 1; // clicking the left end of a picker goes back, anywhere else goes forward
    buttons.forEach((b, i) => {
      if (Input.mouse.moved && Input.mouseIn(b)) this.selected = i;
      if (Input.mouse.clicked && Input.mouseIn(b)) {
        this.selected = i;
        activate = true;
        clickDir = Input.mouse.x < b.x + 64 ? -1 : 1;
      }
    });

    if (activate) {
      const b = buttons[this.selected];
      if (b.kind === 'race') {
        game.startRace();
      } else if (b.kind === 'track') {
        game.changeTrack(clickDir);
      } else if (b.kind === 'mode') {
        game.changeMode();
      } else {
        const result = Career.buy(b.key);
        this.message = { text: result.text, good: result.ok, time: 2.5 };
      }
    }

    // Left/Right change the track or mode when one of those is highlighted,
    // otherwise they change your team (you can also click the arrows under the kart).
    let keyDir = 0;
    if (Input.pressed('ArrowLeft') || Input.pressed('KeyA')) keyDir = -1;
    if (Input.pressed('ArrowRight') || Input.pressed('KeyD')) keyDir = 1;
    const kind = buttons[this.selected].kind;
    let teamDir = 0;
    if (keyDir && kind === 'track') game.changeTrack(keyDir);
    else if (keyDir && kind === 'mode') game.changeMode();
    else teamDir = keyDir;
    if (Input.mouse.clicked && Input.mouseIn(this.teamArrows.left)) teamDir = -1;
    if (Input.mouse.clicked && Input.mouseIn(this.teamArrows.right)) teamDir = 1;
    if (teamDir) {
      Career.data.team = nextTeam(Career.data.team, teamDir);
      Career.save();
      this.showcase = null;
    }

    if (Input.pressed('KeyR')) {
      if (this.resetArmed) {
        Career.reset();
        this.resetArmed = false;
        this.message = { text: 'New career started. Good luck!', good: true, time: 2.5 };
      } else {
        this.resetArmed = true;
        this.message = { text: 'Press R again to delete your career and start over', good: false, time: 3 };
      }
    } else if (Input.justPressed.size > 0 || Input.mouse.clicked) {
      this.resetArmed = false;
    }

    if (Input.pressed('Escape')) game.showMenu();
  },

  draw(ctx, game) {
    const c = Career.data;

    // Garage floor and walls.
    const bg = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    bg.addColorStop(0, '#4a0d16');
    bg.addColorStop(1, '#1a0508');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(0, 96, GAME_WIDTH, 3);

    // Header.
    HUD.text(ctx, TEAMS[c.team].name.toUpperCase(), 40, 52, {
      font: 'bold 38px system-ui, sans-serif', color: COLORS.gold, outline: false, maxWidth: 560,
    });
    HUD.text(ctx, 'TEAM GARAGE · CAIRO', 42, 80, {
      font: 'bold 15px system-ui, sans-serif', color: '#999', outline: false,
    });
    HUD.text(ctx, formatMoney(c.money), GAME_WIDTH - 40, 58, {
      font: 'bold 38px system-ui, sans-serif', color: '#5dff7a', align: 'right', outline: false,
    });
    HUD.text(ctx, 'Races ' + c.races + '  ·  Wins ' + c.wins + '  ·  Podiums ' + c.podiums, GAME_WIDTH - 40, 82, {
      font: '15px system-ui, sans-serif', color: '#aaa', align: 'right', outline: false,
    });

    this.drawKart(ctx);
    this.drawStats(ctx);

    const buttons = this.buttons();
    buttons.forEach((b, i) => {
      const on = i === this.selected;
      if (b.kind === 'upgrade') this.drawUpgrade(ctx, b, on);
      else if (b.kind === 'track') {
        const record = Save.get(game.track.recordKey, null);
        this.drawPicker(ctx, b, on, 'TRACK  ·  best lap ' + formatTime(record), game.track.name);
      } else if (b.kind === 'mode') {
        this.drawPicker(ctx, b, on, 'MODE', game.mode === 'ghost' ? 'YOU  (race your ghost)' : 'Race the computer');
      } else this.drawRaceButton(ctx, b, on, game);
    });

    // Message after buying something.
    if (this.message) {
      HUD.text(ctx, this.message.text, 280, 672, {
        font: 'bold 18px system-ui, sans-serif', align: 'center',
        color: this.message.good ? '#5dff7a' : '#ff8a7a', outline: false,
      });
    }
    const sel = buttons[this.selected].kind;
    const hint = sel === 'track' || sel === 'mode' ? '← → change' : 'Enter buy / race';
    HUD.text(ctx, '↑ ↓ choose  ·  ' + hint + '  ·  or click  ·  Esc menu  ·  R R new career', GAME_WIDTH / 2, 706, {
      font: '14px system-ui, sans-serif', align: 'center', color: '#777', outline: false,
    });
  },

  drawKart(ctx) {
    if (!this.showcase) {
      this.showcase = new Kart(Object.assign(playerSetup(0, Career.data.team), { x: 0, y: 0, heading: -Math.PI / 2 }));
    }
    const cx = 270, cy = 235;
    // Turntable.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 5, 160, 100, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(212,160,23,0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(5.5, 5.5);
    this.showcase.heading = -Math.PI / 2 + Math.sin(performance.now() / 1400) * 0.35;
    this.showcase.draw(ctx);
    ctx.restore();

    // Team picker: ◀ Team name ▶
    const a = this.teamArrows;
    for (const [r, label] of [[a.left, '◀'], [a.right, '▶']]) {
      ctx.fillStyle = Input.mouseIn(r) ? 'rgba(212,160,23,0.3)' : 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, 8);
      ctx.fill();
      HUD.text(ctx, label, r.x + r.w / 2, r.y + 28, {
        font: 'bold 20px system-ui, sans-serif', align: 'center', color: COLORS.gold, outline: false,
      });
    }
    HUD.text(ctx, TEAMS[Career.data.team].name, cx, a.left.y + 28, {
      font: 'bold 22px system-ui, sans-serif', align: 'center', outline: false, maxWidth: 250,
    });
    HUD.text(ctx, '← → change team (when no picker is selected)', cx, a.left.y + 52, {
      font: '13px system-ui, sans-serif', align: 'center', color: '#999', outline: false,
    });
  },

  drawStats(ctx) {
    const stats = Career.kartStats();
    const rows = [
      ['Top speed', Math.round(stats.topSpeed * 0.36) + ' km/h', 'engine'],
      ['Acceleration', null, 'gearbox'],
      ['Grip', null, 'tyres'],
      ['Braking', null, 'brakes'],
    ];
    const x = 60, w = 420;
    rows.forEach(([label, value, key], i) => {
      const y = 450 + i * 50;
      HUD.text(ctx, label, x, y, { font: 'bold 16px system-ui, sans-serif', color: '#ddd', outline: false });
      if (value) HUD.text(ctx, value, x + w, y, {
        font: '15px system-ui, sans-serif', color: '#aaa', align: 'right', outline: false,
      });
      // Bar: grey = maximum possible, gold = what you have now.
      const lvl = Career.level(key);
      ctx.fillStyle = '#333';
      ctx.fillRect(x, y + 10, w, 12);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(x, y + 10, w * (0.4 + 0.6 * (lvl - 1) / (ECONOMY.maxLevel - 1)), 12);
    });
  },

  drawButtonBox(ctx, b, on, border) {
    ctx.fillStyle = on ? 'rgba(212,160,23,0.16)' : 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 12);
    ctx.fill();
    ctx.strokeStyle = on ? COLORS.gold : border || '#444';
    ctx.lineWidth = on ? 3 : 1.5;
    ctx.stroke();
  },

  drawUpgrade(ctx, b, on) {
    const u = ECONOMY.upgrades[b.key];
    const lvl = Career.level(b.key);
    const price = Career.nextPrice(b.key);
    this.drawButtonBox(ctx, b, on);

    HUD.text(ctx, u.name, b.x + 24, b.y + 30, { font: 'bold 22px system-ui, sans-serif', outline: false });
    HUD.text(ctx, u.improves + '  +' + Math.round(u.perLevel * 100) + '% per level', b.x + 24, b.y + 54, {
      font: '14px system-ui, sans-serif', color: '#999', outline: false,
    });

    // Level pips.
    for (let i = 0; i < ECONOMY.maxLevel; i++) {
      ctx.fillStyle = i < lvl ? COLORS.gold : '#3a3a3a';
      ctx.beginPath();
      ctx.roundRect(b.x + 250 + i * 34, b.y + 22, 26, 18, 4);
      ctx.fill();
    }
    HUD.text(ctx, 'Level ' + lvl, b.x + 250, b.y + 57, {
      font: '13px system-ui, sans-serif', color: '#888', outline: false,
    });

    let label, color;
    if (price == null) {
      label = 'MAX';
      color = COLORS.goldLight;
    } else {
      label = 'Upgrade  ' + formatMoney(price);
      color = Career.data.money >= price ? '#5dff7a' : '#ff8a7a';
    }
    HUD.text(ctx, label, b.x + b.w - 24, b.y + 42, {
      font: 'bold 20px system-ui, sans-serif', color, align: 'right', outline: false,
    });
  },

  // A picker: ◀ value ▶ (click either end, or anywhere to go forward).
  drawPicker(ctx, b, on, label, value) {
    this.drawButtonBox(ctx, b, on);
    HUD.text(ctx, label, b.x + b.w / 2, b.y + 19, {
      font: '12px system-ui, sans-serif', align: 'center', color: '#999', outline: false, maxWidth: b.w - 110,
    });
    HUD.text(ctx, value, b.x + b.w / 2, b.y + 41, {
      font: 'bold 20px system-ui, sans-serif', align: 'center', outline: false, maxWidth: b.w - 110,
    });
    for (const [x, ch] of [[b.x + 22, '◀'], [b.x + b.w - 22, '▶']]) {
      HUD.text(ctx, ch, x, b.y + 33, {
        font: 'bold 18px system-ui, sans-serif', align: 'center', color: COLORS.gold, outline: false,
      });
    }
  },

  drawRaceButton(ctx, b, on, game) {
    this.drawButtonBox(ctx, b, on, COLORS.gold);
    HUD.text(ctx, (game.mode === 'ghost' ? 'RACE YOUR GHOST  ▶  ' : 'RACE  ▶  ') + game.track.name, b.x + 24, b.y + 42, {
      font: 'bold 26px system-ui, sans-serif', color: COLORS.gold, outline: false, maxWidth: b.w - 48,
    });
    const line = (str, y, color) => HUD.text(ctx, str, b.x + 24, y, {
      font: '15px system-ui, sans-serif', color, outline: false, maxWidth: b.w - 48,
    });
    if (game.mode === 'ghost') {
      const g = Ghosts.load(game.track);
      line(g ? 'Your ghost: ' + formatTime(g.total) + ' for ' + game.track.laps + ' laps, driven for ' + (TEAMS[g.team] || TEAMS.burhanuddin).name
             : 'No ghost yet — your first finished race here becomes your ghost', b.y + 72, '#ddd');
      line('Just you against your best time · no prizes · beat it and the ghost gets faster', b.y + 96, '#888');
    } else {
      const diff = DIFFICULTIES[game.difficulty];
      const prizes = ECONOMY.prizes.slice(0, 3).map((_, i) => ordinal(i + 1) + ' ' + formatMoney(prizeFor(i + 1, game.difficulty)));
      line('Prizes: ' + prizes.join('  ·  '), b.y + 72, '#ccc');
      line(diff.label + ' computer drivers (top speed ' + diff.topKmh + ' km/h) · ' + game.track.laps + ' laps · change on the main menu', b.y + 96, '#888');
    }
  },
};
