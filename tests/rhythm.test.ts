import { describe, expect, it } from 'vitest';
import { FISH, type FishBehavior } from '../src/content/fish';
import { RODS } from '../src/content/tackle';
import {
  baseInterval,
  fightModifiers,
  isPlayable,
  noteDensity,
  patternFor,
  patternGlyphs,
  stepAt,
  stepGlyph,
  stepInterval,
} from '../src/game/rhythm';

const bluegill = FISH[0]; // steady, difficulty 1
const bass = FISH[1]; // darting, difficulty 2
const koi = FISH[2]; // tricky, difficulty 3

describe('species rhythm patterns', () => {
  it('gives each behaviour its own looping pattern', () => {
    expect(patternFor(bluegill)).toEqual(['note', 'note', 'note', 'note']);
    expect(patternFor(bass)).toContain('burst');
    expect(patternFor(bass)).not.toContain('rest');
    expect(patternFor(koi)).toContain('rest');
    expect(patternFor(koi).some(isPlayable)).toBe(true);
  });

  it('is deterministic per behaviour', () => {
    expect(patternFor(bass)).toEqual(patternFor(bass));
    expect(patternFor({ ...bass, difficulty: 3 })).toEqual(patternFor(bass));
    expect(patternFor({ ...koi, behavior: 'steady' })).toEqual(patternFor(bluegill));
  });

  it('falls back to the steady pattern for unknown behaviour', () => {
    const ghost = { ...bluegill, behavior: 'ghost' as FishBehavior };
    expect(patternFor(ghost)).toEqual(patternFor(bluegill));
    expect(noteDensity(ghost)).toBe(1);
  });
});

describe('rhythm steps', () => {
  it('marks rests as unplayable and every other step playable', () => {
    expect(isPlayable('note')).toBe(true);
    expect(isPlayable('burst')).toBe(true);
    expect(isPlayable('rest')).toBe(false);
  });

  it('wraps step indices around the pattern in both directions', () => {
    const pattern = patternFor(bass);
    const last = pattern.length - 1;
    expect(stepAt(bass, 0)).toBe(pattern[0]);
    expect(stepAt(bass, 3)).toBe(pattern[3]);
    expect(stepAt(bass, pattern.length)).toBe(pattern[0]);
    expect(stepAt(bass, pattern.length + 3)).toBe(pattern[3]);
    expect(stepAt(bass, -1)).toBe(pattern[last]);
    expect(stepAt(bass, -(pattern.length + 1))).toBe(pattern[last]);
  });
});

describe('note density', () => {
  it('keeps plain and darting riffs at unit density', () => {
    expect(noteDensity(bluegill)).toBe(1);
    expect(noteDensity(bass)).toBe(1);
  });

  it('scales rest-heavy riffs so fights still finish at the same pace', () => {
    expect(noteDensity(koi)).toBe(1.6);
  });
});

describe('step timing', () => {
  it('speeds the pulse up with difficulty but clamps the floor', () => {
    expect(baseInterval(bluegill)).toBeCloseTo(1.03, 10);
    expect(baseInterval(bass)).toBeCloseTo(0.91, 10);
    expect(baseInterval(koi)).toBeCloseTo(0.79, 10);
    expect(baseInterval({ ...koi, difficulty: 9 })).toBe(0.65);
    expect(baseInterval({ ...koi, difficulty: 99 })).toBe(0.65);
  });

  it('arrives early only for burst steps', () => {
    const burst = patternFor(bass).indexOf('burst');
    const plain = patternFor(bass).indexOf('note');
    expect(burst).toBeGreaterThan(plain);
    expect(stepInterval(bass, burst)).toBe(0.56);
    expect(stepInterval({ ...bass, difficulty: 3 }, burst)).toBe(0.49);
    expect(stepInterval(bass, burst)).toBeLessThan(stepInterval(bass, plain));
    expect(stepInterval(bluegill, 2)).toBe(baseInterval(bluegill));
    expect(stepInterval(koi, patternFor(koi).indexOf('rest'))).toBe(baseInterval(koi));
  });

  it('never asks for a press faster than the burst floor', () => {
    const hardBass = { ...bass, difficulty: 99 };
    const burst = patternFor(hardBass).indexOf('burst');
    expect(stepInterval(hardBass, burst)).toBe(0.4);
  });
});

describe('fight modifiers', () => {
  it('uses neutral modifiers when no rod is equipped', () => {
    expect(fightModifiers(undefined, bluegill)).toEqual({ progressScale: 1, missTensionScale: 1 });
  });

  it('folds note density into rod progress and keeps miss softness', () => {
    const driftwood = RODS.find((rod) => rod.id === 'driftwood')!;
    expect(fightModifiers(driftwood, bluegill)).toEqual({
      progressScale: 1.25,
      missTensionScale: 0.8,
    });
    expect(fightModifiers(driftwood, koi).progressScale).toBeCloseTo(1.25 * 1.6, 10);
    expect(fightModifiers(driftwood, koi).missTensionScale).toBe(0.8);
  });
});

describe('pattern glyphs', () => {
  it('renders a glyph per step kind', () => {
    expect(stepGlyph('note')).toBe('♪');
    expect(stepGlyph('burst')).toBe('♪!');
    expect(stepGlyph('rest')).toBe('·');
  });

  it('shows the upcoming riff with the active step bracketed', () => {
    expect(patternGlyphs(bluegill, 0)).toBe('[♪] ♪ ♪ ♪');
    expect(patternGlyphs(koi, 2)).toBe('[·] ♪ · ♪');
    expect(patternGlyphs(bass, 3)).toBe('[♪!] ♪ ♪ ♪!');
    expect(patternGlyphs(koi, 7)).toBe('[·] ♪ ♪ ·');
  });

  it('wraps around the riff and honours a custom count', () => {
    expect(patternGlyphs(bluegill, 3, 2)).toBe('[♪] ♪');
    expect(patternGlyphs(bluegill, 3, 4)).toBe('[♪] ♪ ♪ ♪');
  });
});
