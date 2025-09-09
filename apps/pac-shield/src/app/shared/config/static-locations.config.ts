import { latLngToCell } from 'h3-js';

/**
 * @file static-locations.config.ts
 * @description Centralized configuration for all static geographic locations in Operation Pacific Shield.
 * This file serves as the single source of truth for fixed positions like MOBs and FOSs,
 * ensuring consistency across the application.
 *
 * Yes, consolidating all static locations into a single file is an excellent idea.
 *
 * ### Benefits of this approach:
 * 1.  **Single Source of Truth**: Prevents data duplication and ensures that any updates
 *     to a location's coordinates or properties are reflected everywhere.
 * 2.  **Maintainability**: Simplifies updates. If a location's data changes, you only
 *     need to edit this one file.
 * 3.  **Type Safety**: Using a shared `StaticLocation` interface ensures that all location
 *     objects adhere to the same data structure, which is enforced by the TypeScript compiler.
 * 4.  **Performance**: Keeps static data out of the database, avoiding unnecessary queries
 *     for information that never changes during a game.
 * 5.  **Clarity**: Clearly separates dynamic game state (like player positions) from
 *     the static world geography.
 *
 * The H3 index is pre-computed here to align each location with the game's hex grid system,
 * which is crucial for visual rendering and game logic (e.g., movement, range).
 */

/**
 * Defines the common structure for any static, named location on the game map.
 */
export interface StaticLocation {
  /** Unique identifier (e.g., 'kadena', 'fos-01'). */
  id: string;
  /** Display name (e.g., 'Kadena Air Base'). */
  name: string;
  /** Geographic coordinates as [longitude, latitude]. */
  coordinates: [number, number];
  /** Pre-computed H3 index at the game's primary resolution for grid alignment. */
  h3Index: string;
  /** The country where the location is situated. */
  country: string;
  /** The type of location, used for rendering and rules. */
  type: 'MOB' | 'FOS';
  /** Initial capabilities or properties of the location. */
  capabilities?: string[];
}

// Game board's H3 resolution, used for all index calculations.
const H3_RESOLUTION = 1;

/**
 * A dictionary of all Main Operating Bases (MOBs).
 * These are the primary starting points for each team.
 */
export const MOB_LOCATIONS: Record<string, StaticLocation> = {
  kadena: {
    id: 'kadena',
    name: 'Kadena',
    coordinates: [127.768, 26.355],
    h3Index: latLngToCell(26.355, 127.768, H3_RESOLUTION),
    country: 'Japan',
    type: 'MOB',
  },
  andersen: {
    id: 'andersen',
    name: 'Andersen',
    coordinates: [144.829, 13.584],
    h3Index: latLngToCell(13.584, 144.829, H3_RESOLUTION),
    country: 'Guam',
    type: 'MOB',
  },
  yokota: {
    id: 'yokota',
    name: 'Yokota',
    coordinates: [139.348, 35.748],
    h3Index: latLngToCell(35.748, 139.348, H3_RESOLUTION),
    country: 'Japan',
    type: 'MOB',
  },
  osan: {
    id: 'osan',
    name: 'Osan',
    coordinates: [127.030, 37.091],
    h3Index: latLngToCell(37.091, 127.030, H3_RESOLUTION),
    country: 'South Korea',
    type: 'MOB',
  },
  jbphh: {
    id: 'jbphh',
    name: 'JBPHH',
    coordinates: [-157.92, 21.35], // Corrected longitude to be negative
    h3Index: latLngToCell(21.35, -157.92, H3_RESOLUTION),
    country: 'USA',
    type: 'MOB',
  },
};

/**
 * A dictionary of all Forward Operating Sites (FOSs).
 * These are potential contingency locations that can be established by players.
 * (This is a partial list for demonstration purposes)
 */
export const FOS_LOCATIONS: Record<string, StaticLocation> = {
  'fos-01': {
    id: 'fos-01',
    name: 'FOS 1 (Laoag)',
    coordinates: [120.53, 18.18],
    h3Index: latLngToCell(18.18, 120.53, H3_RESOLUTION),
    country: 'Philippines',
    type: 'FOS',
  },
  'fos-06': {
    id: 'fos-06',
    name: 'FOS 6 (Cagayan North)',
    coordinates: [121.73, 18.37],
    h3Index: latLngToCell(18.37, 121.73, H3_RESOLUTION),
    country: 'Philippines',
    type: 'FOS',
  },
  'fos-22': {
    id: 'fos-22',
    name: 'FOS 22 (Paya Lebar)',
    coordinates: [103.91, 1.36],
    h3Index: latLngToCell(1.36, 103.91, H3_RESOLUTION),
    country: 'Singapore',
    type: 'FOS',
  },
};

/**
 * A combined array of all static locations for easy iteration.
 */
export const ALL_STATIC_LOCATIONS: StaticLocation[] = [
  ...Object.values(MOB_LOCATIONS),
  ...Object.values(FOS_LOCATIONS),
];
