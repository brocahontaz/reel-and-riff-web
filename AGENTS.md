# AGENTS.md — reel-and-riff-web

Web repository for the **Reel & Riff** fishing game (Unity game in the sibling
repository `reel-and-riff`). Stack is not chosen yet; these rules are filled
in as the tooling emerges from real requirements.

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

## Verification

Run `npm install`, `npm test`, `npm run lint`, `npm run format:check`, and
`npm run build` before completing a change. Use `npm run dev` for a manual
playtest of the Phaser canvas.
