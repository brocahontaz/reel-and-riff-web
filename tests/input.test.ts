import { describe, expect, it, vi } from 'vitest';
import {
  bindFishingAction,
  bindPanelKeys,
  DIGIT_KEYS,
  FISHING_KEYS,
  PANEL_KEYS,
} from '../src/input/keyboard';

const fakeKeyboard = () => {
  const handlers = new Map<number, () => void>();
  const events = new Map<number, string>();
  const keyboard = {
    addKey: vi.fn((code: number) => ({
      on: vi.fn((event: string, handler: () => void) => {
        events.set(code, event);
        handlers.set(code, handler);
      }),
    })),
  } as unknown as Phaser.Input.Keyboard.KeyboardPlugin;
  return { handlers, events, keyboard };
};

describe('keyboard input boundary', () => {
  it('binds Space and Enter to the same fishing action', () => {
    const { handlers, events, keyboard } = fakeKeyboard();
    const action = vi.fn();

    bindFishingAction(keyboard, action);

    expect(keyboard.addKey).toHaveBeenNthCalledWith(1, FISHING_KEYS.space);
    expect(keyboard.addKey).toHaveBeenNthCalledWith(2, FISHING_KEYS.enter);
    expect(events.get(FISHING_KEYS.space)).toBe('down');
    expect(events.get(FISHING_KEYS.enter)).toBe('down');
    handlers.get(FISHING_KEYS.space)?.();
    handlers.get(FISHING_KEYS.enter)?.();
    expect(action).toHaveBeenCalledTimes(2);
  });

  it('binds shop, journal, escape and the digit row to panel handlers', () => {
    const { handlers, events, keyboard } = fakeKeyboard();
    const panel = { onShop: vi.fn(), onJournal: vi.fn(), onClose: vi.fn(), onDigit: vi.fn() };

    bindPanelKeys(keyboard, panel);

    expect(events.get(PANEL_KEYS.shop)).toBe('down');
    expect(events.get(PANEL_KEYS.journal)).toBe('down');
    expect(events.get(PANEL_KEYS.escape)).toBe('down');

    handlers.get(PANEL_KEYS.shop)?.();
    handlers.get(PANEL_KEYS.journal)?.();
    handlers.get(PANEL_KEYS.escape)?.();
    expect(panel.onShop).toHaveBeenCalledOnce();
    expect(panel.onJournal).toHaveBeenCalledOnce();
    expect(panel.onClose).toHaveBeenCalledOnce();

    handlers.get(DIGIT_KEYS.start)?.(); // "1"
    handlers.get(DIGIT_KEYS.start + 5)?.(); // "6"
    expect(panel.onDigit).toHaveBeenNthCalledWith(1, 1);
    expect(panel.onDigit).toHaveBeenNthCalledWith(2, 6);
  });
});
