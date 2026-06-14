/**
 * Geographic helpers for proximity scoring. Pure and dependency-free.
 */

import type { GeoPoint } from './types';
import { DISTANCE_DECAY_KM } from './weights';

const EARTH_RADIUS_KM = 6371;

const toRadians = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance between two lat/lng points, in kilometers. */
export const haversineKm = (a: GeoPoint, b: GeoPoint): number => {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
};

/**
 * Exponential distance decay: 1.0 at 0 km, ~0.37 at DISTANCE_DECAY_KM, trending
 * toward 0 far away. Smooth so small distance differences nudge ranking gently.
 */
export const distanceDecay = (km: number): number => Math.exp(-km / DISTANCE_DECAY_KM);
