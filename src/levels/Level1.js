// Level 1 layout — three zones in a horizontally-chained map.
// Each zone has: spawn points, obstacle list, enemy waves, exit gate coords.
// Tile size 32; world is built as a large area we scroll over.

export const LEVEL1 = {
  width: 2880,
  height: 640,
  playerSpawn: { x: 90, y: 320 },
  zones: [
    {
      id: 1,
      name: 'Jungle Clearing',
      bounds: { x: 0, y: 0, width: 960, height: 640 },
      gateAt: { x: 930, y: 320 },
      obstacles: [
        { type: 'tree', x: 200, y: 160 },
        { type: 'tree', x: 380, y: 480 },
        { type: 'tree', x: 620, y: 180 },
        { type: 'tree', x: 820, y: 520 },
        { type: 'rock', x: 320, y: 330 },
        { type: 'rock', x: 580, y: 400 },
        { type: 'crate', x: 740, y: 300 },
      ],
      waves: [
        { delay: 700, spawns: [{ type: 'monkey', x: 600, y: 200 }, { type: 'monkey', x: 700, y: 460 }] },
      ],
    },
    {
      id: 2,
      name: 'Monkey Camp',
      bounds: { x: 960, y: 0, width: 960, height: 640 },
      gateAt: { x: 1890, y: 320 },
      obstacles: [
        { type: 'rock', x: 1080, y: 180 },
        { type: 'rock', x: 1160, y: 460 },
        { type: 'crate', x: 1320, y: 260 },
        { type: 'crate', x: 1320, y: 380 },
        { type: 'tree', x: 1520, y: 120 },
        { type: 'tree', x: 1520, y: 520 },
        { type: 'crate', x: 1700, y: 300 },
        { type: 'rock', x: 1820, y: 180 },
        { type: 'rock', x: 1820, y: 460 },
      ],
      waves: [
        { delay: 700, spawns: [{ type: 'monkey', x: 1200, y: 200 }, { type: 'monkey', x: 1200, y: 460 }] },
        { delay: 0, afterCleared: true, spawns: [{ type: 'monkey', x: 1700, y: 160 }, { type: 'monkey', x: 1700, y: 480 }, { type: 'monkey', x: 1550, y: 320 }] },
      ],
    },
    {
      id: 3,
      name: 'Boss Arena',
      bounds: { x: 1920, y: 0, width: 960, height: 640 },
      gateAt: null,
      isBoss: true,
      obstacles: [
        { type: 'rock', x: 2000, y: 120 },
        { type: 'rock', x: 2000, y: 520 },
        { type: 'rock', x: 2800, y: 120 },
        { type: 'rock', x: 2800, y: 520 },
      ],
      waves: [],
    },
  ],
};
