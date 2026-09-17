import { describe, expect, it, vi } from 'vitest';
import {
  loadPlayer,
  saveCatch,
  savePlayer,
  type PlayerState,
} from '../src/persistence/playerStorage';

const memoryStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => values.delete(key) as unknown as boolean,
    setItem: (key: string, value: string) => void values.set(key, value),
  } as Storage;
};

const basePlayer = (): PlayerState => ({
  ...loadPlayer(undefined),
  coins: 40,
  rods: ['hickory'],
  lures: ['bare'],
  rod: 'hickory',
  lure: 'bare',
  species: { bluegill: 1 },
});

describe('player storage', () => {
  it('loads a fresh player without storage', () => {
    const player = loadPlayer(undefined);
    expect(player.catches).toBe(0);
    expect(player.coins).toBe(0);
    expect(player.species).toEqual({});
    expect(player.rod).toBe('');
  });

  it('round-trips coins, journal and tackle', () => {
    const storage = memoryStorage();
    const player = savePlayer(
      { ...basePlayer(), coins: 77, rod: 'driftwood', species: { bass: 3 } },
      storage,
    );
    const loaded = loadPlayer(storage);
    expect(loaded).toEqual(player);
    expect(loaded.coins).toBe(77);
    expect(loaded.species).toEqual({ bass: 3 });
    expect(loaded.rod).toBe('driftwood');
  });

  it('falls back to defaults on malformed state', () => {
    const storage = memoryStorage();
    storage.setItem('reel-and-riff-player', '{not json');
    expect(loadPlayer(storage).coins).toBe(0);
    storage.setItem(
      'reel-and-riff-player',
      JSON.stringify({ coins: 'lots', catches: -4, species: { bass: 0 } }),
    );
    const loaded = loadPlayer(storage);
    expect(loaded.coins).toBe(0);
    expect(loaded.catches).toBe(0);
    expect(loaded.species).toEqual({});
  });

  it('records a catch: count, best weight, coins and journal entry', () => {
    const player = saveCatch(basePlayer(), 'golden-koi', 'Golden Koi', 5.2, 32, memoryStorage());
    expect(player.catches).toBe(1);
    expect(player.bestWeight).toBe(5.2);
    expect(player.coins).toBe(72);
    expect(player.species['golden-koi']).toBe(1);
    expect(player.lastCatch).toBe('Golden Koi');
    const again = saveCatch(player, 'golden-koi', 'Golden Koi', 3, 10, memoryStorage());
    expect(again.catches).toBe(2);
    expect(again.bestWeight).toBe(5.2);
    expect(again.coins).toBe(82);
    expect(again.species['golden-koi']).toBe(2);
  });

  it('keeps playing when the browser store is blocked', () => {
    const blocked = {
      setItem: vi.fn(() => {
        throw new Error('quota');
      }),
      getItem: () => null,
    } as unknown as Storage;
    expect(() => saveCatch(basePlayer(), 'bass', 'River Bass', 2, 14, blocked)).not.toThrow();
    expect(() => savePlayer(basePlayer(), blocked)).not.toThrow();
  });
});
