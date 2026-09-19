import { describe, expect, it } from 'vitest';
import {
  CHAR_WIDTH,
  advanceDialogue,
  createDialogue,
  dialogueDone,
  dialogueLine,
  wrapLine,
} from '../src/ui/dialogue';

describe('dialogue flow', () => {
  it('starts on the first line and not done', () => {
    const dialogue = createDialogue('Old Marlin', ['hello', 'young angler']);
    expect(dialogue.speaker).toBe('Old Marlin');
    expect(dialogueLine(dialogue)).toBe('hello');
    expect(dialogueDone(dialogue)).toBe(false);
  });

  it('advances line by line and marks done at the end', () => {
    let dialogue = createDialogue('June', ['one', 'two', 'three']);
    dialogue = advanceDialogue(dialogue);
    expect(dialogueLine(dialogue)).toBe('two');
    dialogue = advanceDialogue(dialogue);
    expect(dialogueLine(dialogue)).toBe('three');
    expect(dialogueDone(dialogue)).toBe(false);
    dialogue = advanceDialogue(dialogue);
    expect(dialogueDone(dialogue)).toBe(true);
    expect(dialogueLine(dialogue)).toBe('');
  });

  it('stays done when advanced again instead of looping', () => {
    const dialogue = advanceDialogue(
      advanceDialogue(advanceDialogue(createDialogue('June', ['only']))),
    );
    expect(dialogueDone(dialogue)).toBe(true);
    expect(dialogue.index).toBe(1);
    expect(dialogueLine(advanceDialogue(dialogue))).toBe('');
  });

  it('does not mutate the dialogue it advances', () => {
    const before = createDialogue('Old Marlin', ['a', 'b']);
    const after = advanceDialogue(before);
    expect(before.index).toBe(0);
    expect(after.index).toBe(1);
  });
});

describe('wrapLine', () => {
  it('exposes the monospace char width used for measuring', () => {
    expect(CHAR_WIDTH).toBeGreaterThan(0);
  });

  it('keeps short text on one line', () => {
    expect(wrapLine('short line', 80)).toEqual(['short line']);
  });

  it('wraps greedily at word boundaries', () => {
    // 72px / 7.2 = 10 chars per line: 'hello world' is 11 chars.
    expect(wrapLine('hello world', 10 * CHAR_WIDTH)).toEqual(['hello', 'world']);
    expect(wrapLine('aa bb cc dd', 5 * CHAR_WIDTH)).toEqual(['aa bb', 'cc dd']);
  });

  it('hard-splits words longer than the width', () => {
    expect(wrapLine('abcdefghij', 5 * CHAR_WIDTH)).toEqual(['abcde', 'fghij']);
    expect(wrapLine('aa bcdefghij', 5 * CHAR_WIDTH)).toEqual(['aa', 'bcdef', 'ghij']);
  });

  it('returns a single empty line for empty text', () => {
    expect(wrapLine('', 80)).toEqual(['']);
  });
});
