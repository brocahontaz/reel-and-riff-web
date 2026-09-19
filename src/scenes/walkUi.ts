/**
 * Shared screen-space UI for the walking scenes: camera fade transitions,
 * interaction prompts and the dialogue box. Scenes stay thin — input, timing
 * and dispatch live in the scene, look and layout live here.
 */

import Phaser from 'phaser';
import {
  advanceDialogue,
  createDialogue,
  dialogueDone,
  dialogueLine,
  wrapLine,
  type Dialogue,
} from '../ui/dialogue';
import { promptFor } from '../game/interactions';
import type { InteractionSpot } from '../world/worldMap';

export const VIEW = { width: 960, height: 600 };

export const DIALOGUE_PANEL = { x: 30, y: 425, width: 900, height: 150 };
const DIALOGUE_WRAP = 860;

export type Fade = {
  busy: () => boolean;
  /** Fade out, then start the target scene once. Re-entry while busy is ignored. */
  to: (sceneKey: string, data?: Record<string, unknown>) => void;
};

export const createFade = (scene: Phaser.Scene): Fade => {
  let busy = false;
  return {
    busy: () => busy,
    to: (sceneKey, data) => {
      if (busy) return;
      busy = true;
      scene.cameras.main.fadeOut(200, 8, 26, 43);
      scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        scene.scene.start(sceneKey, data ?? {});
      });
    },
  };
};

const MONO = 'monospace';

export type PromptUi = {
  /** Show the floating prompt above the spot plus the bottom HUD line. */
  show: (spot: InteractionSpot | undefined) => void;
};

/** Floating spot prompt (world space) and the bottom-center HUD line. */
export const createPromptUi = (scene: Phaser.Scene): PromptUi => {
  const floating = scene.add
    .text(0, 0, '', { fontFamily: MONO, fontSize: '13px', color: '#f7f3e3' })
    .setOrigin(0.5, 1)
    .setShadow(1, 1, '#081a2b', 2)
    .setVisible(false);
  const hud = scene.add
    .text(VIEW.width / 2, VIEW.height - 20, '', {
      fontFamily: MONO,
      fontSize: '13px',
      color: '#f4b942',
    })
    .setOrigin(0.5, 1)
    .setScrollFactor(0);
  return {
    show: (spot) => {
      const text = promptFor(spot);
      floating.setText(text).setVisible(spot !== undefined);
      if (spot) floating.setPosition(spot.x, spot.y - 22);
      hud.setText(text);
    },
  };
};

export type DialogueUi = {
  open: (speaker: string, lines: string[]) => void;
  /** Advance one page; closes the box once the dialogue is done. */
  advance: () => void;
  isOpen: () => boolean;
};

/** Bottom dialogue panel in the shop-panel style: dark box, amber border. */
export const createDialogueUi = (scene: Phaser.Scene): DialogueUi => {
  let current: Dialogue | undefined;
  const panel = scene.add.graphics().setVisible(false);
  const speaker = scene.add
    .text(DIALOGUE_PANEL.x + 24, DIALOGUE_PANEL.y + 12, '', {
      fontFamily: MONO,
      fontSize: '13px',
      color: '#f4b942',
      fontStyle: 'bold',
    })
    .setVisible(false);
  const body = scene.add
    .text(DIALOGUE_PANEL.x + 24, DIALOGUE_PANEL.y + 36, '', {
      fontFamily: MONO,
      fontSize: '13px',
      color: '#f7f3e3',
      lineSpacing: 6,
    })
    .setVisible(false);
  const hint = scene.add
    .text(
      DIALOGUE_PANEL.x + DIALOGUE_PANEL.width - 24,
      DIALOGUE_PANEL.y + DIALOGUE_PANEL.height - 22,
      '',
      {
        fontFamily: MONO,
        fontSize: '11px',
        color: '#7fb2c4',
      },
    )
    .setOrigin(1, 0)
    .setVisible(false);

  const render = () => {
    if (!current) {
      panel.clear().setVisible(false);
      speaker.setVisible(false);
      body.setVisible(false);
      hint.setVisible(false);
      return;
    }
    panel
      .clear()
      .fillStyle(0x0c253d, 0.94)
      .fillRoundedRect(
        DIALOGUE_PANEL.x,
        DIALOGUE_PANEL.y,
        DIALOGUE_PANEL.width,
        DIALOGUE_PANEL.height,
        12,
      )
      .lineStyle(2, 0xf4b942, 0.9)
      .strokeRoundedRect(
        DIALOGUE_PANEL.x,
        DIALOGUE_PANEL.y,
        DIALOGUE_PANEL.width,
        DIALOGUE_PANEL.height,
        12,
      );
    panel.setVisible(true);
    speaker.setText(current.speaker).setVisible(true);
    body.setText(wrapLine(dialogueLine(current), DIALOGUE_WRAP).join('\n')).setVisible(true);
    hint.setText(dialogueDone(current) ? 'E — close' : 'E — continue').setVisible(true);
  };

  return {
    open: (name, lines) => {
      current = createDialogue(name, lines);
      render();
    },
    advance: () => {
      if (!current) return;
      const next = advanceDialogue(current);
      if (dialogueDone(next)) {
        current = undefined;
      } else {
        current = next;
      }
      render();
    },
    isOpen: () => current !== undefined,
  };
};
