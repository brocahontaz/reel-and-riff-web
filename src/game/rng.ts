export type Rng = () => number;

/**
 * mulberry32 — a tiny, deterministic 32-bit PRNG so encounter rolls stay
 * reproducible in tests while feeling random in play.
 */
export const createRng = (seed: number): Rng => {
  let state = (Number.isFinite(seed) ? Math.trunc(seed) : 1) >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Stable weighted pick. Falls back to the first item when weights are degenerate. */
export const pickWeighted = <T>(items: readonly T[], weights: readonly number[], rng: Rng): T => {
  if (items.length === 0) throw new Error('pickWeighted requires at least one item');
  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (!(total > 0)) return items[0];
  let roll = rng() * total;
  for (let index = 0; index < items.length; index += 1) {
    roll -= Math.max(0, weights[index]);
    if (roll <= 0) return items[index];
  }
  return items[items.length - 1];
};
