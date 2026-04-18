import { GAME_WIDTH, GAME_HEIGHT } from '../main.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { Sound } from '../systems/Sound.js';

export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  create(data) {
    Sound.gameOver();
    this.cameras.main.setBackgroundColor('#1a0a0a');

    this.add.text(GAME_WIDTH / 2, 160, 'OUT OF LIVES', {
      fontFamily: 'Trebuchet MS', fontSize: '64px', color: '#cc1818',
      stroke: '#3a2510', strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 240, 'The monkeys got away with the mangoes...', {
      fontFamily: 'Trebuchet MS', fontSize: '22px', color: '#f5e6c8',
    }).setOrigin(0.5);

    this.add.image(GAME_WIDTH / 2 - 40, 360, 'mangobob').setScale(3).setTint(0x888888);
    this.add.image(GAME_WIDTH / 2 + 40, 365, 'jeff').setScale(3).setTint(0x888888);

    this.add.text(GAME_WIDTH / 2, 440, `Golden Mangoes: ${data?.mangoes || 0}`, {
      fontFamily: 'Trebuchet MS', fontSize: '20px', color: '#ffe24a',
    }).setOrigin(0.5);

    // Reset save so Continue doesn't bring them back with 0 lives
    SaveSystem.reset();

    const btn = this.add.text(GAME_WIDTH / 2, 520, 'TRY AGAIN', {
      fontFamily: 'Trebuchet MS', fontSize: '28px', color: '#f5e6c8',
      backgroundColor: '#3a2510', padding: { x: 18, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#ffb347'));
    btn.on('pointerout', () => btn.setColor('#f5e6c8'));
    btn.on('pointerdown', () => this.scene.start('Title'));
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('Title'));
  }
}
