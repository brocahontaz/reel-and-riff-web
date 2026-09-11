import type { Fish } from '../content/fish';

export const FISH_INFO_WIDTH = 270;

export const formatFishInfo = (fish: Fish): string =>
  `${fish.name}  •  ${fish.rarity.toUpperCase()}\nDIFFICULTY ${'★'.repeat(fish.difficulty)}  •  ${fish.behavior}`;
