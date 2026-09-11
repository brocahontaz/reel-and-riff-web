# Reel & Riff — Web

Web implementation of **Reel & Riff**, a fishing game where the fishing is the
music. The first slice is built with TypeScript, Phaser, Vite and npm. The
original Unity game lives in the sibling repository
[`reel-and-riff`](https://github.com/brocahontaz/reel-and-riff).

## License

No license yet — all rights reserved by the author. Do not reuse or
redistribute without permission.

Reel & Riff is a small, keyboard-first Phaser prototype where fishing and
music share the same loop. Cast with **Space** or **Enter**, wait for the bite,
then press either key in time with the pulse to play a riff and reel in your
catch.

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

- `src/main.ts` — Phaser scene, input and presentation for the first slice
- `src/audio/riffAudio.ts` — tiny Web Audio riff and outcome feedback
- `src/game/fishing.ts` — deterministic fishing and rhythm rules
- `src/input/keyboard.ts` — keyboard action binding, ready for controller mapping
- `src/content/fish.ts` — data-driven fish definitions
- `src/content/location.ts` — first location and control prompt
- `src/ui/fishingVisuals.ts` — testable fishing-line presentation state
- `src/ui/fishInfo.ts` — compact, readable catch details formatting
- `src/persistence/playerStorage.ts` — browser-storage boundary for player state
- `tests/` — gameplay and persistence tests

The current slice has one location and three fish. The domain rules are kept
separate from Phaser so new locations, fish, songs and mechanics can be added
without making rendering code the source of game state.
