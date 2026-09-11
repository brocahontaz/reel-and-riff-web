export type BeatClock = { remaining: number; ready: boolean };

export const createBeatClock = (remaining = 0): BeatClock => ({ remaining, ready: false });

export const advanceBeat = (clock: BeatClock, delta: number, interval: number): BeatClock => {
  if (clock.ready) {
    const remaining = clock.remaining - delta;
    return remaining <= 0 ? { remaining: interval, ready: false } : { remaining, ready: true };
  }
  const remaining = clock.remaining - delta;
  return remaining <= 0 ? { remaining: 0.6, ready: true } : { remaining, ready: false };
};

export const consumeBeat = (clock: BeatClock, interval: number): BeatClock => ({
  remaining: interval,
  ready: false,
});
