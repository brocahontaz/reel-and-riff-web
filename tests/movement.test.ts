import { describe, expect, it } from 'vitest';
import {
  PLAYER_SPEED,
  inputAxis,
  moveActor,
  type Actor,
  type MoveInput,
} from '../src/game/movement';
import type { Rect } from '../src/world/worldMap';
import { createRng } from '../src/game/rng';

const IDLE: MoveInput = { up: false, down: false, left: false, right: false };
const BOUNDS = { width: 960, height: 960 };
const actor = (x: number, y: number, width = 24, height = 24): Actor => ({ x, y, width, height });

const overlaps = (body: Actor, rect: Rect): boolean =>
  body.x - body.width / 2 < rect.x + rect.width &&
  body.x + body.width / 2 > rect.x &&
  body.y - body.height / 2 < rect.y + rect.height &&
  body.y + body.height / 2 > rect.y;

describe('inputAxis', () => {
  it('returns zero when idle', () => {
    expect(inputAxis(IDLE)).toEqual({ x: 0, y: 0 });
  });

  it('normalizes diagonals and points straight keys', () => {
    expect(inputAxis({ ...IDLE, right: true })).toEqual({ x: 1, y: 0 });
    expect(inputAxis({ ...IDLE, up: true })).toEqual({ x: 0, y: -1 });
    const diagonal = inputAxis({ ...IDLE, up: true, right: true });
    expect(diagonal.x).toBeCloseTo(Math.SQRT1_2, 12);
    expect(diagonal.y).toBeCloseTo(-Math.SQRT1_2, 12);
  });

  it('lets opposite keys cancel out', () => {
    expect(inputAxis({ ...IDLE, left: true, right: true })).toEqual({ x: 0, y: 0 });
  });
});

describe('moveActor', () => {
  it('does not move on idle input', () => {
    expect(moveActor(actor(100, 100), IDLE, 1 / 60, [], BOUNDS)).toEqual(actor(100, 100));
  });

  it('respects speed times delta on straight moves', () => {
    const moved = moveActor(actor(100, 100), { ...IDLE, right: true }, 1 / 60, [], BOUNDS);
    expect(moved.x).toBeCloseTo(100 + PLAYER_SPEED / 60, 10);
    expect(moved.y).toBe(100);
  });

  it('covers no more than speed*dt on diagonals', () => {
    const moved = moveActor(
      actor(100, 100),
      { ...IDLE, up: true, right: true },
      1 / 30,
      [],
      BOUNDS,
    );
    const distance = Math.hypot(moved.x - 100, moved.y - 100);
    expect(distance).toBeCloseTo(PLAYER_SPEED / 30, 10);
  });

  it('clamps huge seconds to 0.1s so steps stay short', () => {
    const moved = moveActor(actor(100, 100), { ...IDLE, right: true }, 5, [], BOUNDS);
    expect(moved.x).toBeCloseTo(100 + PLAYER_SPEED * 0.1, 10);
  });

  it('ignores negative and non-finite seconds', () => {
    expect(moveActor(actor(100, 100), { ...IDLE, right: true }, -1, [], BOUNDS).x).toBe(100);
    expect(moveActor(actor(100, 100), { ...IDLE, right: true }, Number.NaN, [], BOUNDS).x).toBe(
      100,
    );
  });

  it('blocks against a wall from the left and right', () => {
    const wall: Rect = { x: 200, y: 0, width: 32, height: 960 };
    const blocked = moveActor(actor(186, 100), { ...IDLE, right: true }, 1, [wall], BOUNDS);
    expect(blocked.x).toBeCloseTo(wall.x - 12, 10);
    const otherSide = moveActor(actor(250, 100), { ...IDLE, left: true }, 1, [wall], BOUNDS);
    expect(otherSide.x).toBeCloseTo(wall.x + wall.width + 12, 10);
  });

  it('blocks against a wall from above and below', () => {
    const wall: Rect = { x: 0, y: 200, width: 960, height: 32 };
    const blocked = moveActor(actor(100, 186), { ...IDLE, down: true }, 1, [wall], BOUNDS);
    expect(blocked.y).toBeCloseTo(wall.y - 12, 10);
    expect(blocked.x).toBe(100);
    const otherSide = moveActor(actor(100, 250), { ...IDLE, up: true }, 1, [wall], BOUNDS);
    expect(otherSide.y).toBeCloseTo(wall.y + wall.height + 12, 10);
  });

  it('slides along walls instead of sticking', () => {
    const wall: Rect = { x: 200, y: 0, width: 32, height: 960 };
    const moved = moveActor(
      actor(186, 100),
      { ...IDLE, right: true, down: true },
      1 / 30,
      [wall],
      BOUNDS,
    );
    expect(moved.x).toBeCloseTo(wall.x - 12, 10);
    expect(moved.y).toBeCloseTo(100 + (PLAYER_SPEED / 30) * Math.SQRT1_2, 10);
  });

  it('clamps the actor inside world bounds', () => {
    const small = { width: 200, height: 200 };
    expect(moveActor(actor(10, 100), { ...IDLE, left: true }, 1, [], small).x).toBe(12);
    expect(moveActor(actor(190, 100), { ...IDLE, right: true }, 1, [], small).x).toBe(188);
    expect(moveActor(actor(100, 5), { ...IDLE, up: true }, 1, [], small).y).toBe(12);
    expect(moveActor(actor(100, 195), { ...IDLE, down: true }, 1, [], small).y).toBe(188);
  });

  it('never ends up inside a collider for seeded random cases', () => {
    const rng = createRng(20260918);
    for (let caseIndex = 0; caseIndex < 40; caseIndex += 1) {
      const colliders: Rect[] = [];
      while (colliders.length < 4) {
        const col = Math.floor(rng() * 20);
        const row = Math.floor(rng() * 20);
        const width = 32 * (1 + Math.floor(rng() * 3));
        const height = 32 * (1 + Math.floor(rng() * 3));
        const rect: Rect = { x: col * 32, y: row * 32, width, height };
        colliders.push(rect);
      }
      const body = actor(20 + rng() * 500, 20 + rng() * 500, 20 + rng() * 8, 20 + rng() * 8);
      if (colliders.some((rect) => overlaps(body, rect))) continue; // start must be clean
      const input: MoveInput = {
        up: rng() > 0.6,
        down: rng() > 0.6,
        left: rng() > 0.6,
        right: rng() > 0.6,
      };
      const moved = moveActor(body, input, rng() * 0.1, colliders, BOUNDS);
      expect(moved.x).toBeGreaterThanOrEqual(0);
      expect(moved.x).toBeLessThanOrEqual(BOUNDS.width);
      expect(moved.y).toBeGreaterThanOrEqual(0);
      expect(moved.y).toBeLessThanOrEqual(BOUNDS.height);
      for (const rect of colliders) {
        expect(overlaps(moved, rect), `case ${caseIndex} rect ${JSON.stringify(rect)}`).toBe(false);
      }
    }
  });
});
