import { describe, expect, it } from 'vitest';
import { loadPlayer, saveCatch } from '../src/persistence/playerStorage';

const storage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  } as unknown as Storage;
};
describe('player persistence', () => {
  it('round trips catches and keeps the best weight', () => {
    const s = storage();
    const first = saveCatch(loadPlayer(s), 'Bluegill', 1.2, s);
    saveCatch(first, 'Bass', 0.8, s);
    expect(loadPlayer(s)).toMatchObject({ catches: 2, bestWeight: 1.2, lastCatch: 'Bass' });
  });
  it('recovers from malformed storage', () => {
    const s = storage();
    s.setItem('reel-and-riff-player', 'nope');
    expect(loadPlayer(s)).toEqual({ catches: 0, bestWeight: 0 });
  });
  it('ignores invalid fields in valid JSON', () => {
    const s = storage();
    s.setItem('reel-and-riff-player', '{"catches":"many","bestWeight":"heavy"}');
    expect(loadPlayer(s)).toEqual({ catches: 0, bestWeight: 0 });
  });
  it('returns the catch when storage is unavailable', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
    } as unknown as Storage;
    expect(loadPlayer(broken)).toEqual({ catches: 0, bestWeight: 0 });
    expect(saveCatch(loadPlayer(), 'Koi', 4, broken)).toMatchObject({ catches: 1, bestWeight: 4 });
  });
});
