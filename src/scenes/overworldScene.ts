/**
 * The primary game layer: explore Willowmere Shores, talk to NPCs and use
 * interaction spots that hand off to the focused activity scenes. Rendering,
 * input and transitions only — all rules live in the Phaser-free modules.
 */

import Phaser from 'phaser';
import { equippedSummary } from '../ui/panels';
import { loadPlayer } from '../persistence/playerStorage';
import { sanitizePlayer } from '../game/tackle';
import type { PlayerState } from '../persistence/playerStorage';
import {
  TILE,
  type Building,
  type InteractionSpot,
  type NpcDef,
  type Rect,
} from '../world/worldMap';
import { nearestSpot } from '../game/interactions';
import { moveActor, type Actor } from '../game/movement';
import { dialogueFor } from '../content/npc';
import { WILLOWMERE, WILLOWMERE_NAME } from '../content/world';
import { DEFAULT_SPOT_ID } from '../content/fishingSpots';
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

const CABIN_DOOR_CLEARANCE = TILE * 1.4;
const NPC_BOB_SPEED = 0.004;

export class OverworldScene extends Phaser.Scene {
  private actor: Actor = { x: 0, y: 0, width: 20, height: 14 };
  private facing: Facing = 'down';
  private player: PlayerState = sanitizePlayer(loadPlayer());
  private view!: ActorView;
  private fade!: Fade;
  private promptUi!: PromptUi;
  private dialogueUi!: DialogueUi;
  private hudCoins!: Phaser.GameObjects.Text;
  private npcViews: { def: NpcDef; graphics: Phaser.GameObjects.Graphics; phase: number }[] = [];
  private moveKeys = new Map<number, Phaser.Input.Keyboard.Key>();
  private currentSpot: InteractionSpot | undefined;

  constructor() {
    super('overworld');
  }
  init(data: { from?: string }) {
    // Returning home puts the player just outside the cabin door.
    if (data.from === 'home') {
      const door = WILLOWMERE.spots.find((spot) => spot.kind === 'door-home');
      this.actor =
        door !== undefined
          ? { x: door.x, y: door.y + CABIN_DOOR_CLEARANCE, width: 20, height: 14 }
          : { ...WILLOWMERE.spawn, width: 20, height: 14 };
    } else {
      this.actor = { ...WILLOWMERE.spawn, width: 20, height: 14 };
    }
    this.currentSpot = undefined;
  }
  create() {
    // A restarted scene reuses its instance: reset everything run-scoped.
    this.player = sanitizePlayer(loadPlayer());
    this.facing = 'down';
    this.moveKeys = new Map(
      [...MOVE_CODES.up, ...MOVE_CODES.down, ...MOVE_CODES.left, ...MOVE_CODES.right].map(
        (code) => [code, this.input.keyboard!.addKey(code)],
      ),
    );
    this.drawWorld();
    this.npcViews = WILLOWMERE.npcs.map((def, index) => ({
      def,
      graphics: this.add.graphics(),
      phase: index * 1.7,
    }));
    this.view = createActorView(this);
    this.view.graphics.setPosition(this.actor.x, this.actor.y);
    this.view.draw(0, 0, this.facing);
    this.drawHud();
    this.promptUi = createPromptUi(this);
    this.dialogueUi = createDialogueUi(this);
    this.fade = createFade(this);
    const camera = this.cameras.main;
    camera.setBounds(0, 0, WILLOWMERE.widthPx, WILLOWMERE.heightPx);
    camera.centerOn(this.actor.x, this.actor.y);
    camera.startFollow(this.view.graphics, true, 0.12, 0.12);
    this.input.keyboard!.addKey(INTERACT_KEY).on('down', () => this.onInteract());
    this.cameras.main.fadeIn(200);
  }
  update(time: number, delta: number) {
    if (this.fade.busy()) return;
    const input = readMoveInput((code) => this.moveKeys.get(code)?.isDown ?? false);
    if (this.dialogueUi.isOpen()) {
      // Conversation freezes the world; the spot prompt hides with it.
      this.promptUi.show(undefined);
      return;
    }
    this.actor = moveActor(this.actor, input, delta / 1000, WILLOWMERE.colliders, {
      width: WILLOWMERE.widthPx,
      height: WILLOWMERE.heightPx,
    });
    if (input.left || input.right || input.up || input.down) {
      if (input.left) this.facing = 'left';
      else if (input.right) this.facing = 'right';
      else if (input.up) this.facing = 'up';
      else this.facing = 'down';
    }
    this.view.graphics.setPosition(this.actor.x, this.actor.y);
    this.view.draw(0, 0, this.facing);
    for (const npc of this.npcViews) {
      const bob = Math.sin(time * NPC_BOB_SPEED + npc.phase) * 2;
      this.drawNpc(npc.graphics, npc.def, npc.def.y + bob);
    }
    this.currentSpot = nearestSpot(this.actor, WILLOWMERE.spots);
    this.promptUi.show(this.currentSpot);
  }
  private onInteract() {
    if (this.fade.busy()) return;
    // One press, one action: an open dialogue is advanced or closed, and the
    // same press never also triggers the spot underneath it.
    if (this.dialogueUi.isOpen()) {
      this.dialogueUi.advance();
      return;
    }
    const spot = this.currentSpot;
    if (!spot) return;
    if (spot.kind === 'fishing') {
      this.fade.to('fishing', { spotId: DEFAULT_SPOT_ID });
      return;
    }
    if (spot.kind === 'door-home') {
      this.fade.to('home', {});
      return;
    }
    if (spot.kind === 'door-venue') {
      this.dialogueUi.open('The Rusty Reel Hall', [
        'Dark tonight — the band arrives tomorrow. Come back soon.',
      ]);
      return;
    }
    if (spot.kind === 'npc') {
      const npc = this.npcNear(spot);
      const dialogue = npc !== undefined ? dialogueFor(npc.id) : undefined;
      if (npc !== undefined && dialogue !== undefined) {
        this.dialogueUi.open(npc.name, dialogue.lines);
      }
      return;
    }
    // 'guitar' and 'bed' spots only exist inside the cabin scene.
  }
  /** The npc standing closest to the spot, robust to spot id formats. */
  private npcNear(spot: InteractionSpot): NpcDef | undefined {
    let best: NpcDef | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const npc of WILLOWMERE.npcs) {
      const distance = Math.hypot(npc.x - spot.x, npc.y - spot.y);
      if (distance < bestDistance) {
        best = npc;
        bestDistance = distance;
      }
    }
    return best;
  }
  private drawNpc(graphics: Phaser.GameObjects.Graphics, npc: NpcDef, y: number) {
    graphics.clear();
    graphics.fillStyle(0x0c253d, 0.3);
    graphics.fillEllipse(npc.x, y + 1, 18, 7);
    graphics.fillStyle(npc.color, 1);
    graphics.fillRoundedRect(npc.x - 7, y - 19, 14, 14, 4);
    graphics.fillStyle(0xdfa878, 1);
    graphics.fillCircle(npc.x, y - 22, 5);
  }
  private drawHud() {
    this.add
      .text(16, 12, WILLOWMERE_NAME, {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#f4b942',
        fontStyle: 'bold',
      })
      .setScrollFactor(0)
      .setShadow(1, 1, '#081a2b', 2);
    this.hudCoins = this.add
      .text(944, 12, '', { fontFamily: 'monospace', fontSize: '13px', color: '#a9d6e5' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setShadow(1, 1, '#081a2b', 2);
    this.add
      .text(16, 578, 'WASD/arrows move · E interact', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#7fb2c4',
      })
      .setScrollFactor(0)
      .setShadow(1, 1, '#081a2b', 2);
    this.refreshHud();
  }
  private refreshHud() {
    this.hudCoins.setText(`${this.player.coins}c · ${equippedSummary(this.player)}`);
  }

  /** Base grass, flowers, water, paths, dock, fences, buildings and trees. */
  private drawWorld() {
    const g = this.add.graphics();
    const map = WILLOWMERE;
    g.fillStyle(0x5f8f4f, 1);
    g.fillRect(0, 0, map.widthPx, map.heightPx);
    // Flowers: tiny dots and diamonds in alternating warm colors.
    map.flowers.forEach((flower, index) => {
      g.fillStyle(index % 2 === 0 ? 0xf4b942 : 0xf7f3e3, 1);
      if (index % 2 === 0) {
        g.fillCircle(flower.x, flower.y, 2);
      } else {
        g.fillPoints(
          [
            { x: flower.x, y: flower.y - 3 },
            { x: flower.x + 3, y: flower.y },
            { x: flower.x, y: flower.y + 3 },
            { x: flower.x - 3, y: flower.y },
          ],
          true,
        );
      }
    });
    // Water: deep blue fills with a lighter top edge plus static wave arcs.
    for (const rect of map.water) {
      g.fillStyle(0x1b5e75, 1);
      g.fillRect(rect.x, rect.y, rect.width, rect.height);
      g.lineStyle(2, 0x3e89a0, 0.8);
      g.beginPath();
      g.moveTo(rect.x, rect.y + 1);
      g.lineTo(rect.x + rect.width, rect.y + 1);
      g.strokePath();
    }
    this.drawWaveArcs(g, map.water);
    // Paths: sandy tan with a slightly darker border.
    for (const rect of map.paths) {
      g.fillStyle(0xd6bd8f, 1);
      g.fillRect(rect.x, rect.y, rect.width, rect.height);
      g.lineStyle(1, 0xb59a67, 1);
      g.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
    // Dock planks: horizontal brown stripes with darker gaps.
    for (const rect of map.dock) {
      g.fillStyle(0x8a5a33, 1);
      g.fillRect(rect.x, rect.y, rect.width, rect.height);
      g.lineStyle(2, 0x6e4526, 1);
      for (let py = rect.y + 8; py < rect.y + rect.height; py += 8) {
        g.beginPath();
        g.moveTo(rect.x, py);
        g.lineTo(rect.x + rect.width, py);
        g.strokePath();
      }
    }
    // Fences: posts plus rails; a 2x2 square becomes the well landmark.
    for (const rect of map.fences) {
      g.fillStyle(0xa9744a, 1);
      g.fillRect(rect.x, rect.y + 10, rect.width, 5);
      g.fillRect(rect.x, rect.y + 20, rect.width, 5);
      g.fillStyle(0x6e4526, 1);
      for (let px = rect.x; px < rect.x + rect.width; px += TILE) {
        g.fillRect(px + 13, rect.y + 2, 6, 26);
      }
    }
    this.drawWell(g, map.fences);
    // Buildings: warm dark wood walls first, roofs above them after.
    for (const building of map.buildings) {
      for (const rect of building.rects) {
        g.fillStyle(0x7a4a2b, 1);
        g.fillRect(rect.x, rect.y, rect.width, rect.height);
      }
    }
    for (const building of map.buildings) {
      const bounds = buildingBounds(building);
      g.fillStyle(0xb0563a, 1);
      g.fillRoundedRect(bounds.left - 4, bounds.top - 20, bounds.width + 8, 26, 8);
    }
    for (const building of map.buildings) {
      if (building.name === '') continue;
      const door = this.doorNear(building);
      if (door === undefined) continue;
      this.add
        .text(door.x, door.y + TILE * 0.9, building.name, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#f7f3e3',
        })
        .setOrigin(0.5, 0)
        .setShadow(1, 1, '#081a2b', 2);
    }
    // Trees last so trunks and canopies overlap paths and water properly.
    for (const tree of map.trees) {
      g.fillStyle(0x6e4526, 1);
      g.fillRect(tree.x - 3, tree.y - 12, 6, 12);
      g.fillStyle(0x47734a, 1);
      g.fillCircle(tree.x, tree.y - 16, 11);
      g.fillStyle(0x5d8f57, 1);
      g.fillCircle(tree.x - 3, tree.y - 19, 9);
    }
  }
  /** Static lighter wave arcs inside the largest water rects. */
  private drawWaveArcs(g: Phaser.GameObjects.Graphics, water: readonly Rect[]) {
    const largest = [...water].sort((a, b) => b.width * b.height - a.width * a.height).slice(0, 3);
    g.lineStyle(2, 0x3e89a0, 0.5);
    for (const rect of largest) {
      for (let index = 0; index < 2; index += 1) {
        const cx = rect.x + rect.width * (0.3 + 0.25 * index);
        const cy = rect.y + rect.height * (0.4 + 0.25 * index);
        g.beginPath();
        g.arc(cx, cy, 26 + index * 14, Phaser.Math.DegToRad(160), Phaser.Math.DegToRad(20), false);
        g.strokePath();
      }
    }
  }
  /** A stone circle inside a 2x2 fence square, when the map has one. */
  private drawWell(g: Phaser.GameObjects.Graphics, fences: readonly Rect[]) {
    for (const rect of fences) {
      if (rect.width !== TILE * 2) continue;
      const below = fences.find(
        (other) =>
          other !== rect &&
          other.x === rect.x &&
          other.width === rect.width &&
          other.y === rect.y + rect.height,
      );
      if (below === undefined) continue;
      const cx = rect.x + rect.width / 2;
      const cy = rect.y + rect.height;
      g.fillStyle(0x9b9486, 1);
      g.fillCircle(cx, cy, 13);
      g.fillStyle(0x3d3730, 1);
      g.fillCircle(cx, cy, 8);
      return;
    }
  }
  /** The door spot (home or venue) nearest the building's center. */
  private doorNear(building: Building): InteractionSpot | undefined {
    const bounds = buildingBounds(building);
    const center = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    let best: InteractionSpot | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const spot of WILLOWMERE.spots) {
      if (spot.kind !== 'door-home' && spot.kind !== 'door-venue') continue;
      const distance = Math.hypot(spot.x - center.x, spot.y - center.y);
      if (distance < bestDistance) {
        best = spot;
        bestDistance = distance;
      }
    }
    return best;
  }
}

const buildingBounds = (building: Building) => {
  const top = Math.min(...building.rects.map((rect) => rect.y));
  const bottom = Math.max(...building.rects.map((rect) => rect.y + rect.height));
  const left = Math.min(...building.rects.map((rect) => rect.x));
  const right = Math.max(...building.rects.map((rect) => rect.x + rect.width));
  return { top, left, width: right - left, height: bottom - top };
};
