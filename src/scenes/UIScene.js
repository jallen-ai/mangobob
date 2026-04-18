import { GAME_WIDTH, GAME_HEIGHT } from '../main.js';

export class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  create() {
    this.bg = this.add.rectangle(0, 0, GAME_WIDTH, 60, 0x0f1a10, 0.7).setOrigin(0, 0);

    // MangoBob portrait + bar
    this.mbPortrait = this.add.image(30, 30, 'mangobob').setScale(0.9);
    this.mbBarBg = this.add.rectangle(56, 22, 140, 10, 0x3a2510).setOrigin(0, 0.5);
    this.mbBar = this.add.rectangle(57, 22, 138, 8, 0xff6a1a).setOrigin(0, 0.5);
    this.mbLabel = this.add.text(56, 36, 'MangoBob', { fontFamily: 'Trebuchet MS', fontSize: '11px', color: '#ffb347' }).setOrigin(0, 0);

    // Jeff portrait + bar
    this.jfPortrait = this.add.image(240, 30, 'jeff').setScale(0.9);
    this.jfBarBg = this.add.rectangle(266, 22, 140, 10, 0x3a2510).setOrigin(0, 0.5);
    this.jfBar = this.add.rectangle(267, 22, 138, 8, 0x3a72c4).setOrigin(0, 0.5);
    this.jfLabel = this.add.text(266, 36, 'Jeff', { fontFamily: 'Trebuchet MS', fontSize: '11px', color: '#3a72c4' }).setOrigin(0, 0);

    // Lives
    this.livesGroup = this.add.container(460, 28);
    this.livesText = this.add.text(430, 22, 'LIVES', { fontFamily: 'Trebuchet MS', fontSize: '12px', color: '#f5e6c8' }).setOrigin(0, 0.5);

    // Mangoes
    this.mangoIcon = this.add.image(620, 28, 'golden-mango').setScale(1.1);
    this.mangoText = this.add.text(638, 28, 'x 0', { fontFamily: 'Trebuchet MS', fontSize: '18px', color: '#ffe24a', stroke: '#3a2510', strokeThickness: 3 }).setOrigin(0, 0.5);

    // Zone name
    this.zoneText = this.add.text(GAME_WIDTH - 20, 28, '', { fontFamily: 'Trebuchet MS', fontSize: '14px', color: '#f5e6c8' }).setOrigin(1, 0.5);

    // Active indicator
    this.activeRing = this.add.circle(30, 30, 20).setStrokeStyle(3, 0xffe24a);

    // Boss bar (hidden by default)
    this.bossBarBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 34, 680, 20, 0x3a0a0a).setStrokeStyle(2, 0xffb347);
    this.bossBar = this.add.rectangle(GAME_WIDTH / 2 - 338, GAME_HEIGHT - 34, 676, 16, 0xcc1818).setOrigin(0, 0.5);
    this.bossLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 58, '', { fontFamily: 'Trebuchet MS', fontSize: '18px', color: '#ffb347', stroke: '#3a2510', strokeThickness: 4 }).setOrigin(0.5);
    this.setBossBarVisible(false);

    // Pause overlay
    this.pauseText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'PAUSED', {
      fontFamily: 'Trebuchet MS', fontSize: '64px', color: '#ffb347', stroke: '#3a2510', strokeThickness: 8,
    }).setOrigin(0.5).setVisible(false);

    this.hearts = [];

    // Subscribe to Game events
    const gs = this.scene.get('Game');
    gs.events.on('hud-refresh', (state) => this.refresh(state));
    gs.events.on('hud-pause', (paused) => this.pauseText.setVisible(paused));
    gs.events.on('boss-appeared', (boss) => {
      this.bossLabel.setText('Rotten Mango King');
      this.setBossBarVisible(true);
      this.refreshBoss(boss.health, boss.maxHealth);
    });
    gs.events.on('bossDamaged', (boss) => this.refreshBoss(boss.health, boss.maxHealth));
    gs.events.on('bossDefeated', () => this.setBossBarVisible(false));
    gs.events.on('shutdown', () => this.scene.stop());
  }

  setBossBarVisible(v) {
    this.bossBarBg.setVisible(v);
    this.bossBar.setVisible(v);
    this.bossLabel.setVisible(v);
  }

  refreshBoss(hp, max) {
    const ratio = Phaser.Math.Clamp(hp / max, 0, 1);
    this.bossBar.width = 676 * ratio;
  }

  refresh(state) {
    const mbRatio = Math.max(0, state.mangobob.hp / state.mangobob.max);
    const jfRatio = Math.max(0, state.jeff.hp / state.jeff.max);
    this.mbBar.width = 138 * mbRatio;
    this.jfBar.width = 138 * jfRatio;

    this.mbPortrait.setAlpha(state.mangobob.alive ? 1 : 0.35);
    this.jfPortrait.setAlpha(state.jeff.alive ? 1 : 0.35);

    this.mangoText.setText('x ' + state.mangoes);
    this.zoneText.setText(state.zoneName);

    // Active ring
    if (state.activeKey === 'mangobob') this.activeRing.setPosition(this.mbPortrait.x, this.mbPortrait.y);
    else this.activeRing.setPosition(this.jfPortrait.x, this.jfPortrait.y);

    // Hearts
    this.hearts.forEach((h) => h.destroy());
    this.hearts = [];
    for (let i = 0; i < state.lives; i++) {
      this.hearts.push(this.add.image(485 + i * 22, 28, 'heart').setScale(0.9));
    }
  }
}
