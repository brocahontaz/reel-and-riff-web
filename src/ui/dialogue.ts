/**
 * Pure dialogue state machine plus greedy word wrap for the dialogue box.
 */

export type Dialogue = { speaker: string; lines: string[]; index: number };

/** px per character for 13px monospace, used to measure wrap widths. */
export const CHAR_WIDTH = 7.2;

export const createDialogue = (speaker: string, lines: string[]): Dialogue => ({
  speaker,
  lines,
  index: 0,
});

/** The current line, or '' once the dialogue is exhausted. */
export const dialogueLine = (dialogue: Dialogue): string =>
  dialogue.index < dialogue.lines.length ? dialogue.lines[dialogue.index] : '';

export const dialogueDone = (dialogue: Dialogue): boolean =>
  dialogue.index >= dialogue.lines.length;

/** Step to the next line; further advances stay done instead of looping. */
export const advanceDialogue = (dialogue: Dialogue): Dialogue => ({
  ...dialogue,
  index: Math.min(dialogue.index + 1, dialogue.lines.length),
});

/**
 * Greedy word wrap for the dialogue box. Words longer than the width are
 * hard-split across lines. Returns at least one line, possibly empty.
 */
export const wrapLine = (text: string, maxWidth: number): string[] => {
  const maxChars = Math.max(1, Math.floor(maxWidth / CHAR_WIDTH));
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current.length > 0) {
      const candidate = `${current} ${word}`;
      if (candidate.length <= maxChars) {
        current = candidate;
        continue;
      }
      lines.push(current);
      current = '';
    }
    let remaining = word;
    while (remaining.length > maxChars) {
      lines.push(remaining.slice(0, maxChars));
      remaining = remaining.slice(maxChars);
    }
    current = remaining;
  }
  if (current.length > 0 || lines.length === 0) lines.push(current);
  return lines;
};
