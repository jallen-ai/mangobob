import { GAME_WIDTH, GAME_HEIGHT } from '../main.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { Sound } from '../systems/Sound.js';
import { WEAPONS, WEAPON_KEYS } from '../systems/Weapons.js';

// Shown once on New Game (before the Title button advances to Game).
export class WeaponSelectScene extends Phaser.Scene {
  constructor() { super('WeaponSelect'); }

  create() {
    this.cameras.main.setBackgroundColor('#1a2a18');

    // Background flourishes
    for (let i = 0; i < 18; i++) {
      const x = Phaser.Math.Between(40, GAME_WIDTH - 40);
      const y = Phaser.Math.Between(40, GAME_HEIGHT - 40);
      this.add.image(x, y, i % 3 === 0 ? 'mango' : 'crate').setAlpha(0.12)
        .setScale(Phaser.Math.FloatBetween(0.8, 1.6))
        .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
    }

    this.add.text(GAME_WIDTH / 2, 70, 'CHOOSE YOUR WEAPON', {
      fontFamily: 'Trebuchet MS', fontSize: '44px', fontStyle: 'bold',
      color: '#ffb347', stroke: '#3a2510', strokeThickness: 7,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 115,
      'MangoBob always carries his club (SPACE) and grenades (F).\nPick a ranged weapon for E — this is yours for the whole run.',
      { fontFamily: 'Trebuchet MS', fontSize: '15px', color: '#f5e6c8', align: 'center', lineSpacing: 4 }
    ).setOrigin(0.5);

    // Cards
    const cardW = 240, cardH = 340, gap = 30;
    const keys = WEAPON_KEYS;
    const totalW = keys.length * cardW + (keys.length - 1) * gap;
    const startX = (GAME_WIDTH - totalW) / 2 + cardW / 2;
    const y = 380;

    keys.forEach((k, i) => this.drawCard(startX + i * (cardW + gap), y, cardW, cardH, WEAPONS[k]));

    // Hint for keyboard users
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, 'Click to choose \u2022 or press 1 / 2 / 3', {
      fontFamily: 'Trebuchet MS', fontSize: '13px', color: '#8ea67f',
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-ONE', () => this.choose('bazooka'));
    this.input.keyboard.on('keydown-TWO', () => this.choose('pistols'));
    this.input.keyboard.on('keydown-THREE', () => this.choose('slingshot'));
  }

  drawCard(x, y, w, h, weapon) {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, w, h, 0x3a2510).setStrokeStyle(4, 0x8b5a2b);
    container.add(bg);

    // Weapon icon
    const iconTexture = weapon.id === 'bazooka' ? 'bazooka-shot'
                      : weapon.id === 'pistols' ? 'mango'
                      : 'mango';
    const iconScale = weapon.id === 'bazooka' ? 2.4 : 3;
    const icon = this.add.image(0, -90, iconTexture).setScale(iconScale);
    container.add(icon);
    if (weapon.id === 'pistols') {
      // Draw a pair for the pistols card
      container.add(this.add.image(-26, -90, 'mango').setScale(2.4));
      container.add(this.add.image(26, -90, 'mango').setScale(2.4));
      icon.setVisible(false);
    }

    const title = this.add.text(0, 0, weapon.name, {
      fontFamily: 'Trebuchet MS', fontSize: '18px', fontStyle: 'bold',
      color: '#ffb347', align: 'center', wordWrap: { width: w - 24 },
    }).setOrigin(0.5);
    container.add(title);

    const blurb = this.add.text(0, 60, weapon.blurb, {
      fontFamily: 'Trebuchet MS', fontSize: '13px', color: '#f5e6c8',
      align: 'center', wordWrap: { width: w - 28 }, lineSpacing: 3,
    }).setOrigin(0.5);
    container.add(blurb);

    // Stat summary
    const stats = [
      `Damage: ${weapon.damage}${weapon.splashDamage ? ` (+${weapon.splashDamage} splash)` : ''}`,
      `Fire rate: ${Math.round(1000 / weapon.cooldown * 10) / 10}/s`,
    ];
    const statsText = this.add.text(0, 130, stats.join('  \u2022  '), {
      fontFamily: 'Trebuchet MS', fontSize: '11px', color: '#ffe24a',
    }).setOrigin(0.5);
    container.add(statsText);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setStrokeStyle(4, 0xffb347));
    bg.on('pointerout', () => bg.setStrokeStyle(4, 0x8b5a2b));
    bg.on('pointerdown', () => this.choose(weapon.id));

    return container;
  }

  choose(weaponId) {
    Sound.menuClick();
    const save = SaveSystem.load();
    SaveSystem.save({ ...save, defaultWeapon: weaponId });

    this.cameras.main.flash(200, 255, 220, 100);
    this.time.delayedCall(250, () => {
      this.scene.start('Game');
      this.scene.launch('UI');
    });
  }
}
