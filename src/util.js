// Small helpers shared by the whole game.

// Bump this (and the ?v= numbers in index.html) whenever you release a change.
// It's shown on the title screen so you can tell which version you are playing.
const GAME_VERSION = '9  ·  2 Oct 2026';

// The screen is always 1280 x 720. The world (the map the tracks are built on)
// is TRACK_SCALE times bigger in each direction, so a bigger TRACK_SCALE means
// bigger tracks and longer laps. 1 = one screen, 2 = four screens, and so on.
const TRACK_SCALE = 2;

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const WORLD_WIDTH = GAME_WIDTH * TRACK_SCALE;
const WORLD_HEIGHT = GAME_HEIGHT * TRACK_SCALE;

// Team colours: red & gold.
const COLORS = {
  red: '#c8102e',
  redDark: '#3a0a10',
  gold: '#d4a017',
  goldLight: '#f2c94c',
  black: '#141414',
  white: '#ffffff',
};

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

// A random number generator that gives the same numbers every time for the
// same seed, so palm trees and sand speckles don't move between races.
function seededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 83.456 seconds -> "1:23.456"
function formatTime(seconds) {
  if (seconds == null || !isFinite(seconds)) return '--:--.---';
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return m + ':' + (s < 10 ? '0' : '') + s.toFixed(3);
}

function ordinal(n) {
  return n + (['th', 'st', 'nd', 'rd'][n] || 'th');
}
