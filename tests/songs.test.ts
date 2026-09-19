import { describe, expect, it } from 'vitest';
import { isPlayable, type RhythmStep } from '../src/game/rhythm';
import { SONGS, songById, totalSteps } from '../src/content/songs';

const STEP_KINDS: readonly RhythmStep[] = ['note', 'burst', 'rest'];

describe('song content', () => {
  it('ships at least three songs with unique ids', () => {
    expect(SONGS.length).toBeGreaterThanOrEqual(3);
    expect(new Set(SONGS.map((song) => song.id)).size).toBe(SONGS.length);
  });

  it('keeps every song playable: long, valid, well-paced, with notes to hit', () => {
    for (const song of SONGS) {
      expect(song.steps.length, song.id).toBeGreaterThanOrEqual(8);
      for (const step of song.steps) {
        expect(STEP_KINDS, `${song.id} step '${step}'`).toContain(step);
      }
      expect(song.interval, song.id).toBeGreaterThanOrEqual(0.5);
      expect(song.interval, song.id).toBeLessThanOrEqual(1.0);
      expect(song.loops, song.id).toBeGreaterThanOrEqual(1);
      expect(
        song.steps.some((step) => isPlayable(step)),
        song.id,
      ).toBe(true);
    }
  });

  it('gives each song its own character', () => {
    const lakeside = songById('lakeside')!;
    const campfire = songById('campfire')!;
    const foxglove = songById('foxglove')!;
    expect(lakeside.name).toBe('Lakeside Lullaby');
    expect(lakeside.loops).toBe(2);
    expect(lakeside.steps).toContain('rest');
    expect(campfire.steps).toContain('burst');
    expect(foxglove.loops).toBe(3);
    expect(foxglove.steps.filter((step) => step === 'rest').length).toBeGreaterThan(0);
    expect(lakeside.steps).not.toEqual(campfire.steps);
    expect(campfire.steps).not.toEqual(foxglove.steps);
  });
});

describe('song lookup', () => {
  it('finds songs by id and totals their steps', () => {
    const lakeside = songById('lakeside')!;
    expect(songById('lakeside')).toBe(lakeside);
    expect(totalSteps(lakeside)).toBe(lakeside.steps.length * lakeside.loops);
    expect(totalSteps(songById('foxglove')!)).toBe(30);
  });

  it('returns undefined for unknown ids', () => {
    expect(songById('nope')).toBeUndefined();
  });
});
