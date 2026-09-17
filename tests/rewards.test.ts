import { describe, expect, it } from 'vitest';
import { FISH } from '../src/content/fish';
import { LURES } from '../src/content/tackle';
import { catchReward, NEW_SPECIES_BONUS } from '../src/game/rewards';

const koi = FISH[2];
const moonfly = LURES.find((lure) => lure.id === 'moonfly');

describe('catch rewards', () => {
  it('scales coins with landed weight across the species range', () => {
    const light = catchReward(koi, koi.minWeight, false, false).coins;
    const heavy = catchReward(koi, koi.maxWeight, false, false).coins;
    expect(light).toBeLessThan(heavy);
    expect(light).toBeGreaterThanOrEqual(1);
  });

  it('pays a perfect-riff bonus', () => {
    const plain = catchReward(koi, 5, false, false).coins;
    const perfect = catchReward(koi, 5, true, false).coins;
    expect(perfect).toBe(Math.round(plain * 1.5));
  });

  it('adds the new-species discovery bonus once', () => {
    const known = catchReward(koi, 5, false, false).coins;
    const discovery = catchReward(koi, 5, false, true).coins;
    expect(discovery).toBe(known + NEW_SPECIES_BONUS);
  });

  it('applies the lure coin bonus', () => {
    const bare = catchReward(koi, 5, false, false).coins;
    const withMoonfly = catchReward(koi, 5, false, false, moonfly).coins;
    expect(withMoonfly).toBe(bare + (moonfly?.coinBonus ?? 0));
  });

  it('never pays less than one coin', () => {
    const bluegill = FISH[0];
    expect(catchReward(bluegill, 0, false, false).coins).toBeGreaterThanOrEqual(1);
  });
});
