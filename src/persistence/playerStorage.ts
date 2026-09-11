export type PlayerState = { catches: number; bestWeight: number; lastCatch?: string };
const KEY = 'reel-and-riff-player';
const EMPTY: PlayerState = { catches: 0, bestWeight: 0 };

const browserStorage = (): Storage | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

export const loadPlayer = (storage: Storage | undefined = browserStorage()): PlayerState => {
  if (!storage) return { ...EMPTY };
  try {
    const value = JSON.parse(storage.getItem(KEY) ?? 'null') as Partial<PlayerState> | null;
    if (!value || typeof value !== 'object') return { ...EMPTY };
    const catches = value.catches;
    const bestWeight = value.bestWeight;
    return {
      catches:
        typeof catches === 'number' && Number.isInteger(catches) && catches >= 0
          ? catches
          : EMPTY.catches,
      bestWeight:
        typeof bestWeight === 'number' && Number.isFinite(bestWeight) && bestWeight >= 0
          ? bestWeight
          : EMPTY.bestWeight,
      ...(typeof value.lastCatch === 'string' ? { lastCatch: value.lastCatch } : {}),
    };
  } catch {
    return { ...EMPTY };
  }
};

export const saveCatch = (
  player: PlayerState,
  fishName: string,
  weight: number,
  storage: Storage | undefined = browserStorage(),
): PlayerState => {
  const next = {
    catches: player.catches + 1,
    bestWeight: Math.max(player.bestWeight, weight),
    lastCatch: fishName,
  };
  try {
    storage?.setItem(KEY, JSON.stringify(next));
  } catch {
    // A blocked or full browser store should not interrupt the catch result.
  }
  return next;
};
