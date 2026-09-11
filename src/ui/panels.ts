import { FISH } from '../content/fish';
import { LURES, Lure, RODS, Rod } from '../content/tackle';
import type { PlayerState } from '../persistence/playerStorage';
import { buyLure, buyRod, lureById, rodById } from '../game/tackle';

export type Overlay = 'none' | 'shop' | 'journal';

export type ShopRow = { kind: 'rod'; rod: Rod } | { kind: 'lure'; lure: Lure };

/** Digit-key rows across both shop sections: 1-3 rods, 4-6 lures. */
export const SHOP_ROWS: readonly ShopRow[] = [
  ...RODS.map((rod) => ({ kind: 'rod' as const, rod })),
  ...LURES.map((lure) => ({ kind: 'lure' as const, lure })),
];

const pad = (text: string, width: number): string =>
  text.length >= width ? text.slice(0, width) : text + ' '.repeat(width - text.length);

const equippedId = (player: PlayerState, row: ShopRow): string =>
  row.kind === 'rod' ? player.rod : player.lure;

const ownedIds = (player: PlayerState, row: ShopRow): string[] =>
  row.kind === 'rod' ? player.rods : player.lures;

const rowStatus = (player: PlayerState, row: ShopRow): string => {
  const item = row.kind === 'rod' ? row.rod : row.lure;
  if (equippedId(player, row) === item.id) return 'EQUIPPED';
  if (ownedIds(player, row).includes(item.id)) return 'OWNED';
  return `${item.cost}c`;
};

export const shopLines = (player: PlayerState): string[] => [
  `== BAIT & TACKLE ==      COINS ${player.coins}c`,
  '',
  '-- RODS --',
  ...SHOP_ROWS.filter((row) => row.kind === 'rod').map(
    (row, position) =>
      `${position + 1}) ${pad(row.rod.name, 15)} ${pad(rowStatus(player, row), 9)} ${row.rod.description}`,
  ),
  '-- LURES --',
  ...SHOP_ROWS.filter((row) => row.kind === 'lure').map(
    (row, position) =>
      `${position + 4}) ${pad(row.lure.name, 15)} ${pad(rowStatus(player, row), 9)} ${row.lure.description}`,
  ),
  '',
  '1-6 BUY / EQUIP    S OR ESC CLOSE',
];

export const journalLines = (player: PlayerState): string[] => [
  `== SPECIES JOURNAL ==    ${Object.keys(player.species).length}/${FISH.length} DISCOVERED`,
  '',
  ...FISH.map((fish) => {
    const caught = player.species[fish.id] ?? 0;
    if (caught === 0) return `?  ???             A shadow in the deep.`;
    return `${fish.rarity[0].toUpperCase()}  ${pad(fish.name, 16)}x${caught}`;
  }),
  '',
  'C OR ESC CLOSE',
];

export type DigitResult = { player: PlayerState; message: string };

/** Apply a 1-6 shop digit. Returns the player untouched for invalid digits. */
export const handleShopDigit = (player: PlayerState, digit: number): DigitResult => {
  const row = SHOP_ROWS[digit - 1];
  if (!row) return { player, message: '' };
  return row.kind === 'rod' ? buyRod(player, row.rod) : buyLure(player, row.lure);
};

/** True when the equipped loadout changed (so the scene can persist it). */
export const playerChanged = (before: PlayerState, after: PlayerState): boolean =>
  before.coins !== after.coins ||
  before.rod !== after.rod ||
  before.lure !== after.lure ||
  before.rods.join(',') !== after.rods.join(',') ||
  before.lures.join(',') !== after.lures.join(',');

export const equippedSummary = (player: PlayerState): string => {
  const rod = rodById(player.rod)?.name ?? '—';
  const lure = lureById(player.lure)?.name ?? '—';
  return `${rod} + ${lure}`;
};
