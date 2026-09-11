import { describe, expect, it, vi } from 'vitest';
import { playOutcome, playRiff, resumeAudio } from '../src/audio/riffAudio';

describe('riff audio boundary', () => {
  it('does not leak a rejected browser resume promise', async () => {
    const resume = vi.fn(() => Promise.reject(new Error('autoplay blocked')));
    resumeAudio({ state: 'suspended', resume });
    await Promise.resolve();
    expect(resume).toHaveBeenCalledOnce();
  });

  it('is safe when Web Audio is unavailable', () => {
    expect(() => playRiff(true)).not.toThrow();
  });

  it('schedules an outcome when Web Audio is available', () => {
    const oscillators: Array<{
      frequency: { value: number };
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];
    const gains: Array<{
      gain: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
    }> = [];
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
      createGain: vi.fn(() => {
        const gain = {
          gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn(() => ({ destination: true })),
        };
        gains.push(gain);
        return gain;
      }),
      resume: vi.fn(() => Promise.resolve()),
    };
    vi.stubGlobal(
      'AudioContext',
      vi.fn(() => fakeContext),
    );
    expect(() => playOutcome(true)).not.toThrow();
    expect(fakeContext.createOscillator).toHaveBeenCalledTimes(3);
    expect(oscillators.map(({ frequency }) => frequency.value)).toEqual([392, 494, 587]);
    expect(oscillators.map(({ start }) => start.mock.calls[0][0])).toEqual([0, 0.12, 0.24]);
    expect(oscillators.map(({ stop }) => stop.mock.calls[0][0])).toEqual([0.22, 0.34, 0.46]);
    expect(gains.every(({ gain }) => gain.setValueAtTime.mock.calls.length === 1)).toBe(true);
    expect(
      gains.every(({ gain }) => gain.exponentialRampToValueAtTime.mock.calls.length === 2),
    ).toBe(true);
    vi.unstubAllGlobals();
  });
});
