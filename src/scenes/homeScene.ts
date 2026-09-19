/**
 * The cabin interior: rest, practice on the guitar mat, or head back out to
 * Willowmere Shores. Same movement and interaction mechanics as the overworld.
 */

import Phaser from 'phaser';
import { equippedSummary } from '../ui/panels';
import { loadPlayer } from '../persistence/playerStorage';
import { sanitizePlayer } from '../game/tackle';
import type { PlayerState } from '../persistence/playerStorage';
import { TILE, type InteractionSpot, type Rect } from '../world/worldMap';
import { nearestSpot } from '../game/interactions';
import { moveActor, type Actor } from '../game/movement';
import { CABIN } from '../content/world';
import { INTERACT_KEY, MOVE_CODES, readMoveInput } from '../input/keys';
import { createActorView, type ActorView, type Facing } from './actorView';
import {
  createDialogueUi,
  createFade,
  createPromptUi,
  type DialogueUi,
  type Fade,
  type PromptUi,
} from './walkUi';

const FLOOR = 0x9a6a40;
const FLOOR_LINE = 0x7a4a2b;
const WALL = 0x5c3a24;

export class HomeScene extends Phaser.Scene {
  private actor: Actor = { x: 0, y: 0, width: 20, height: 14 };
  private facing: Facing = 'down';
  private player: PlayerState = sanitizePlayer(loadPlayer());
  private view!: ActorView;
  private fade!: Fade;
  private promptUi!: PromptUi;
  private dialogueUi!: DialogueUi;
  private moveKeys = new Map<number, Phaser.Input.Keyboard.Key>();
  private currentSpot: InteractionSpot | undefined;

  constructor() {
    super('home');
  }
  create() {
    // A restarted scene reuses its instance: reset everything run-scoped.
    this.player = sanitizePlayer(loadPlayer());
    this.facing = 'down';
    this.currentSpot = undefined;
    this.actor = { ...CABIN.spawn, width: 20, height: 14 };
    this.moveKeys = new Map(
      [...MOVE_CODES.up, ...MOVE_CODES.down, ...MOVE_CODES.left, ...MOVE_CODES.right].map(
        (code) => [code, this.input.keyboard!.addKey(code)],
      ),
    );
    this.drawWorld();
    this.view = createActorView(this);
    this.view.graphics.setPosition(this.actor.x, this.actor.y);
    this.view.draw(0, 0, this.facing);
    const camera = this.cameras.main;
    camera.setBounds(0, 0, CABIN.widthPx, CABIN.heightPx);
    // The room is smaller than the viewport: center it once, no follow.
    camera.centerOn(CABIN.widthPx / 2, CABIN.heightPx / 2);
    this.drawHud();
    this.promptUi = createPromptUi(this);
    this.dialogueUi = createDialogueUi(this);
    this.fade = createFade(this);
    this.input.keyboard!.addKey(INTERACT_KEY).on('down', () => this.onInteract());
    this.cameras.main.fadeIn(200);
  }
  update(_time: number, delta: number) {
    if (this.fade.busy()) return;
    const input = readMoveInput((code) => this.moveKeys.get(code)?.isDown ?? false);
    if (this.dialogueUi.isOpen()) {
      this.promptUi.show(undefined);
      return;
    }
    this.actor = moveActor(this.actor, input, delta / 1000, CABIN.colliders, {
      width: CABIN.widthPx,
      height: CABIN.heightPx,
    });
    if (input.left || input.right || input.up || input.down) {
      if (input.left) this.facing = 'left';
      else if (input.right) this.facing = 'right';
      else if (input.up) this.facing = 'up';
      else this.facing = 'down';
    }
    this.view.graphics.setPosition(this.actor.x, this.actor.y);
    this.view.draw(0, 0, this.facing);
    this.currentSpot = nearestSpot(this.actor, CABIN.spots);
    this.promptUi.show(this.currentSpot);
  }
  private onInteract() {
    if (this.fade.busy()) return;
    // One press, one action: dialogue advance first, spot dispatch second.
    if (this.dialogueUi.isOpen()) {
      this.dialogueUi.advance();
      return;
    }
    const spot = this.currentSpot;
    if (!spot) return;
    if (spot.kind === 'door-home') {
      this.fade.to('overworld', { from: 'home' });
      return;
    }
    if (spot.kind === 'guitar') {
      this.fade.to('practice', { songId: 'lakeside', returnTo: 'home' });
      return;
    }
    if (spot.kind === 'bed') {
      this.dialogueUi.open('You', ['You already feel rested. The lake is calling.']);
      return;
    }
  }
  private drawHud() {
    this.add
      .text(944, 12, '', { fontFamily: 'monospace', fontSize: '13px', color: '#a9d6e5' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setShadow(1, 1, '#081a2b', 2)
      .setText(`${this.player.coins}c · ${equippedSummary(this.player)}`);
    this.add
      .text(16, 578, 'E interact', { fontFamily: 'monospace', fontSize: '12px', color: '#7fb2c4' })
      .setScrollFactor(0)
      .setShadow(1, 1, '#081a2b', 2);
  }

  /** Wood floor, walls, fireplace, bed and the guitar mat on its rug. */
  private drawWorld() {
    const g = this.add.graphics();
    const map = CABIN;
    // Plank floor: warm browns with horizontal board lines.
    g.fillStyle(FLOOR, 1);
    g.fillRect(0, 0, map.widthPx, map.heightPx);
    g.lineStyle(2, FLOOR_LINE, 1);
    for (let py = 16; py < map.heightPx; py += 16) {
      g.beginPath();
      g.moveTo(0, py);
      g.lineTo(map.widthPx, py);
      g.strokePath();
    }
    // Walls darker than the floor.
    for (const building of map.buildings) {
      for (const rect of building.rects) {
        g.fillStyle(WALL, 1);
        g.fillRect(rect.x, rect.y, rect.width, rect.height);
      }
    }
    // Rug ellipse under the guitar mat.
    const guitar = map.spots.find((spot) => spot.kind === 'guitar');
    if (guitar !== undefined) {
      g.fillStyle(0xa9502f, 1);
      g.fillEllipse(guitar.x, guitar.y + 6, 76, 44);
      g.lineStyle(2, 0x8a3c22, 1);
      g.strokeEllipse(guitar.x, guitar.y + 6, 76, 44);
      // Guitar silhouette: two circles plus a neck line on the mat.
      g.fillStyle(0x8a5a33, 1);
      g.fillCircle(guitar.x, guitar.y + 4, 15);
      g.fillStyle(0x543418, 1);
      g.fillCircle(guitar.x + 6, guitar.y + 8, 7);
      g.fillCircle(guitar.x - 1, guitar.y + 1, 5);
      g.lineStyle(3, 0xd6bd8f, 1);
      g.beginPath();
      g.moveTo(guitar.x - 4, guitar.y - 3);
      g.lineTo(guitar.x - 13, guitar.y - 15);
      g.strokePath();
    }
    // Bed: blanket, pillow and a dark frame at its collider spot.
    const bed = map.spots.find((spot) => spot.kind === 'bed');
    const bedRect = bed !== undefined ? this.rectAt(map, bed) : undefined;
    if (bedRect !== undefined) {
      g.fillStyle(0x6e4526, 1);
      g.fillRect(bedRect.x, bedRect.y, bedRect.width, bedRect.height);
      g.fillStyle(0xb0563a, 1);
      g.fillRect(bedRect.x + 2, bedRect.y + 2, bedRect.width - 4, bedRect.height - 4);
      g.fillStyle(0xf7f3e3, 1);
      g.fillRect(bedRect.x + 5, bedRect.y + 4, bedRect.width - 10, 9);
    }
    // Fireplace inside the small fence square: stone, firebox, flame.
    const fire = map.fences.find(
      (rect) =>
        map.fences.some(
          (other) =>
            other !== rect &&
            other.x === rect.x &&
            other.width === rect.width &&
            other.y === rect.y + rect.height,
        ) && rect.width === TILE * 2,
    );
    if (fire !== undefined) {
      const cx = fire.x + fire.width / 2;
      const cy = fire.y + fire.height;
      g.fillStyle(0x9b9486, 1);
      g.fillRoundedRect(cx - 28, cy - 22, 56, 44, 6);
      g.fillStyle(0x2b2118, 1);
      g.fillRect(cx - 16, cy - 10, 32, 22);
      g.fillStyle(0xf4b942, 1);
      g.fillTriangle(cx - 10, cy + 12, cx + 10, cy + 12, cx, cy - 12);
      g.fillStyle(0xf7f3e3, 0.85);
      g.fillTriangle(cx - 5, cy + 12, cx + 5, cy + 12, cx, cy - 2);
    }
  }
  /** The collider rect under a spot, for drawing furniture at its tile. */
  private rectAt(map: typeof CABIN, spot: InteractionSpot): Rect | undefined {
    return (
      map.colliders.find(
        (rect) =>
          spot.x > rect.x &&
          spot.x < rect.x + rect.width &&
          spot.y > rect.y &&
          spot.y < rect.y + rect.height,
      ) ?? undefined
    );
  }
}
