const KEY = 'mangobob-save-v1';

const defaultSave = () => ({
  mangobobLives: 3,
  jeffLives: 3,
  levelId: 1,
  zone: 1,
  // Per-run counter (resets on death/new game)
  mangoesCollected: 0,
  // Persistent wallet — survives death, spent in shop
  wallet: 0,
  // Array of purchased upgrade ids (see Upgrades.js)
  upgrades: [],
  // How many times the player has faced the Rotten Mango King (0..3)
  bossEncounters: 0,
  bossDefeated: false,
  lastPlayed: null,
});

export const SaveSystem = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultSave();
      return { ...defaultSave(), ...JSON.parse(raw) };
    } catch (_) {
      return defaultSave();
    }
  },

  save(state) {
    const next = { ...state, lastPlayed: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  },

  reset() {
    localStorage.removeItem(KEY);
    return defaultSave();
  },

  hasSave() {
    return localStorage.getItem(KEY) !== null;
  },
};
