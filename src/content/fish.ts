export type FishBehavior = 'steady' | 'darting' | 'tricky';
export type Rarity = 'common' | 'uncommon' | 'rare';

export type Fish = {
  id: string;
  name: string;
  rarity: Rarity;
  difficulty: number;
  minWeight: number;
  maxWeight: number;
  behavior: FishBehavior;
  color: number;
  /** Base coin value before weight, riff and discovery bonuses. */
  value: number;
  description: string;
};

export const FISH: Fish[] = [
  {
    id: 'bluegill',
    name: 'Bluegill',
    rarity: 'common',
    difficulty: 1,
    minWeight: 0.4,
    maxWeight: 1.2,
    behavior: 'steady',
    color: 0x5cc8d7,
    value: 6,
    description: 'A calm first catch.',
  },
  {
    id: 'bass',
    name: 'River Bass',
    rarity: 'uncommon',
    difficulty: 2,
    minWeight: 1.8,
    maxWeight: 4.5,
    behavior: 'darting',
    color: 0x8ed081,
    value: 14,
    description: 'Quick on the line, quick on its fins.',
  },
  {
    id: 'golden-koi',
    name: 'Golden Koi',
    rarity: 'rare',
    difficulty: 3,
    minWeight: 3.5,
    maxWeight: 8,
    behavior: 'tricky',
    color: 0xf4b942,
    value: 32,
    description: 'A shimmering test of rhythm.',
  },
];
