/**
 * Proximity interactions: which spot is the player close enough to use, and
 * what should the HUD prompt say.
 */

import type { Vec2 } from './movement';
import type { InteractionKind, InteractionSpot } from '../world/worldMap';
import { SPOT_LABELS } from '../world/worldMap';

/** The closest spot whose center lies within its own radius; undefined when none. */
export const nearestSpot = (
  from: Vec2,
  spots: readonly InteractionSpot[],
): InteractionSpot | undefined => {
  let best: InteractionSpot | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const spot of spots) {
    const distance = Math.hypot(spot.x - from.x, spot.y - from.y);
    if (distance <= spot.radius && distance < bestDistance) {
      best = spot;
      bestDistance = distance;
    }
  }
  return best;
};

/** 'E — Talk' style prompt text; '' when there is nothing to interact with. */
export const promptFor = (
  spot: InteractionSpot | undefined,
  labels?: Partial<Record<InteractionKind, string>>,
): string => {
  if (!spot) return '';
  const label = labels?.[spot.kind] ?? (spot.label || SPOT_LABELS[spot.kind]);
  return `E — ${label}`;
};
