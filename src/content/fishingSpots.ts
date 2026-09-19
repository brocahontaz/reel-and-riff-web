/**
 * Registry of fishable spots in the world. The fishing scene looks its spot
 * up here so water, names and taglines stay data-driven as new spots appear.
 */

export type FishingSpotInfo = { id: string; name: string; tagline: string };

export const FISHING_SPOTS: FishingSpotInfo[] = [
  { id: 'dock', name: 'Moonlit Cove', tagline: 'Calm water by the old dock' },
];

export const DEFAULT_SPOT_ID = 'dock';

export const fishingSpotById = (id: string): FishingSpotInfo | undefined =>
  FISHING_SPOTS.find((spot) => spot.id === id);
