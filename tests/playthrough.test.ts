import { describe, expect, it } from 'vitest';
import { FISH } from '../src/content/fish';
import {
  beginCast,
  biteHooked,
  createFishingState,
  expireHook,
  finishCast,
  hookWindow,
  rhythmHit,
  setHook,
} from '../src/game/fishing';
import { biteDelay, pickFish, rollWeight } from '../src/game/encounter';
import { createRng } from '../src/game/rng';
import { catchReward } from '../src/game/rewards';
import { lureById, rodById, rodModifiers, sanitizePlayer } from '../src/game/tackle';
import {
  loadPlayer,
  saveCatch,
  savePlayer,
  type PlayerState,
} from '../src/persistence/playerStorage';
import { handleShopDigit, journalLines, playerChanged, shopLines } from '../src/ui/panels';

/**
 * A headless playthrough that wires the domain modules exactly the way the
 * Phaser scene does (cast -> wait -> spook -> bite -> hook -> riff -> reward
 * -> shop), verifying the full progression loop end to end.
 */
const memoryStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: () => null,
    removeItem: () => undefined,
    setItem: (key: string, value: string) => void values.set(key, value),
  } as Storage;
};

const reelUntilDone = (
  state: ReturnType<typeof setHook>,
  mods: { progressScale: number; missTensionScale: number },
) => {
  let current = state;
  while (current.phase === 'reeling') current = rhythmHit(current, 1, mods);
  return current;
};

describe('full playthrough', () => {
  it('runs the loop from first cast to upgraded gear', () => {
    const storage = memoryStorage();
    let player = sanitizePlayer(loadPlayer(storage));
    const rng = createRng(777);
    let state = createFishingState();

    // Start with starter gear and empty pockets.
    expect(player.rod).toBe('hickory');
    expect(player.lure).toBe('bare');
    expect(player.coins).toBe(0);

    // 1. Cast deep, get impatient, and spook the water.
    state = beginCast(state);
    state = finishCast(state, 0.9);
    const calmDelay = biteDelay(state.castPower, rng, false);
    const spookedDelay = biteDelay(state.castPower, rng, true);
    expect(spookedDelay).toBeGreaterThan(calmDelay);
    state = finishCast(state, 0.9); // re-cast after the spook

    // 2. Something bites: hook it inside the window.
    const fish = pickFish(state.castPower, rng, lureById(player.lure));
    const weight = rollWeight(fish, state.castPower, rng);
    expect(FISH.some((known) => known.id === fish.id)).toBe(true);
    state = biteHooked(state, fish, weight);
    expect(hookWindow(fish)).toBeGreaterThan(0);

    // 3. Wait too long and the fish is gone without paying anything.
    const coinsBefore = player.coins;
    const lost = expireHook(state);
    expect(lost.phase).toBe('lost');
    expect(player.coins).toBe(coinsBefore);

    // 4. Second encounter: hook in time and riff it in perfectly.
    state = biteHooked(createFishingState(), fish, weight);
    state = setHook(state);
    const finished = reelUntilDone(state, rodModifiers(rodById(player.rod)));
    expect(finished.phase).toBe('caught');
    expect(finished.misses).toBe(0);

    const result = catchReward(
      finished.fish!,
      finished.weight!,
      true,
      !player.species[finished.fish!.id],
      lureById(player.lure),
    );
    player = saveCatch(
      player,
      finished.fish!.id,
      finished.fish!.name,
      finished.weight!,
      result.coins,
      storage,
    );
    expect(player.coins).toBe(coinsBefore + result.coins);
    expect(player.catches).toBe(1);
    expect(player.species[finished.fish!.id]).toBe(1);
    expect(result.newSpecies).toBe(true);

    // 5. Keep fishing until the Driftwood Rod (55c) is affordable, then buy it.
    const fishOnce = () => {
      let next = finishCast(beginCast(createFishingState()), 0.9);
      biteDelay(next.castPower, rng, false);
      const nextFish = pickFish(next.castPower, rng, lureById(player.lure));
      const nextWeight = rollWeight(nextFish, next.castPower, rng);
      next = reelUntilDone(
        setHook(biteHooked(next, nextFish, nextWeight)),
        rodModifiers(rodById(player.rod)),
      );
      const nextResult = catchReward(
        next.fish!,
        next.weight!,
        next.misses === 0,
        !player.species[next.fish!.id],
        lureById(player.lure),
      );
      player = saveCatch(
        player,
        next.fish!.id,
        next.fish!.name,
        next.weight!,
        nextResult.coins,
        storage,
      );
    };
    for (let rounds = 0; player.coins < 55 && rounds < 12; rounds += 1) fishOnce();
    expect(player.coins).toBeGreaterThanOrEqual(55);
    expect(shopLines(player).join('\n')).toContain(`${player.coins}c`);
    const purchase = handleShopDigit(player, 2);
    expect(playerChanged(player, purchase.player)).toBe(true);
    player = savePlayer(purchase.player, storage);
    expect(player.rod).toBe('driftwood');
    expect(loadPlayer(storage)).toEqual(player);

    // 6. The upgraded rod lands the next fish in fewer beats.
    const next = biteHooked(createFishingState(), FISH[0], 1);
    const withDriftwood = reelUntilDone(setHook(next), rodModifiers(rodById(player.rod)));
    expect(withDriftwood.phase).toBe('caught');
    const driftwoodBeats = withDriftwood.beats;
    const baseline = reelUntilDone(
      setHook(biteHooked(createFishingState(), FISH[0], 1)),
      rodModifiers(rodById('hickory')),
    );
    expect(driftwoodBeats).toBeLessThan(baseline.beats);

    const repeat = catchReward(
      withDriftwood.fish!,
      withDriftwood.weight!,
      false,
      !player.species[withDriftwood.fish!.id],
    );
    expect(repeat.newSpecies).toBe(false);
    player = saveCatch(
      player,
      withDriftwood.fish!.id,
      withDriftwood.fish!.name,
      withDriftwood.weight!,
      repeat.coins,
      storage,
    );

    // 7. The journal reflects everything discovered so far.
    const journal = journalLines(player).join('\n');
    const discovered = Object.keys(player.species).length;
    expect(journal).toContain(`${discovered}/${FISH.length} DISCOVERED`);
    expect(discovered).toBeGreaterThanOrEqual(1);
    expect(shopLines(player).join('\n')).toContain('EQUIPPED');
  });

  it('starts a brand-new player with starter gear after sanitising', () => {
    const fresh: PlayerState = sanitizePlayer(loadPlayer(undefined));
    expect(fresh.rods).toEqual(['hickory']);
    expect(fresh.lures).toEqual(['bare']);
    expect(fresh.rod).toBe('hickory');
    expect(fresh.lure).toBe('bare');
    expect(fresh.coins).toBe(0);
    expect(fresh.catches).toBe(0);
  });
});
