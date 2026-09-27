// Saving progress in the browser (localStorage).
// Wrapped in try/catch because some browsers block storage for local files
// or in private windows — the game still works, it just won't remember.

const Save = {
  PREFIX: 'burhanuddin-racing:',

  get(key, fallback) {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
    } catch (e) {
      // Ignore — saving is a bonus, not required.
    }
  },
};
