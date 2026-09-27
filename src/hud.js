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
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = opts.color || '#fff';
    ctx.fillText(str, x, y);
  },

  panel(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(15,15,15,0.72)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
  },

  // Lap / time / speed box for one racer.
  racerPanel(ctx, race, racer, x, y) {
    const w = 210, h = 144;
    this.panel(ctx, x, y, w, h);
    const k = racer.kart;

    // Colour swatch + name.
    ctx.fillStyle = k.body;
    ctx.fillRect(x + 12, y + 12, 14, 14);
    ctx.fillStyle = k.trim;
    ctx.fillRect(x + 12, y + 17.5, 14, 3);
    this.text(ctx, racer.name, x + 34, y + 25, { font: 'bold 16px system-ui, sans-serif', outline: false });
    if (race.racers.length > 1) {
      this.text(ctx, ordinal(racer.position), x + w - 12, y + 26, {
        font: 'bold 22px system-ui, sans-serif', align: 'right', color: COLORS.goldLight, outline: false,
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

  title(ctx, track, bestLap) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const cx = GAME_WIDTH / 2;
    this.panel(ctx, cx - 330, 150, 660, 420);

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

    this.text(ctx, 'Press  1  for ONE player', cx, 398, {
      font: 'bold 24px system-ui, sans-serif', align: 'center', color: '#fff', outline: false,
    });
    this.text(ctx, 'drive with the Arrow keys or W A S D', cx, 422, {
      font: '15px system-ui, sans-serif', align: 'center', color: '#aaa', outline: false,
    });
    this.text(ctx, 'Press  2  for TWO players', cx, 470, {
      font: 'bold 24px system-ui, sans-serif', align: 'center', color: '#fff', outline: false,
    });
    this.text(ctx, 'Player 1: W A S D     ·     Player 2: Arrow keys', cx, 494, {
      font: '15px system-ui, sans-serif', align: 'center', color: '#aaa', outline: false,
    });
    this.text(ctx, 'Up = accelerate · Down = brake · Left/Right = steer · P = pause · Esc = menu', cx, 545, {
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

  results(ctx, race) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const cx = GAME_WIDTH / 2;
    const rows = race.finishOrder;
    const h = 190 + rows.length * 70;
    const top = GAME_HEIGHT / 2 - h / 2;
    this.panel(ctx, cx - 300, top, 600, h);

    const heading = rows.length > 1 ? rows[0].name + ' WINS!' : 'RACE COMPLETE';
    this.text(ctx, '🏁 ' + heading, cx, top + 55, {
      font: 'bold 40px system-ui, sans-serif', align: 'center', color: COLORS.gold, outlineWidth: 6,
    });

    rows.forEach((r, i) => {
      const y = top + 110 + i * 70;
      this.text(ctx, ordinal(i + 1) + '  ' + r.name, cx - 260, y, {
        font: 'bold 22px system-ui, sans-serif', outline: false,
      });
      this.text(ctx, formatTime(r.finishTime), cx + 260, y, {
        font: 'bold 22px ui-monospace, Menlo, Consolas, monospace', align: 'right', color: COLORS.goldLight, outline: false,
      });
      this.text(ctx, 'Laps: ' + r.lapTimes.map(formatTime).join('  ·  ') + '   Best: ' + formatTime(r.bestLap), cx - 260, y + 26, {
        font: '14px ui-monospace, Menlo, Consolas, monospace', color: '#bbb', outline: false,
      });
    });

    const footY = top + h - 40;
    if (race.newRecord) {
      this.text(ctx, '★ NEW TRACK RECORD ★', cx, footY - 30, {
        font: 'bold 20px system-ui, sans-serif', align: 'center', color: '#5dff7a', outline: false,
      });
    }
    this.text(ctx, 'Enter = race again   ·   Esc = menu', cx, footY, {
      font: '18px system-ui, sans-serif', align: 'center', color: '#ddd', outline: false,
    });
  },
};
