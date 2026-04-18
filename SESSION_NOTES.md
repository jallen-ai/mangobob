# Session handoff — 2026-04-18

This doc captures what shipped this session and what's next. Pick up from any sprint below; they're independent.

## What shipped today

### Morning build (the whole game)
- Phaser 3 scaffold + GitHub Pages deploy
- MangoBob & Jeff with AI companion swap
- Mango club + swing animation, bazooka, grenades with splash, slingshot
- Monkey enemies, Rotten Mango King boss with 4 attack patterns
- Health / lives / save system (localStorage)
- Full HUD, title screen, Victory / GameOver scenes
- Mango Fury super move with meter and activation
- Real illustrated MangoBob sprite (replaced procedural placeholder)
- Kenney CC0 sound effects (26 OGG files wired to every event)
- Enemy variety — Small / Normal / Big monkey subtypes
- Level 2: Mango Factory with factory-themed tiles + factory door transition
- Jeff removed from gameplay (code preserved, stub kept)
- Per-character lives (was shared lives)

### Late-session progression pass (this commit batch)

**Sprint 1 — Wallet + persistent save** (`17fb19e`)
- Save now carries `wallet`, `upgrades[]`, `bossEncounters`
- Wallet persists across death; per-run mango count resets as before
- HUD shows both counts ("x 2" per-run + "WALLET 12" persistent)

**Sprint 2 — Jump mechanic** (`17fb19e`)
- `V` key hops vertically for ~420 ms
- Shadow sprite stays on ground, shrinks during air time
- While airborne: immune to contact damage + shockwave damage
- 700 ms cooldown — deliberate, not spammable

**Sprint 3 — Between-level shop + upgrade pool** (`17fb19e`)
- New `ShopScene` intercepts the Level 1 → Level 2 transition
- 12-upgrade pool in `src/systems/Upgrades.js`: HP, speed, damage, reach, bazooka boost, Fury tuning, roll distance, jump height, extra lives, heal-on-pickup amount
- Cheapest-first draw so first-time visitors always see something affordable
- Purchases persist across death. `buildEffectiveStats()` folds owned upgrades over `CHAR_CONFIG.mangobob` at Player construction.

**Sprint 5 — Recurring boss + shockwave attack** (`f9396fb`)
- Rotten Mango King no longer dies on first defeat — plays escape animation, flies off-screen with a taunt, re-appears tougher next level
- HP scales per encounter: 60 → 85 → 110 → 150
- Tint darkens each encounter (pale → bruised → enraged red)
- **New attack**: ground-slam shockwave — boss hops, slams, orange ring expands outward. Damage only lands if player is on the ground. **Press V to jump over it.**
- Final-arena flag currently = `levelId >= 2` (flip to `=== 4` when Levels 3+4 land)

## What's deferred (for next session)

### Sprint 4 — Weapon triangle (Phase C)
**Not started.** This is a larger refactor:
- Rework `Player.tryPrimary/Secondary/Heavy` into three weapon **slots**: light / heavy / shield
- New `src/systems/Weapons.js` registry keyed by weapon id
- Rebind inputs: Space = light, E = heavy, F = shield (hold)
- Add slingshot as MangoBob's light default
- Add shield mechanic: hold to block (reduce damage ~60%)
- Certain upgrades already exist in pool to unlock weapons (e.g., `unlock-bazooka`) — just needs wiring
- Estimated scope: ~1–2 hours focused work

### Sprint 6 — Levels 3 + 4 (Phase F)
**Not started.** Content-heavy:
- `src/levels/Level3.js` — suggested "Mango Swamp" biome (poison pools as hazard tiles, new obstacles)
- `src/levels/Level4.js` — "Mango Throne Room" final arena
- New `BootScene` textures: swamp floor, lily-pad, poison-pool, stone-floor, throne, throne-arena decor
- Generalize the level-transition from the Level-1-specific `enterLevel2()` to a generic `enterNextLevel()`
- Update `spawnBoss` final-arena flag once Level 4 exists
- Save the Level 2 → Shop → Level 3 link the same way Level 1 → Shop → Level 2 works today

### Minor polish backlog
- Shopkeeper NPC sprite (currently just text banner; could be a character)
- Boss re-entrance cinematic when he returns ("I'M BAAAACK!" moment in Level 2)
- More boss attack variety in later encounters (projectile fan that arcs, summon waves)
- Sound preset for shockwave slam + boss escape (currently reuses existing clips)

## Key files touched

- `src/scenes/GameScene.js` — scene-level wiring, shop transition, shockwave attack, bossEscaped handling
- `src/entities/Player.js` — jump mechanic, shadow, effective stats via `buildEffectiveStats`
- `src/entities/Enemy.js` — `Boss` gains `encounterCount`, `isFinalEncounter`, `escape()`, plus shockwave attack hook
- `src/systems/SaveSystem.js` — wallet, upgrades, bossEncounters fields
- `src/systems/Upgrades.js` — new; the upgrade pool
- `src/scenes/ShopScene.js` — new; between-level shop
- `src/scenes/GameOverScene.js` — preserves wallet/upgrades/encounters on death
- `src/scenes/UIScene.js` — wallet display
- `src/main.js` — registers `ShopScene`
- `index.html` — updated controls banner (V jump / SHIFT roll)

## How to test end-to-end

1. `python3 -m http.server 8765` in project root, visit http://localhost:8765 (or use the preview panel)
2. **New Game** → Jungle. Pick up golden mangoes; watch wallet tick.
3. Press `V` mid-level — visible hop, MangoBob immune to monkey contact while airborne.
4. Beat Level 1 monkeys → reach boss → drop King's HP to 0 → he **escapes** (taunt + fly off) → factory door spawns.
5. Walk into door → **Shop** appears. Spend wallet on upgrades. Continue.
6. Level 2 boss has more HP + uses the **shockwave slam** — jump to avoid.
7. Defeat Level 2 boss → real death animation → Victory screen.
8. Die mid-level → title screen → Continue → wallet + upgrades persist; per-run count reset.
