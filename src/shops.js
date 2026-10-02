// The two shops you can open from the garage:
//
//   PaintShop    - paint your kart, choose stripes and pick your race number.
//   DriverMarket - hire teammates who race for your team.
//
// Both work with the mouse (click) and the keyboard (arrows + Enter, Esc to go back).

// The dark red backdrop with the gold line, the title and your money.
function shopBackdrop(ctx, title, subtitle) {
  const bg = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  bg.addColorStop(0, '#4a0d16');
  bg.addColorStop(1, '#1a0508');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(0, 96, GAME_WIDTH, 3);
  HUD.text(ctx, title, 40, 52, { font: 'bold 38px system-ui, sans-serif', color: COLORS.gold, outline: false });
  HUD.text(ctx, subtitle, 42, 80, { font: 'bold 15px system-ui, sans-serif', color: '#999', outline: false });
  HUD.text(ctx, formatMoney(Career.data.money), GAME_WIDTH - 40, 58, {
    font: 'bold 38px system-ui, sans-serif', color: '#5dff7a', align: 'right', outline: false,
  });
}

// A rounded button (hover = brighter, big = gold outline).
function shopButton(ctx, r, label, opts = {}) {
  const hover = Input.mouseIn(r) || opts.focus;
  ctx.fillStyle = hover ? 'rgba(212,160,23,0.28)' : opts.fill || 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 10);
  ctx.fill();
  ctx.strokeStyle = hover || opts.strong ? COLORS.gold : '#555';
  ctx.lineWidth = opts.strong ? 3 : 1.5;
  ctx.stroke();
  HUD.text(ctx, label, r.x + r.w / 2, r.y + r.h / 2 + 1, {
    font: opts.font || 'bold 17px system-ui, sans-serif', align: 'center', baseline: 'middle',
    color: opts.color || '#fff', outline: false, maxWidth: r.w - 16,
  });
}

function shopMessage(ctx, message, x = 280, y = 672) {
  if (!message) return;
  HUD.text(ctx, message.text, x, y, {
    font: 'bold 18px system-ui, sans-serif', align: 'center', maxWidth: 520,
    color: message.good ? '#5dff7a' : '#ff8a7a', outline: false,
  });
}

// ====================================================================
//  Paint & number shop
// ====================================================================

const PaintShop = {
  TABS: ['Body', 'Stripe', 'Helmet', 'Style', 'Number'],
  PARTS: ['body', 'trim', 'helmet'],   // what the first three tabs paint
  tab: 0,
  focus: -1,            // the colour / style under the pointer or the keyboard cursor (-1 = none)
  numberDraft: 7,       // the number being looked at on the Number tab
  message: null,
  preview: null,        // the big kart on the left, and the look it was made for
  previewKey: '',

  open() {
    this.tab = 0;
    this.focus = -1;
    this.numberDraft = Career.data.paint.number;
    this.message = null;
    this.previewKey = '';
  },

  tabRect(i) { return { x: 560 + i * 138, y: 116, w: 128, h: 44 }; },
  resetRect: { x: 560, y: 590, w: 330, h: 44 },
  backRect: { x: 910, y: 590, w: 330, h: 44 },

  // The things you can click on the current tab.
  cells() {
    if (this.tab <= 2) {
      return PAINT_COLORS.map((c, i) => ({
        kind: 'color', value: c.hex, c,
        x: 560 + (i % 6) * 116, y: 184 + Math.floor(i / 6) * 128, w: 104, h: 116,
      }));
    }
    if (this.tab === 3) {
      return PAINT_STYLES.map((s, i) => ({
        kind: 'style', value: s.id, s,
        x: 560 + (i % 3) * 232, y: 184 + Math.floor(i / 3) * 128, w: 216, h: 116,
      }));
    }
    return [];
  },

  teamColor(part) {
    return TEAMS[Career.data.team][part];
  },

  // The colour currently on that part of the kart.
  currentColor(part) {
    return Career.data.paint[part] || this.teamColor(part);
  },

  // What the kart would look like with the thing under the pointer applied.
  previewPaint() {
    const p = Object.assign({}, Career.data.paint);
    const cells = this.cells();
    const cell = this.focus >= 0 ? cells[this.focus] : null;
    if (this.tab <= 2 && cell) p[this.PARTS[this.tab]] = cell.value === this.teamColor(this.PARTS[this.tab]) ? null : cell.value;
    if (this.tab === 3 && cell) p.style = cell.value;
    if (this.tab === 4) p.number = this.numberDraft;
    return p;
  },

  say(result) {
    this.message = { text: result.text, good: result.ok, time: 3 };
    if (result.ok) Garage.showcase = null;
  },

  activate(cell) {
    if (this.tab <= 2) {
      const part = this.PARTS[this.tab];
      if (cell.value === this.teamColor(part)) {          // the team's own colour is always free
        Career.data.paint[part] = null;
        Career.save();
        Garage.showcase = null;
        this.say({ ok: true, text: 'Back to the team colour' });
      } else {
        this.say(Career.useColor(part, cell.value));
      }
    } else if (this.tab === 3) {
      this.say(Career.useStyle(cell.value));
    }
  },

  setTab(i) {
    this.tab = (i + this.TABS.length) % this.TABS.length;
    this.focus = -1;
  },

  stepNumber(d) {
    this.digitsTyped = 0;
    this.numberDraft = ((this.numberDraft - 1 + d + 990) % 99) + 1;   // 1 to 99, wrapping
  },

  update(game, dt) {
    if (this.message) {
      this.message.time -= dt;
      if (this.message.time <= 0) this.message = null;
    }
    if (Input.pressed('Escape') || (Input.mouse.clicked && Input.mouseIn(this.backRect))) {
      game.showGarage();
      return;
    }

    // Tabs: click, or Q / E.
    for (let i = 0; i < this.TABS.length; i++) {
      if (Input.mouse.clicked && Input.mouseIn(this.tabRect(i))) this.setTab(i);
    }
    if (Input.pressed('KeyQ') || Input.pressed('PageUp')) this.setTab(this.tab - 1);
    if (Input.pressed('KeyE') || Input.pressed('PageDown')) this.setTab(this.tab + 1);

    if (Input.mouse.clicked && Input.mouseIn(this.resetRect)) {
      Career.resetPaint();
      Garage.showcase = null;
      this.say({ ok: true, text: 'Your kart is back in the team colours' });
    }

    const cells = this.cells();
    if (this.tab <= 3) {
      const cols = this.tab === 3 ? 3 : 6;
      if (Input.mouse.moved) this.focus = cells.findIndex((c) => Input.mouseIn(c));
      // Keyboard cursor.
      const move = (d) => { this.focus = clamp((this.focus < 0 ? 0 : this.focus) + d, 0, cells.length - 1); };
      if (Input.pressed('ArrowRight') || Input.pressed('KeyD')) move(this.focus < 0 ? 0 : 1);
      if (Input.pressed('ArrowLeft') || Input.pressed('KeyA')) move(this.focus < 0 ? 0 : -1);
      if (Input.pressed('ArrowDown') || Input.pressed('KeyS')) move(this.focus < 0 ? 0 : cols);
      if (Input.pressed('ArrowUp') || Input.pressed('KeyW')) move(this.focus < 0 ? 0 : -cols);
      const clicked = cells.findIndex((c) => Input.mouse.clicked && Input.mouseIn(c));
      if (clicked >= 0) {
        this.focus = clicked;
        this.activate(cells[clicked]);
      } else if ((Input.pressed('Enter') || Input.pressed('NumpadEnter')) && this.focus >= 0) {
        this.activate(cells[this.focus]);
      }
    } else {
      this.updateNumber();
    }
  },

  numberButtons() {
    return {
      minus10: { x: 640, y: 420, w: 90, h: 52, d: -10 }, minus1: { x: 744, y: 420, w: 90, h: 52, d: -1 },
      plus1: { x: 966, y: 420, w: 90, h: 52, d: 1 }, plus10: { x: 1070, y: 420, w: 90, h: 52, d: 10 },
      use: { x: 730, y: 486, w: 340, h: 56 },
    };
  },

  updateNumber() {
    const b = this.numberButtons();
    for (const key of ['minus10', 'minus1', 'plus1', 'plus10']) {
      if (Input.mouse.clicked && Input.mouseIn(b[key])) this.stepNumber(b[key].d);
    }
    if (Input.pressed('ArrowRight') || Input.pressed('KeyD')) this.stepNumber(1);
    if (Input.pressed('ArrowLeft') || Input.pressed('KeyA')) this.stepNumber(-1);
    if (Input.pressed('ArrowUp') || Input.pressed('KeyW')) this.stepNumber(10);
    if (Input.pressed('ArrowDown') || Input.pressed('KeyS')) this.stepNumber(-10);
    // Type a number: the digits you press make up the number.
    for (let d = 0; d <= 9; d++) {
      if (Input.pressed('Digit' + d) || Input.pressed('Numpad' + d)) {
        if (d === 0 && this.digitsTyped !== 1) continue;   // a number can't start with 0
        const typed = this.digitsTyped === 1 ? this.numberDraft * 10 + d : d;
        this.numberDraft = clamp(typed, 1, 99);
        this.digitsTyped = this.digitsTyped === 1 ? 2 : 1;
      }
    }
    if ((Input.mouse.clicked && Input.mouseIn(b.use)) || Input.pressed('Enter') || Input.pressed('NumpadEnter')) {
      this.say(Career.useNumber(this.numberDraft));
    }
  },

  draw(ctx) {
    const c = Career.data;
    shopBackdrop(ctx, 'PAINT & NUMBER SHOP', 'Make the kart yours · colours cost ' + formatMoney(PAINT_PRICE) + ' the first time, then they are free');

    // ----- Your kart, with the thing you are looking at applied -----
    const paint = this.previewPaint();
    const key = c.team + JSON.stringify(paint);
    if (key !== this.previewKey || !this.preview) {
      this.preview = new Kart(Object.assign(playerSetup(0, c.team, paint), { x: 0, y: 0, heading: -Math.PI / 2 }));
      this.previewKey = key;
    }
    const cx = 270, cy = 255;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 5, 190, 125, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(212,160,23,0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(7, 7);
    this.preview.heading = -Math.PI / 2 + Math.sin(performance.now() / 1400) * 0.3;
    this.preview.draw(ctx);
    ctx.restore();

    // The number plate.
    ctx.fillStyle = '#f4f3ee';
    ctx.beginPath();
    ctx.roundRect(cx - 62, 410, 124, 74, 12);
    ctx.fill();
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    ctx.stroke();
    HUD.text(ctx, String(paint.number), cx, 449, {
      font: 'bold 56px system-ui, sans-serif', align: 'center', baseline: 'middle', color: '#16161a', outline: false,
    });
    HUD.text(ctx, 'Your race number', cx, 506, { font: '14px system-ui, sans-serif', align: 'center', color: '#999', outline: false });
    HUD.text(ctx, 'Point at a colour to try it on the kart', cx, 548, {
      font: '14px system-ui, sans-serif', align: 'center', color: '#bbb', outline: false,
    });
    HUD.text(ctx, 'Click to buy it and put it on', cx, 568, {
      font: '14px system-ui, sans-serif', align: 'center', color: '#bbb', outline: false,
    });

    // ----- Tabs -----
    this.TABS.forEach((name, i) => {
      shopButton(ctx, this.tabRect(i), name, { strong: i === this.tab, fill: i === this.tab ? 'rgba(212,160,23,0.2)' : undefined });
    });

    // ----- The grid of things to buy -----
    const cells = this.cells();
    cells.forEach((cell, i) => {
      if (cell.kind === 'color') this.drawColorCell(ctx, cell, i === this.focus);
      else this.drawStyleCell(ctx, cell, i === this.focus);
    });
    if (this.tab === 4) this.drawNumberTab(ctx);

    shopButton(ctx, this.resetRect, 'Back to team colours');
    shopButton(ctx, this.backRect, '◀  Back to the garage', { strong: true });
    shopMessage(ctx, this.message);
    HUD.text(ctx, 'Click to choose  ·  arrows + Enter also work  ·  Q / E change tab  ·  Esc back to the garage', GAME_WIDTH / 2, 706, {
      font: '14px system-ui, sans-serif', align: 'center', color: '#777', outline: false,
    });
  },

  drawColorCell(ctx, cell, focus) {
    const part = this.PARTS[this.tab];
    const hex = cell.value;
    const inUse = this.currentColor(part) === hex;
    const owned = Career.ownsColor(hex) || hex === this.teamColor(part);
    const price = Career.colorPrice(hex);

    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.roundRect(cell.x, cell.y, cell.w, cell.h, 10);
    ctx.fill();
    ctx.strokeStyle = inUse ? COLORS.gold : focus ? '#ffffff' : '#444';
    ctx.lineWidth = inUse ? 4 : focus ? 3 : 1.5;
    ctx.stroke();

    // The colour itself (specials get a shine).
    ctx.fillStyle = hex;
    ctx.beginPath();
    ctx.roundRect(cell.x + 8, cell.y + 8, cell.w - 16, 52, 8);
    ctx.fill();
    if (cell.c.special) {
      const shine = ctx.createLinearGradient(cell.x, cell.y + 8, cell.x + cell.w, cell.y + 60);
      shine.addColorStop(0, 'rgba(255,255,255,0.55)');
      shine.addColorStop(0.45, 'rgba(255,255,255,0)');
      shine.addColorStop(1, 'rgba(255,255,255,0.25)');
      ctx.fillStyle = shine;
      ctx.beginPath();
      ctx.roundRect(cell.x + 8, cell.y + 8, cell.w - 16, 52, 8);
      ctx.fill();
      HUD.text(ctx, '★', cell.x + cell.w - 20, cell.y + 26, { font: 'bold 16px system-ui, sans-serif', color: '#fff', outline: true });
    }
    HUD.text(ctx, cell.c.name, cell.x + cell.w / 2, cell.y + 80, {
      font: 'bold 14px system-ui, sans-serif', align: 'center', outline: false, maxWidth: cell.w - 12,
    });
    let label, color;
    if (inUse) { label = 'In use'; color = COLORS.goldLight; }
    else if (owned) { label = 'Yours — free'; color = '#bbb'; }
    else { label = formatMoney(price); color = Career.data.money >= price ? '#5dff7a' : '#ff8a7a'; }
    HUD.text(ctx, label, cell.x + cell.w / 2, cell.y + 102, {
      font: 'bold 13px system-ui, sans-serif', align: 'center', color, outline: false, maxWidth: cell.w - 12,
    });
  },

  drawStyleCell(ctx, cell, focus) {
    const style = cell.s;
    const inUse = Career.data.paint.style === style.id;
    const owned = Career.ownsStyle(style.id);

    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.roundRect(cell.x, cell.y, cell.w, cell.h, 10);
    ctx.fill();
    ctx.strokeStyle = inUse ? COLORS.gold : focus ? '#ffffff' : '#444';
    ctx.lineWidth = inUse ? 4 : focus ? 3 : 1.5;
    ctx.stroke();

    // A little nose cone showing the stripes in your colours.
    const team = TEAMS[Career.data.team], p = Career.data.paint;
    const body = p.body || team.body, trim = p.trim || team.trim;
    const bands = style.id === null ? (team.stripes || [trim]) : style.id === 'single' ? [trim] : stripesForStyle(style.id, trim, body);
    const sx = cell.x + 18, sy = cell.y + 14, sw = cell.w - 36, sh = 44;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.roundRect(sx, sy, sw, sh, 14);
    ctx.fill();
    const bh = style.id === null || style.id === 'single' ? 7 : 5;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(sx, sy, sw, sh, 14);
    ctx.clip();
    bands.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(sx, sy + sh / 2 - (bands.length * bh) / 2 + i * bh, sw, bh);
    });
    ctx.restore();

    HUD.text(ctx, style.name, cell.x + cell.w / 2, cell.y + 82, {
      font: 'bold 16px system-ui, sans-serif', align: 'center', outline: false, maxWidth: cell.w - 16,
    });
    let label, color;
    if (inUse) { label = 'In use'; color = COLORS.goldLight; }
    else if (owned) { label = 'Free'; color = '#bbb'; }
    else { label = formatMoney(style.price); color = Career.data.money >= style.price ? '#5dff7a' : '#ff8a7a'; }
    HUD.text(ctx, label, cell.x + cell.w / 2, cell.y + 104, {
      font: 'bold 14px system-ui, sans-serif', align: 'center', color, outline: false,
    });
  },

  drawNumberTab(ctx) {
    const b = this.numberButtons();
    const n = this.numberDraft;
    const owned = Career.ownsNumber(n), inUse = Career.data.paint.number === n;
    HUD.text(ctx, 'Pick your race number (1 to 99)', 900, 205, {
      font: 'bold 18px system-ui, sans-serif', align: 'center', color: '#ddd', outline: false,
    });
    ctx.fillStyle = '#f4f3ee';
    ctx.beginPath();
    ctx.roundRect(790, 230, 220, 170, 20);
    ctx.fill();
    HUD.text(ctx, String(n), 900, 318, {
      font: 'bold 120px system-ui, sans-serif', align: 'center', baseline: 'middle', color: '#16161a', outline: false,
    });
    for (const key of ['minus10', 'minus1', 'plus1', 'plus10']) {
      const d = b[key].d;
      shopButton(ctx, b[key], (d > 0 ? '+' : '−') + Math.abs(d));
    }
    let label, fill;
    if (inUse) { label = 'This is your number'; fill = 'rgba(255,255,255,0.05)'; }
    else if (owned) { label = 'Use number ' + n + '  (yours — free)'; }
    else { label = 'Buy & use number ' + n + '  ·  ' + formatMoney(NUMBER_PRICE); }
    shopButton(ctx, b.use, label, { strong: !inUse, fill });
    HUD.text(ctx, 'You can also type the number on the keyboard, or use the arrow keys', 900, 566, {
      font: '14px system-ui, sans-serif', align: 'center', color: '#999', outline: false,
    });
  },
};

// ====================================================================
//  Driver market
// ====================================================================

const DriverMarket = {
  focus: 0,
  armed: null,          // { id, time } - a hired driver you have clicked once, to release them
  message: null,

  open() {
    this.focus = 0;
    this.armed = null;
    this.message = null;
  },

  cardRect(i) {
    return { x: 40 + (i % 2) * 620, y: 168 + Math.floor(i / 2) * 100, w: 600, h: 90 };
  },
  backRect: { x: 40, y: 600, w: 300, h: 48 },

  say(result) {
    this.message = { text: result.text, good: result.ok, time: 3.5 };
  },

  activate(i) {
    const d = DRIVERS[i];
    if (Career.isHired(d.id)) {
      if (this.armed && this.armed.id === d.id) {
        this.say(Career.release(d.id));
        this.armed = null;
      } else {
        this.armed = { id: d.id, time: 3 };
        this.message = { text: 'Click ' + d.name + ' again to let them go', good: false, time: 3 };
      }
    } else {
      this.armed = null;
      this.say(Career.hire(d.id));
    }
  },

  update(game, dt) {
    if (this.message) {
      this.message.time -= dt;
      if (this.message.time <= 0) this.message = null;
    }
    if (this.armed) {
      this.armed.time -= dt;
      if (this.armed.time <= 0) this.armed = null;
    }
    if (Input.pressed('Escape') || (Input.mouse.clicked && Input.mouseIn(this.backRect))) {
      game.showGarage();
      return;
    }
    const n = DRIVERS.length;
    if (Input.pressed('ArrowDown') || Input.pressed('KeyS')) this.focus = Math.min(n - 1, this.focus + 2);
    if (Input.pressed('ArrowUp') || Input.pressed('KeyW')) this.focus = Math.max(0, this.focus - 2);
    if (Input.pressed('ArrowRight') || Input.pressed('KeyD')) this.focus = Math.min(n - 1, this.focus + 1);
    if (Input.pressed('ArrowLeft') || Input.pressed('KeyA')) this.focus = Math.max(0, this.focus - 1);
    for (let i = 0; i < n; i++) {
      const r = this.cardRect(i);
      if (Input.mouse.moved && Input.mouseIn(r)) this.focus = i;
      if (Input.mouse.clicked && Input.mouseIn(r)) {
        this.focus = i;
        this.activate(i);
      }
    }
    if (Input.pressed('Enter') || Input.pressed('NumpadEnter')) this.activate(this.focus);
  },

  draw(ctx) {
    const c = Career.data;
    shopBackdrop(ctx, 'DRIVER MARKET', 'Hire drivers to race for ' + TEAMS[c.team].name);

    const hired = Career.hiredDrivers();
    const salaries = hired.reduce((a, d) => a + driverSalary(d), 0);
    HUD.text(ctx, 'Your team: ' + hired.length + ' of ' + MAX_TEAMMATES + ' seats filled'
      + (hired.length ? '   ·   salaries ' + formatMoney(salaries) + ' per full race' : ''), 40, 138, {
      font: 'bold 18px system-ui, sans-serif', color: '#ddd', outline: false, maxWidth: 1200,
    });

    DRIVERS.forEach((d, i) => this.drawCard(ctx, d, i));

    const lines = [
      'Hired drivers race next to you in your team colours and bring their prize money to your team.',
      'You pay their salary after every race (less for shorter races). Better drivers (more stars) are faster, but cost more.',
      'Teammates only race against the computer — not in YOU (ghost) mode.',
    ];
    lines.forEach((t, i) => HUD.text(ctx, t, 380, 616 + i * 20, {
      font: '14px system-ui, sans-serif', color: '#aaa', outline: false, maxWidth: 860,
    }));
    shopButton(ctx, this.backRect, '◀  Back to the garage', { strong: true });
    shopMessage(ctx, this.message, GAME_WIDTH / 2, 692);
    HUD.text(ctx, 'Click a driver to hire  ·  arrows + Enter also work  ·  Esc back to the garage', GAME_WIDTH / 2, 710, {
      font: '14px system-ui, sans-serif', align: 'center', color: '#777', outline: false,
    });
  },

  drawCard(ctx, d, i) {
    const r = this.cardRect(i);
    const hired = Career.isHired(d.id);
    const fee = driverFee(d), salary = driverSalary(d), stats = DRIVER_STARS[d.stars];
    const full = !hired && Career.data.hired.length >= MAX_TEAMMATES;
    const afford = Career.data.money >= fee;
    const focus = i === this.focus;

    ctx.fillStyle = hired ? 'rgba(212,160,23,0.14)' : 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 12);
    ctx.fill();
    ctx.strokeStyle = hired ? COLORS.gold : focus ? '#ffffff' : '#444';
    ctx.lineWidth = hired || focus ? 3 : 1.5;
    ctx.stroke();

    // A helmet with their number.
    ctx.fillStyle = d.helmet;
    ctx.beginPath();
    ctx.arc(r.x + 44, r.y + 45, 29, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(r.x + 49, r.y + 49, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0c0f14';
    ctx.beginPath();
    ctx.ellipse(r.x + 44, r.y + 40, 20, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    HUD.text(ctx, '#' + d.number, r.x + 44, r.y + 66, {
      font: 'bold 13px system-ui, sans-serif', align: 'center', color: '#222', outline: false,
    });

    HUD.text(ctx, d.name, r.x + 90, r.y + 32, { font: 'bold 22px system-ui, sans-serif', outline: false });
    ctx.font = 'bold 22px system-ui, sans-serif';
    const nameW = ctx.measureText(d.name).width;
    HUD.text(ctx, '"' + d.nick + '"', r.x + 90 + nameW + 10, r.y + 32, {
      font: 'italic 14px system-ui, sans-serif', color: '#999', outline: false, maxWidth: 130,
    });
    HUD.text(ctx, '★'.repeat(d.stars) + '☆'.repeat(5 - d.stars), r.x + 90, r.y + 58, {
      font: '20px system-ui, sans-serif', color: COLORS.goldLight, outline: false,
    });
    HUD.text(ctx, 'Top speed about ' + stats.topKmh + ' km/h', r.x + 90, r.y + 80, {
      font: '13px system-ui, sans-serif', color: '#aaa', outline: false,
    });

    const x = r.x + r.w - 16;
    HUD.text(ctx, 'Signing fee  ' + formatMoney(fee), x, r.y + 28, {
      font: '14px system-ui, sans-serif', align: 'right', color: '#ddd', outline: false,
    });
    HUD.text(ctx, 'Salary  ' + formatMoney(salary) + ' / race', x, r.y + 48, {
      font: '14px system-ui, sans-serif', align: 'right', color: '#ddd', outline: false,
    });
    let label, color;
    if (hired) {
      const armed = this.armed && this.armed.id === d.id;
      label = armed ? 'Click again to release' : 'ON YOUR TEAM ✓';
      color = armed ? '#ff8a7a' : COLORS.goldLight;
    } else if (full) { label = 'Team full'; color = '#888'; }
    else if (!afford) { label = 'Need ' + formatMoney(fee - Career.data.money) + ' more'; color = '#ff8a7a'; }
    else { label = 'HIRE'; color = '#5dff7a'; }
    HUD.text(ctx, label, x, r.y + 76, { font: 'bold 18px system-ui, sans-serif', align: 'right', color, outline: false });
  },
};
