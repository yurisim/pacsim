import { Injectable, signal, effect, Renderer2, RendererFactory2, inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  isDarkMode = signal<boolean>(true);
  private rendererFactory = inject(RendererFactory2);

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

  toggleTheme(): void {
    this.isDarkMode.set(!this.isDarkMode());
  }
}
