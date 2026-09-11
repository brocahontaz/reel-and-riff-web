export type PlayerState = {
  catches: number;
  bestWeight: number;
  lastCatch?: string;
  coins: number;
  /** Species journal: fish id -> times landed. */
  species: Record<string, number>;
  rods: string[];
  lures: string[];
  rod: string;
  lure: string;
};

const KEY = 'reel-and-riff-player';
const EMPTY: PlayerState = {
  catches: 0,
  bestWeight: 0,
  coins: 0,
  species: {},
  rods: [],
  lures: [],
  rod: '',
  lure: '',
};

const browserStorage = (): Storage | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

const finiteAtLeast = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;

const nonNegativeInt = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : fallback;

const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const speciesCounts = (value: unknown): Record<string, number> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const counts: Record<string, number> = {};
  for (const [id, count] of Object.entries(value)) {
    if (typeof id === 'string' && id.length > 0 && typeof count === 'number' && count >= 1) {
      counts[id] = Math.min(Math.floor(count), 9999);
    }
  }
  return counts;
};

export const loadPlayer = (storage: Storage | undefined = browserStorage()): PlayerState => {
  if (!storage) return { ...EMPTY };
  try {
    const value = JSON.parse(storage.getItem(KEY) ?? 'null') as Partial<PlayerState> | null;
    if (!value || typeof value !== 'object') return { ...EMPTY };
    return {
      catches: nonNegativeInt(value.catches, EMPTY.catches),
      bestWeight: finiteAtLeast(value.bestWeight, EMPTY.bestWeight),
      coins: finiteAtLeast(value.coins, EMPTY.coins),
      species: speciesCounts(value.species),
      rods: stringList(value.rods),
      lures: stringList(value.lures),
      rod: typeof value.rod === 'string' ? value.rod : EMPTY.rod,
      lure: typeof value.lure === 'string' ? value.lure : EMPTY.lure,
      ...(typeof value.lastCatch === 'string' ? { lastCatch: value.lastCatch } : {}),
    };
  } catch {
    return { ...EMPTY };
  }
};

export const savePlayer = (
  player: PlayerState,
  storage: Storage | undefined = browserStorage(),
) => {
  try {
    storage?.setItem(KEY, JSON.stringify(player));
  } catch {
    // A blocked or full browser store should not interrupt the session.
  }
  return player;
};

export const saveCatch = (
  player: PlayerState,
  fishId: string,
  fishName: string,
  weight: number,
  coins: number,
  storage: Storage | undefined = browserStorage(),
): PlayerState =>
  savePlayer(
    {
      ...player,
      catches: player.catches + 1,
      bestWeight: Math.max(player.bestWeight, weight),
      coins: player.coins + coins,
      lastCatch: fishName,
      species: { ...player.species, [fishId]: (player.species[fishId] ?? 0) + 1 },
    },
    storage,
  );
