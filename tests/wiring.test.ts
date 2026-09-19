/**
 * Cheap content-wiring guards for the scene layer: the maps, dialogues, songs
 * and spot registries the four scenes are built on stay coherent. All pure
 * node-side checks — no Phaser.
 */

import { describe, expect, it } from 'vitest';
import { CABIN, WILLOWMERE } from '../src/content/world';
import { NPC_DIALOGUES, dialogueFor } from '../src/content/npc';
import { SONGS, songById, totalSteps } from '../src/content/songs';
import { DEFAULT_SPOT_ID, FISHING_SPOTS, fishingSpotById } from '../src/content/fishingSpots';
import { practiceGlyphs, stepKind } from '../src/game/guitar';
import { KEY, MOVE_CODES, readMoveInput } from '../src/input/keys';

describe('willowmere overworld wiring', () => {
  const countKind = (kind: string, map: typeof WILLOWMERE) =>
    map.spots.filter((spot) => spot.kind === kind).length;

  it('has exactly one fishing, home and venue spot', () => {
    expect(countKind('fishing', WILLOWMERE)).toBe(1);
    expect(countKind('door-home', WILLOWMERE)).toBe(1);
    expect(countKind('door-venue', WILLOWMERE)).toBe(1);
  });

  it('has exactly two npc spots, one per npc', () => {
    expect(countKind('npc', WILLOWMERE)).toBe(2);
    expect(WILLOWMERE.npcs).toHaveLength(2);
    for (const npc of WILLOWMERE.npcs) {
      expect(WILLOWMERE.spots.some((spot) => spot.id === `npc-${npc.id}`)).toBe(true);
    }
  });

  it('has a spawn point inside the map bounds', () => {
    expect(WILLOWMERE.spawn.x).toBeGreaterThan(0);
    expect(WILLOWMERE.spawn.x).toBeLessThan(WILLOWMERE.widthPx);
    expect(WILLOWMERE.spawn.y).toBeGreaterThan(0);
    expect(WILLOWMERE.spawn.y).toBeLessThan(WILLOWMERE.heightPx);
  });

  it('gives every npc a dialogue of at least three lines', () => {
    expect(NPC_DIALOGUES.length).toBeGreaterThanOrEqual(WILLOWMERE.npcs.length);
    for (const npc of WILLOWMERE.npcs) {
      expect(dialogueFor(npc.id)?.lines.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('cabin interior wiring', () => {
  it('has door, guitar and bed spots', () => {
    const kinds = CABIN.spots.map((spot) => spot.kind);
    expect(kinds).toContain('door-home');
    expect(kinds).toContain('guitar');
    expect(kinds).toContain('bed');
  });

  it('has no outdoor-only spots', () => {
    const kinds = CABIN.spots.map((spot) => spot.kind);
    expect(kinds).not.toContain('fishing');
    expect(kinds).not.toContain('door-venue');
    expect(CABIN.npcs).toHaveLength(0);
  });
});

describe('practice songs', () => {
  it('has unique ids that songById resolves', () => {
    const ids = SONGS.map((song) => song.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const song of SONGS) {
      expect(songById(song.id)).toBe(song);
    }
    expect(songById('nope')).toBeUndefined();
  });

  it('totals one run as pattern length times loops', () => {
    for (const song of SONGS) {
      expect(totalSteps(song)).toBe(song.steps.length * song.loops);
    }
  });
});

describe('fishing spot registry', () => {
  it('exposes the dock spot and falls back to undefined', () => {
    expect(DEFAULT_SPOT_ID).toBe('dock');
    expect(FISHING_SPOTS.some((spot) => spot.id === 'dock')).toBe(true);
    expect(fishingSpotById('dock')?.name).toBe('Moonlit Cove');
    expect(fishingSpotById('dock')?.tagline.length).toBeGreaterThan(0);
    expect(fishingSpotById('nope')).toBeUndefined();
  });
});

describe('practiceGlyphs', () => {
  const lakeside = SONGS[0];

  it('brackets the active step', () => {
    expect(practiceGlyphs(lakeside, 0, 3)).toBe('[♪] ♪ ·');
    expect(practiceGlyphs(lakeside, 2, 3)).toBe('[·] ♪ ♪');
  });

  it('wraps indices around the song', () => {
    const last = lakeside.steps.length - 1;
    expect(stepKind(lakeside, -1)).toBe(lakeside.steps[last]);
    expect(practiceGlyphs(lakeside, last, 3)).toBe('[♪] ♪ ♪');
    expect(practiceGlyphs(lakeside, last + 1, 3)).toBe('[♪] ♪ ·');
  });
});

describe('readMoveInput', () => {
  it('maps each arrow key', () => {
    expect(readMoveInput((code) => code === KEY.up)).toEqual({
      up: true,
      down: false,
      left: false,
      right: false,
    });
    expect(readMoveInput((code) => code === KEY.left)).toEqual({
      up: false,
      down: false,
      left: true,
      right: false,
    });
  });

  it('maps WASD equivalents onto the same directions', () => {
    const wasd = readMoveInput(
      (code) => code === KEY.w || code === KEY.a || code === KEY.s || code === KEY.d,
    );
    expect(wasd).toEqual({ up: true, down: true, left: true, right: true });
    expect(MOVE_CODES.up).toContain(KEY.w);
    expect(MOVE_CODES.left).toContain(KEY.a);
    expect(MOVE_CODES.down).toContain(KEY.s);
    expect(MOVE_CODES.right).toContain(KEY.d);
  });

  it('combines simultaneous directions and reads idle as none', () => {
    expect(readMoveInput((code) => code === KEY.down || code === KEY.right)).toEqual({
      up: false,
      down: true,
      left: false,
      right: true,
    });
    expect(readMoveInput(() => false)).toEqual({
      up: false,
      down: false,
      left: false,
      right: false,
    });
  });
});
