import type { Fish, Rarity } from '../content/fish';
import type { Lure } from '../content/tackle';
import { FISH } from '../content/fish';
import { pickWeighted, type Rng } from './rng';

/**
 * Encounter rules: a longer cast reaches deeper water where rarer fish live,
 * and a lure biases the deep-water odds even further.
 */

const RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare'];

/** [shallow odds, deep odds] per rarity, interpolated by cast power. */
const DEPTH_WEIGHTS: Record<Rarity, readonly [number, number]> = {
  common: [0.78, 0.35],
  uncommon: [0.2, 0.4],
  rare: [0.02, 0.25],
};

const clamp01 = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

export const rarityWeights = (castPower: number, lure: Lure | undefined): number[] =>
  RARITIES.map((rarity) => {
    const [shallow, deep] = DEPTH_WEIGHTS[rarity];
    const weight = shallow + (deep - shallow) * clamp01(castPower);
    return rarity === 'rare' ? weight * (lure?.rareWeight ?? 1) : weight;
  });

export const pickFish = (castPower: number, rng: Rng, lure?: Lure): Fish => {
  const weights = rarityWeights(castPower, lure);
  return pickWeighted(
    FISH,
    FISH.map((fish) => weights[RARITIES.indexOf(fish.rarity)]),
    rng,
  );
};

/** Landed weight grows with cast depth plus a little jitter. */
export const rollWeight = (fish: Fish, castPower: number, rng: Rng): number => {
  const jitter = (rng() * 2 - 1) * 0.15;
  const fraction = clamp01(0.3 + 0.55 * clamp01(castPower) + jitter);
  return Number((fish.minWeight + (fish.maxWeight - fish.minWeight) * fraction).toFixed(1));
};

/** Seconds until the next bite. Spooked water needs longer to settle. */
export const biteDelay = (castPower: number, rng: Rng, spooked: boolean): number => {
  const base = 1.4 + rng() * 2.2 - 0.6 * clamp01(castPower);
  return Number(Math.max(1, spooked ? base + 1.6 : base).toFixed(2));
};
