import { describe, expect, it } from 'vitest';
import { nearestSpot, promptFor } from '../src/game/interactions';
import type { InteractionSpot } from '../src/world/worldMap';

const spot = (id: string, x: number, y: number, radius: number, label = id): InteractionSpot => ({
  id,
  kind: 'npc',
  x,
  y,
  radius,
  label,
});

describe('nearestSpot', () => {
  const spots = [spot('near', 100, 100, 48), spot('far', 200, 100, 48)];

  it('picks the closest spot in range', () => {
    expect(nearestSpot({ x: 110, y: 100 }, spots)?.id).toBe('near');
    expect(nearestSpot({ x: 190, y: 100 }, spots)?.id).toBe('far');
  });

  it('returns undefined when nothing is in range', () => {
    expect(nearestSpot({ x: 500, y: 500 }, spots)).toBeUndefined();
    expect(nearestSpot({ x: 100, y: 100 }, [])).toBeUndefined();
  });

  it('honours each spot radius at its edge', () => {
    const edge = spot('edge', 0, 0, 56);
    expect(nearestSpot({ x: 56, y: 0 }, [edge])?.id).toBe('edge');
    expect(nearestSpot({ x: 57, y: 0 }, [edge])).toBeUndefined();
  });

  it('prefers the closer of two overlapping ranges', () => {
    const a = spot('a', 0, 0, 100);
    const b = spot('b', 30, 0, 100);
    expect(nearestSpot({ x: 10, y: 0 }, [a, b])?.id).toBe('a');
    expect(nearestSpot({ x: 20, y: 0 }, [a, b])?.id).toBe('b');
  });
});

describe('promptFor', () => {
  it('formats E-prompt text from the spot label', () => {
    expect(promptFor(spot('marlin', 0, 0, 56, 'Talk'))).toBe('E — Talk');
    expect(promptFor(spot('dock', 0, 0, 56, 'Fish'))).toBe('E — Fish');
  });

  it('returns empty text without a spot', () => {
    expect(promptFor(undefined)).toBe('');
  });

  it('falls back to default labels per kind', () => {
    const kinds: [InteractionSpot, string][] = [
      [{ ...spot('f', 0, 0, 56), kind: 'fishing', label: '' }, 'E — Fish'],
      [{ ...spot('n', 0, 0, 56), kind: 'npc', label: '' }, 'E — Talk'],
      [{ ...spot('h', 0, 0, 48), kind: 'door-home', label: '' }, 'E — Enter'],
      [{ ...spot('v', 0, 0, 48), kind: 'door-venue', label: '' }, 'E — Enter'],
      [{ ...spot('g', 0, 0, 48), kind: 'guitar', label: '' }, 'E — Play guitar'],
      [{ ...spot('b', 0, 0, 48), kind: 'bed', label: '' }, 'E — Rest'],
    ];
    for (const [entry, expected] of kinds) {
      expect(promptFor(entry)).toBe(expected);
    }
  });

  it('lets callers override labels per kind', () => {
    const npc = spot('marlin', 0, 0, 56, 'Talk');
    expect(promptFor(npc, { npc: 'Chat with' })).toBe('E — Chat with');
    expect(promptFor(npc, { fishing: 'Fish here' })).toBe('E — Talk');
  });
});
