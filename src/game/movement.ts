/**
 * Pure top-down movement with axis-separated wall sliding. No Phaser — the
 * scene feeds it input each frame and draws the returned actor.
 */

import type { Rect } from '../world/worldMap';

export type Vec2 = { x: number; y: number };

export type MoveInput = { up: boolean; down: boolean; left: boolean; right: boolean };

/** Centered actor box: (x, y) is the middle of the body. */
export type Actor = { x: number; y: number; width: number; height: number };

export type Bounds = { width: number; height: number };

export const PLAYER_SPEED = 150; // px/s

/** Normalized direction from held keys; (0, 0) when idle, diagonals normalized. */
export const inputAxis = (input: MoveInput): Vec2 => {
  const x = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const y = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (x === 0 && y === 0) return { x: 0, y: 0 };
  const length = Math.hypot(x, y);
  return { x: x / length, y: y / length };
};

/**
 * Move an actor for `seconds`, resolving X then Y so walls can be slid along.
 * Seconds are clamped to <= 0.1: at 150 px/s that is a 15 px step, which can
 * never skip a tile-sized (32 px) collider, so tunneling is impossible.
 * With a non-overlapping start the actor never ends up inside a collider.
 */
export const moveActor = (
  actor: Actor,
  input: MoveInput,
  seconds: number,
  colliders: readonly Rect[],
  bounds: { width: number; height: number },
): Actor => {
  const dt = Number.isFinite(seconds) ? Math.max(0, Math.min(0.1, seconds)) : 0;
  const axis = inputAxis(input);
  const halfWidth = actor.width / 2;
  const halfHeight = actor.height / 2;
  const afterX: Actor = {
    ...actor,
    x: sweepX(actor, axis.x * PLAYER_SPEED * dt, colliders, halfWidth, bounds.width),
  };
  return {
    ...afterX,
    y: sweepY(afterX, axis.y * PLAYER_SPEED * dt, colliders, halfHeight, bounds.height),
  };
};

const clampAxis = (value: number, half: number, size: number): number =>
  Math.max(half, Math.min(value, size - half));

/**
 * Horizontal pass: sweep the box's leading edge and, for every collider it
 * crosses, stop flush against that collider's edge (closest one wins).
 */
const sweepX = (
  actor: Actor,
  dx: number,
  colliders: readonly Rect[],
  halfWidth: number,
  boundsWidth: number,
): number => {
  const x = clampAxis(actor.x + dx, halfWidth, boundsWidth);
  if (dx === 0) return x;
  let resolved = x;
  for (const rect of colliders) {
    if (!overlapsY(actor.y, actor.height, rect)) continue;
    if (dx > 0) {
      const crossed = actor.x + halfWidth <= rect.x && resolved + halfWidth > rect.x;
      if (crossed) resolved = Math.min(resolved, rect.x - halfWidth);
    } else {
      const crossed =
        actor.x - halfWidth >= rect.x + rect.width && resolved - halfWidth < rect.x + rect.width;
      if (crossed) resolved = Math.max(resolved, rect.x + rect.width + halfWidth);
    }
  }
  return clampAxis(resolved, halfWidth, boundsWidth);
};

/** Vertical pass, mirroring sweepX so sliding works the same both ways. */
const sweepY = (
  actor: Actor,
  dy: number,
  colliders: readonly Rect[],
  halfHeight: number,
  boundsHeight: number,
): number => {
  const y = clampAxis(actor.y + dy, halfHeight, boundsHeight);
  if (dy === 0) return y;
  let resolved = y;
  for (const rect of colliders) {
    if (!overlapsX(actor.x, actor.width, rect)) continue;
    if (dy > 0) {
      const crossed = actor.y + halfHeight <= rect.y && resolved + halfHeight > rect.y;
      if (crossed) resolved = Math.min(resolved, rect.y - halfHeight);
    } else {
      const crossed =
        actor.y - halfHeight >= rect.y + rect.height &&
        resolved - halfHeight < rect.y + rect.height;
      if (crossed) resolved = Math.max(resolved, rect.y + rect.height + halfHeight);
    }
  }
  return clampAxis(resolved, halfHeight, boundsHeight);
};

const overlapsX = (x: number, width: number, rect: Rect): boolean =>
  x - width / 2 < rect.x + rect.width && x + width / 2 > rect.x;

const overlapsY = (y: number, height: number, rect: Rect): boolean =>
  y - height / 2 < rect.y + rect.height && y + height / 2 > rect.y;
