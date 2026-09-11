import { describe, expect, it } from 'vitest';
import { FISH } from '../src/content/fish';
import { MOONLIT_COVE } from '../src/content/location';
import { advanceBeat, consumeBeat, createBeatClock } from '../src/game/beat';
import {
  beginCast,
  createFishingState,
  finishCast,
  rhythmHit,
  startReel,
} from '../src/game/fishing';
import { fishingVisualForPhase } from '../src/ui/fishingVisuals';
import { FISH_INFO_WIDTH, formatFishInfo } from '../src/ui/fishInfo';

describe('fishing loop rules', () => {
  it('defines the first location and its keyboard controls', () => {
    expect(MOONLIT_COVE).toEqual({
      name: 'MOONLIT COVE',
      controls: 'SPACE / ENTER  •  CAST + PLAY',
    });
  });

  it('shows the line while fishing and hides it between casts', () => {
    expect(fishingVisualForPhase('ready').visible).toBe(false);
    expect(fishingVisualForPhase('casting')).toMatchObject({ visible: true, targetX: 400 });
    expect(fishingVisualForPhase('waiting')).toMatchObject({ visible: true, targetY: 420 });
    expect(fishingVisualForPhase('reeling')).toMatchObject({ visible: true, targetX: 700 });
    expect(fishingVisualForPhase('caught').visible).toBe(false);
    expect(fishingVisualForPhase('lost').visible).toBe(false);
  });

  it('formats catch information with rarity, difficulty, and behavior', () => {
    expect(formatFishInfo(FISH[2])).toBe('Golden Koi  •  RARE\nDIFFICULTY ★★★  •  tricky');
    expect(FISH_INFO_WIDTH).toBeLessThanOrEqual(320);
  });

  it('allows only one input per rhythm pulse', () => {
    const ready = advanceBeat(createBeatClock(0.1), 0.1, 1);
    expect(ready.ready).toBe(true);
    const consumed = consumeBeat(ready, 1);
    expect(consumed.ready).toBe(false);
    expect(advanceBeat(consumed, 0.01, 1).ready).toBe(false);
  });

  it('closes an unanswered timing window before the next pulse', () => {
    const ready = advanceBeat(createBeatClock(0.1), 0.1, 1);
    expect(advanceBeat(ready, 0.61, 1).ready).toBe(false);
    expect(advanceBeat(advanceBeat(ready, 0.61, 1), 1, 1).ready).toBe(true);
  });

  it('moves from ready to waiting with bounded cast power', () => {
    const casting = beginCast(createFishingState());
    expect(finishCast(casting, 1.4)).toMatchObject({ phase: 'waiting', castPower: 1 });
    expect(finishCast(casting, Number.NaN).castPower).toBe(0);
  });
  it('rewards an on-beat riff more than a miss', () => {
    const base = startReel(finishCast(beginCast(createFishingState()), 0.5), FISH[0], 0.8);
    expect(rhythmHit(base, 1).progress).toBeGreaterThan(rhythmHit(base, 0.2).progress);
    expect(rhythmHit(base, 0.2).tension).toBeGreaterThan(rhythmHit(base, 1).tension);
  });
  it('can catch every fish through accurate beats and lose to tension', () => {
    for (const fish of FISH) {
      let caught = startReel(createFishingState(), fish, fish.minWeight);
      for (let i = 0; i < 30 && caught.phase === 'reeling'; i++) caught = rhythmHit(caught, 1);
      expect(caught.phase).toBe('caught');
    }
    const hard = startReel(createFishingState(), FISH[2], 4);
    let lost = hard;
    for (let i = 0; i < 8; i++) lost = rhythmHit(lost, 0);
    expect(lost.phase).toBe('lost');
  });

  it('supports a complete cast-to-catch loop', () => {
    const cast = finishCast(beginCast(createFishingState()), 0.75);
    expect(cast.phase).toBe('waiting');
    let encounter = startReel(cast, FISH[1], 3.1);
    while (encounter.phase === 'reeling') encounter = rhythmHit(encounter, 1);
    expect(encounter).toMatchObject({ phase: 'caught', fish: FISH[1], weight: 3.1 });
  });
});
