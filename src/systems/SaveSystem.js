const KEY = 'mangobob-save-v1';

const defaultSave = () => ({
  mangobobLives: 3,
  jeffLives: 3,
  zone: 1,
  mangoesCollected: 0,
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
