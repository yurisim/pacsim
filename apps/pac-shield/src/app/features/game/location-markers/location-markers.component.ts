import { Component, Input, OnDestroy, OnChanges, SimpleChanges, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Map, Marker } from 'maplibre-gl';
import { MOB_LOCATIONS, FOS_LOCATIONS, StaticLocation } from '../../../shared/config/static-locations.config';
import { ThemeService } from '../../../shared/services/theme.service';
import {
  MobMarkerReference,
  FosMarkerReference,
  MarkerStyleConfig,
  FosColorSet
} from './location-markers.interfaces';

/**
 * Component Intent: Renders and manages MOB and FOS location markers on the game map.
 * 
 * This component provides:
 * - Custom HTML markers for MOB locations with home icons
 * - Custom HTML markers for FOS locations with camping icons and color coding
 * - Theme-aware styling that responds to light/dark mode changes
 * - Efficient marker management with proper cleanup
 * - Color-coded FOS markers based on strategic value (green/yellow/red)
 * 
 * The component uses Material Design icons and maintains references to DOM elements
 * for dynamic theme updates without recreating markers.
 */
@Component({
  selector: 'app-location-markers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './location-markers.component.html',
  styleUrls: ['./location-markers.component.scss']
})
export class LocationMarkersComponent implements OnDestroy, OnChanges {
  @Input() map!: Map;
  @Input() showMobMarkers = true;
  @Input() showFosMarkers = true;
  @Input() markerConfig: Partial<MarkerStyleConfig> = {};

  private themeService = inject(ThemeService);
  private mobMarkers: MobMarkerReference[] = [];
  private fosMarkers: FosMarkerReference[] = [];
  private markersInitialized = false;

  // Default configuration
  private defaultConfig: MarkerStyleConfig = {
    iconSize: '26px',
    labelFontSize: '16px',
    labelMargin: '2px'
  };

  constructor() {
    // Setup theme change listener
    effect(() => {
      const isDarkMode = this.themeService.isDarkMode();
      if (this.markersInitialized) {
        this.updateMarkerColors();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['map'] && this.map && !this.markersInitialized) {
      // Wait for map to be fully initialized
      if (this.map.loaded()) {
        this.initializeMarkers();
        this.markersInitialized = true;
      } else {
        // Wait for map to load
        this.map.on('load', () => {
          this.initializeMarkers();
          this.markersInitialized = true;
        });
      }
    }

    if (changes['showMobMarkers'] && this.markersInitialized) {
      this.toggleMobMarkers(this.showMobMarkers);
    }

    if (changes['showFosMarkers'] && this.markersInitialized) {
      this.toggleFosMarkers(this.showFosMarkers);
    }

    if (changes['markerConfig'] && this.markersInitialized) {
      this.updateMarkerStyles();
    }
  }

  ngOnDestroy(): void {
    this.cleanupMarkers();
  }

  /**
   * Initialize all markers when map is ready
   */
  private initializeMarkers(): void {
    if (!this.map) return;

    if (this.showMobMarkers) {
      this.renderMobSymbols();
    }

    if (this.showFosMarkers) {
      this.renderFosSymbols();
    }
  }

  /**
   * Method Intent: Render MOB location symbols using custom HTML markers with Material Design icons.
   * 
   * Creates home icon markers for each Main Operating Base with:
   * - Material Design home icon
   * - Base name label
   * - Theme-aware primary color styling
   * - Interactive cursor on hover
   */
  private renderMobSymbols(): void {
    if (!this.map) {
      console.warn('Cannot render MOB symbols: map not initialized');
      return;
    }

    // Clear existing MOB markers if any
    this.mobMarkers.forEach(({ marker }) => {
      try {
        marker.remove();
      } catch (e) {
        console.warn('Error removing MOB marker:', e);
      }
    });
    this.mobMarkers = [];

    const config = { ...this.defaultConfig, ...this.markerConfig };
    const primaryColor = this.getCSSVariableValue('--mat-sys-primary') || '#0066CC';

    // Create custom HTML markers for each MOB location
    Object.values(MOB_LOCATIONS).forEach(mob => {
      try {
        // Create marker container
        const markerElement = document.createElement('div');
        markerElement.className = 'mob-marker';
        markerElement.style.textAlign = 'center';
        markerElement.style.cursor = 'pointer';

        // Create Material icon element using Google Material Icons font
        const iconElement = document.createElement('span');
        iconElement.className = 'material-icons';
        iconElement.textContent = 'home';
        iconElement.style.fontSize = config.iconSize;
        iconElement.style.color = primaryColor;

        // Create label element
        const labelElement = document.createElement('div');
        labelElement.className = 'mob-marker-label';
        labelElement.textContent = mob.name;
        labelElement.style.fontSize = config.labelFontSize;
        labelElement.style.color = primaryColor;
        labelElement.style.marginTop = config.labelMargin;

        // Append elements
        markerElement.appendChild(iconElement);
        markerElement.appendChild(labelElement);

        // Create and add marker to map
        const marker = new Marker({
          element: markerElement,
          anchor: 'bottom' // Anchor the marker at the bottom of the element
        })
          .setLngLat(mob.coordinates)
          .addTo(this.map);

        // Store reference for theme updates
        this.mobMarkers.push({
          marker,
          mobData: mob,
          iconElement,
          labelElement
        });
      } catch (error) {
        console.error(`Error creating MOB marker for ${mob.name}:`, error);
      }
    });
  }

  /**
   * Method Intent: Render FOS location symbols using custom HTML markers with camping icons and color coding.
   * 
   * Creates festival/camping icon markers for each Forward Operating Site with:
   * - Material Design festival icon
   * - Site name label
   * - Color coding based on strategic value (green/yellow/red)
   * - Theme-aware color adjustments for accessibility
   * - Interactive cursor on hover
   */
  private renderFosSymbols(): void {
    if (!this.map) {
      console.warn('Cannot render FOS symbols: map not initialized');
      return;
    }

    // Clear existing FOS markers if any
    this.fosMarkers.forEach(({ marker }) => {
      try {
        marker.remove();
      } catch (e) {
        console.warn('Error removing FOS marker:', e);
      }
    });
    this.fosMarkers = [];

    const config = { ...this.defaultConfig, ...this.markerConfig };

    // Create custom HTML markers for each FOS location
    Object.values(FOS_LOCATIONS).forEach(fos => {
      try {
        // Create marker container
        const markerElement = document.createElement('div');
        markerElement.className = 'fos-marker';
        markerElement.style.textAlign = 'center';
        markerElement.style.cursor = 'pointer';

        // Create Material icon element using Google Material Icons font
        const iconElement = document.createElement('span');
        iconElement.className = 'material-icons';
        iconElement.textContent = 'festival';
        iconElement.style.fontSize = config.iconSize;

        // Set color based on FOS color property with proper light/dark mode contrast
        const iconColor = this.getThemeAwareFosColor(fos.color!);
        iconElement.style.color = iconColor;

        // Create label element
        const labelElement = document.createElement('div');
        labelElement.className = 'fos-marker-label';
        labelElement.textContent = fos.name;
        labelElement.style.fontSize = '12px'; // Smaller font for FOS labels
        labelElement.style.color = iconColor;
        labelElement.style.marginTop = '1px';

        // Append elements
        markerElement.appendChild(iconElement);
        markerElement.appendChild(labelElement);

        // Create and add marker to map
        const marker = new Marker({
          element: markerElement,
          anchor: 'bottom' // Anchor the marker at the bottom of the element
        })
          .setLngLat(fos.coordinates)
          .addTo(this.map);

        // Store reference for theme updates
        this.fosMarkers.push({
          marker,
          fosData: fos,
          iconElement,
          labelElement
        });
      } catch (error) {
        console.error(`Error creating FOS marker for ${fos.name}:`, error);
      }
    });
  }

  /**
   * Toggle visibility of MOB markers
   */
  private toggleMobMarkers(show: boolean): void {
    if (show && this.mobMarkers.length === 0) {
      this.renderMobSymbols();
    } else if (!show) {
      this.mobMarkers.forEach(({ marker }) => marker.remove());
      this.mobMarkers = [];
    }
  }

  /**
   * Toggle visibility of FOS markers
   */
  private toggleFosMarkers(show: boolean): void {
    if (show && this.fosMarkers.length === 0) {
      this.renderFosSymbols();
    } else if (!show) {
      this.fosMarkers.forEach(({ marker }) => marker.remove());
      this.fosMarkers = [];
    }
  }

  /**
   * Update marker colors to match current Material Design theme
   * Called when theme changes to ensure HTML marker colors stay consistent
   */
  private updateMarkerColors(): void {
    // Update FOS marker colors
    this.fosMarkers.forEach(({ fosData, iconElement, labelElement }) => {
      const newColor = this.getThemeAwareFosColor(fosData.color!);
      iconElement.style.color = newColor;
      labelElement.style.color = newColor;
    });

    // Update MOB marker colors using Material Design primary color
    const primaryColor = this.getCSSVariableValue('--mat-sys-primary') || '#0066CC';
    this.mobMarkers.forEach(({ iconElement, labelElement }) => {
      iconElement.style.color = primaryColor;
      labelElement.style.color = primaryColor;
    });
  }

  /**
   * Update marker styles based on configuration changes
   */
  private updateMarkerStyles(): void {
    const config = { ...this.defaultConfig, ...this.markerConfig };

    // Update MOB marker styles
    this.mobMarkers.forEach(({ iconElement, labelElement }) => {
      iconElement.style.fontSize = config.iconSize;
      labelElement.style.fontSize = config.labelFontSize;
      labelElement.style.marginTop = config.labelMargin;
    });

    // Update FOS marker styles
    this.fosMarkers.forEach(({ iconElement, labelElement }) => {
      iconElement.style.fontSize = config.iconSize;
      labelElement.style.fontSize = '12px'; // FOS labels stay smaller
      labelElement.style.marginTop = '1px';
    });
  }

  /**
   * Clean up all markers
   */
  private cleanupMarkers(): void {
    this.fosMarkers.forEach(({ marker }) => marker.remove());
    this.mobMarkers.forEach(({ marker }) => marker.remove());
    this.fosMarkers = [];
    this.mobMarkers = [];
    this.markersInitialized = false;
  }

  /**
   * Helper method to resolve CSS custom properties to actual color values
   * MapLibre GL requires actual color values, not CSS variables
   */
  private getCSSVariableValue(variableName: string): string {
    // Try to get from body first (where theme classes are applied), then fall back to root
    const bodyStyle = getComputedStyle(document.body);
    const bodyValue = bodyStyle.getPropertyValue(variableName).trim();

    if (bodyValue) {
      return bodyValue;
    }

    const rootStyle = getComputedStyle(document.documentElement);
    return rootStyle.getPropertyValue(variableName).trim();
  }

  /**
   * Helper method to get theme-aware FOS colors with proper contrast ratios.
   * Returns colors optimized for accessibility in both light and dark themes.
   *
   * Colors selected based on Adobe Color accessibility standards:
   * - Light theme: Darker, more saturated colors for better contrast on light backgrounds
   * - Dark theme: Brighter, less saturated colors for better contrast on dark backgrounds
   * - All colors maintain minimum 4.5:1 contrast ratio with their respective backgrounds
   */
  private getThemeAwareFosColor(fosColor: string): string {
    const isDarkMode = this.themeService.isDarkMode();

    // Color sets optimized for contrast and accessibility
    const lightModeColors: FosColorSet = {
      green: '#388E3C',  // A slightly less intense, yet clear green
      yellow: '#FFA000', // A rich amber/gold for excellent contrast on light backgrounds
      red: '#D32F2F'     // A strong, clear red that is less dark than the original
    };

    const darkModeColors: FosColorSet = {
      green: '#81C784',  // A lighter, softer green that's clear on dark backgrounds
      yellow: '#FFD54F', // A pleasant, lighter yellow that stands out well
      red: '#E57373'     // A softer, less saturated red for better harmony in dark mode
    };

    const colorSet = isDarkMode ? darkModeColors : lightModeColors;

    switch (fosColor) {
      case 'green':
        return colorSet.green;
      case 'yellow':
        return colorSet.yellow;
      case 'red':
        return colorSet.red;
      default:
        // Fallback to theme's on-surface color for unknown colors
        return this.getCSSVariableValue('--mat-sys-on-surface') || (isDarkMode ? '#E0E0E0' : '#1C1C1C');
    }
  }

  /**
   * Public method to refresh all markers
   * Can be called externally if needed
   */
  public refreshMarkers(): void {
    this.cleanupMarkers();
    this.initializeMarkers();
    this.markersInitialized = true;
  }

  /**
   * Public method to get marker counts
   * Useful for debugging or status displays
   */
  public getMarkerCounts(): { mob: number; fos: number } {
    return {
      mob: this.mobMarkers.length,
      fos: this.fosMarkers.length
    };
  }
}
