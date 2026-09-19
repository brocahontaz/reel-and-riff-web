# Reel & Riff — Web

Web implementation of **Reel & Riff**, a top-down overworld slice where fishing
is the music. You explore the small lakeside village of Willowmere Shores, talk
to its people, fish at the old dock, and practice guitar on the mat in your
cabin. Built with TypeScript, Phaser, Vite and npm. The original Unity game
lives in the sibling repository
[`reel-and-riff`](https://github.com/brocahontaz/reel-and-riff).

## License

No license yet — all rights reserved by the author. Do not reuse or
redistribute without permission.

## The slice

**Willowmere Shores** is one handcrafted 46×30-tile map with a lake, a dock, a
cabin, a dark little venue and a handful of people. Walk the paths and press
**E** at every prompt:

1. **Talk** — Old Marlin by the dock and June by the hall share tips and lore.
2. **Fish** — the original loop, now a focused scene at the dock: cast with
   **Space**, wait for the bite, hook it, then keep pressing on the pulse to
   play a riff and reel in your catch. Coins scale with species, weight and a
   perfect riff.
3. **Upgrade** — press **S** for the tackle shop (rods and lures) and **C** for
   the species journal while fishing.
4. **Practice** — enter your cabin and step on the guitar mat: a rhythm
   minigame over three short songs, graded gold, silver or bronze.
5. **Persist** — coins, gear, journal and best catch survive page reloads via
   browser storage.

## Controls

- **WASD / arrow keys** — move
- **E** — interact with spots and people; leave a focused activity (when idle)
- **Space / Enter** — cast, hook and play while fishing; start and play while
  practicing
- **S** — tackle shop (while fishing)
- **C** — species journal (while fishing)
- **Esc** — close shop/journal, or head back to shore (while idle)

## Scenes

- **Overworld** — the primary layer: Willowmere Shores, NPCs and interaction
  prompts.
- **Home** — the cabin interior with the bed and the guitar mat.
- **Fishing** — the focused fishing activity at the dock.
- **Practice** — the focused guitar rhythm activity.

The domain rules stay Phaser-free in `src/game` and `src/world` so the scenes
stay thin: input, rendering, timing and transitions only.

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

The prototype is intentionally asset-free: Phaser draws the overworld, fish and
feedback using generated shapes and text so gameplay can be iterated before art
production.

## CI/CD

GitHub Actions runs lint, format check, typecheck, tests and the production
build on every pull request and push to `main`. Pushes to `main` and `v*`
version tags publish the site image to `ghcr.io/brocahontaz/reel-and-riff-web`
([packages](https://github.com/brocahontaz?tab=packages)).

Local smoke test:

```bash
docker build -t reel-and-riff-web .
docker run --rm -p 8080:80 reel-and-riff-web
# open http://localhost:8080
```

## Structure

- `src/main.ts` — Phaser bootstrap that registers the four scenes
- `src/scenes/overworldScene.ts` — the primary exploration layer
- `src/scenes/homeScene.ts` — the cabin interior
- `src/scenes/fishingScene.ts` — the focused fishing activity
- `src/scenes/practiceScene.ts` — the focused guitar practice activity
- `src/scenes/actorView.ts` — shared procedural player figure
- `src/scenes/walkUi.ts` — shared prompts, dialogue box and camera fades
- `src/world/worldMap.ts` — pure ASCII world parsing, spots and map audits
- `src/game/movement.ts` — pure top-down movement with wall sliding
- `src/game/interactions.ts` — proximity spots and prompt text
- `src/game/guitar.ts` — pure practice minigame rules
- `src/game/fishing.ts` — deterministic fishing, hook and rhythm rules
- `src/game/beat.ts` — the reeling pulse clock
- `src/game/rhythm.ts` — per-species rhythm patterns, step timing and fight modifiers
- `src/game/encounter.ts` — depth-weighted fish encounters and bite timing
- `src/game/rewards.ts` — catch coin values and bonuses
- `src/game/tackle.ts` — shop purchase/equip rules and gear sanitising
- `src/game/rng.ts` — seeded PRNG so randomness stays testable
- `src/content/world.ts` — handcrafted Willowmere and cabin maps
- `src/content/npc.ts` — NPC dialogue content
- `src/content/songs.ts` — practice songs
- `src/content/fishingSpots.ts` — registry of fishable spots
- `src/content/fish.ts` — data-driven fish definitions
- `src/content/tackle.ts` — data-driven rods and lures
- `src/input/keys.ts` — raw key codes and pure input mapping
- `src/input/keyboard.ts` — keyboard bindings for fishing and panels
- `src/ui/dialogue.ts` — pure dialogue state and word wrap
- `src/ui/fishingVisuals.ts` — testable fishing-line presentation state
- `src/ui/panels.ts` — shop and journal panel content and digit handling
- `src/ui/fishInfo.ts` — compact, readable catch details formatting
- `src/persistence/playerStorage.ts` — browser-storage boundary for player
  coins, journal and tackle
- `src/audio/riffAudio.ts` — Web Audio riffs, coin chimes and outcome jingles
- `tests/` — gameplay, encounter, reward, tackle, panel, audio, persistence,
  movement, interaction and content-wiring tests

The domain rules are kept separate from Phaser so new locations, fish, gear
and mechanics can be added without making rendering code the source of game
state.
