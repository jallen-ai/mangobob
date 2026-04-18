import { GAME_WIDTH, GAME_HEIGHT } from '../main.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { Sound } from '../systems/Sound.js';

export class VictoryScene extends Phaser.Scene {
  constructor() { super('Victory'); }

  create(data) {
    Sound.victory();
    this.cameras.main.setBackgroundColor('#0f1a10');

    this.add.text(GAME_WIDTH / 2, 140, 'VICTORY!', {
      fontFamily: 'Trebuchet MS', fontSize: '72px', color: '#ffe24a',
      stroke: '#3a2510', strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 220, 'The Rotten Mango King is defeated!', {
      fontFamily: 'Trebuchet MS', fontSize: '24px', color: '#f5e6c8',
    }).setOrigin(0.5);

    this.add.image(GAME_WIDTH / 2 - 70, 360, 'mangobob').setScale(3.5);
    this.add.image(GAME_WIDTH / 2 + 70, 365, 'jeff').setScale(3.5);

    this.add.text(GAME_WIDTH / 2, 450, `Golden Mangoes Collected: ${data?.mangoes || 0}`, {
      fontFamily: 'Trebuchet MS', fontSize: '22px', color: '#ffe24a',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 482, `MangoBob Lives: ${data?.mangobobLives ?? 0}   \u00b7   Jeff Lives: ${data?.jeffLives ?? 0}`, {
      fontFamily: 'Trebuchet MS', fontSize: '18px', color: '#f5e6c8',
    }).setOrigin(0.5);

    // Confetti of mangoes
    for (let i = 0; i < 24; i++) {
      const x = Phaser.Math.Between(40, GAME_WIDTH - 40);
      const y = Phaser.Math.Between(-200, -40);
      const m = this.add.image(x, y, Math.random() > 0.5 ? 'mango' : 'golden-mango').setScale(Phaser.Math.FloatBetween(0.8, 1.6));
      this.tweens.add({
        targets: m,
        y: GAME_HEIGHT + 60,
        rotation: Math.PI * 4,
        duration: Phaser.Math.Between(3000, 5500),
        repeat: -1,
        delay: Phaser.Math.Between(0, 1800),
      });
    }

    const btn = this.add.text(GAME_WIDTH / 2, 560, 'PLAY AGAIN', {
      fontFamily: 'Trebuchet MS', fontSize: '28px', color: '#f5e6c8',
      backgroundColor: '#3a2510', padding: { x: 18, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#ffb347'));
    btn.on('pointerout', () => btn.setColor('#f5e6c8'));
    btn.on('pointerdown', () => { SaveSystem.reset(); this.scene.start('Title'); });
    this.input.keyboard.once('keydown-ENTER', () => { SaveSystem.reset(); this.scene.start('Title'); });
  }
}
