import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { VictoryScene } from './scenes/VictoryScene.js';

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 640;

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1d2a1b',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, TitleScene, GameScene, UIScene, GameOverScene, VictoryScene],
};

new Phaser.Game(config);
