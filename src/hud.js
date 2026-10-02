// Everything drawn on top of the track: lap info, countdown, menus.

const HUD = {
  // Text with a dark outline so it's readable on sand and asphalt.
  text(ctx, str, x, y, opts = {}) {
    ctx.font = opts.font || 'bold 18px system-ui, sans-serif';
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = opts.baseline || 'alphabetic';
    if (opts.outline !== false) {
      ctx.lineWidth = opts.outlineWidth || 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineJoin = 'round';
      ctx.strokeText(str, x, y, opts.maxWidth);
    }
    ctx.fillStyle = opts.color || '#fff';
    ctx.fillText(str, x, y, opts.maxWidth); // maxWidth squeezes long text to fit
  },

  panel(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(58,10,16,0.82)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
  },

  // Lap / time / speed box for one racer.
  racerPanel(ctx, race, racer, x, y) {
    const w = 240, h = 144;
    this.panel(ctx, x, y, w, h);
    const k = racer.kart;

    // Colour swatch + name.
    ctx.fillStyle = k.body;
    ctx.fillRect(x + 12, y + 12, 14, 14);
    ctx.fillStyle = k.trim;
    ctx.fillRect(x + 12, y + 17.5, 14, 3);
    this.text(ctx, racer.name, x + 34, y + 25, { font: 'bold 13px system-ui, sans-serif', outline: false, maxWidth: w - 116 });
    if (!race.ghostMode) {
      this.text(ctx, ordinal(racer.position) + '/' + race.racers.length, x + w - 12, y + 26, {
        font: 'bold 20px system-ui, sans-serif', align: 'right', color: COLORS.goldLight, outline: false,
      });
    }

    const lap = Math.min(racer.lapsDone + 1, race.track.laps);
    const current = racer.finished ? racer.finishTime : race.time - racer.lapStart;
    const last = racer.lapTimes[racer.lapTimes.length - 1];
    const f = '15px ui-monospace, Menlo, Consolas, monospace';
    const row = (label, value, ry, color) => {
      this.text(ctx, label, x + 12, ry, { font: f, color: '#bbb', outline: false });
      this.text(ctx, value, x + w - 12, ry, { font: f, align: 'right', color: color || '#fff', outline: false });
    };
    if (racer.finished) {
      row('FINISHED', formatTime(racer.finishTime), y + 50, COLORS.goldLight);
    } else {
      row('LAP', lap + ' / ' + race.track.laps, y + 50);
    }
    row('TIME', formatTime(race.state === 'countdown' ? 0 : current), y + 70);
    row('LAST', formatTime(last), y + 90);
    row('BEST', formatTime(racer.bestLap), y + 110, COLORS.goldLight);
    row('SPEED', k.kmh + ' km/h', y + 130, '#9fd');
  },

  // Warnings: above the kart in the top-down view, in the middle of the screen in 3D.
  warnings(ctx, racer, view) {
    if (racer.finished) return;
    let msg = null;
    if (racer.wrongWayTime > 0.8) msg = 'WRONG WAY!';
    else if (racer.missedCheckpoint) msg = 'MISSED CHECKPOINT — GO BACK';
    if (!msg) return;
    this.text(ctx, msg, GAME_WIDTH / 2, 170, {
      font: 'bold 32px system-ui, sans-serif', align: 'center', color: '#ff6b5a', outlineWidth: 6,
    });
  },

  countdown(ctx, race, controls) {
    let label, color;
    if (race.state === 'countdown') {
      label = String(Math.ceil(race.countdown));
      color = '#ff5a4a';
    } else if (race.time < 0.8) {
      label = 'GO!';
      color = '#5dff7a';
    } else {
      return;
    }
    this.text(ctx, label, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, {
      font: 'bold 110px system-ui, sans-serif', align: 'center', color, outlineWidth: 10,
    });
    if (race.state === 'countdown') {
      const hint = controls === 'trackpad'
        ? 'Slide left / right on the trackpad to steer  ·  press & hold (or Space) to brake'
        : 'Up = accelerate  ·  Down = brake  ·  Left / Right = steer';
      this.text(ctx, hint, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, {
        font: 'bold 20px system-ui, sans-serif', align: 'center', outlineWidth: 5,
      });
    }
  },

  // A clickable button.
  button(ctx, r, label, opts = {}) {
    const hover = Input.mouseIn(r);
    ctx.fillStyle = hover ? 'rgba(212,160,23,0.35)' : opts.fill || 'rgba(58,10,16,0.85)';
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 10);
    ctx.fill();
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = opts.strong ? 3 : 1.5;
    ctx.stroke();
    this.text(ctx, label, r.x + r.w / 2, r.y + r.h / 2 + 1, {
      font: opts.font || 'bold 18px system-ui, sans-serif', align: 'center', baseline: 'middle',
      color: opts.color || '#fff', outline: false, maxWidth: r.w - 16,
    });
  },

  menuButtons() {
    const cx = GAME_WIDTH / 2;
    return {
      start: { x: cx - 200, y: 372, w: 400, h: 64 },
      difficulty: { x: cx - 300, y: 456, w: 290, h: 48 },
      controls: { x: cx + 10, y: 456, w: 290, h: 48 },
    };
  },

  title(ctx, game) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const cx = GAME_WIDTH / 2;
    this.panel(ctx, cx - 330, 130, 660, 450);

    this.text(ctx, 'BURHANUDDIN RACING', cx, 205, {
      font: 'bold 54px system-ui, sans-serif', align: 'center', color: COLORS.gold, outlineWidth: 8,
    });
    this.text(ctx, 'CAIRO KARTING', cx, 242, {
      font: 'bold 20px system-ui, sans-serif', align: 'center', color: '#fff', outline: false,
    });
    this.text(ctx, game.track.name + ' · ' + game.track.laps + ' laps', cx, 292, {
      font: '18px system-ui, sans-serif', align: 'center', color: '#ddd', outline: false,
    });
    this.text(ctx, 'Track record: ' + formatTime(Save.get(game.track.recordKey, null)), cx, 318, {
      font: '16px system-ui, sans-serif', align: 'center', color: COLORS.goldLight, outline: false,
    });

    const b = this.menuButtons();
    this.button(ctx, b.start, 'START  ▶', { font: 'bold 28px system-ui, sans-serif', color: COLORS.gold, strong: true });
    this.button(ctx, b.difficulty, 'Computer drivers: ' + DIFFICULTIES[game.difficulty].label);
    this.button(ctx, b.controls, 'Controls: ' + CONTROL_MODES[game.controls]);

    this.text(ctx, 'Version ' + GAME_VERSION, cx, 564, {
      font: '12px system-ui, sans-serif', align: 'center', color: '#777', outline: false,
    });
    this.text(ctx, 'Click a button — or press Enter to start, D for difficulty, T for controls', cx, 540, {
      font: '14px system-ui, sans-serif', align: 'center', color: '#999', outline: false,
    });
  },

  raceButtons() {
    return {
      view: { x: GAME_WIDTH - 250, y: 12, w: 180, h: 44 },
      pause: { x: GAME_WIDTH - 60, y: 12, w: 48, h: 44 },
    };
  },

  // A small map of the whole track, with a dot for every kart.
  minimap(ctx, race, me) {
    const w = 256, h = 144, x = GAME_WIDTH - w - 12, y = GAME_HEIGHT - h - 12;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(race.track.minimapImage(w, h), x, y);
    ctx.restore();
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    const sx = w / WORLD_WIDTH, sy = h / WORLD_HEIGHT;
    for (const r of race.racers) {
      if (r === me) continue;
      ctx.fillStyle = r.kart.body;
      ctx.beginPath();
      ctx.arc(x + r.kart.x * sx, y + r.kart.y * sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (race.ghost) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(x + race.ghost.kart.x * sx, y + race.ghost.kart.y * sy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // You: an arrow pointing the way you're driving.
    const k = me.kart;
    ctx.save();
    ctx.translate(x + k.x * sx, y + k.y * sy);
    ctx.rotate(k.heading);
    ctx.fillStyle = k.body;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, -6);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },

  // Shows how far the trackpad is steering (the steering wheel does this in the cockpit view).
  steerMeter(ctx, kart) {
    const w = 300, x = GAME_WIDTH / 2 - w / 2, y = GAME_HEIGHT - 28;
    ctx.fillStyle = 'rgba(58,10,16,0.75)';
    ctx.beginPath();
    ctx.roundRect(x - 8, y - 10, w + 16, 20, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(GAME_WIDTH / 2 - 1, y - 7, 2, 14);
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(GAME_WIDTH / 2 + kart.steerVisual * (w / 2), y, 7, 0, Math.PI * 2);
    ctx.fill();
  },

  // Everything drawn over the race.
  raceHud(ctx, game, race, me) {
    this.warnings(ctx, me, game.view);
    if (race.ghostMode) this.ghostBar(ctx, race);
    else this.leaderboard(ctx, race);
    this.racerPanel(ctx, race, me, 12, 12);
    if (game.view !== 'top') this.minimap(ctx, race, me);
    if (game.view !== 'cockpit' && game.controls === 'trackpad') this.steerMeter(ctx, me.kart);
    const b = this.raceButtons();
    this.button(ctx, b.view, '👁 ' + VIEW_LABELS[game.view], { font: 'bold 16px system-ui, sans-serif' });
    this.button(ctx, b.pause, game.screen === 'paused' ? '▶' : 'II', { font: 'bold 18px system-ui, sans-serif' });
    this.text(ctx, 'C = change view', b.view.x + b.view.w / 2, b.view.y + b.view.h + 16, {
      font: '12px system-ui, sans-serif', align: 'center', color: '#eee', outlineWidth: 3,
    });
    this.countdown(ctx, race, game.controls);
  },

  paused(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.text(ctx, 'PAUSED', GAME_WIDTH / 2, GAME_HEIGHT / 2, {
      font: 'bold 64px system-ui, sans-serif', align: 'center', color: COLORS.gold, outlineWidth: 8,
    });
    this.text(ctx, 'Click or press P to keep racing  ·  Esc = back to the garage', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, {
      font: '18px system-ui, sans-serif', align: 'center',
    });
  },

  // YOU mode: how far ahead or behind your ghost you are (updated at every checkpoint).
  ghostBar(ctx, race) {
    const w = 440, h = 50, x = GAME_WIDTH / 2 - w / 2, y = 6;
    ctx.fillStyle = 'rgba(58,10,16,0.82)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    this.text(ctx, '👻 GHOST', x + 16, y + 31, { font: 'bold 17px system-ui, sans-serif', color: '#e8e8ff', outline: false });
    if (!race.ghost) {
      this.text(ctx, 'No ghost yet — this run will become your ghost!', x + w - 14, y + 31, {
        font: '14px system-ui, sans-serif', align: 'right', color: COLORS.goldLight, outline: false, maxWidth: 290,
      });
      return;
    }
    this.text(ctx, 'best ' + formatTime(race.ghost.data.total), x + 112, y + 31, {
      font: '14px ui-monospace, Menlo, Consolas, monospace', color: '#aaa', outline: false,
    });
    let label = '—', color = '#bbb';
    if (race.gap != null) {
      const ahead = race.gap <= 0;
      label = (ahead ? '−' : '+') + Math.abs(race.gap).toFixed(2) + ' s';
      color = ahead ? '#5dff7a' : '#ff7a6a';
    }
    this.text(ctx, label, x + w - 16, y + 34, {
      font: 'bold 26px ui-monospace, Menlo, Consolas, monospace', align: 'right', color, outline: false,
    });
  },

  // YOU mode results: you against your ghost.
  resultsGhost(ctx, race) {
    const g = race.ghostResult, me = race.humans[0];
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const cx = GAME_WIDTH / 2, w = 640, h = 380, top = GAME_HEIGHT / 2 - h / 2;
    this.panel(ctx, cx - w / 2, top, w, h);

    let heading = 'FIRST TIME SET!', color = COLORS.gold;
    if (g && g.hadGhost) {
      heading = g.beatGhost ? 'YOU BEAT YOUR GHOST!' : 'YOUR GHOST WINS';
      color = g.beatGhost ? '#5dff7a' : '#ff8a7a';
    }
    this.text(ctx, '🏁 ' + heading, cx, top + 56, {
      font: 'bold 38px system-ui, sans-serif', align: 'center', color, outlineWidth: 6, maxWidth: 600,
    });
    if (g && g.hadGhost) {
      const diff = Math.abs(g.playerTotal - g.ghostTotal).toFixed(2);
      this.text(ctx, g.beatGhost ? 'You were ' + diff + ' s faster than your best' : 'You were ' + diff + ' s slower than your best', cx, top + 90, {
        font: '18px system-ui, sans-serif', align: 'center', color: '#ddd', outline: false,
      });
    } else {
      this.text(ctx, 'This run is now your ghost. Beat it next time!', cx, top + 90, {
        font: '18px system-ui, sans-serif', align: 'center', color: '#ddd', outline: false,
      });
    }

    const mono = 'ui-monospace, Menlo, Consolas, monospace';
    const row = (y, name, swatch, time, sub, hi) => {
      if (hi) {
        ctx.fillStyle = 'rgba(212,160,23,0.18)';
        ctx.fillRect(cx - w / 2 + 16, y - 26, w - 32, 62);
      }
      ctx.fillStyle = swatch;
      ctx.fillRect(cx - 280, y - 14, 8, 22);
      this.text(ctx, name, cx - 260, y + 2, { font: 'bold 22px system-ui, sans-serif', outline: false });
      this.text(ctx, time, cx + 280, y + 2, { font: 'bold 24px ' + mono, align: 'right', color: COLORS.goldLight, outline: false });
      this.text(ctx, sub, cx - 260, y + 26, { font: '13px ' + mono, color: '#aaa', outline: false });
    };
    row(top + 150, 'YOU', me.kart.body, formatTime(me.finishTime),
      'Laps: ' + me.lapTimes.map(formatTime).join('  ·  '), !(g && g.hadGhost && !g.beatGhost));
    if (g && g.hadGhost) {
      row(top + 230, 'GHOST (your best)', race.ghost ? race.ghost.kart.body : '#ccc', formatTime(g.ghostTotal),
        'The best race you had before this one', g.hadGhost && !g.beatGhost);
    }
    if (g && g.newBest) {
      this.text(ctx, '★ NEW BEST — your ghost has been updated ★', cx, top + h - 62, {
        font: 'bold 18px system-ui, sans-serif', align: 'center', color: '#5dff7a', outline: false,
      });
    }
    this.text(ctx, 'Click or press Enter to go back to the garage', cx, top + h - 26, {
      font: '17px system-ui, sans-serif', align: 'center', color: '#ddd', outline: false,
    });
  },

  // Live race order across the top of the screen, like on TV.
  leaderboard(ctx, race) {
    const order = race.standings();
    const itemW = 92, h = 26;
    const total = itemW * order.length;
    const x0 = GAME_WIDTH / 2 - total / 2, y = 6;
    ctx.fillStyle = 'rgba(58,10,16,0.82)';
    ctx.beginPath();
    ctx.roundRect(x0 - 6, y, total + 12, h, 8);
    ctx.fill();
    order.forEach((r, i) => {
      const x = x0 + i * itemW;
      this.text(ctx, String(i + 1), x + 4, y + 18, {
        font: 'bold 13px system-ui, sans-serif', color: '#999', outline: false,
      });
      ctx.fillStyle = r.kart.body;
      ctx.fillRect(x + 16, y + 7, 5, 12);
      this.text(ctx, r.kart.shortName, x + 25, y + 18, {
        font: (r.isHuman ? 'bold ' : '') + '13px system-ui, sans-serif',
        color: r.isHuman ? COLORS.goldLight : '#eee', outline: false,
      });
    });
  },

  // prize: money won (career mode) or null.
  results(ctx, race, prize) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const cx = GAME_WIDTH / 2;
    const rows = race.standings();
    const rowH = 40;
    const h = 170 + rows.length * rowH;
    const top = GAME_HEIGHT / 2 - h / 2;
    this.panel(ctx, cx - 320, top, 640, h);

    const winner = rows[0];
    let heading;
    if (race.humans.length === 1) {
      const me = race.humans[0];
      heading = me.position === 1 ? 'YOU WIN!' : 'You finished ' + ordinal(me.position);
      if (prize != null) heading += '  +' + formatMoney(prize);
    } else {
      heading = winner.name + ' WINS!';
    }
    this.text(ctx, '🏁 ' + heading, cx, top + 52, {
      font: 'bold 38px system-ui, sans-serif', align: 'center', color: COLORS.gold, outlineWidth: 6, maxWidth: 600,
    });

    const mono = 'ui-monospace, Menlo, Consolas, monospace';
    this.text(ctx, 'BEST LAP', cx + 170, top + 86, { font: '12px ' + mono, align: 'right', color: '#888', outline: false });
    this.text(ctx, 'TIME', cx + 290, top + 86, { font: '12px ' + mono, align: 'right', color: '#888', outline: false });

    rows.forEach((r, i) => {
      const y = top + 116 + i * rowH;
      if (r.isHuman) {
        ctx.fillStyle = 'rgba(212,160,23,0.18)';
        ctx.fillRect(cx - 305, y - 24, 610, rowH - 6);
      }
      this.text(ctx, ordinal(i + 1), cx - 290, y, {
        font: 'bold 20px system-ui, sans-serif', color: '#aaa', outline: false,
      });
      ctx.fillStyle = r.kart.body;
      ctx.fillRect(cx - 238, y - 15, 8, 18);
      this.text(ctx, r.name, cx - 220, y, {
        maxWidth: 260,
        font: 'bold 20px system-ui, sans-serif', color: r.isHuman ? COLORS.goldLight : '#fff', outline: false,
      });
      this.text(ctx, formatTime(r.bestLap), cx + 170, y, {
        font: '16px ' + mono, align: 'right', color: '#bbb', outline: false,
      });
      const lapsLeft = race.track.laps - r.lapsDone;
      const time = r.finished ? formatTime(r.finishTime) : lapsLeft + ' lap' + (lapsLeft > 1 ? 's' : '') + ' to go';
      this.text(ctx, time, cx + 290, y, {
        font: 'bold 17px ' + mono, align: 'right', color: r.finished ? COLORS.goldLight : '#888', outline: false,
      });
    });

    const footY = top + h - 22;
    if (race.newRecord) {
      this.text(ctx, '★ NEW TRACK RECORD ★', cx, footY - 26, {
        font: 'bold 18px system-ui, sans-serif', align: 'center', color: '#5dff7a', outline: false,
      });
    }
    const next = 'Click or press Enter to go back to the garage';
    this.text(ctx, next, cx, footY, {
      font: '17px system-ui, sans-serif', align: 'center', color: '#ddd', outline: false,
    });
  },
};
