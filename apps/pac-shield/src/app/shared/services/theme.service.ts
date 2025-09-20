import { Injectable, signal, effect, Renderer2, RendererFactory2, inject } from '@angular/core';

/**
 * Theme management service for handling light/dark mode switching.
 * Manages theme persistence, DOM class application, and reactive theme changes.
 * Uses Angular signals for reactive theme state management.
 */
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;

  /** Signal tracking current dark mode state. True for dark mode, false for light mode. */
  isDarkMode = signal<boolean>(true);

  private rendererFactory = inject(RendererFactory2);

  /**
   * Initializes the theme service with saved preferences and sets up reactive effects.
   * Loads theme preference from localStorage, defaulting to dark mode if none exists.
   * Sets up an effect to automatically apply theme changes to the DOM.
   */
  constructor() {
    this.renderer = this.rendererFactory.createRenderer(null, null);

    // Load saved theme preference or default to dark mode
    const storedTheme = localStorage.getItem('isDarkMode');
    this.isDarkMode.set(storedTheme ? JSON.parse(storedTheme) : true);

    // Apply theme changes when signal updates
    effect(() => {
      localStorage.setItem('isDarkMode', JSON.stringify(this.isDarkMode()));

      if (this.isDarkMode()) {
        // Dark mode: remove light-mode class
        this.renderer.removeClass(document.body, 'light-mode');
      } else {
        // Light mode: add light-mode class
        this.renderer.addClass(document.body, 'light-mode');
      }
    });
  }

  /**
   * Toggles between light and dark theme modes.
   * Automatically persists the change to localStorage and updates the DOM.
   * Triggers the reactive effect to apply the new theme immediately.
   * @example
   * // Switch from dark to light or light to dark
   * themeService.toggleTheme();
   */
  toggleTheme(): void {
    this.isDarkMode.set(!this.isDarkMode());
  }
}
