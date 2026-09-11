import { describe, expect, it } from 'vitest';
import { loadPlayer, type PlayerState } from '../src/persistence/playerStorage';
import {
  equippedSummary,
  handleShopDigit,
  journalLines,
  playerChanged,
  shopLines,
} from '../src/ui/panels';

const playerWith = (overrides: Partial<PlayerState>): PlayerState => ({
  ...loadPlayer(undefined),
  coins: 100,
  rods: ['hickory'],
  lures: ['bare'],
  rod: 'hickory',
  lure: 'bare',
  species: {},
  ...overrides,
});

describe('shop panel', () => {
  it('lists every rod and lure with cost or status', () => {
    const lines = shopLines(playerWith({}));
    const text = lines.join('\n');
    expect(text).toContain('Hickory Pole');
    expect(text).toContain('Moonfly Rod');
    expect(text).toContain('Shiny Spinner');
    expect(text).toContain('EQUIPPED');
    expect(text).toContain('140c');
    expect(text).toContain('COINS 100c');
  });

  it('marks owned-but-unequipped gear as OWNED', () => {
    const lines = shopLines(playerWith({ lures: ['bare', 'spinner'], lure: 'bare' }));
    expect(lines.join('\n')).toContain('OWNED');
  });

  it('digit 2 buys and equips the Driftwood Rod', () => {
    const result = handleShopDigit(playerWith({}), 2);
    expect(result.player.rod).toBe('driftwood');
    expect(result.player.coins).toBe(45);
  });

  it('digit 5 equips the Shiny Spinner once owned', () => {
    const owned = playerWith({ lures: ['bare', 'spinner'], lure: 'bare' });
    const result = handleShopDigit(owned, 5);
    expect(result.player.lure).toBe('spinner');
    expect(result.player.coins).toBe(100);
  });

  it('ignores digits outside the shop rows', () => {
    const before = playerWith({});
    const result = handleShopDigit(before, 9);
    expect(result.player).toBe(before);
    expect(result.message).toBe('');
  });

  it('detects when a purchase should be persisted', () => {
    const before = playerWith({});
    const after = handleShopDigit(before, 2).player;
    expect(playerChanged(before, after)).toBe(true);
    expect(playerChanged(before, before)).toBe(false);
  });

  it('summarises the equipped loadout', () => {
    expect(equippedSummary(playerWith({}))).toBe('Hickory Pole + Bare Hook');
    expect(equippedSummary(playerWith({ rod: 'missing' }))).toContain('—');
  });
});

describe('species journal', () => {
  it('hides undiscovered species behind ???', () => {
    const lines = journalLines(playerWith({}));
    const text = lines.join('\n');
    expect(text).toContain('0/3 DISCOVERED');
    expect(text.match(/\?\?\?/g)?.length).toBe(3);
    expect(text).not.toContain('Golden Koi');
  });

  it('reveals caught species with their catch count', () => {
    const lines = journalLines(playerWith({ species: { bass: 2 } }));
    const text = lines.join('\n');
    expect(text).toContain('1/3 DISCOVERED');
    expect(text).toContain('River Bass');
    expect(text).toContain('x2');
    const bassLine = lines.find((line) => line.includes('River Bass'))!;
    expect(bassLine).not.toContain('???');
  });
});
