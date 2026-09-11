import type { Fish } from '../content/fish';

export type Phase = 'ready' | 'casting' | 'waiting' | 'reeling' | 'caught' | 'lost';
export type FishingState = {
  phase: Phase;
  castPower: number;
  tension: number;
  progress: number;
  combo: number;
  beats: number;
  fish?: Fish;
  weight?: number;
};

export const createFishingState = (): FishingState => ({
  phase: 'ready',
  castPower: 0,
  tension: 0,
  progress: 0,
  combo: 0,
  beats: 0,
});

export const beginCast = (state: FishingState): FishingState => ({
  ...state,
  phase: 'casting',
  castPower: 0,
  progress: 0,
  tension: 0,
  combo: 0,
  beats: 0,
  fish: undefined,
  weight: undefined,
});

export const finishCast = (state: FishingState, power: number): FishingState => ({
  ...state,
  phase: 'waiting',
  castPower: Number.isFinite(power) ? Math.max(0, Math.min(1, power)) : 0,
});

export const startReel = (state: FishingState, fish: Fish, weight: number): FishingState => ({
  ...state,
  phase: 'reeling',
  fish,
  weight,
  progress: 0,
  tension: 0,
  combo: 0,
  beats: 0,
});

export const rhythmHit = (state: FishingState, accuracy: number): FishingState => {
  if (state.phase !== 'reeling' || !state.fish) return state;
  const good = accuracy >= 0.6;
  const progress = Math.min(1, state.progress + (good ? 0.15 : 0.025) / state.fish.difficulty);
  const tension = Math.max(0, state.tension + (good ? 0.012 : 0.14) * state.fish.difficulty);
  const combo = good ? state.combo + 1 : 0;
  const beats = state.beats + 1;
  return {
    ...state,
    progress,
    tension,
    combo,
    beats,
    phase: tension >= 1 ? 'lost' : progress >= 1 ? 'caught' : 'reeling',
  };
};

export const missBeat = (state: FishingState): FishingState => rhythmHit(state, 0);
