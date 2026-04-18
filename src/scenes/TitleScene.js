import { GAME_WIDTH, GAME_HEIGHT } from '../main.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { Sound } from '../systems/Sound.js';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this.cameras.main.setBackgroundColor('#1a2a18');

    // Background flourishes
    for (let i = 0; i < 14; i++) {
      const x = Phaser.Math.Between(20, GAME_WIDTH - 20);
      const y = Phaser.Math.Between(20, GAME_HEIGHT - 20);
      const img = this.add.image(x, y, i % 3 === 0 ? 'mango' : 'grass').setAlpha(0.18).setScale(Phaser.Math.FloatBetween(0.8, 1.6));
      img.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
    }

    // Title
    const title = this.add.text(GAME_WIDTH / 2, 150, 'MANGOBOB & JEFF', {
      fontFamily: 'Trebuchet MS',
      fontSize: '64px',
      fontStyle: 'bold',
      color: '#ffb347',
      stroke: '#3a2510',
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 210, 'vs. the Rotten Mango King', {
      fontFamily: 'Trebuchet MS',
      fontSize: '26px',
      color: '#f5e6c8',
      stroke: '#3a2510',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Character showcase \u2014 Jeff is out of the lineup for now, MangoBob centered
    this.add.image(GAME_WIDTH / 2, 330, 'mangobob').setDisplaySize(160, 160);
    this.add.text(GAME_WIDTH / 2, 410, 'MangoBob', { fontSize: '18px', color: '#ffb347' }).setOrigin(0.5);

    // Menu
    const hasSave = SaveSystem.hasSave();
    const save = SaveSystem.load();

    const buttons = [];
    if (hasSave) {
      buttons.push({
        label: `CONTINUE  (Zone ${save.zone} \u2022 MB ${save.mangobobLives}\u2665 Jeff ${save.jeffLives}\u2665)`,
        action: () => this.startGame(false),
      });
      buttons.push({ label: 'NEW GAME', action: () => this.startGame(true) });
    } else {
      buttons.push({ label: 'START GAME', action: () => this.startGame(true) });
    }

    buttons.forEach((btn, i) => {
      const y = 460 + i * 48;
      const text = this.add.text(GAME_WIDTH / 2, y, btn.label, {
        fontFamily: 'Trebuchet MS',
        fontSize: '26px',
        color: '#f5e6c8',
        backgroundColor: '#3a2510',
        padding: { x: 18, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      text.on('pointerover', () => text.setColor('#ffb347'));
      text.on('pointerout', () => text.setColor('#f5e6c8'));
      text.on('pointerdown', () => { Sound.menuClick(); btn.action(); });
    });

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, 'Click a button or press ENTER to start', {
      fontFamily: 'Trebuchet MS',
      fontSize: '14px',
      color: '#8ea67f',
    }).setOrigin(0.5);

    this.input.keyboard.once('keydown-ENTER', () => this.startGame(!hasSave));
  }

  startGame(reset) {
    if (reset) SaveSystem.reset();
    const save = SaveSystem.load();
    // New game (or a save without a chosen weapon) \u2192 weapon select first
    if (!save.defaultWeapon) {
      this.scene.start('WeaponSelect');
    } else {
      this.scene.start('Game');
      this.scene.launch('UI');
    }
  }
}
