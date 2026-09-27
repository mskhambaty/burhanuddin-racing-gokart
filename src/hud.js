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
    this.text(ctx, racer.name, x + 34, y + 25, { font: 'bold 14px system-ui, sans-serif', outline: false, maxWidth: w - 104 });
    this.text(ctx, ordinal(racer.position) + '/' + race.racers.length, x + w - 12, y + 26, {
      font: 'bold 20px system-ui, sans-serif', align: 'right', color: COLORS.goldLight, outline: false,
    });

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

  // Little warnings that float above a kart.
  kartWarnings(ctx, racer) {
    const k = racer.kart;
    let msg = null;
    if (racer.finished) return;
    if (racer.wrongWayTime > 0.8) msg = 'WRONG WAY!';
    else if (racer.missedCheckpoint) msg = 'MISSED CHECKPOINT — GO BACK';
    if (msg) {
      this.text(ctx, msg, k.x, k.y - 22, {
        font: 'bold 14px system-ui, sans-serif', align: 'center', color: '#ff6b5a',
      });
    }
  },

  countdown(ctx, race) {
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
    this.text(ctx, label, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, {
      font: 'bold 110px system-ui, sans-serif', align: 'center', color, outlineWidth: 10,
    });
  },

  title(ctx, track, bestLap, difficulty) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const cx = GAME_WIDTH / 2;
    this.panel(ctx, cx - 330, 150, 660, 430);

    this.text(ctx, 'BURHANUDDIN RACING', cx, 225, {
      font: 'bold 54px system-ui, sans-serif', align: 'center', color: COLORS.gold, outlineWidth: 8,
    });
    this.text(ctx, 'CAIRO KARTING', cx, 262, {
      font: 'bold 20px system-ui, sans-serif', align: 'center', color: '#fff', outline: false,
    });

    this.text(ctx, track.name + ' · ' + track.laps + ' laps', cx, 312, {
      font: '18px system-ui, sans-serif', align: 'center', color: '#ddd', outline: false,
    });
    this.text(ctx, 'Track record: ' + formatTime(bestLap), cx, 338, {
      font: '16px system-ui, sans-serif', align: 'center', color: COLORS.goldLight, outline: false,
    });

    this.text(ctx, 'Press  1  for CAREER', cx, 398, {
      font: 'bold 24px system-ui, sans-serif', align: 'center', color: '#fff', outline: false,
    });
    this.text(ctx, 'pick a team, race for prize money, upgrade your kart', cx, 422, {
      font: '15px system-ui, sans-serif', align: 'center', color: '#aaa', outline: false,
    });
    this.text(ctx, 'Press  2  for TWO PLAYERS', cx, 470, {
      font: 'bold 24px system-ui, sans-serif', align: 'center', color: '#fff', outline: false,
    });
    this.text(ctx, 'pick your teams · Player 1: W A S D     ·     Player 2: Arrow keys', cx, 494, {
      font: '15px system-ui, sans-serif', align: 'center', color: '#aaa', outline: false,
    });
    this.text(ctx, 'Computer drivers: ' + DIFFICULTIES[difficulty].label + '   (press D to change)', cx, 528, {
      font: 'bold 16px system-ui, sans-serif', align: 'center', color: COLORS.goldLight, outline: false,
    });
    this.text(ctx, 'Up = accelerate · Down = brake · Left/Right = steer · P = pause · Esc = menu', cx, 554, {
      font: '14px system-ui, sans-serif', align: 'center', color: '#888', outline: false,
    });
  },

  paused(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.text(ctx, 'PAUSED', GAME_WIDTH / 2, GAME_HEIGHT / 2, {
      font: 'bold 64px system-ui, sans-serif', align: 'center', color: COLORS.gold, outlineWidth: 8,
    });
    this.text(ctx, 'P = keep racing · Esc = menu', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, {
      font: '18px system-ui, sans-serif', align: 'center',
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
    const next = prize != null ? 'Enter = back to the garage' : 'Enter = race again   ·   Esc = menu';
    this.text(ctx, next, cx, footY, {
      font: '17px system-ui, sans-serif', align: 'center', color: '#ddd', outline: false,
    });
  },
};
