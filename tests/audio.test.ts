import { describe, expect, it, vi } from 'vitest';
import { playBeat, playCoins, playOutcome, playRiff, resumeAudio } from '../src/audio/riffAudio';

describe('riff audio boundary', () => {
  it('does not leak a rejected browser resume promise', async () => {
    const resume = vi.fn(() => Promise.reject(new Error('autoplay blocked')));
    resumeAudio({ state: 'suspended', resume });
    await Promise.resolve();
    expect(resume).toHaveBeenCalledOnce();
  });

  it('is safe when Web Audio is unavailable', () => {
    expect(() => playRiff(true)).not.toThrow();
    expect(() => playCoins()).not.toThrow();
    expect(() => playBeat('note')).not.toThrow();
    expect(() => playBeat('burst')).not.toThrow();
    expect(() => playBeat('rest')).not.toThrow();
  });

  it('schedules combo riffs, coins, outcomes and pulse ticks in order', () => {
    const oscillators: Array<{ frequency: { value: number } }> = [];
    const fakeContext = {
      currentTime: 0,
      state: 'running',
      destination: {},
      createOscillator: vi.fn(() => {
        const oscillator = {
          frequency: { value: 0 },
          connect: vi.fn(() => oscillator),
          start: vi.fn(),
          stop: vi.fn(),
        };
        oscillators.push(oscillator);
        return oscillator;
      }),
      createGain: vi.fn(() => ({
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(() => ({ destination: true })),
      })),
      resume: vi.fn(() => Promise.resolve()),
    };
    vi.stubGlobal(
      'AudioContext',
      vi.fn(() => fakeContext),
    );

    playRiff(true, 2); // riff climbs two semitones on a combo of two
    playRiff(false, 5); // a miss stays a single dull note
    playCoins(); // two-note coin sparkle
    playOutcome(true); // three-note catch jingle
    playRiff(true, 50); // combo pitch is capped
    playBeat('note'); // one pulse tick per reeling beat kind
    playBeat('burst');
    playBeat('rest');

    const comboRoot = 392 * Math.pow(2, 2 / 12);
    const cappedRoot = 392 * Math.pow(2, 8 / 12);
    expect(oscillators.map(({ frequency }) => frequency.value)).toEqual([
      comboRoot,
      comboRoot * 1.3346,
      233,
      880,
      1318,
      392,
      494,
      587,
      cappedRoot,
      cappedRoot * 1.3346,
      523,
      659,
      196,
    ]);
    vi.unstubAllGlobals();
  });
});
