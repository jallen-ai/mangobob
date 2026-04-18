import { GAME_WIDTH, GAME_HEIGHT } from '../main.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { Sound } from '../systems/Sound.js';
import { pickShopOffer } from '../systems/Upgrades.js';

// Between-level shop. Data comes through scene.start('Shop', { nextLevel, nextZoneIdx }).
export class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }

  create(data) {
    this.nextLevel = data?.nextLevel || 2;
    this.nextZoneIdx = data?.nextZoneIdx || 0;

    this.save = SaveSystem.load();
    this.wallet = this.save.wallet || 0;
    this.owned = [...(this.save.upgrades || [])];

    this.cameras.main.setBackgroundColor('#241a14');

    // Decorative mango-shop backdrop — stacked crates, warm glow
    for (let i = 0; i < 8; i++) {
      const x = Phaser.Math.Between(40, GAME_WIDTH - 40);
      const y = Phaser.Math.Between(60, GAME_HEIGHT - 60);
      this.add.image(x, y, i % 2 === 0 ? 'crate' : 'mango').setAlpha(0.1).setScale(Phaser.Math.FloatBetween(0.8, 1.5));
    }

    // Banner
    this.add.text(GAME_WIDTH / 2, 60, 'MANGO MERCHANT', {
      fontFamily: 'Trebuchet MS', fontSize: '42px', fontStyle: 'bold',
      color: '#ffb347', stroke: '#3a2510', strokeThickness: 7,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 105, 'Spend your golden mangoes before moving on', {
      fontFamily: 'Trebuchet MS', fontSize: '16px', color: '#f5e6c8',
    }).setOrigin(0.5);

    // Wallet display
    this.add.image(GAME_WIDTH / 2 - 60, 145, 'golden-mango').setScale(1.6);
    this.walletText = this.add.text(GAME_WIDTH / 2 - 40, 145, `x ${this.wallet}`, {
      fontFamily: 'Trebuchet MS', fontSize: '28px', color: '#ffe24a',
      stroke: '#3a2510', strokeThickness: 4,
    }).setOrigin(0, 0.5);

    // Offer cards
    const offers = pickShopOffer(this.owned, 4);
    const cardW = 200, cardH = 220, gap = 20;
    const totalW = offers.length * cardW + (offers.length - 1) * gap;
    const startX = (GAME_WIDTH - totalW) / 2 + cardW / 2;
    const y = 340;

    this.cards = offers.map((u, i) => this.drawCard(startX + i * (cardW + gap), y, cardW, cardH, u));

    if (offers.length === 0) {
      this.add.text(GAME_WIDTH / 2, y, 'No more upgrades available!', {
        fontFamily: 'Trebuchet MS', fontSize: '20px', color: '#f5e6c8',
      }).setOrigin(0.5);
    }

    // Continue button
    const btn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, 'CONTINUE TO NEXT LEVEL', {
      fontFamily: 'Trebuchet MS', fontSize: '24px', fontStyle: 'bold',
      color: '#f5e6c8', backgroundColor: '#3a2510', padding: { x: 24, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#ffb347'));
    btn.on('pointerout', () => btn.setColor('#f5e6c8'));
    btn.on('pointerdown', () => this.continueToLevel());

    this.input.keyboard.once('keydown-ENTER', () => this.continueToLevel());
    this.input.keyboard.once('keydown-SPACE', () => this.continueToLevel());
  }

  drawCard(x, y, w, h, upgrade) {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, w, h, 0x3a2510).setStrokeStyle(3, 0x8b5a2b);
    container.add(bg);

    const icon = this.add.image(0, -70, 'golden-mango').setScale(2.2);
    container.add(icon);

    const title = this.add.text(0, -10, upgrade.name, {
      fontFamily: 'Trebuchet MS', fontSize: '14px', fontStyle: 'bold',
      color: '#ffb347', align: 'center', wordWrap: { width: w - 20 },
    }).setOrigin(0.5);
    container.add(title);

    const desc = this.add.text(0, 40, upgrade.desc || '', {
      fontFamily: 'Trebuchet MS', fontSize: '12px', color: '#f5e6c8',
      align: 'center', wordWrap: { width: w - 24 },
    }).setOrigin(0.5);
    container.add(desc);

    const price = this.add.text(0, 90, `${upgrade.cost} \u{1F7E0}`, {
      fontFamily: 'Trebuchet MS', fontSize: '20px', fontStyle: 'bold',
      color: '#ffe24a', stroke: '#3a2510', strokeThickness: 3,
    }).setOrigin(0.5);
    container.add(price);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => { if (!container.sold) bg.setStrokeStyle(3, 0xffb347); });
    bg.on('pointerout', () => { if (!container.sold) bg.setStrokeStyle(3, 0x8b5a2b); });
    bg.on('pointerdown', () => this.tryBuy(container, upgrade));

    container.bg = bg;
    container.price = price;
    container.sold = false;
    container.upgrade = upgrade;

    return container;
  }

  tryBuy(card, upgrade) {
    if (card.sold) return;
    if (this.wallet < upgrade.cost) {
      // Flash red + sound
      this.tweens.add({
        targets: card.bg,
        alpha: { from: 1, to: 0.4 },
        yoyo: true, duration: 120,
      });
      Sound.playerHurt();
      return;
    }
    this.wallet -= upgrade.cost;
    this.owned.push(upgrade.id);
    SaveSystem.save({ ...this.save, wallet: this.wallet, upgrades: this.owned });
    this.save = SaveSystem.load();

    card.sold = true;
    card.bg.setFillStyle(0x1a1008).setStrokeStyle(3, 0x3a2510);
    card.price.setText('OWNED').setColor('#8ea67f');

    this.walletText.setText(`x ${this.wallet}`);
    Sound.goldenPickup();
    this.cameras.main.flash(120, 255, 220, 120);
  }

  continueToLevel() {
    Sound.menuClick();
    SaveSystem.save({ ...this.save, levelId: this.nextLevel, zone: this.nextZoneIdx + 1 });
    this.scene.start('Game', { level: this.nextLevel, zoneIdx: this.nextZoneIdx });
    this.scene.launch('UI');
  }
}
