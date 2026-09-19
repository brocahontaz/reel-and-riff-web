import { describe, expect, it } from 'vitest';
import { isPlayable } from '../src/game/rhythm';
import { SONGS, songById, totalSteps } from '../src/content/songs';
import {
  createPracticeState,
  passRest,
  practiceHit,
  practiceMiss,
  practiceResult,
  startPractice,
  stepKind,
  type PracticeState,
} from '../src/game/guitar';
import { createRng } from '../src/game/rng';

const lakeside = songById('lakeside')!;
const campfire = songById('campfire')!;
const foxglove = songById('foxglove')!;

const playing = (song = lakeside): PracticeState => startPractice(createPracticeState(song));

/** Resolve one full song, choosing an action per step kind via a seeded rng. */
const drive = (
  state: PracticeState,
  rng: () => number,
): { state: PracticeState; resolves: number } => {
  let current = state;
  let resolves = 0;
  while (current.phase === 'playing') {
    expect(resolves, 'run must terminate').toBeLessThan(totalSteps(current.song) + 1);
    const kind = stepKind(current.song, current.step);
    if (kind === 'rest') {
      current = passRest(current);
    } else if (rng() > 0.35) {
      current = practiceHit(current, rng());
    } else {
      current = practiceMiss(current);
    }
    resolves += 1;
  }
  return { state: current, resolves };
};

describe('practice lifecycle', () => {
  it('starts ready and begins on demand', () => {
    const fresh = createPracticeState(lakeside);
    expect(fresh.phase).toBe('ready');
    expect(fresh.score).toBe(0);
    expect(fresh.lastFeedback).toBe('');
    const started = startPractice(fresh);
    expect(started.phase).toBe('playing');
    expect(startPractice(started)).toBe(started);
  });

  it('ignores every action outside a playing run', () => {
    const fresh = createPracticeState(lakeside);
    expect(practiceHit(fresh, 1)).toBe(fresh);
    expect(practiceMiss(fresh)).toBe(fresh);
    expect(passRest(fresh)).toBe(fresh);
    const done: PracticeState = { ...playing(), phase: 'done' };
    expect(practiceHit(done, 1)).toBe(done);
    expect(practiceMiss(done)).toBe(done);
    expect(passRest(done)).toBe(done);
  });
});

describe('resolving steps', () => {
  it('scores clean and good hits on notes', () => {
    expect(stepKind(lakeside, 0)).toBe('note');
    const clean = practiceHit(playing(), 1);
    expect(clean.hits).toBe(1);
    expect(clean.combo).toBe(1);
    expect(clean.bestCombo).toBe(1);
    expect(clean.score).toBe(10);
    expect(clean.lastFeedback).toBe('hit');
    expect(clean.step).toBe(1);
    const good = practiceHit(playing(), 0.7);
    expect(good.lastFeedback).toBe('good');
    expect(good.score).toBe(7);
  });

  it('turns sloppy presses into flubs that reset the combo', () => {
    let state = playing();
    state = practiceHit(state, 1);
    const flubbed = practiceHit(state, 0.3);
    expect(flubbed.lastFeedback).toBe('flub');
    expect(flubbed.combo).toBe(0);
    expect(flubbed.misses).toBe(1);
    expect(flubbed.score).toBe(state.score + 2);
    expect(flubbed.step).toBe(state.step + 1);
  });

  it('flubs pressed rests without killing the run', () => {
    let state = playing(foxglove);
    state = practiceHit(state, 1); // step 0 is a note
    expect(stepKind(foxglove, 1)).toBe('rest');
    const flubbed = practiceHit(state, 1);
    expect(flubbed.lastFeedback).toBe('rest-flub');
    expect(flubbed.combo).toBe(0);
    expect(flubbed.misses).toBe(1);
    expect(flubbed.score).toBe(state.score - 1);
    expect(flubbed.step).toBe(2);
    expect(flubbed.phase).toBe('playing');
  });

  it('never scores below zero, even mashing rests from a fresh run', () => {
    let state = playing(foxglove);
    while (state.phase === 'playing') {
      state = practiceHit(state, 0.2);
    }
    expect(state.score).toBeGreaterThanOrEqual(0);
  });

  it('expires unplayed notes at no score', () => {
    const missed = practiceMiss(playing());
    expect(missed.lastFeedback).toBe('miss');
    expect(missed.combo).toBe(0);
    expect(missed.misses).toBe(1);
    expect(missed.score).toBe(0);
    expect(missed.step).toBe(1);
  });

  it('passes rests in silence, free of charge', () => {
    let state = playing(lakeside);
    state = practiceHit(state, 1);
    state = practiceHit(state, 1); // step 2 is the first rest
    expect(stepKind(lakeside, 2)).toBe('rest');
    const passed = passRest(state);
    expect(passed.lastFeedback).toBe('rest-ok');
    expect(passed.misses).toBe(state.misses);
    expect(passed.combo).toBe(state.combo);
    expect(passed.score).toBe(state.score);
    expect(passed.step).toBe(3);
  });

  it('wraps steps per loop and counts completed loops', () => {
    let state = playing(lakeside);
    for (let resolved = 0; resolved < lakeside.steps.length; resolved += 1) {
      state = isPlayable(stepKind(lakeside, state.step)) ? practiceHit(state, 1) : passRest(state);
    }
    expect(state.step).toBe(0);
    expect(state.loop).toBe(1);
    expect(state.phase).toBe('playing');
  });

  it('wraps negative and overflow indices in stepKind', () => {
    expect(stepKind(lakeside, lakeside.steps.length)).toBe(stepKind(lakeside, 0));
    expect(stepKind(lakeside, -1)).toBe(lakeside.steps[lakeside.steps.length - 1]);
  });
});

describe('run termination', () => {
  it('finishes every song after exactly totalSteps resolutions', () => {
    for (const song of SONGS) {
      for (const seed of [1, 7, 1234]) {
        const { state, resolves } = drive(
          startPractice(createPracticeState(song)),
          createRng(seed),
        );
        expect(state.phase, `${song.id} seed ${seed}`).toBe('done');
        expect(resolves, `${song.id} seed ${seed}`).toBe(totalSteps(song));
        expect(state.loop).toBe(song.loops);
      }
    }
  });

  it('locks the run once done', () => {
    const { state } = drive(playing(), createRng(3));
    expect(practiceHit(state, 1)).toBe(state);
    expect(practiceMiss(state)).toBe(state);
    expect(passRest(state)).toBe(state);
  });
});

describe('practice results', () => {
  const perfectRun = (song = lakeside): PracticeState => {
    let state = playing(song);
    while (state.phase === 'playing') {
      state = isPlayable(stepKind(song, state.step)) ? practiceHit(state, 1) : passRest(state);
    }
    return state;
  };

  it('grades a perfect run gold, with the combo covering every playable step', () => {
    for (const song of [lakeside, campfire]) {
      const done = perfectRun(song);
      expect(done.phase).toBe('done');
      expect(done.misses).toBe(0);
      const result = practiceResult(done);
      expect(result.accuracy).toBe(1);
      expect(result.bestCombo).toBe(song.steps.filter(isPlayable).length * song.loops);
      expect(result.grade, `${song.id}`).toBe('gold');
    }
  });

  it('puts clean-but-broken runs on silver', () => {
    let state = playing(lakeside);
    let playableSeen = 0;
    while (state.phase === 'playing') {
      if (!isPlayable(stepKind(lakeside, state.step))) {
        state = passRest(state);
        continue;
      }
      playableSeen += 1;
      state =
        playableSeen === 3 || playableSeen === 9 ? practiceHit(state, 0.2) : practiceHit(state, 1);
    }
    const result = practiceResult(state);
    expect(result.accuracy).toBeCloseTo(10 / 12, 10);
    expect(result.bestCombo).toBeLessThan(
      lakeside.steps.filter(isPlayable).length * lakeside.loops * 0.75,
    );
    expect(result.grade).toBe('silver');
  });

  it('puts flub-heavy runs on bronze', () => {
    let state = playing(lakeside);
    let playableSeen = 0;
    while (state.phase === 'playing') {
      if (!isPlayable(stepKind(lakeside, state.step))) {
        state = passRest(state);
        continue;
      }
      playableSeen += 1;
      state = practiceHit(state, playableSeen % 3 === 1 ? 0.2 : 1);
    }
    const result = practiceResult(state);
    expect(result.accuracy).toBeCloseTo(8 / 12, 10);
    expect(result.grade).toBe('bronze');
  });

  it('reports score and best combo through untouched', () => {
    let state = playing(lakeside);
    state = practiceHit(state, 1);
    const result = practiceResult({ ...state, phase: 'done' });
    expect(result.score).toBe(state.score);
    expect(result.bestCombo).toBe(state.bestCombo);
  });
});
