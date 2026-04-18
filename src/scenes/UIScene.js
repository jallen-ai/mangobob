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

    // Fury meter
    this.furyLabel = this.add.text(700, 14, 'FURY', { fontFamily: 'Trebuchet MS', fontSize: '11px', color: '#ffb347' }).setOrigin(0, 0);
    this.furyPips = [];
    for (let i = 0; i < 5; i++) {
      const pip = this.add.circle(708 + i * 14, 38, 5, 0x3a2510).setStrokeStyle(1, 0x6b3a1b);
      this.furyPips.push(pip);
    }
    this.furyTimerBg = this.add.rectangle(700, 38, 70, 8, 0x3a2510).setOrigin(0, 0.5).setVisible(false);
    this.furyTimerBar = this.add.rectangle(701, 38, 68, 6, 0xffe24a).setOrigin(0, 0.5).setVisible(false);

    // Zone name
    this.zoneText = this.add.text(GAME_WIDTH - 20, 28, '', { fontFamily: 'Trebuchet MS', fontSize: '14px', color: '#f5e6c8' }).setOrigin(1, 0.5);

    // Active indicator
    this.activeRing = this.add.circle(30, 30, 20).setStrokeStyle(3, 0xffe24a);

    // Boss bar (hidden by default)
    this.bossFrame = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 40, 720, 32, 0x1a0606).setStrokeStyle(3, 0xffb347);
    this.bossBarBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 40, 708, 20, 0x3a0a0a);
    this.bossBar = this.add.rectangle(GAME_WIDTH / 2 - 354, GAME_HEIGHT - 40, 708, 18, 0xcc1818).setOrigin(0, 0.5);
    this.bossHpText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, '', {
      fontFamily: 'Trebuchet MS', fontSize: '12px', color: '#ffffff', stroke: '#3a0000', strokeThickness: 3,
    }).setOrigin(0.5);
    this.bossLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 68, '', {
      fontFamily: 'Trebuchet MS', fontSize: '20px', fontStyle: 'bold',
      color: '#ffb347', stroke: '#3a2510', strokeThickness: 5,
    }).setOrigin(0.5);
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
    this.bossFrame.setVisible(v);
    this.bossBarBg.setVisible(v);
    this.bossBar.setVisible(v);
    this.bossHpText.setVisible(v);
    this.bossLabel.setVisible(v);
  }

  refreshBoss(hp, max) {
    const ratio = Phaser.Math.Clamp(hp / max, 0, 1);
    this.bossBar.width = 708 * ratio;
    this.bossHpText.setText(`${Math.max(0, Math.ceil(hp))} / ${max}`);
    // Color shift as HP drops
    if (ratio > 0.66) this.bossBar.fillColor = 0xcc1818;
    else if (ratio > 0.33) this.bossBar.fillColor = 0xff7a1a;
    else this.bossBar.fillColor = 0xffd04a;
  }

  refresh(state) {
    // Boss bar — authoritative sync from state every frame we get
    if (state.boss) {
      if (!this.bossFrame.visible) {
        this.bossLabel.setText('Rotten Mango King');
        this.setBossBarVisible(true);
      }
      this.refreshBoss(state.boss.hp, state.boss.max);
    } else if (this.bossFrame.visible) {
      this.setBossBarVisible(false);
    }

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

    // Fury meter
    const f = state.fury;
    if (f.active) {
      this.furyPips.forEach((p) => p.setVisible(false));
      this.furyTimerBg.setVisible(true);
      this.furyTimerBar.setVisible(true);
      const ratio = Phaser.Math.Clamp(f.remaining / 6000, 0, 1);
      this.furyTimerBar.width = 68 * ratio;
      this.furyLabel.setText('FURY!').setColor('#ffe24a');
    } else {
      this.furyTimerBg.setVisible(false);
      this.furyTimerBar.setVisible(false);
      this.furyPips.forEach((p, i) => {
        p.setVisible(true);
        if (i < f.charge) p.setFillStyle(0xffb347);
        else p.setFillStyle(0x3a2510);
      });
      const full = f.charge >= f.max;
      this.furyLabel.setText(full ? 'READY!' : 'FURY').setColor(full ? '#ffe24a' : '#ffb347');
      // pulse pips when ready
      if (full && !this._readyPulse) {
        this._readyPulse = this.tweens.add({
          targets: this.furyPips,
          scale: { from: 1, to: 1.35 },
          duration: 360,
          yoyo: true,
          repeat: -1,
        });
      } else if (!full && this._readyPulse) {
        this._readyPulse.stop();
        this.furyPips.forEach((p) => p.setScale(1));
        this._readyPulse = null;
      }
    }
  }
}
