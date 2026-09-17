import { LURES, Lure, RODS, Rod, STARTER_LURE_ID, STARTER_ROD_ID } from '../content/tackle';
import type { PlayerState } from '../persistence/playerStorage';

export type TackleResult = { player: PlayerState; message: string };

export const rodById = (id: string): Rod | undefined => RODS.find((rod) => rod.id === id);
export const lureById = (id: string): Lure | undefined => LURES.find((lure) => lure.id === id);

/** Numeric modifiers the equipped rod applies to the reel fight. */
export const rodModifiers = (rod: Rod | undefined) => ({
  progressScale: rod?.progressPerHit ?? 1,
  missTensionScale: rod?.missTensionScale ?? 1,
});

const ensureOwned = (
  ids: string[],
  starterId: string,
  known: readonly { id: string }[],
): string[] => {
  const knownIds = new Set(known.map((item) => item.id));
  const unique: string[] = [];
  for (const id of [...ids, starterId]) {
    if (knownIds.has(id) && !unique.includes(id)) unique.push(id);
  }
  return unique;
};

/** Drop unknown ids from storage and guarantee a valid starter loadout. */
export const sanitizePlayer = (player: PlayerState): PlayerState => {
  const rods = ensureOwned(player.rods, STARTER_ROD_ID, RODS);
  const lures = ensureOwned(player.lures, STARTER_LURE_ID, LURES);
  return {
    ...player,
    rods,
    lures,
    rod: rods.includes(player.rod) ? player.rod : STARTER_ROD_ID,
    lure: lures.includes(player.lure) ? player.lure : STARTER_LURE_ID,
  };
};

const buyOrEquip = <T extends { id: string; name: string; cost: number }>(
  player: PlayerState,
  item: T,
  owned: string[],
  equipped: string,
  kind: 'rod' | 'lure',
): TackleResult => {
  const withLoadout = (base: PlayerState, nextEquipped: string): PlayerState => ({
    ...base,
    ...(kind === 'rod'
      ? { rods: owned.includes(item.id) ? owned : [...owned, item.id], rod: nextEquipped }
      : { lures: owned.includes(item.id) ? owned : [...owned, item.id], lure: nextEquipped }),
  });

  if (owned.includes(item.id)) {
    if (equipped === item.id) {
      return { player, message: `${item.name} is already in hand.` };
    }
    return { player: withLoadout(player, item.id), message: `${item.name} equipped.` };
  }
  if (player.coins < item.cost) {
    return { player, message: `Need ${item.cost - player.coins} more coins for ${item.name}.` };
  }
  return {
    player: withLoadout({ ...player, coins: player.coins - item.cost }, item.id),
    message: `${item.name} bought and equipped!`,
  };
};

export const buyRod = (player: PlayerState, rod: Rod): TackleResult =>
  buyOrEquip(player, rod, player.rods, player.rod, 'rod');

export const buyLure = (player: PlayerState, lure: Lure): TackleResult =>
  buyOrEquip(player, lure, player.lures, player.lure, 'lure');
