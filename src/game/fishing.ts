import type { Fish } from '../content/fish';

export type Phase = 'ready' | 'casting' | 'waiting' | 'biting' | 'reeling' | 'caught' | 'lost';

/** Multipliers the equipped rod applies to the reel fight. */
export type ReelModifiers = { progressScale: number; missTensionScale: number };

export const NEUTRAL_REEL: ReelModifiers = { progressScale: 1, missTensionScale: 1 };

export type FishingState = {
  phase: Phase;
  castPower: number;
  tension: number;
  progress: number;
  combo: number;
  beats: number;
  /** Off-beat presses and flubs during the current fight. */
  misses: number;
  fish?: Fish;
  weight?: number;
};

const clamp01 = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

const settlePhase = (tension: number, progress: number): Phase =>
  tension >= 1 ? 'lost' : progress >= 1 ? 'caught' : 'reeling';

export const createFishingState = (): FishingState => ({
  phase: 'ready',
  castPower: 0,
  tension: 0,
  progress: 0,
  combo: 0,
  beats: 0,
  misses: 0,
});

export const beginCast = (state: FishingState): FishingState => ({
  ...state,
  phase: 'casting',
  castPower: 0,
  progress: 0,
  tension: 0,
  combo: 0,
  beats: 0,
  misses: 0,
  fish: undefined,
  weight: undefined,
});

export const finishCast = (state: FishingState, power: number): FishingState => ({
  ...state,
  phase: 'waiting',
  castPower: clamp01(power),
});

/** A fish has taken the bait — the player now has a short window to set the hook. */
export const biteHooked = (state: FishingState, fish: Fish, weight: number): FishingState => ({
  ...state,
  phase: 'biting',
  fish,
  weight,
  progress: 0,
  tension: 0,
  combo: 0,
  beats: 0,
  misses: 0,
});

/** Hook set in time — the fight begins. */
export const setHook = (state: FishingState): FishingState => {
  if (state.phase !== 'biting' || !state.fish) return state;
  return {
    ...state,
    phase: 'reeling',
    progress: 0,
    tension: 0,
    combo: 0,
    beats: 0,
    misses: 0,
  };
};

/** Hesitated too long — the fish spits the hook and is gone. */
export const expireHook = (state: FishingState): FishingState => {
  if (state.phase !== 'biting') return state;
  return { ...state, phase: 'lost' };
};

/** Seconds the player has to set the hook; trickier fish feel faster. */
export const hookWindow = (fish: Fish): number =>
  Number(Math.max(0.7, Math.min(1.4, 1.2 - 0.12 * (fish.difficulty - 1))).toFixed(2));

export const rhythmHit = (
  state: FishingState,
  accuracy: number,
  mods: ReelModifiers = NEUTRAL_REEL,
): FishingState => {
  if (state.phase !== 'reeling' || !state.fish) return state;
  const good = accuracy >= 0.6;
  const progress = Math.min(
    1,
    state.progress +
      (good ? 0.15 * Math.max(0, mods.progressScale) : 0.025) / state.fish.difficulty,
  );
  const tension = Math.max(
    0,
    state.tension +
      (good ? 0.012 : 0.14 * Math.max(0, mods.missTensionScale)) * state.fish.difficulty,
  );
  const combo = good ? state.combo + 1 : 0;
  const beats = state.beats + 1;
  const misses = good ? state.misses : state.misses + 1;
  return {
    ...state,
    progress,
    tension,
    combo,
    beats,
    misses,
    phase: settlePhase(tension, progress),
  };
};

/** Pressing before the beat: the riff stumbles, costing tension and the perfect bonus. */
export const flub = (state: FishingState): FishingState => {
  if (state.phase !== 'reeling' || !state.fish) return state;
  const tension = Math.max(0, state.tension + 0.04 * state.fish.difficulty);
  return {
    ...state,
    tension,
    combo: 0,
    misses: state.misses + 1,
    phase: settlePhase(tension, state.progress),
  };
};

export const missBeat = (state: FishingState): FishingState => rhythmHit(state, 0);
