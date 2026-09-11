import type { Lure } from '../content/tackle';
import type { Fish } from '../content/fish';

export type CatchResult = {
  fish: Fish;
  weight: number;
  coins: number;
  perfect: boolean;
  newSpecies: boolean;
};

export const NEW_SPECIES_BONUS = 10;
export const PERFECT_MULTIPLIER = 1.5;

const clamp01 = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

/**
 * Coin value for a landed catch: species value scaled by how heavy the fish
 * is relative to its species range, a bonus for a flawless riff, the lure's
 * coin kicker, and a one-time discovery bonus for a new species.
 */
export const catchReward = (
  fish: Fish,
  weight: number,
  perfect: boolean,
  newSpecies: boolean,
  lure?: Lure,
): CatchResult => {
  const span = fish.maxWeight - fish.minWeight;
  const weightFactor = 0.8 + 0.4 * (span > 0 ? clamp01((weight - fish.minWeight) / span) : 1);
  const coins = Math.max(
    1,
    Math.round(
      fish.value * weightFactor * (perfect ? PERFECT_MULTIPLIER : 1) +
        (lure?.coinBonus ?? 0) +
        (newSpecies ? NEW_SPECIES_BONUS : 0),
    ),
  );
  return { fish, weight, coins, perfect, newSpecies };
};
