import { describe, expect, it } from 'vitest';
import { createRng, pickWeighted, type Rng } from '../src/game/rng';

describe('seeded rng', () => {
  it('reproduces the same sequence for the same seed', () => {
    const a = createRng(1234);
    const b = createRng(1234);
    const sequenceA = Array.from({ length: 20 }, () => a());
    const sequenceB = Array.from({ length: 20 }, () => b());
    expect(sequenceA).toEqual(sequenceB);
  });

  it('produces values in [0, 1) and varies across seeds', () => {
    const rng = createRng(99);
    const values = Array.from({ length: 200 }, () => rng());
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
    expect(new Set(values).size).toBeGreaterThan(100);
    expect(Array.from({ length: 10 }, () => createRng(7)())).not.toEqual(
      Array.from({ length: 10 }, () => createRng(8)()),
    );
  });

  it('treats NaN seeds as 1', () => {
    expect(createRng(Number.NaN)()).toBe(createRng(1)());
  });
});

describe('pickWeighted', () => {
  const rng: Rng = createRng(42);

  it('picks only from the provided items', () => {
    const items = ['a', 'b', 'c'] as const;
    const picks = Array.from({ length: 200 }, () => pickWeighted(items, [1, 1, 1], rng));
    expect(picks.every((pick) => items.includes(pick))).toBe(true);
  });

  it('honours a 100% weight', () => {
    const picks = Array.from({ length: 20 }, () => pickWeighted(['x', 'y'], [0, 1], rng));
    expect(picks.every((pick) => pick === 'y')).toBe(true);
  });

  it('falls back to the first item when all weights are zero', () => {
    expect(pickWeighted(['only', 'other'], [0, 0], rng)).toBe('only');
  });
});
