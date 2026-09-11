# Reel & Riff — Web

Web implementation of **Reel & Riff**, a fishing game where the fishing is the
music. The first slice is built with TypeScript, Phaser, Vite and npm. The
original Unity game lives in the sibling repository
[`reel-and-riff`](https://github.com/brocahontaz/reel-and-riff).

## License

No license yet — all rights reserved by the author. Do not reuse or
redistribute without permission.

Reel & Riff is a small, keyboard-first Phaser prototype where fishing and
music share the same loop. Cast with **Space** or **Enter**, wait for the
bite, hook the fish with a quick press, then keep pressing in time with the
pulse to play a riff and reel in your catch. Every catch pays coins, and coins
buy rods and lures that reach deeper water and rarer fish.

## The loop

1. **Cast** — Space starts the power meter; a deeper cast reaches rarer water.
2. **Wait** — press Space too early and the ripples scare the fish away.
3. **Hook** — when something bites you have a beat or two to set the hook.
4. **Riff** — press Space on the pulse. On-beat presses climb a melody and
   reel the fish in; sloppy ones raise tension until the line snaps.
5. **Reward** — coins scale with species value, landed weight, a perfect riff
   and a first-time species discovery bonus.
6. **Upgrade** — press **S** to spend coins on rods (faster reels, softer
   misses) and lures (rarer deep-water fish, bonus coins). Press **C** for the
   species journal, where undiscovered fish are still shadows.

## Development

```bash
npm install
npm run dev       # local Vite server
npm test          # deterministic domain and persistence tests
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run preview   # serve the production build locally, after npm run build
```

The prototype is intentionally asset-free: Phaser draws the lake, fish and
feedback using generated shapes and text so gameplay can be iterated before
art production.

## Structure

- `src/main.ts` — Phaser scene, input and presentation
- `src/audio/riffAudio.ts` — Web Audio riffs, coin chimes and outcome jingles
- `src/game/fishing.ts` — deterministic fishing, hook and rhythm rules
- `src/game/beat.ts` — the reeling pulse clock
- `src/game/encounter.ts` — depth-weighted fish encounters and bite timing
- `src/game/rewards.ts` — catch coin values and bonuses
- `src/game/tackle.ts` — shop purchase/equip rules and gear sanitising
- `src/game/rng.ts` — seeded PRNG so randomness stays testable
- `src/content/fish.ts` — data-driven fish definitions
- `src/content/tackle.ts` — data-driven rods and lures
- `src/content/location.ts` — first location and control prompt
- `src/input/keyboard.ts` — keyboard bindings for fishing and panels
- `src/ui/fishingVisuals.ts` — testable fishing-line presentation state
- `src/ui/panels.ts` — shop and journal panel content and digit handling
- `src/ui/fishInfo.ts` — compact, readable catch details formatting
- `src/persistence/playerStorage.ts` — browser-storage boundary for player
  coins, journal and tackle
- `tests/` — gameplay, encounter, reward, tackle, panel, audio and persistence
  tests

The domain rules are kept separate from Phaser so new locations, fish, gear
and mechanics can be added without making rendering code the source of game
state.
