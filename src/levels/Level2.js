// Level 2 — The Mango Factory.
// MangoBob enters through a door after defeating the Rotten Mango King.
// Three factory zones ending in a Factory Overseer boss.

export const LEVEL2 = {
  id: 2,
  name: 'Mango Factory',
  floorTile: 'factory-floor',
  accentTile: 'factory-belt',
  width: 2880,
  height: 640,
  playerSpawn: { x: 90, y: 320 },
  zones: [
    {
      id: 1,
      name: 'Loading Dock',
      bounds: { x: 0, y: 0, width: 960, height: 640 },
      gateAt: { x: 930, y: 320 },
      obstacles: [
        { type: 'metal-crate', x: 240, y: 180 },
        { type: 'metal-crate', x: 240, y: 460 },
        { type: 'metal-crate', x: 440, y: 150 },
        { type: 'metal-crate', x: 560, y: 500 },
        { type: 'pipe', x: 700, y: 200 },
        { type: 'pipe', x: 700, y: 460 },
        { type: 'metal-crate', x: 820, y: 320 },
      ],
      waves: [
        { delay: 700, spawns: [
          { type: 'monkey', x: 600, y: 220 },
          { type: 'small-monkey', x: 520, y: 440 },
          { type: 'small-monkey', x: 660, y: 460 },
        ] },
      ],
    },
    {
      id: 2,
      name: 'Conveyor Line',
      bounds: { x: 960, y: 0, width: 960, height: 640 },
      gateAt: { x: 1890, y: 320 },
      obstacles: [
        { type: 'pipe', x: 1100, y: 130 },
        { type: 'pipe', x: 1100, y: 510 },
        { type: 'metal-crate', x: 1280, y: 220 },
        { type: 'metal-crate', x: 1280, y: 420 },
        { type: 'metal-crate', x: 1520, y: 150 },
        { type: 'metal-crate', x: 1520, y: 490 },
        { type: 'pipe', x: 1720, y: 130 },
        { type: 'pipe', x: 1720, y: 510 },
        { type: 'metal-crate', x: 1820, y: 320 },
      ],
      waves: [
        { delay: 700, spawns: [
          { type: 'big-monkey', x: 1200, y: 320 },
          { type: 'small-monkey', x: 1300, y: 180 },
          { type: 'small-monkey', x: 1300, y: 460 },
        ] },
        { delay: 0, afterCleared: true, spawns: [
          { type: 'big-monkey', x: 1650, y: 240 },
          { type: 'big-monkey', x: 1650, y: 420 },
          { type: 'monkey', x: 1500, y: 320 },
        ] },
      ],
    },
    {
      id: 3,
      name: 'Overseer\u2019s Chamber',
      bounds: { x: 1920, y: 0, width: 960, height: 640 },
      gateAt: null,
      isBoss: true,
      obstacles: [
        { type: 'pipe', x: 2000, y: 120 },
        { type: 'pipe', x: 2000, y: 520 },
        { type: 'pipe', x: 2800, y: 120 },
        { type: 'pipe', x: 2800, y: 520 },
        { type: 'metal-crate', x: 2100, y: 320 },
        { type: 'metal-crate', x: 2700, y: 320 },
      ],
      waves: [],
    },
  ],
};
