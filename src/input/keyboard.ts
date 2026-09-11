import type Phaser from 'phaser';

export const FISHING_KEYS = { space: 32, enter: 13 } as const;
export const PANEL_KEYS = { shop: 83, journal: 67, escape: 27 } as const;
export const DIGIT_KEYS = { start: 49, count: 9 } as const;

export const bindFishingAction = (
  keyboard: Phaser.Input.Keyboard.KeyboardPlugin,
  action: () => void,
) => {
  keyboard.addKey(FISHING_KEYS.space).on('down', action);
  keyboard.addKey(FISHING_KEYS.enter).on('down', action);
};

export type PanelHandlers = {
  onShop: () => void;
  onJournal: () => void;
  onClose: () => void;
  onDigit: (digit: number) => void;
};

/** Binds S, C, Escape and the 1-9 digit row for shop and journal panels. */
export const bindPanelKeys = (
  keyboard: Phaser.Input.Keyboard.KeyboardPlugin,
  handlers: PanelHandlers,
) => {
  keyboard.addKey(PANEL_KEYS.shop).on('down', handlers.onShop);
  keyboard.addKey(PANEL_KEYS.journal).on('down', handlers.onJournal);
  keyboard.addKey(PANEL_KEYS.escape).on('down', handlers.onClose);
  for (let digit = 1; digit <= DIGIT_KEYS.count; digit += 1) {
    keyboard.addKey(DIGIT_KEYS.start + digit - 1).on('down', () => handlers.onDigit(digit));
  }
};
