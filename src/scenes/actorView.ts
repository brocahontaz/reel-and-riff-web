/**
 * Shared procedural player figure for the walking scenes. The scene moves the
 * returned Graphics (its x/y is the feet point the camera can follow) and
 * redraws the relative figure each frame.
 */

import Phaser from 'phaser';

export type Facing = 'up' | 'down' | 'left' | 'right';

export type ActorView = {
  graphics: Phaser.GameObjects.Graphics;
  /** Redraw the figure standing with its feet at the given relative point. */
  draw: (x: number, y: number, facing: Facing) => void;
};

const SKIN = 0xdfa878;
const TUNIC = 0xf7f3e3;
const CAP = 0xf4b942;
const STRAP = 0x8a5a33;
const SHADOW = 0x0c253d;

export const createActorView = (scene: Phaser.Scene): ActorView => {
  const graphics = scene.add.graphics();
  const draw = (x: number, y: number, facing: Facing) => {
    graphics.clear();
    // Facing offsets: left/right mirror the strap, up/down nudge the head.
    const headShift = facing === 'up' ? -2 : facing === 'down' ? 1 : 0;
    const headX = x + (facing === 'left' ? -2 : facing === 'right' ? 2 : 0);

    graphics.fillStyle(SHADOW, 0.35);
    graphics.fillEllipse(x, y + 1, 20, 8);

    // Guitar strap behind the body.
    const strapFrom = facing === 'left' ? { x: x + 5, y: y - 9 } : { x: x - 5, y: y - 9 };
    const strapTo = facing === 'left' ? { x: x - 5, y: y - 20 } : { x: x + 5, y: y - 20 };
    graphics.lineStyle(2, STRAP, 1);
    graphics.beginPath();
    graphics.moveTo(strapFrom.x, strapFrom.y);
    graphics.lineTo(strapTo.x, strapTo.y);
    graphics.strokePath();

    // Tunic body.
    graphics.fillStyle(TUNIC, 1);
    graphics.fillRoundedRect(x - 8, y - 22, 16, 16, 5);

    // Head and cap.
    graphics.fillStyle(SKIN, 1);
    graphics.fillCircle(headX, y - 26 + headShift, 6);
    graphics.fillStyle(CAP, 1);
    graphics.slice(headX, y - 27 + headShift, 6.5, Math.PI, Math.PI * 2, false);
    graphics.fillPath();
  };
  return { graphics, draw };
};
