import { describe, expect, it } from 'vitest';
import { LURES, RODS } from '../src/content/tackle';
import { loadPlayer, type PlayerState } from '../src/persistence/playerStorage';
import {
  buyLure,
  buyRod,
  lureById,
  rodById,
  rodModifiers,
  sanitizePlayer,
} from '../src/game/tackle';

const playerWith = (overrides: Partial<PlayerState>): PlayerState => ({
  ...loadPlayer(undefined),
  coins: 100,
  rods: ['hickory'],
  lures: ['bare'],
  rod: 'hickory',
  lure: 'bare',
  ...overrides,
});

describe('tackle shop', () => {
  it('buys and equips a rod the player can afford', () => {
    const driftwood = rodById('driftwood')!;
    const result = buyRod(playerWith({}), driftwood);
    expect(result.player.coins).toBe(45);
    expect(result.player.rods).toContain('driftwood');
    expect(result.player.rod).toBe('driftwood');
    expect(result.message).toContain('bought');
  });

  it('refuses a purchase the player cannot afford', () => {
    const flyrod = rodById('flyrod')!;
    const result = buyRod(playerWith({ coins: 20 }), flyrod);
    expect(result.player.coins).toBe(20);
    expect(result.player.rods).not.toContain('flyrod');
    expect(result.message).toContain('more coins');
  });

  it('equips owned gear for free instead of buying it twice', () => {
    const owned = playerWith({ rods: ['hickory', 'driftwood'], rod: 'hickory' });
    const result = buyRod(owned, rodById('driftwood')!);
    expect(result.player.coins).toBe(100);
    expect(result.player.rod).toBe('driftwood');
  });

  it('reports an already equipped item without changes', () => {
    const result = buyLure(playerWith({}), lureById('bare')!);
    expect(result.message).toContain('already');
    expect(result.player.lure).toBe('bare');
  });

  it('buys lures the same way', () => {
    const result = buyLure(playerWith({ coins: 80 }), lureById('spinner')!);
    expect(result.player.coins).toBe(10);
    expect(result.player.lure).toBe('spinner');
    expect(result.player.lures).toContain('spinner');
  });

  it('maps the equipped rod to reel modifiers', () => {
    expect(rodModifiers(rodById('hickory'))).toEqual({ progressScale: 1, missTensionScale: 1 });
    expect(rodModifiers(rodById('flyrod'))).toEqual({ progressScale: 1.5, missTensionScale: 0.6 });
    expect(rodModifiers(undefined)).toEqual({ progressScale: 1, missTensionScale: 1 });
  });

  it('sanitizes unknown ids and guarantees starter gear', () => {
    const messy = playerWith({
      rods: ['hickory', 'ghost-rod'],
      lures: ['spinner', 'phantom-lure'],
      rod: 'ghost-rod',
      lure: 'phantom-lure',
    });
    const clean = sanitizePlayer(messy);
    expect(clean.rods).toEqual(['hickory']);
    expect(clean.lures).toEqual(['spinner', 'bare']);
    expect(clean.rod).toBe('hickory');
    expect(clean.lure).toBe('bare');
  });

  it('covers every rod and lure with a unique id', () => {
    const ids = [...RODS, ...LURES].map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(RODS.every((rod) => rod.cost >= 0)).toBe(true);
    expect(LURES.every((lure) => lure.rareWeight >= 1)).toBe(true);
  });
});
