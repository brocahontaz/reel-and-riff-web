export type Rod = {
  id: string;
  name: string;
  cost: number;
  /** Multiplier on progress earned per on-beat riff. */
  progressPerHit: number;
  /** Multiplier on tension gained from sloppy beats. */
  missTensionScale: number;
  description: string;
};

export type Lure = {
  id: string;
  name: string;
  cost: number;
  /** Multiplier on the deep-water rare-fish odds. */
  rareWeight: number;
  /** Flat coins added to every landed catch. */
  coinBonus: number;
  description: string;
};

export const RODS: Rod[] = [
  {
    id: 'hickory',
    name: 'Hickory Pole',
    cost: 0,
    progressPerHit: 1,
    missTensionScale: 1,
    description: 'Grandpa-approved. Gets the job done.',
  },
  {
    id: 'driftwood',
    name: 'Driftwood Rod',
    cost: 55,
    progressPerHit: 1.25,
    missTensionScale: 0.8,
    description: 'Smooth drag keeps sloppy beats from snapping the line.',
  },
  {
    id: 'flyrod',
    name: 'Moonfly Rod',
    cost: 140,
    progressPerHit: 1.5,
    missTensionScale: 0.6,
    description: 'Every riff lands twice as deep in the fight.',
  },
];

export const LURES: Lure[] = [
  {
    id: 'bare',
    name: 'Bare Hook',
    cost: 0,
    rareWeight: 1,
    coinBonus: 0,
    description: 'Honest and unadorned.',
  },
  {
    id: 'spinner',
    name: 'Shiny Spinner',
    cost: 70,
    rareWeight: 2.2,
    coinBonus: 0,
    description: 'Deep-water rarities notice the flash.',
  },
  {
    id: 'moonfly',
    name: 'Moonfly Lure',
    cost: 160,
    rareWeight: 3.5,
    coinBonus: 3,
    description: 'Looks like a moonlight moth. Pays a little extra, too.',
  },
];

export const STARTER_ROD_ID = 'hickory';
export const STARTER_LURE_ID = 'bare';
