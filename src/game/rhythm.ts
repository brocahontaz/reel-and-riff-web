import type { Fish } from '../content/fish';
import type { ReelModifiers } from './fishing';
import type { Rod } from '../content/tackle';

/** One slot in a fish's repeating riff. */
export type RhythmStep = 'note' | 'burst' | 'rest';

const PATTERNS: Record<string, readonly RhythmStep[]> = {
  steady: ['note', 'note', 'note', 'note'],
  darting: ['note', 'note', 'note', 'burst', 'note', 'note', 'burst', 'note'],
  tricky: ['note', 'note', 'rest', 'note', 'rest', 'note', 'note', 'rest'],
};

/** The repeating riff a fish plays, keyed by behaviour (steady as fallback). */
export const patternFor = (fish: Fish): readonly RhythmStep[] =>
  PATTERNS[fish?.behavior] ?? PATTERNS.steady;

/** The riff step at a position, wrapping negative and overflow indices. */
export const stepAt = (fish: Fish, step: number): RhythmStep => {
  const pattern = patternFor(fish);
  return pattern[((step % pattern.length) + pattern.length) % pattern.length];
};

/** Rests are silence: playing one is a flub, letting it pass is free. */
export const isPlayable = (step: RhythmStep): boolean => step !== 'rest';

/** Riff length per playable note, so rest-heavy fish still reel in at the same pace. */
export const noteDensity = (fish: Fish): number => {
  const pattern = patternFor(fish);
  const playable = pattern.filter(isPlayable).length;
  return playable === 0 ? 1 : pattern.length / playable;
};

/** Seconds between beats: faster fish pulse sooner, clamped so fights stay human. */
export const baseInterval = (fish: Fish): number =>
  Math.max(0.65, 1.15 - (fish?.difficulty ?? 1) * 0.12);

/** The wait before a step's beat: only bursts arrive early. */
export const stepInterval = (fish: Fish, step: number): number => {
  const base = baseInterval(fish);
  if (stepAt(fish, step) !== 'burst') return base;
  return Number((base * 0.62).toFixed(2));
};

/** The equipped rod folded together with the riff into plain reel modifiers. */
export const fightModifiers = (rod: Rod | undefined, fish: Fish): ReelModifiers => ({
  progressScale: (rod?.progressPerHit ?? 1) * noteDensity(fish),
  missTensionScale: rod?.missTensionScale ?? 1,
});

export const stepGlyph = (step: RhythmStep): string =>
  step === 'burst' ? '♪!' : step === 'rest' ? '·' : '♪';

/** The next `count` riff steps from `from`, with the active step bracketed. */
export const patternGlyphs = (fish: Fish, from: number, count = 4): string =>
  Array.from({ length: count }, (_, index) => stepAt(fish, from + index))
    .map((step, index) => (index === 0 ? `[${stepGlyph(step)}]` : stepGlyph(step)))
    .join(' ');
