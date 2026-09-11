import type { Phase } from '../game/fishing';

export type FishingVisual = { visible: boolean; targetX: number; targetY: number };

export const fishingVisualForPhase = (phase: Phase): FishingVisual => {
  if (phase === 'reeling') return { visible: true, targetX: 700, targetY: 350 };
  if (phase === 'casting' || phase === 'waiting') {
    return { visible: true, targetX: 400, targetY: 420 };
  }
  return { visible: false, targetX: 400, targetY: 420 };
};
