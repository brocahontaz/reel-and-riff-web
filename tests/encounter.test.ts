import { describe, expect, it } from 'vitest';
import { FISH } from '../src/content/fish';
import { LURES } from '../src/content/tackle';
import { biteDelay, pickFish, rarityWeights, rollWeight } from '../src/game/encounter';
import { createRng } from '../src/game/rng';

const rareRate = (castPower: number, runs: number, lureId?: string) => {
  const rng = createRng(2026);
  const lure = LURES.find((candidate) => candidate.id === lureId);
  let rare = 0;
  for (let index = 0; index < runs; index += 1) {
    if (pickFish(castPower, rng, lure).rarity === 'rare') rare += 1;
  }
  return rare / runs;
};

describe('encounters', () => {
  it('is deterministic for a given seed', () => {
    const first = pickFish(0.7, createRng(5));
    const second = pickFish(0.7, createRng(5));
    expect(first.id).toBe(second.id);
  });

  it('always returns a defined species', () => {
    const rng = createRng(11);
    const picks = Array.from({ length: 300 }, () => pickFish(0.5, rng));
    expect(picks.every((fish) => FISH.some((known) => known.id === fish.id))).toBe(true);
  });

  it('makes deeper casts more likely to find rare fish', () => {
    const shallow = rareRate(0, 4000);
    const deep = rareRate(1, 4000);
    expect(deep).toBeGreaterThan(shallow * 4);
  });

  it('lets lures boost rare odds further in deep water', () => {
    const bare = rareRate(1, 4000);
    const moonfly = rareRate(1, 4000, 'moonfly');
    expect(moonfly).toBeGreaterThan(bare * 1.5);
  });

  it('interpolates rarity weights between shallow and deep water', () => {
    const [shallowCommon, , shallowRare] = rarityWeights(0, undefined);
    const [deepCommon, , deepRare] = rarityWeights(1, undefined);
    expect(shallowCommon).toBeGreaterThan(deepCommon);
    expect(deepRare).toBeGreaterThan(shallowRare);
  });

  it('lands weights inside the species range and favours deep water', () => {
    const koi = FISH[2];
    const rng = createRng(3);
    const weights = Array.from({ length: 500 }, () => rollWeight(koi, 0.9, rng));
    expect(weights.every((weight) => weight >= koi.minWeight && weight <= koi.maxWeight)).toBe(
      true,
    );
    const shallow = Array.from({ length: 500 }, () => rollWeight(koi, 0, rng));
    const deepAverage = weights.reduce((sum, weight) => sum + weight, 0) / weights.length;
    const shallowAverage = shallow.reduce((sum, weight) => sum + weight, 0) / shallow.length;
    expect(deepAverage).toBeGreaterThan(shallowAverage);
  });

  it('rolls a bite delay that is longer after a spook', () => {
    const rng = createRng(8);
    const delays = Array.from({ length: 50 }, () => biteDelay(0.5, rng, false));
    const spooked = Array.from({ length: 50 }, () => biteDelay(0.5, rng, true));
    expect(delays.every((delay) => delay >= 1)).toBe(true);
    expect(spooked.every((delay) => delay >= 1.4 + 1.6 - 0.6 - 0.01)).toBe(true);
    const average = delays.reduce((sum, delay) => sum + delay, 0) / delays.length;
    const spookedAverage = spooked.reduce((sum, delay) => sum + delay, 0) / spooked.length;
    expect(spookedAverage).toBeGreaterThan(average);
  });
});
