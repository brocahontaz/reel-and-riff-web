/**
 * Pure practice minigame for the guitar mat, mirroring the fishing state
 * machine vocabulary. A run always resolves exactly `totalSteps(song)` steps
 * regardless of how the player plays, then reports a graded result.
 */

import type { Song } from '../content/songs';
import { playableSteps } from '../content/songs';
import { stepGlyph, type RhythmStep } from './rhythm';

export type PracticePhase = 'ready' | 'playing' | 'done';

export type PracticeGrade = 'gold' | 'silver' | 'bronze';

export type PracticeState = {
  phase: PracticePhase;
  song: Song;
  /** Index within the song's steps; wraps to 0 as each loop completes. */
  step: number;
  /** Completed loops; equals song.loops once the run is done. */
  loop: number;
  hits: number;
  misses: number;
  combo: number;
  bestCombo: number;
  score: number;
  lastFeedback: 'hit' | 'good' | 'miss' | 'flub' | 'rest-ok' | 'rest-flub' | '';
};

const GOOD_ACCURACY = 0.6;
const CLEAN_ACCURACY = 0.9;

export const createPracticeState = (song: Song): PracticeState => ({
  phase: 'ready',
  song,
  step: 0,
  loop: 0,
  hits: 0,
  misses: 0,
  combo: 0,
  bestCombo: 0,
  score: 0,
  lastFeedback: '',
});

/** Begin the run; only a fresh state can start. */
export const startPractice = (state: PracticeState): PracticeState => {
  if (state.phase !== 'ready') return state;
  return { ...state, phase: 'playing' };
};

/** The step kind at an absolute position, wrapping around the song's steps. */
export const stepKind = (song: Song, step: number): RhythmStep => {
  const length = song.steps.length;
  return song.steps[((step % length) + length) % length];
};

/** The next `count` song steps from `from`, with the active step bracketed. */
export const practiceGlyphs = (song: Song, from: number, count = 4): string =>
  Array.from({ length: count }, (_, index) => stepKind(song, from + index))
    .map((step, index) => (index === 0 ? `[${stepGlyph(step)}]` : stepGlyph(step)))
    .join(' ');

/** One resolved step advances the run; finishing the last one marks it done. */
const advance = (state: PracticeState, patch: Partial<PracticeState>): PracticeState => {
  let step = state.step + 1;
  let loop = state.loop;
  if (step >= state.song.steps.length) {
    step = 0;
    loop += 1;
  }
  return {
    ...state,
    ...patch,
    step,
    loop,
    phase: loop >= state.song.loops ? 'done' : 'playing',
  };
};

/**
 * Resolve the current step with a press: notes and bursts are played, rests
 * are flubbed. Accuracy >= 0.9 is a clean hit, >= 0.6 a good one, below that
 * a flub. Anything outside a playing run is ignored.
 */
export const practiceHit = (state: PracticeState, accuracy: number): PracticeState => {
  if (state.phase !== 'playing') return state;
  if (stepKind(state.song, state.step) === 'rest') {
    return advance(state, {
      combo: 0,
      misses: state.misses + 1,
      score: Math.max(0, state.score - 1),
      lastFeedback: 'rest-flub',
    });
  }
  const clean = accuracy >= GOOD_ACCURACY;
  if (!clean) {
    return advance(state, {
      combo: 0,
      misses: state.misses + 1,
      score: state.score + 2,
      lastFeedback: 'flub',
    });
  }
  const combo = state.combo + 1;
  return advance(state, {
    hits: state.hits + 1,
    combo,
    bestCombo: Math.max(state.bestCombo, combo),
    score: state.score + Math.round(10 * accuracy),
    lastFeedback: accuracy >= CLEAN_ACCURACY ? 'hit' : 'good',
  });
};

/** A note window expired unplayed: the run moves on at no score. */
export const practiceMiss = (state: PracticeState): PracticeState => {
  if (state.phase !== 'playing') return state;
  return advance(state, {
    combo: 0,
    misses: state.misses + 1,
    lastFeedback: 'miss',
  });
};

/** A rest expired in silence: free, and the run moves on. */
export const passRest = (state: PracticeState): PracticeState => {
  if (state.phase !== 'playing') return state;
  return advance(state, { lastFeedback: 'rest-ok' });
};

/**
 * Final tally. Gold demands a near-perfect run (accuracy >= 0.9) plus a combo
 * covering at least 75% of the song's playable steps; silver is accuracy
 * >= 0.7; everything else is bronze. The combo bar is measured against
 * playable steps so rest-heavy songs can still be played to gold.
 */
export const practiceResult = (
  state: PracticeState,
): { score: number; bestCombo: number; accuracy: number; grade: PracticeGrade } => {
  const attempts = state.hits + state.misses;
  const accuracy = attempts === 0 ? 1 : state.hits / attempts;
  const playableTotal = playableSteps(state.song).length * state.song.loops;
  const grade: PracticeGrade =
    accuracy >= 0.9 && state.bestCombo >= playableTotal * 0.75
      ? 'gold'
      : accuracy >= 0.7
        ? 'silver'
        : 'bronze';
  return { score: state.score, bestCombo: state.bestCombo, accuracy, grade };
};
