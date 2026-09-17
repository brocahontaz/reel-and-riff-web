import type { Fish, FishBehavior } from '../content/fish';

export const FISH_INFO_WIDTH = 270;

const BEHAVIOR_HINTS: Record<FishBehavior, string> = {
  steady: 'steady pulse',
  darting: 'speed bursts — play the fast ♪!',
  tricky: 'silent rests — hold on the ·',
};

export const formatFishInfo = (fish: Fish): string =>
  `${fish.name}  •  ${fish.rarity.toUpperCase()}\nDIFFICULTY ${'★'.repeat(fish.difficulty)}  •  ${BEHAVIOR_HINTS[fish.behavior]}`;
