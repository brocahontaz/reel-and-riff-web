import { describe, expect, it } from 'vitest';
import {
  CABIN,
  WILLOWMERE,
  WILLOWMERE_NAME,
  WILLOWMERE_NPCS,
  WILLOWMERE_PROBLEMS,
  WILLOWMERE_ROWS,
} from '../src/content/world';
import {
  assertMapIntegrity,
  labelBuildings,
  parseWorldMap,
  TILE,
  tileCenter,
  type Rect,
  type WorldMap,
} from '../src/world/worldMap';

const centerInside = (x: number, y: number, rect: Rect): boolean =>
  x > rect.x && x < rect.x + rect.width && y > rect.y && y < rect.y + rect.height;

const tileSolidAt = (map: WorldMap, col: number, row: number): boolean => {
  const { x, y } = tileCenter(col, row);
  return map.colliders.some((rect) => centerInside(x, y, rect));
};

const waterTilesIn = (rows: string[]): number =>
  rows.reduce((total, row) => total + [...row].filter((ch) => ch === 'W').length, 0);

describe('handcrafted maps', () => {
  it('parses Willowmere with no integrity problems', () => {
    expect(WILLOWMERE.name).toBe(WILLOWMERE_NAME);
    expect(WILLOWMERE.cols).toBe(WILLOWMERE_ROWS[0].length);
    expect(WILLOWMERE.rows).toBe(WILLOWMERE_ROWS.length);
    expect(WILLOWMERE.widthPx).toBe(WILLOWMERE.cols * TILE);
    expect(WILLOWMERE.heightPx).toBe(WILLOWMERE.rows * TILE);
    expect(WILLOWMERE_PROBLEMS).toEqual([]);
  });

  it('parses the cabin interior clean', () => {
    expect(CABIN.name).toBe('Home Sweet Cabin');
    expect(CABIN.cols).toBe(14);
    expect(CABIN.rows).toBe(10);
    expect(assertMapIntegrity(CABIN)).toEqual([]);
  });

  it('labels both buildings in reading order', () => {
    expect(WILLOWMERE.buildings.map((building) => building.name)).toEqual([
      'Home Sweet Cabin',
      'The Rusty Reel Hall',
    ]);
    expect(WILLOWMERE.buildings.every((building) => building.rects.length > 0)).toBe(true);
  });

  it('has a spawn on walkable ground inside bounds', () => {
    for (const map of [WILLOWMERE, CABIN]) {
      expect(map.spawn.x).toBeGreaterThan(0);
      expect(map.spawn.x).toBeLessThan(map.widthPx);
      expect(map.spawn.y).toBeGreaterThan(0);
      expect(map.spawn.y).toBeLessThan(map.heightPx);
      const col = Math.floor(map.spawn.x / TILE);
      const row = Math.floor(map.spawn.y / TILE);
      expect(tileSolidAt(map, col, row)).toBe(false);
    }
  });

  it('merges solid runs per row instead of one rect per tile', () => {
    expect(WILLOWMERE.water.length).toBeLessThan(waterTilesIn(WILLOWMERE_ROWS));
    expect(WILLOWMERE.water.length).toBeGreaterThan(0);
    for (const rect of [...WILLOWMERE.water, ...WILLOWMERE.colliders]) {
      expect(rect.width % TILE).toBe(0);
      expect(rect.height).toBe(TILE);
    }
  });

  it('keeps the fishing spot on the dock next to water', () => {
    const spot = WILLOWMERE.spots.find((entry) => entry.kind === 'fishing');
    expect(spot).toBeDefined();
    const onDock = WILLOWMERE.dock.some((rect) => centerInside(spot!.x, spot!.y, rect));
    expect(onDock).toBe(true);
    const tile = { col: Math.floor(spot!.x / TILE), row: Math.floor(spot!.y / TILE) };
    const nearWater = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].some(([dc, dr]) => {
      const { x, y } = tileCenter(tile.col + dc, tile.row + dr);
      return WILLOWMERE.water.some((rect) => centerInside(x, y, rect));
    });
    expect(nearWater).toBe(true);
  });

  it('gives every door a walkable non-door neighbour', () => {
    for (const map of [WILLOWMERE, CABIN]) {
      const doors = map.spots.filter(
        (spot) => spot.kind === 'door-home' || spot.kind === 'door-venue',
      );
      expect(doors.length).toBeGreaterThan(0);
      for (const door of doors) {
        const tile = { col: Math.floor(door.x / TILE), row: Math.floor(door.y / TILE) };
        const open = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dc, dr]) => !tileSolidAt(map, tile.col + dc, tile.row + dr));
        expect(open, `door ${door.id} in ${map.name} is walled in`).toBe(true);
      }
    }
  });

  it('places npcs on walkable ground', () => {
    for (const map of [WILLOWMERE, CABIN]) {
      for (const npc of map.npcs) {
        const col = Math.floor(npc.x / TILE);
        const row = Math.floor(npc.y / TILE);
        expect(tileSolidAt(map, col, row), `npc ${npc.id} in ${map.name}`).toBe(false);
      }
    }
  });

  it('parses both npc markers with their seed identities', () => {
    expect(WILLOWMERE_NPCS.map((seed) => seed.id)).toEqual(['marlin', 'june']);
    expect(WILLOWMERE.npcs.map((npc) => npc.id)).toEqual(['june', 'marlin']);
    expect(WILLOWMERE.npcs.map((npc) => npc.name)).toEqual(['June', 'Old Marlin']);
    expect(WILLOWMERE.spots.filter((spot) => spot.kind === 'npc').length).toBe(2);
  });

  it('exposes interaction spots with radii and labels', () => {
    const fishing = WILLOWMERE.spots.find((spot) => spot.kind === 'fishing')!;
    const door = WILLOWMERE.spots.find((spot) => spot.kind === 'door-home')!;
    expect(fishing.radius).toBe(56);
    expect(fishing.label).toBe('Fish');
    expect(door.radius).toBe(48);
    expect(door.label).toBe('Enter');
    expect(CABIN.spots.find((spot) => spot.kind === 'guitar')!.label).toBe('Play guitar');
    expect(CABIN.spots.find((spot) => spot.kind === 'bed')!.label).toBe('Rest');
    expect(new Set(WILLOWMERE.spots.map((spot) => spot.id)).size).toBe(WILLOWMERE.spots.length);
  });

  it('centers tiles in the middle of the tile', () => {
    expect(tileCenter(0, 0)).toEqual({ x: TILE / 2, y: TILE / 2 });
    expect(tileCenter(3, 2)).toEqual({ x: 3 * TILE + TILE / 2, y: 2 * TILE + TILE / 2 });
  });
});

describe('parser validation', () => {
  it('throws on ragged rows and names the offending row', () => {
    expect(() => parseWorldMap('Broken', ['....', '..'], [])).toThrow(/row 1 .* expected 4/);
  });

  it('throws on unknown tiles', () => {
    expect(() => parseWorldMap('Broken', ['.x.'], [])).toThrow(/unknown tile 'x' at row 0, col 1/);
  });

  it('demands exactly one spawn', () => {
    expect(() => parseWorldMap('Broken', ['..'], [])).toThrow(/exactly one '@' spawn \(found 0\)/);
    expect(() => parseWorldMap('Broken', ['@@'], [])).toThrow(/exactly one '@' spawn \(found 2\)/);
  });

  it('throws when an npc marker lacks a definition or a def is unused', () => {
    expect(() => parseWorldMap('Broken', ['@1'], [])).toThrow(/marker '1' .* has no definition/);
    expect(() =>
      parseWorldMap('Broken', ['@.'], [{ marker: '2', id: 'june', name: 'June', color: 0xffffff }]),
    ).toThrow(/'june' .* unused/);
  });

  it('merges same-kind runs but splits on kind changes', () => {
    const map = parseWorldMap('Tiny', ['@WW.', '#W..'], []);
    const row0 = map.water.filter((rect) => rect.y === 0);
    expect(row0.length).toBe(1);
    expect(row0[0].width).toBe(2 * TILE);
    expect(map.colliders.filter((rect) => rect.y === TILE).length).toBe(2);
  });

  it('groups 4-connected walls into one building cluster', () => {
    const map = parseWorldMap('Tiny', ['@HH.', '.HH.', '....'], []);
    expect(map.buildings.length).toBe(1);
    expect(map.buildings[0].rects.length).toBe(2);
    const split = parseWorldMap('Tiny', ['@H.H', '....', '....'], []);
    expect(split.buildings.length).toBe(2);
  });

  it('names clusters in reading order and leaves extras unnamed', () => {
    const map = parseWorldMap('Tiny', ['@..H', '.H..', '....'], []);
    const named = labelBuildings(map, ['First']);
    expect(named.buildings.map((building) => building.name)).toEqual(['First', '']);
    expect(labelBuildings(map, ['A', 'B']).buildings[1].name).toBe('B');
    expect(map.buildings[0].name).toBe('');
  });

  it('reports integrity problems for a broken map', () => {
    const broken: WorldMap = { ...CABIN, spawn: tileCenter(4, 4) }; // on the furniture
    expect(assertMapIntegrity(broken)).toContain('spawn is inside a collider');
  });
});
