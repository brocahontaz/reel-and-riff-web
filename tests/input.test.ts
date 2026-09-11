import { describe, expect, it, vi } from 'vitest';
import { bindFishingAction, FISHING_KEYS } from '../src/input/keyboard';

describe('keyboard input boundary', () => {
  it('binds Space and Enter to the same fishing action', () => {
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
});
