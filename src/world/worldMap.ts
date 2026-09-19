/**
 * Pure ASCII world parsing for the overworld slice. No Phaser here — scenes
 * consume the parsed `WorldMap` (rects are already in px).
 */

export const TILE = 32; // px per tile

export type InteractionKind = 'fishing' | 'door-home' | 'door-venue' | 'guitar' | 'bed' | 'npc';

export type InteractionSpot = {
  id: string; // unique, e.g. 'fishing-11-16', 'door-home-22-7', 'npc-marlin'
  kind: InteractionKind;
  /** Center position in px (tile center). */
  x: number;
  y: number;
  /** Interaction radius in px. */
  radius: number;
  /** HUD prompt text, e.g. 'Fish' or 'Talk'. */
  label: string;
};

export type NpcDef = { id: string; name: string; x: number; y: number; color: number }; // x/y px

/** Seed for an NPC marker in the ASCII rows: marker char -> identity. */
export type NpcSeed = { marker: string; id: string; name: string; color: number };

export type Rect = { x: number; y: number; width: number; height: number };

export type Point = { x: number; y: number };

export type Building = { id: string; name: string; rects: Rect[] };

export type WorldMap = {
  name: string; // display name, e.g. 'Willowmere Shores'
  cols: number;
  rows: number;
  /** px size, cols*TILE / rows*TILE */
  widthPx: number;
  heightPx: number;
  /** Solid collision rects in px (trees, walls, water, fence, bed), merged per row run. */
  colliders: Rect[];
  /** Water tile rects in px (for rendering). */
  water: Rect[];
  /** Dock plank tile rects in px (for rendering). */
  dock: Rect[];
  /** Path tile rects (for rendering). */
  paths: Rect[];
  /** Fence rects (for rendering; also colliders). */
  fences: Rect[];
  /** Wall rects per building: one entry per 4-connected wall cluster. */
  buildings: Building[];
  /** Tree positions in px (trunk base point, tile bottom-center) for rendering. */
  trees: Point[];
  /** Flower positions in px (tile center) for rendering. */
  flowers: Point[];
  spawn: Point;
  spots: InteractionSpot[];
  npcs: NpcDef[];
};

/** Default HUD prompt label per interaction kind. */
export const SPOT_LABELS: Record<InteractionKind, string> = {
  fishing: 'Fish',
  npc: 'Talk',
  'door-home': 'Enter',
  'door-venue': 'Enter',
  guitar: 'Play guitar',
  bed: 'Rest',
};

/** Default interaction radius per kind: doors/mats up close, people and fish a step out. */
const SPOT_RADIUS: Record<InteractionKind, number> = {
  fishing: 56,
  npc: 56,
  'door-home': 48,
  'door-venue': 48,
  guitar: 48,
  bed: 48,
};

const KNOWN_CHARS = new Set([
  '.',
  ',',
  '#',
  'W',
  'D',
  '=',
  'f',
  'H',
  'h',
  'v',
  'g',
  'b',
  's',
  '@',
  '1',
  '2',
]);

/** Run kind per tile char: same-kind runs merge into one rect per row. */
const RUN_KIND: Record<string, string> = {
  '#': 'tree',
  W: 'water',
  H: 'wall',
  f: 'fence',
  b: 'bed',
  D: 'dock',
  s: 'dock',
  '=': 'path',
};

/** Center of a tile in px. */
export const tileCenter = (col: number, row: number): Point => ({
  x: col * TILE + TILE / 2,
  y: row * TILE + TILE / 2,
});

const runRect = (row: number, startCol: number, endCol: number): Rect => ({
  x: startCol * TILE,
  y: row * TILE,
  width: (endCol - startCol + 1) * TILE,
  height: TILE,
});

export const parseWorldMap = (name: string, rows: string[], npcDefs: NpcSeed[]): WorldMap => {
  const cols = rows[0]?.length ?? 0;
  rows.forEach((row, index) => {
    if (row.length !== cols) {
      throw new Error(
        `Map '${name}' rows must be rectangular: row ${index} has ${row.length} tiles, expected ${cols}`,
      );
    }
  });

  let spawnCount = 0;
  let spawn: Point = { x: 0, y: 0 };
  const colliders: Rect[] = [];
  const water: Rect[] = [];
  const dock: Rect[] = [];
  const paths: Rect[] = [];
  const fences: Rect[] = [];
  const trees: Point[] = [];
  const flowers: Point[] = [];
  const wallTiles: { col: number; row: number }[] = [];
  const fishingTiles: { col: number; row: number }[] = [];
  const doorTiles: { col: number; row: number; kind: InteractionKind }[] = [];
  const matTiles: { col: number; row: number; kind: InteractionKind }[] = [];
  const npcTiles: { col: number; row: number; marker: string }[] = [];

  rows.forEach((row, rowIndex) => {
    let runKind: string | undefined;
    let runStart = 0;
    const closeRun = (endCol: number) => {
      if (!runKind) return;
      const rect = runRect(rowIndex, runStart, endCol);
      if (runKind === 'water') {
        water.push(rect);
        colliders.push(rect);
      } else if (runKind === 'dock') {
        dock.push(rect);
      } else if (runKind === 'path') {
        paths.push(rect);
      } else if (runKind === 'fence') {
        fences.push(rect);
        colliders.push(rect);
      } else if (runKind === 'bed') {
        colliders.push(rect);
      } else if (runKind === 'tree') {
        colliders.push(rect);
      }
    };
    for (let col = 0; col < cols; col += 1) {
      const ch = row[col];
      if (!KNOWN_CHARS.has(ch)) {
        throw new Error(`Map '${name}' has unknown tile '${ch}' at row ${rowIndex}, col ${col}`);
      }
      const kind = RUN_KIND[ch];
      if (kind !== runKind) {
        closeRun(col - 1);
        runKind = kind;
        runStart = col;
      }
      const center = tileCenter(col, rowIndex);
      if (ch === '#') trees.push({ x: center.x, y: (rowIndex + 1) * TILE });
      if (ch === ',') flowers.push(center);
      if (ch === 'H') wallTiles.push({ col, row: rowIndex });
      if (ch === 's') fishingTiles.push({ col, row: rowIndex });
      if (ch === 'h' || ch === 'v') {
        doorTiles.push({ col, row: rowIndex, kind: ch === 'h' ? 'door-home' : 'door-venue' });
      }
      if (ch === 'g' || ch === 'b') {
        matTiles.push({ col, row: rowIndex, kind: ch === 'g' ? 'guitar' : 'bed' });
      }
      if (ch === '1' || ch === '2') npcTiles.push({ col, row: rowIndex, marker: ch });
      if (ch === '@') {
        spawnCount += 1;
        spawn = center;
      }
    }
    closeRun(cols - 1);
  });

  if (spawnCount !== 1) {
    throw new Error(`Map '${name}' must have exactly one '@' spawn (found ${spawnCount})`);
  }

  const defByMarker = new Map<string, NpcSeed>();
  const usedMarkers = new Set<string>();
  for (const def of npcDefs) {
    if (!defByMarker.has(def.marker)) defByMarker.set(def.marker, def);
  }
  const npcs: NpcDef[] = npcTiles.map(({ col, row, marker }) => {
    const def = defByMarker.get(marker);
    if (!def) {
      throw new Error(
        `Map '${name}' NPC marker '${marker}' at row ${row}, col ${col} has no definition`,
      );
    }
    usedMarkers.add(def.marker);
    return { id: def.id, name: def.name, ...tileCenter(col, row), color: def.color };
  });
  for (const def of npcDefs) {
    if (!usedMarkers.has(def.marker)) {
      throw new Error(
        `Map '${name}' NPC definition '${def.id}' (marker '${def.marker}') is unused`,
      );
    }
  }

  const spots: InteractionSpot[] = [
    ...fishingTiles.map(({ col, row }) => makeSpot('fishing', col, row)),
    ...doorTiles.map(({ col, row, kind }) => makeSpot(kind, col, row)),
    ...matTiles.map(({ col, row, kind }) => makeSpot(kind, col, row)),
    ...npcs.map((npc) => ({
      id: `npc-${npc.id}`,
      kind: 'npc' as const,
      x: npc.x,
      y: npc.y,
      radius: SPOT_RADIUS.npc,
      label: SPOT_LABELS.npc,
    })),
  ];

  return {
    name,
    cols,
    rows: rows.length,
    widthPx: cols * TILE,
    heightPx: rows.length * TILE,
    colliders,
    water,
    dock,
    paths,
    fences,
    buildings: clusterWalls(wallTiles),
    trees,
    flowers,
    spawn,
    spots,
    npcs,
  };
};

const makeSpot = (kind: InteractionKind, col: number, row: number): InteractionSpot => ({
  id: `${kind}-${col}-${row}`,
  kind,
  ...tileCenter(col, row),
  radius: SPOT_RADIUS[kind],
  label: SPOT_LABELS[kind],
});

/** Flood-fill 4-connected wall tiles into building clusters, in reading order. */
const clusterWalls = (wallTiles: { col: number; row: number }[]): Building[] => {
  const key = (col: number, row: number) => `${col},${row}`;
  const byKey = new Map(wallTiles.map((tile) => [key(tile.col, tile.row), tile]));
  const visited = new Set<string>();
  const buildings: Building[] = [];
  for (const start of wallTiles) {
    if (visited.has(key(start.col, start.row))) continue;
    const cluster: { col: number; row: number }[] = [];
    const stack = [start];
    visited.add(key(start.col, start.row));
    while (stack.length > 0) {
      const tile = stack.pop()!;
      cluster.push(tile);
      for (const [dc, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const next = { col: tile.col + dc, row: tile.row + dr };
        const nextKey = key(next.col, next.row);
        if (byKey.has(nextKey) && !visited.has(nextKey)) {
          visited.add(nextKey);
          stack.push(next);
        }
      }
    }
    buildings.push({
      id: `building-${buildings.length + 1}`,
      name: '',
      rects: clusterRects(cluster),
    });
  }
  return buildings;
};

/** Merge a cluster's tiles into per-row horizontal runs. */
const clusterRects = (cluster: { col: number; row: number }[]): Rect[] => {
  const byRow = new Map<number, number[]>();
  for (const { col, row } of cluster) {
    const cols = byRow.get(row) ?? [];
    cols.push(col);
    byRow.set(row, cols);
  }
  const rects: Rect[] = [];
  for (const row of [...byRow.keys()].sort((a, b) => a - b)) {
    const sorted = byRow.get(row)!.sort((a, b) => a - b);
    let start = sorted[0];
    let prev = sorted[0];
    for (const col of sorted.slice(1).concat(Number.NaN)) {
      if (col !== prev + 1) {
        rects.push(runRect(row, start, prev));
        start = col;
      }
      prev = col;
    }
  }
  return rects;
};

const rectTop = (rects: readonly Rect[]): number =>
  rects.reduce((top, rect) => Math.min(top, rect.y), Number.POSITIVE_INFINITY);

const rectLeft = (rects: readonly Rect[]): number =>
  rects.reduce((left, rect) => Math.min(left, rect.x), Number.POSITIVE_INFINITY);

/** Assign display names to buildings in reading order (top-left first); extras stay unnamed. */
export const labelBuildings = (map: WorldMap, names: readonly string[]): WorldMap => {
  const order = map.buildings
    .map((building, index) => ({
      index,
      top: rectTop(building.rects),
      left: rectLeft(building.rects),
    }))
    .sort((a, b) => a.top - b.top || a.left - b.left || a.index - b.index);
  const nameByIndex = new Map<number, string>();
  order.forEach((entry, position) => {
    if (position < names.length) nameByIndex.set(entry.index, names[position]);
  });
  return {
    ...map,
    buildings: map.buildings.map((building, index) => ({
      ...building,
      name: nameByIndex.get(index) ?? '',
    })),
  };
};

const pointInRect = (x: number, y: number, rect: Rect): boolean =>
  x > rect.x && x < rect.x + rect.width && y > rect.y && y < rect.y + rect.height;

const tileOf = (point: Point): { col: number; row: number } => ({
  col: Math.floor(point.x / TILE),
  row: Math.floor(point.y / TILE),
});

const tileInsideBounds = (map: WorldMap, col: number, row: number): boolean =>
  col >= 0 && row >= 0 && col < map.cols && row < map.rows;

const tileIsSolid = (map: WorldMap, col: number, row: number): boolean => {
  const center = tileCenter(col, row);
  return map.colliders.some((rect) => pointInRect(center.x, center.y, rect));
};

/**
 * Dev-time map coherence audit. Returns a list of human-readable problems;
 * an empty list means the map is ready for play.
 */
export const assertMapIntegrity = (map: WorldMap): string[] => {
  const problems: string[] = [];

  const spawnTile = tileOf(map.spawn);
  if (!tileInsideBounds(map, spawnTile.col, spawnTile.row)) {
    problems.push('spawn lies outside the map bounds');
  } else if (tileIsSolid(map, spawnTile.col, spawnTile.row)) {
    problems.push('spawn is inside a collider');
  }

  const doorKeys = new Set(
    map.spots
      .filter((spot) => spot.kind === 'door-home' || spot.kind === 'door-venue')
      .map((spot) => tileOf(spot))
      .map((tile) => `${tile.col},${tile.row}`),
  );

  for (const npc of map.npcs) {
    const tile = tileOf(npc);
    if (!tileInsideBounds(map, tile.col, tile.row)) {
      problems.push(`npc '${npc.id}' stands outside the map bounds`);
    } else if (tileIsSolid(map, tile.col, tile.row)) {
      problems.push(`npc '${npc.id}' stands inside a collider`);
    }
  }

  for (const spot of map.spots) {
    const tile = tileOf(spot);
    const where = `spot '${spot.id}'`;
    if (!tileInsideBounds(map, tile.col, tile.row)) {
      problems.push(`${where} lies outside the map bounds`);
      continue;
    }
    if (spot.kind === 'bed') {
      if (!tileIsSolid(map, tile.col, tile.row)) problems.push(`${where} is not on a bed tile`);
      continue;
    }
    if (spot.kind === 'fishing') {
      const onDock = map.dock.some((rect) => pointInRect(spot.x, spot.y, rect));
      if (!onDock) problems.push(`${where} is not on a dock tile`);
      const waterNear = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dc, dr]) => tileIsWater(map, tile.col + dc, tile.row + dr));
      if (!waterNear) problems.push(`${where} has no adjacent water`);
      continue;
    }
    if (tileIsSolid(map, tile.col, tile.row)) {
      problems.push(`${where} stands inside a collider`);
      continue;
    }
    if (spot.kind === 'door-home' || spot.kind === 'door-venue') {
      const walkableNeighbour = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dc, dr]) => {
        const col = tile.col + dc;
        const row = tile.row + dr;
        return (
          tileInsideBounds(map, col, row) &&
          !tileIsSolid(map, col, row) &&
          !doorKeys.has(`${col},${row}`)
        );
      });
      if (!walkableNeighbour) problems.push(`${where} has no walkable non-door neighbour`);
    }
  }

  return problems;
};

const tileIsWater = (map: WorldMap, col: number, row: number): boolean => {
  if (!tileInsideBounds(map, col, row)) return false;
  const center = tileCenter(col, row);
  return map.water.some((rect) => pointInRect(center.x, center.y, rect));
};
