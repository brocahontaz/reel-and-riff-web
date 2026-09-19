/**
 * Practice songs for the cabin guitar mat. Patterns are built from rhythm
 * step kinds only; phase 2 drives them through game/guitar.ts.
 */

import type { RhythmStep } from '../game/rhythm';
import { isPlayable } from '../game/rhythm';

export type Song = {
  id: string;
  name: string;
  /** Seconds between beats, kept between 0.5 and 1.0 so songs stay human. */
  interval: number;
  /** How many times the pattern repeats in one practice run. */
  loops: number;
  steps: readonly RhythmStep[];
  description: string;
};

export const SONGS: Song[] = [
  {
    id: 'lakeside',
    name: 'Lakeside Lullaby',
    interval: 0.9,
    loops: 2,
    steps: ['note', 'note', 'rest', 'note', 'note', 'note', 'rest', 'note'],
    description: 'Gentle notes drifting over calm water.',
  },
  {
    id: 'campfire',
    name: 'Campfire Chug',
    interval: 0.6,
    loops: 2,
    steps: ['note', 'note', 'burst', 'note', 'burst', 'note', 'note', 'burst'],
    description: 'Driving chords around the fire.',
  },
  {
    id: 'foxglove',
    name: 'Foxglove Waltz',
    interval: 0.8,
    loops: 3,
    steps: ['note', 'rest', 'note', 'note', 'rest', 'note', 'note', 'rest', 'note', 'note'],
    description: 'A swaying tune in three-four time.',
  },
];

export const songById = (id: string): Song | undefined => SONGS.find((song) => song.id === id);

/** Resolved steps in one full practice run: pattern length times loops. */
export const totalSteps = (song: Song): number => song.steps.length * song.loops;

/** The steps of one loop that ask for input (notes and bursts, not rests). */
export const playableSteps = (song: Song): RhythmStep[] =>
  song.steps.filter((step) => isPlayable(step));
