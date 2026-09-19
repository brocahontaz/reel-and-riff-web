/**
 * Handcrafted overworld and interior maps, parsed once at module load. The
 * ASCII grids are the source of truth; `WILLOWMERE_PROBLEMS` must stay empty
 * (tests enforce it) whenever the maps are edited by hand.
 */

import { assertMapIntegrity, labelBuildings, parseWorldMap, type NpcSeed } from '../world/worldMap';

export const WILLOWMERE_NAME = 'Willowmere Shores';

export const WILLOWMERE_NPCS: NpcSeed[] = [
  { marker: '1', id: 'marlin', name: 'Old Marlin', color: 0x8ed081 },
  { marker: '2', id: 'june', name: 'June', color: 0xf4b942 },
];

/**
 * Willowmere Shores, 46 x 30 tiles.
 *
 * Legend: `.` grass `,` flowers `#` tree `W` water `D` dock `=` path `f` fence
 * `H` wall `h` home door `v` venue door `g` guitar mat `b` bed `s` fishing
 * spot `@` spawn `1`/`2` npc markers.
 */
export const WILLOWMERE_ROWS: string[] = [
  '##############################################',
  '#............................................#',
  '#...........,...,.........,..................#',
  '#..,....#.#................#.................#',
  '#...............fff.HHHHH.....,..............#',
  '#......,........f,f.HHHHH........HHHHHHHH....#',
  '#....#..........f,f.HHHHH........HHHHHHHH....#',
  '#...............fff.HHhHH......#.HHHHHHHH....#',
  '#..,.........#........@...,......HHHHHHHH....#',
  '#......,..............=..........HHHvHHHH....#',
  '#...WWWWWW............=........,....=........#',
  '#..WWWWWWWW.....,.....=.............=2.......#',
  '#WWWWWWWWWWW.......,..=....,..#.....=........#',
  '#WWWWWWWWWWWW.........=.............=........#',
  '#WWWWWWWWWWWWW.......================........#',
  '#WWWWWWWWWWWWW.......=ff=....................#',
  '#WWWWWWWWWWsDDD=======ff=.....,..............#',
  '#WWWWWWWWWWDDDD1.....====....................#',
  '#WWWWWWWWWWWWWW............#..#...,..........#',
  '#WWWWWWWWWWWWWWW..........,..................#',
  '#WWWWWWWWWWWWWWW.,.#....,.........#.#.#.#.#..#',
  '#WWWWWWWWWWWWWWW.........#.......#.#.#.#.#.#.#',
  '#WWWWWWWWWWWWWW...#..,.........#..#.#.#.#.#..#',
  '#WWWWWWWWWWWWW...................#.#.#.#.#.#.#',
  '#WWWWWWWWWWWWW..............#.....#.#.#.#.#..#',
  '#WWWWWWWWWWWW.................,....#.#.#.#.#.#',
  '#WWWWWWWWWWW.,............,.......#.#.#.#.#..#',
  '#WWWWWWWWW.........................#.#.#.#...#',
  '#..WWWWWW....................................#',
  '##############################################',
];

/** Home Sweet Cabin interior, 14 x 10 tiles. */
export const CABIN_ROWS: string[] = [
  'HHHHHHHHHHHHHH',
  'H.g.........bH',
  'H............H',
  'H,...........H',
  'H...ff.......H',
  'H...ff.......H',
  'H..,.........H',
  'H..........,.H',
  'H.....@......H',
  'HHHHHHhHHHHHHH',
];

/** The labeled overworld: parsing and building names applied in one step. */
export const WILLOWMERE = labelBuildings(
  parseWorldMap(WILLOWMERE_NAME, WILLOWMERE_ROWS, WILLOWMERE_NPCS),
  ['Home Sweet Cabin', 'The Rusty Reel Hall'],
);

export const CABIN = parseWorldMap('Home Sweet Cabin', CABIN_ROWS, []);

/** Empty when both handcrafted maps are coherent; tests assert exactly that. */
export const WILLOWMERE_PROBLEMS = [
  ...assertMapIntegrity(WILLOWMERE),
  ...assertMapIntegrity(CABIN),
];
