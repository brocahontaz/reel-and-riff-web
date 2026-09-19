/**
 * Raw key codes and input mapping for the scene layer. No Phaser here —
 * `readMoveInput` is pure so tests can run it in node.
 */

import type { MoveInput } from '../game/movement';

export const KEY = {
  up: 38,
  down: 40,
  left: 37,
  right: 39,
  w: 87,
  a: 65,
  s: 83,
  d: 68,
  e: 69,
  esc: 27,
  space: 32,
  enter: 13,
} as const;

/** Cursor keys plus WASD per direction. */
export const MOVE_CODES = {
  up: [KEY.up, KEY.w],
  down: [KEY.down, KEY.s],
  left: [KEY.left, KEY.a],
  right: [KEY.right, KEY.d],
} as const;

export const INTERACT_KEY = KEY.e;

export const BACK_KEY = KEY.esc;

/** Maps raw key-down checks onto the movement input the domain expects. */
export const readMoveInput = (down: (code: number) => boolean): MoveInput => ({
  up: MOVE_CODES.up.some(down),
  down: MOVE_CODES.down.some(down),
  left: MOVE_CODES.left.some(down),
  right: MOVE_CODES.right.some(down),
});
