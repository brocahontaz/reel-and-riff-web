# AGENTS.md — reel-and-riff-web

Web repository for **Reel & Riff**, a top-down overworld slice where fishing is
the music (Unity game in the sibling repository `reel-and-riff`). Built with
TypeScript, Phaser, Vite and npm; these rules are filled in as the tooling
emerges from real requirements.

## Workflow

- Work in vertical slices: smallest useful end-to-end behavior first.
- No structure for hypothetical future functionality — the first slice
  defines the stack, layout and conventions.
- Observable behavior changes require automated tests; behavior is verified
  with the commands defined in _Verification_ below once tooling exists.

## Conventions

- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, ...).
- Follow standard conventions of whatever framework the first slice picks;
  update this file when they are chosen instead of inventing parallel rules.

### Game architecture

- The overworld (`src/scenes/overworldScene.ts`) is the primary game layer;
  fishing and music are focused activity scenes it hands off to.
- Pure domain modules under `src/game` and `src/world` stay Phaser-free, so
  scenes only do input, rendering, timing and transitions.
- Handcrafted maps live in `src/content/world.ts`; `WILLOWMERE_PROBLEMS` must
  stay empty when editing maps (tests enforce it).

## Verification

Run `npm install`, `npm test`, `npm run lint`, `npm run format:check`, and
`npm run build` before completing a change. Use `npm run dev` for a manual
playtest of the Phaser canvas.
