import type Phaser from 'phaser';

export const FISHING_KEYS = { space: 32, enter: 13 } as const;

export const bindFishingAction = (
  keyboard: Phaser.Input.Keyboard.KeyboardPlugin,
  action: () => void,
) => {
  keyboard.addKey(FISHING_KEYS.space).on('down', action);
  keyboard.addKey(FISHING_KEYS.enter).on('down', action);
};
