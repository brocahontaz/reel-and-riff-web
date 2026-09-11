export type FishBehavior = 'steady' | 'darting' | 'tricky';

export type Fish = {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare';
  difficulty: number;
  minWeight: number;
  maxWeight: number;
  behavior: FishBehavior;
  color: number;
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
    description: 'A shimmering test of rhythm.',
  },
];
