import { describe, expect, it } from 'vitest';
import { FISH } from '../src/content/fish';
import {
  beginCast,
  biteHooked,
  createFishingState,
  expireHook,
  finishCast,
  flub,
  flubRest,
  hookWindow,
  missBeat,
  missNote,
  passRest,
  rhythmHit,
  setHook,
} from '../src/game/fishing';
import { fishingVisualForPhase } from '../src/ui/fishingVisuals';
import { FISH_INFO_WIDTH, formatFishInfo } from '../src/ui/fishInfo';

const bluegill = FISH[0];
const koi = FISH[2];

describe('cast and wait', () => {
  it('starts ready to cast', () => {
    const fresh = createFishingState();
    expect(fresh.phase).toBe('ready');
    expect(fresh.step).toBe(0);
  });

  it('clamps cast power between 0 and 1', () => {
    expect(finishCast(createFishingState(), 1.5).castPower).toBe(1);
    expect(finishCast(createFishingState(), -3).castPower).toBe(0);
    expect(finishCast(createFishingState(), Number.NaN).castPower).toBe(0);
  });
});

describe('the hook moment', () => {
  it('enters a biting window when a fish takes the bait', () => {
    const state = biteHooked(createFishingState(), bluegill, 0.8);
    expect(state.phase).toBe('biting');
    expect(state.fish?.id).toBe('bluegill');
  });

  it('sets the hook into the reeling fight with a clean slate', () => {
    const dirty = rhythmHit(biteHooked(createFishingState(), koi, 5), 0.9);
    const hooked = setHook(dirty);
    expect(hooked.phase).toBe('reeling');
    expect(hooked.progress).toBe(0);
    expect(hooked.tension).toBe(0);
    expect(hooked.misses).toBe(0);
    expect(hooked.combo).toBe(0);
    expect(hooked.step).toBe(0);
  });

  it('loses the fish when the hook window expires', () => {
    const state = expireHook(biteHooked(createFishingState(), koi, 5));
    expect(state.phase).toBe('lost');
    expect(state.fish?.id).toBe('golden-koi');
  });

  it('gives trickier fish a shorter hook window', () => {
    expect(hookWindow(bluegill)).toBe(1.2);
    expect(hookWindow(koi)).toBeLessThan(hookWindow(bluegill));
    expect(hookWindow(koi)).toBeGreaterThanOrEqual(0.7);
  });
});

describe('the reel fight', () => {
  const reeling = (fish = bluegill) => setHook(biteHooked(createFishingState(), fish, 1));

  it('progresses on accurate beats and raises tension on sloppy ones', () => {
    const good = rhythmHit(reeling(), 0.9);
    expect(good.progress).toBeGreaterThan(0);
    expect(good.combo).toBe(1);
    const bad = rhythmHit(reeling(), 0.2);
    expect(bad.progress).toBeLessThan(good.progress);
    expect(bad.tension).toBeGreaterThan(good.tension);
    expect(bad.misses).toBe(1);
  });

  it('catches the fish once progress completes', () => {
    let state = reeling();
    for (let hits = 0; state.phase === 'reeling'; hits += 1) {
      state = rhythmHit(state, 0.9);
      expect(hits).toBeLessThan(50);
    }
    expect(state.phase).toBe('caught');
  });

  it('snaps the line when tension maxes out', () => {
    let state = reeling(koi);
    for (let beats = 0; state.phase === 'reeling'; beats += 1) {
      state = rhythmHit(state, 0);
      expect(beats).toBeLessThan(50);
    }
    expect(state.phase).toBe('lost');
  });

  it('penalises early flubs with tension and a broken combo', () => {
    let state = reeling();
    state = rhythmHit(state, 0.9);
    expect(state.combo).toBe(1);
    const flubbed = flub(state);
    expect(flubbed.combo).toBe(0);
    expect(flubbed.misses).toBe(1);
    expect(flubbed.tension).toBeGreaterThan(state.tension);
  });

  it('uses rod modifiers: faster reels and softer miss tension', () => {
    const base = rhythmHit(reeling(), 0.9).progress;
    const boosted = rhythmHit(reeling(), 0.9, { progressScale: 1.5, missTensionScale: 0.6 });
    expect(boosted.progress).toBeGreaterThan(base);
    const sloppyBase = rhythmHit(reeling(), 0).tension;
    const sloppySoft = rhythmHit(reeling(), 0, { progressScale: 1, missTensionScale: 0.6 }).tension;
    expect(sloppySoft).toBeLessThan(sloppyBase);
  });

  it('advances the rhythm step on every resolved beat', () => {
    const state = reeling();
    expect(state.step).toBe(0);
    expect(rhythmHit(state, 0.9).step).toBe(1);
    expect(rhythmHit(rhythmHit(state, 0.9), 0.2).step).toBe(2);
  });

  it('misses an expired note like a sloppy beat and moves the riff on', () => {
    const state = reeling();
    const missed = missNote(state);
    expect(missed.tension).toBeGreaterThan(rhythmHit(state, 0.9).tension);
    expect(missed.combo).toBe(0);
    expect(missed.misses).toBe(1);
    expect(missed.beats).toBe(1);
    expect(missed.progress).toBeGreaterThan(0);
    expect(missed.step).toBe(1);
    const idle = createFishingState();
    expect(missNote(idle)).toBe(idle);
  });

  it('softens expired-note tension with rod modifiers', () => {
    const base = missNote(reeling()).tension;
    const soft = missNote(reeling(), { progressScale: 3, missTensionScale: 0.6 }).tension;
    expect(soft).toBeLessThan(base);
    expect(soft).toBeCloseTo(base * 0.6, 12);
  });

  it('passes rests in silence without penalty', () => {
    const state = reeling(koi);
    const passed = passRest(state);
    expect(passed.step).toBe(state.step + 1);
    expect(passed.tension).toBe(state.tension);
    expect(passed.combo).toBe(state.combo);
    expect(passed.misses).toBe(state.misses);
    expect(passed.beats).toBe(state.beats);
    expect(passed.progress).toBe(state.progress);
    expect(passed.phase).toBe('reeling');
    const idle = createFishingState();
    expect(passRest(idle)).toBe(idle);
  });

  it('punishes pressing during a rest without advancing the riff', () => {
    const state = reeling(koi);
    const flubbed = flubRest(state);
    expect(flubbed.tension).toBeGreaterThan(state.tension);
    expect(flubbed.combo).toBe(0);
    expect(flubbed.misses).toBe(1);
    expect(flubbed.progress).toBe(state.progress);
    expect(flubbed.beats).toBe(state.beats);
    expect(flubbed.step).toBe(state.step);
    const soft = flubRest(state, { progressScale: 1, missTensionScale: 0.6 });
    expect(soft.tension).toBeLessThan(flubbed.tension);
    const idle = createFishingState();
    expect(flubRest(idle)).toBe(idle);
  });

  it('snaps the line when rest mashing maxes tension', () => {
    let state = reeling(koi);
    for (let presses = 0; state.phase === 'reeling'; presses += 1) {
      state = flubRest(state);
      expect(presses).toBeLessThan(50);
    }
    expect(state.phase).toBe('lost');
    expect(state.step).toBe(0);
  });

  it('ignores beats outside the fight', () => {
    const idle = createFishingState();
    expect(rhythmHit(idle, 0.9)).toBe(idle);
    expect(missBeat(idle)).toBe(idle);
    expect(missNote(idle)).toBe(idle);
    expect(flub(idle)).toBe(idle);
    expect(passRest(idle)).toBe(idle);
    expect(flubRest(idle)).toBe(idle);
  });

  it('resets the fight on a new cast', () => {
    const dirty = rhythmHit(setHook(biteHooked(createFishingState(), koi, 5)), 0);
    const fresh = beginCast(dirty);
    expect(fresh.phase).toBe('casting');
    expect(fresh.misses).toBe(0);
    expect(fresh.step).toBe(0);
    expect(fresh.fish).toBeUndefined();
  });
});

describe('fishing presentation', () => {
  it('shows the line for every active phase, taut while fighting', () => {
    expect(fishingVisualForPhase('biting')).toEqual({ visible: true, targetX: 700, targetY: 350 });
    expect(fishingVisualForPhase('reeling').visible).toBe(true);
    expect(fishingVisualForPhase('waiting').targetY).toBe(420);
    expect(fishingVisualForPhase('ready').visible).toBe(false);
    expect(fishingVisualForPhase('caught').visible).toBe(false);
    expect(fishingVisualForPhase('lost').visible).toBe(false);
  });

  it('formats compact species info', () => {
    expect(formatFishInfo(bluegill)).toBe('Bluegill  •  COMMON\nDIFFICULTY ★  •  steady pulse');
    expect(formatFishInfo(koi)).toBe(
      'Golden Koi  •  RARE\nDIFFICULTY ★★★  •  silent rests — hold on the ·',
    );
    expect(FISH_INFO_WIDTH).toBeGreaterThan(0);
  });
});
