import { Marker } from 'maplibre-gl';
import { StaticLocation } from '../../../shared/config/static-locations.config';

/**
 * Interface for MOB marker storage
 * Stores references to both the MapLibre marker and DOM elements for theme updates
 */
export interface MobMarkerReference {
  /** MapLibre GL marker instance */
  marker: Marker;
  /** MOB location data */
  mobData: StaticLocation;
  /** Reference to the icon DOM element for style updates */
  iconElement: HTMLElement;
  /** Reference to the label DOM element for style updates */
  labelElement: HTMLElement;
}

/**
 * Interface for FOS marker storage
 * Stores references to both the MapLibre marker and DOM elements for theme updates
 */
export interface FosMarkerReference {
  /** MapLibre GL marker instance */
  marker: Marker;
  /** FOS location data */
  fosData: StaticLocation;
  /** Reference to the icon DOM element for style updates */
  iconElement: HTMLElement;
  /** Reference to the label DOM element for style updates */
  labelElement: HTMLElement;
}

/**
 * Configuration for marker styling
 */
export interface MarkerStyleConfig {
  /** Icon size in pixels */
  iconSize: string;
  /** Label font size in pixels */
  labelFontSize: string;
  /** Margin between icon and label */
  labelMargin: string;
  /** Primary color for MOB markers */
  primaryColor?: string;
  /** Whether dark mode is active */
  isDarkMode?: boolean;
}

/**
 * Theme-aware color set for FOS markers
 */
export interface FosColorSet {
  green: string;
  yellow: string;
  red: string;
}
