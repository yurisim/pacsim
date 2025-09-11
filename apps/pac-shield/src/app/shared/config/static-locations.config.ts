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
  /** Color code for FOS locations to indicate strategic value or status. */
  color?: 'green' | 'yellow' | 'red';
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
  // Japan
  'fos-01': {
    id: 'fos-01',
    name: 'FOS 1',
    coordinates: [139.5, 35.5],
    h3Index: latLngToCell(35.5, 139.5, H3_RESOLUTION),
    country: 'Japan',
    type: 'FOS',
    color: 'green',
  },
  'fos-02': {
    id: 'fos-02',
    name: 'FOS 2',
    coordinates: [140.5, 36.5],
    h3Index: latLngToCell(36.5, 140.5, H3_RESOLUTION),
    country: 'Japan',
    type: 'FOS',
    color: 'green',
  },
  'fos-03': {
    id: 'fos-03',
    name: 'FOS 3',
    coordinates: [141.0, 38.5],
    h3Index: latLngToCell(38.5, 141.0, H3_RESOLUTION),
    country: 'Japan',
    type: 'FOS',
    color: 'green',
  },
  'fos-04': {
    id: 'fos-04',
    name: 'FOS 4',
    coordinates: [140.0, 40.5],
    h3Index: latLngToCell(40.5, 140.0, H3_RESOLUTION),
    country: 'Japan',
    type: 'FOS',
    color: 'green',
  },
  'fos-05': {
    id: 'fos-05',
    name: 'FOS 5',
    coordinates: [130.5, 33.5],
    h3Index: latLngToCell(33.5, 130.5, H3_RESOLUTION),
    country: 'Japan',
    type: 'FOS',
    color: 'green',
  },

  // Philippines
  'fos-06': {
    id: 'fos-06',
    name: 'FOS 6',
    coordinates: [121.0, 15.5],
    h3Index: latLngToCell(15.5, 121.0, H3_RESOLUTION),
    country: 'Philippines',
    type: 'FOS',
    color: 'green',
  },
  'fos-07': {
    id: 'fos-07',
    name: 'FOS 7',
    coordinates: [123.0, 13.5],
    h3Index: latLngToCell(13.5, 123.0, H3_RESOLUTION),
    country: 'Philippines',
    type: 'FOS',
    color: 'yellow',
  },
  'fos-08': {
    id: 'fos-08',
    name: 'FOS 8',
    coordinates: [124.5, 11.5],
    h3Index: latLngToCell(11.5, 124.5, H3_RESOLUTION),
    country: 'Philippines',
    type: 'FOS',
    color: 'green',
  },
  'fos-09': {
    id: 'fos-09',
    name: 'FOS 9',
    coordinates: [126.0, 7.5],
    h3Index: latLngToCell(7.5, 126.0, H3_RESOLUTION),
    country: 'Philippines',
    type: 'FOS',
    color: 'red',
  },
  'fos-10': {
    id: 'fos-10',
    name: 'FOS 10',
    coordinates: [118.8, 9.8],
    h3Index: latLngToCell(9.8, 118.8, H3_RESOLUTION),
    country: 'Philippines',
    type: 'FOS',
    color: 'yellow',
  },

  // Indonesia
  'fos-11': {
    id: 'fos-11',
    name: 'FOS 11',
    coordinates: [135.0, -4.0],
    h3Index: latLngToCell(-4.0, 135.0, H3_RESOLUTION),
    country: 'Indonesia',
    type: 'FOS',
    color: 'green',
  },
  'fos-12': {
    id: 'fos-12',
    name: 'FOS 12',
    coordinates: [122.0, 0.5],
    h3Index: latLngToCell(0.5, 122.0, H3_RESOLUTION),
    country: 'Indonesia',
    type: 'FOS',
    color: 'red',
  },
  'fos-15': {
    id: 'fos-15',
    name: 'FOS 15',
    coordinates: [114.0, 0.0],
    h3Index: latLngToCell(0.0, 114.0, H3_RESOLUTION),
    country: 'Indonesia',
    type: 'FOS',
    color: 'green',
  },
  'fos-16': {
    id: 'fos-16',
    name: 'FOS 16',
    coordinates: [112.0, -2.0],
    h3Index: latLngToCell(-2.0, 112.0, H3_RESOLUTION),
    country: 'Indonesia',
    type: 'FOS',
    color: 'green',
  },
  'fos-17': {
    id: 'fos-17',
    name: 'FOS 17',
    coordinates: [113.5, -8.0],
    h3Index: latLngToCell(-8.0, 113.5, H3_RESOLUTION),
    country: 'Indonesia',
    type: 'FOS',
    color: 'green',
  },
  'fos-18': {
    id: 'fos-18',
    name: 'FOS 18',
    coordinates: [115.5, -8.5],
    h3Index: latLngToCell(-8.5, 115.5, H3_RESOLUTION),
    country: 'Indonesia',
    type: 'FOS',
    color: 'yellow',
  },
  'fos-19': {
    id: 'fos-19',
    name: 'FOS 19',
    coordinates: [106.0, -6.5],
    h3Index: latLngToCell(-6.5, 106.0, H3_RESOLUTION),
    country: 'Indonesia',
    type: 'FOS',
    color: 'red',
  },
  'fos-20': {
    id: 'fos-20',
    name: 'FOS 20',
    coordinates: [107.0, -6.5],
    h3Index: latLngToCell(-6.5, 107.0, H3_RESOLUTION),
    country: 'Indonesia',
    type: 'FOS',
    color: 'green',
  },
  'fos-21': {
    id: 'fos-21',
    name: 'FOS 21',
    coordinates: [105.0, -5.0],
    h3Index: latLngToCell(-5.0, 105.0, H3_RESOLUTION),
    country: 'Indonesia',
    type: 'FOS',
    color: 'green',
  },

  // Brunei
  'fos-13': {
    id: 'fos-13',
    name: 'FOS 13',
    coordinates: [114.5, 4.5],
    h3Index: latLngToCell(4.5, 114.5, H3_RESOLUTION),
    country: 'Brunei',
    type: 'FOS',
    color: 'yellow',
  },
  'fos-14': {
    id: 'fos-14',
    name: 'FOS 14',
    coordinates: [115.0, 4.8],
    h3Index: latLngToCell(4.8, 115.0, H3_RESOLUTION),
    country: 'Malaysia',
    type: 'FOS',
    color: 'yellow',
  },

  // Singapore
  'fos-22': {
    id: 'fos-22',
    name: 'FOS 22',
    coordinates: [103.8, 1.3],
    h3Index: latLngToCell(1.3, 103.8, H3_RESOLUTION),
    country: 'Singapore',
    type: 'FOS',
    color: 'green',
  },

  // Malaysia
  'fos-23': {
    id: 'fos-23',
    name: 'FOS 23',
    coordinates: [102.0, 2.5],
    h3Index: latLngToCell(2.5, 102.0, H3_RESOLUTION),
    country: 'Malaysia',
    type: 'FOS',
    color: 'green',
  },
  'fos-24': {
    id: 'fos-24',
    name: 'FOS 24',
    coordinates: [103.5, 3.5],
    h3Index: latLngToCell(3.5, 103.5, H3_RESOLUTION),
    country: 'Malaysia',
    type: 'FOS',
    color: 'yellow',
  },

  // Thailand
  'fos-25': {
    id: 'fos-25',
    name: 'FOS 25',
    coordinates: [99.5, 8.5],
    h3Index: latLngToCell(8.5, 99.5, H3_RESOLUTION),
    country: 'Thailand',
    type: 'FOS',
    color: 'yellow',
  },
  'fos-26': {
    id: 'fos-26',
    name: 'FOS 26',
    coordinates: [100.5, 7.0],
    h3Index: latLngToCell(7.0, 100.5, H3_RESOLUTION),
    country: 'Thailand',
    type: 'FOS',
    color: 'red',
  },
  'fos-30': {
    id: 'fos-30',
    name: 'FOS 30',
    coordinates: [100.5, 13.7],
    h3Index: latLngToCell(13.7, 100.5, H3_RESOLUTION),
    country: 'Thailand',
    type: 'FOS',
    color: 'green',
  },
  'fos-32': {
    id: 'fos-32',
    name: 'FOS 32',
    coordinates: [99.0, 14.0],
    h3Index: latLngToCell(14.0, 99.0, H3_RESOLUTION),
    country: 'Thailand',
    type: 'FOS',
    color: 'yellow',
  },
  'fos-33': {
    id: 'fos-33',
    name: 'FOS 33',
    coordinates: [102.0, 15.0],
    h3Index: latLngToCell(15.0, 102.0, H3_RESOLUTION),
    country: 'Thailand',
    type: 'FOS',
    color: 'green',
  },
  'fos-34': {
    id: 'fos-34',
    name: 'FOS 34',
    coordinates: [103.0, 16.5],
    h3Index: latLngToCell(16.5, 103.0, H3_RESOLUTION),
    country: 'Thailand',
    type: 'FOS',
    color: 'red',
  },

  // Cambodia
  'fos-29': {
    id: 'fos-29',
    name: 'FOS 29',
    coordinates: [104.5, 11.5],
    h3Index: latLngToCell(11.5, 104.5, H3_RESOLUTION),
    country: 'Cambodia',
    type: 'FOS',
    color: 'yellow',
  },

  // Vietnam
  'fos-27': {
    id: 'fos-27',
    name: 'FOS 27',
    coordinates: [106.0, 10.5],
    h3Index: latLngToCell(10.5, 106.0, H3_RESOLUTION),
    country: 'Vietnam',
    type: 'FOS',
    color: 'green',
  },
  'fos-28': {
    id: 'fos-28',
    name: 'FOS 28',
    coordinates: [107.0, 10.8],
    h3Index: latLngToCell(10.8, 107.0, H3_RESOLUTION),
    country: 'Vietnam',
    type: 'FOS',
    color: 'yellow',
  },
  'fos-31': {
    id: 'fos-31',
    name: 'FOS 31',
    coordinates: [108.2, 16.0],
    h3Index: latLngToCell(16.0, 108.2, H3_RESOLUTION),
    country: 'Vietnam',
    type: 'FOS',
    color: 'green',
  },
  'fos-36': {
    id: 'fos-36',
    name: 'FOS 36',
    coordinates: [106.0, 20.5],
    h3Index: latLngToCell(20.5, 106.0, H3_RESOLUTION),
    country: 'Vietnam',
    type: 'FOS',
    color: 'yellow',
  },
  'fos-37': {
    id: 'fos-37',
    name: 'FOS 37',
    coordinates: [105.8, 21.0],
    h3Index: latLngToCell(21.0, 105.8, H3_RESOLUTION),
    country: 'Vietnam',
    type: 'FOS',
    color: 'green',
  },

  // Laos
  'fos-35': {
    id: 'fos-35',
    name: 'FOS 35',
    coordinates: [102.5, 18.0],
    h3Index: latLngToCell(18.0, 102.5, H3_RESOLUTION),
    country: 'Laos',
    type: 'FOS',
    color: 'red',
  },

  // India
  'fos-38': {
    id: 'fos-38',
    name: 'FOS 38',
    coordinates: [92.5, 24.0],
    h3Index: latLngToCell(24.0, 92.5, H3_RESOLUTION),
    country: 'India',
    type: 'FOS',
    color: 'yellow',
  },
  'fos-39': {
    id: 'fos-39',
    name: 'FOS 39',
    coordinates: [88.8, 22.5],
    h3Index: latLngToCell(22.5, 88.8, H3_RESOLUTION),
    country: 'India',
    type: 'FOS',
    color: 'green',
  },
  'fos-40': {
    id: 'fos-40',
    name: 'FOS 40',
    coordinates: [88.0, 21.7],
    h3Index: latLngToCell(21.7, 88.0, H3_RESOLUTION),
    country: 'India',
    type: 'FOS',
    color: 'yellow',
  },
  'fos-41': {
    id: 'fos-41',
    name: 'FOS 41',
    coordinates: [80.0, 13.0],
    h3Index: latLngToCell(13.0, 80.0, H3_RESOLUTION),
    country: 'India',
    type: 'FOS',
    color: 'yellow',
  },
  'fos-42': {
    id: 'fos-42',
    name: 'FOS 42',
    coordinates: [73.8, 15.5],
    h3Index: latLngToCell(15.5, 73.8, H3_RESOLUTION),
    country: 'India',
    type: 'FOS',
    color: 'green',
  },
  'fos-43': {
    id: 'fos-43',
    name: 'FOS 43',
    coordinates: [75.0, 13.0],
    h3Index: latLngToCell(13.0, 75.0, H3_RESOLUTION),
    country: 'India',
    type: 'FOS',
    color: 'green',
  },
  'fos-44': {
    id: 'fos-44',
    name: 'FOS 44',
    coordinates: [77.5, 8.5],
    h3Index: latLngToCell(8.5, 77.5, H3_RESOLUTION),
    country: 'India',
    type: 'FOS',
    color: 'yellow',
  },
  'fos-45': {
    id: 'fos-45',
    name: 'FOS 45',
    coordinates: [77.0, 8.7],
    h3Index: latLngToCell(8.7, 77.0, H3_RESOLUTION),
    country: 'India',
    type: 'FOS',
    color: 'green',
  },
};

/**
 * A combined array of all static locations for easy iteration.
 */
export const ALL_STATIC_LOCATIONS: StaticLocation[] = [
  ...Object.values(MOB_LOCATIONS),
  ...Object.values(FOS_LOCATIONS),
];
